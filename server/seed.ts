import { storage } from "./storage";
import { seedCards1 } from "./seed-cards-1";
import { seedCards2 } from "./seed-cards-2";
import { getUncachableStripeClient } from "./stripeClient";

async function ensureStripeProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 10 });
    const hasBasic = products.data.some((p) => p.name === "DealCoach Basic");
    const hasPro = products.data.some((p) => p.name === "DealCoach Pro");

    if (hasBasic && hasPro) {
      return;
    }

    if (!hasBasic) {
      const basicProduct = await stripe.products.create({
        name: "DealCoach Basic",
        description: "全スキルカード、月10回AIロープレ、詳細スキル診断、学習カレンダー",
        metadata: { plan: "basic" },
      });
      await stripe.prices.create({ product: basicProduct.id, unit_amount: 3000, currency: "jpy", recurring: { interval: "month" }, metadata: { plan: "basic", billingCycle: "monthly" } });
      await stripe.prices.create({ product: basicProduct.id, unit_amount: 30000, currency: "jpy", recurring: { interval: "year" }, metadata: { plan: "basic", billingCycle: "annual" } });
      console.log("Created DealCoach Basic product with prices");
    }

    if (!hasPro) {
      const proProduct = await stripe.products.create({
        name: "DealCoach Pro",
        description: "全機能無制限、AIレコメンド、カスタムシナリオ無制限",
        metadata: { plan: "pro" },
      });
      await stripe.prices.create({ product: proProduct.id, unit_amount: 4500, currency: "jpy", recurring: { interval: "month" }, metadata: { plan: "pro", billingCycle: "monthly" } });
      await stripe.prices.create({ product: proProduct.id, unit_amount: 45000, currency: "jpy", recurring: { interval: "year" }, metadata: { plan: "pro", billingCycle: "annual" } });
      console.log("Created DealCoach Pro product with prices");
    }
  } catch (error) {
    console.error("Error ensuring Stripe products:", error);
  }
}

export async function seedDatabase() {
  const cardCount = await storage.getSkillCardCount();

  if (cardCount < 50) {
    if (cardCount > 0) {
      await storage.deleteAllSkillCards();
    }

    const allCards = [...seedCards1, ...seedCards2];
    for (const card of allCards) {
      await storage.createSkillCard(card);
    }
    console.log(`Seeded ${allCards.length} skill cards`);
  }

  const scenarioCount = await storage.getScenarioCount();

  const scenariosData = [
    {
      title: "SaaS Sales Meeting",
      titleJa: "SaaS製品の初回商談",
      customerName: "田中部長",
      customerRole: "IT部門 部長",
      companyName: "テクノフューチャー株式会社",
      industry: "製造業",
      productService: "クラウド型業務管理SaaS",
      situation: "現在のオンプレミスシステムの老朽化に課題を感じている。デジタル化を推進したいが、セキュリティと移行コストが懸念。予算は年間500万円程度。",
      difficulty: "medium",
      isCustom: false,
    },
    {
      title: "Enterprise Software Renewal",
      titleJa: "大企業向けソフトウェア更新提案",
      customerName: "佐藤課長",
      customerRole: "経営企画部 課長",
      companyName: "グローバルコマース株式会社",
      industry: "小売業",
      productService: "統合ERPシステム",
      situation: "5年間使用してきたシステムのライセンス更新時期。競合他社からの提案も受けている。現行システムへの不満はあるが、移行リスクを懸念。",
      difficulty: "hard",
      isCustom: false,
    },
    {
      title: "Startup First Meeting",
      titleJa: "スタートアップへの初回アプローチ",
      customerName: "鈴木CEO",
      customerRole: "代表取締役",
      companyName: "イノベートラボ",
      industry: "IT・スタートアップ",
      productService: "マーケティングオートメーションツール",
      situation: "急成長中のスタートアップで、マーケティング業務を効率化したい。少人数チームで運営しており、導入の手間は最小限にしたい。予算は限られている。",
      difficulty: "easy",
      isCustom: false,
    },
  ];

  if (scenarioCount === 0) {
    for (const scenario of scenariosData) {
      await storage.createScenario(scenario);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    await ensureStripeProducts();
  }

  console.log("Seed check complete");
}
