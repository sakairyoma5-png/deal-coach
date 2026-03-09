import { getUncachableStripeClient } from './stripeClient';

async function seedStripeProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.list({ limit: 100 });

  for (const product of existingProducts.data) {
    if (product.metadata?.plan === 'basic' || product.metadata?.plan === 'pro' || product.metadata?.plan === 'enterprise') {
      console.log(`Archiving old product: ${product.name} (${product.id})`);
      const prices = await stripe.prices.list({ product: product.id, limit: 100 });
      for (const price of prices.data) {
        if (price.active) {
          await stripe.prices.update(price.id, { active: false });
        }
      }
      await stripe.products.update(product.id, { active: false });
    }
  }

  console.log('Creating Basic plan product...');
  const basicProduct = await stripe.products.create({
    name: 'DealCoach Basic',
    description: '全スキルカード、月10回AIロープレ、詳細スキル診断、学習カレンダー',
    metadata: { plan: 'basic' },
  });

  const basicMonthly = await stripe.prices.create({
    product: basicProduct.id,
    unit_amount: 3000,
    currency: 'jpy',
    recurring: { interval: 'month' },
    metadata: { plan: 'basic', billingCycle: 'monthly' },
  });

  const basicAnnual = await stripe.prices.create({
    product: basicProduct.id,
    unit_amount: 30000,
    currency: 'jpy',
    recurring: { interval: 'year' },
    metadata: { plan: 'basic', billingCycle: 'annual' },
  });

  console.log('Basic plan created:', basicProduct.id);
  console.log('  Monthly price:', basicMonthly.id, '¥3,000/月');
  console.log('  Annual price:', basicAnnual.id, '¥30,000/年');

  console.log('Creating Pro plan product...');
  const proProduct = await stripe.products.create({
    name: 'DealCoach Pro',
    description: '全機能無制限、AIレコメンド、カスタムシナリオ無制限',
    metadata: { plan: 'pro' },
  });

  const proMonthly = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 4500,
    currency: 'jpy',
    recurring: { interval: 'month' },
    metadata: { plan: 'pro', billingCycle: 'monthly' },
  });

  const proAnnual = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 45000,
    currency: 'jpy',
    recurring: { interval: 'year' },
    metadata: { plan: 'pro', billingCycle: 'annual' },
  });

  console.log('Pro plan created:', proProduct.id);
  console.log('  Monthly price:', proMonthly.id, '¥4,500/月');
  console.log('  Annual price:', proAnnual.id, '¥45,000/年');

  console.log('Creating Enterprise plan product...');
  const enterpriseProduct = await stripe.products.create({
    name: 'DealCoach Enterprise',
    description: '法人向け全機能利用可能プラン（1アカウントあたり）',
    metadata: { plan: 'enterprise' },
  });

  const enterpriseMonthly = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 10000,
    currency: 'jpy',
    recurring: { interval: 'month' },
    metadata: { plan: 'enterprise', billingCycle: 'monthly' },
  });

  console.log('Enterprise plan created:', enterpriseProduct.id);
  console.log('  Monthly price:', enterpriseMonthly.id, '¥10,000/月 (per seat)');

  console.log('\n=== UPDATE pricing.tsx with these price IDs ===');
  console.log(`Basic Monthly: ${basicMonthly.id}`);
  console.log(`Basic Annual: ${basicAnnual.id}`);
  console.log(`Pro Monthly: ${proMonthly.id}`);
  console.log(`Pro Annual: ${proAnnual.id}`);
  console.log(`Enterprise Monthly: ${enterpriseMonthly.id}`);

  console.log('\nStripe product seeding complete!');
}

seedStripeProducts().catch(console.error);
