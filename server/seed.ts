import { storage } from "./storage";
import { seedCards1 } from "./seed-cards-1";
import { seedCards2 } from "./seed-cards-2";

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

  console.log("Seed check complete");
}
