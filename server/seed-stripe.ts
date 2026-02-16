import { getUncachableStripeClient } from './stripeClient';

async function seedStripeProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.list({ limit: 100 });
  const basicExists = existingProducts.data.find(p => p.metadata?.plan === 'basic');
  const proExists = existingProducts.data.find(p => p.metadata?.plan === 'pro');

  if (!basicExists) {
    console.log('Creating Basic plan product...');
    const basicProduct = await stripe.products.create({
      name: 'DealCoach Basic',
      description: '全スキルカード、月10回AIロープレ、詳細スキル診断、学習カレンダー',
      metadata: { plan: 'basic' },
    });

    await stripe.prices.create({
      product: basicProduct.id,
      unit_amount: 300000,
      currency: 'jpy',
      recurring: { interval: 'month' },
      metadata: { plan: 'basic', billingCycle: 'monthly' },
    });

    await stripe.prices.create({
      product: basicProduct.id,
      unit_amount: 3000000,
      currency: 'jpy',
      recurring: { interval: 'year' },
      metadata: { plan: 'basic', billingCycle: 'annual' },
    });

    console.log('Basic plan created:', basicProduct.id);
  } else {
    console.log('Basic plan already exists:', basicExists.id);
  }

  if (!proExists) {
    console.log('Creating Pro plan product...');
    const proProduct = await stripe.products.create({
      name: 'DealCoach Pro',
      description: '全機能無制限、AIレコメンド、カスタムシナリオ無制限',
      metadata: { plan: 'pro' },
    });

    await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 450000,
      currency: 'jpy',
      recurring: { interval: 'month' },
      metadata: { plan: 'pro', billingCycle: 'monthly' },
    });

    await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 4500000,
      currency: 'jpy',
      recurring: { interval: 'year' },
      metadata: { plan: 'pro', billingCycle: 'annual' },
    });

    console.log('Pro plan created:', proProduct.id);
  } else {
    console.log('Pro plan already exists:', proExists.id);
  }

  console.log('Stripe product seeding complete!');
}

seedStripeProducts().catch(console.error);
