import { getStripeSync } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. '
      );
    }
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const event = JSON.parse(payload.toString());
      await WebhookHandlers.handleOrgSubscriptionEvents(event);
    } catch (error) {
      console.error('Error handling org subscription webhook:', error);
    }
  }

  static async handleOrgSubscriptionEvents(event: any): Promise<void> {
    const subscriptionEvents = [
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'customer.subscription.paused',
      'invoice.payment_failed',
    ];

    if (!subscriptionEvents.includes(event.type)) return;

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (!subscriptionId) return;

      const org = await storage.getOrganizationByStripeSubscriptionId(subscriptionId);
      if (org) {
        await storage.updateOrganization(org.id, { subscriptionStatus: 'past_due' });
        console.log(`Org ${org.id} subscription marked as past_due due to payment failure`);
      }
      return;
    }

    const subscription = event.data.object;
    if (!subscription?.id) return;

    const org = await storage.getOrganizationByStripeSubscriptionId(subscription.id);
    if (!org) return;

    const statusMap: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'unpaid',
      incomplete: 'incomplete',
      incomplete_expired: 'canceled',
      trialing: 'active',
      paused: 'paused',
    };

    const newStatus = statusMap[subscription.status] || subscription.status;

    if (org.subscriptionStatus !== newStatus) {
      await storage.updateOrganization(org.id, { subscriptionStatus: newStatus });
      console.log(`Org ${org.id} subscription status updated: ${org.subscriptionStatus} → ${newStatus}`);
    }
  }
}
