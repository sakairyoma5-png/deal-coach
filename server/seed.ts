import { storage } from "./storage";

export async function seedDatabase() {
  const cardCount = await storage.getSkillCardCount();

  const skillCardsData = [
    {
      title: "SPIN Selling",
      titleJa: "SPIN営業法",
      category: "ヒアリング",
      description: "A questioning technique that uncovers customer needs through Situation, Problem, Implication, and Need-payoff questions.",
      descriptionJa: "状況質問・問題質問・示唆質問・解決質問の4つの質問タイプを使い、顧客の潜在ニーズを引き出す手法です。",
      goodExample: "That's interesting. How does that impact your team's productivity?",
      goodExampleJa: "それは興味深いですね。そのことがチームの生産性にどのような影響を与えていますか？",
      badExample: "Our product can solve that. Let me tell you about our features.",
      badExampleJa: "弊社の製品ならそれを解決できます。機能について説明させてください。",
      tips: ["Listen actively before asking the next question", "Let the customer discover the value themselves"],
      tipsJa: ["次の質問をする前にしっかり傾聴する", "顧客自身に価値を発見させる"],
      difficulty: "intermediate",
      iconName: "Target",
      isPremium: false,
    },
    {
      title: "Mirroring",
      titleJa: "ミラーリング",
      category: "ラポール構築",
      description: "A rapport-building technique where you subtly mirror the customer's body language, tone, and speech patterns.",
      descriptionJa: "顧客のボディランゲージ、声のトーン、話し方のパターンをさりげなく反映することで信頼関係を構築する手法です。",
      goodExample: "Customer: 'We're really struggling with efficiency.' You: 'Struggling with efficiency...' (nod)",
      goodExampleJa: "顧客：「効率化に本当に苦労しているんです」 あなた：「効率化に苦労されている...」（うなずき）",
      badExample: "I understand. Anyway, let me show you our solution.",
      badExampleJa: "わかりました。では、弊社のソリューションをご紹介しましょう。",
      tips: ["Mirror the last 1-3 key words", "Use a genuine curious tone", "Pause after mirroring to let them elaborate"],
      tipsJa: ["最後の1〜3つのキーワードを繰り返す", "本当に好奇心のあるトーンで話す", "ミラーリング後に一拍置いて相手に話を広げてもらう"],
      difficulty: "beginner",
      iconName: "Users",
      isPremium: false,
    },
    {
      title: "Objection Handling",
      titleJa: "反論処理",
      category: "クロージング",
      description: "Techniques for addressing and overcoming customer concerns and objections during the sales process.",
      descriptionJa: "商談中に顧客の懸念や反論に対応し、克服するためのテクニックです。",
      goodExample: "I appreciate you sharing that concern. Many of our clients initially felt the same way. Could you tell me more about what specifically worries you?",
      goodExampleJa: "そのご懸念を共有いただきありがとうございます。多くのお客様も最初は同じように感じていました。具体的にどの点がご心配ですか？",
      badExample: "No, that's not right. Our product is actually very affordable.",
      badExampleJa: "いいえ、それは違います。弊社の製品は実は非常にお手頃です。",
      tips: ["Acknowledge the objection first", "Ask clarifying questions", "Reframe the objection as an opportunity"],
      tipsJa: ["まず反論を認める", "明確化のための質問をする", "反論を機会として再定義する"],
      difficulty: "advanced",
      iconName: "Shield",
      isPremium: false,
    },
    {
      title: "Active Listening",
      titleJa: "アクティブリスニング",
      category: "ヒアリング",
      description: "A communication technique that involves fully concentrating, understanding, and responding to the customer.",
      descriptionJa: "顧客の話に完全に集中し、理解し、適切に応答するコミュニケーション技法です。",
      goodExample: "Let me make sure I understand correctly. You mentioned three main challenges: budget constraints, timeline pressure, and team resistance. Is that right?",
      goodExampleJa: "正しく理解できているか確認させてください。3つの主要な課題を挙げていただきました：予算の制約、スケジュールのプレッシャー、チームの抵抗。合っていますか？",
      badExample: "Uh-huh, yeah, sure. So about our pricing...",
      badExampleJa: "はい、そうですね。では料金について...",
      tips: ["Summarize what the customer said", "Use verbal and non-verbal cues", "Take notes to show engagement"],
      tipsJa: ["顧客の話を要約する", "言語的・非言語的な合図を使う", "メモを取って関心を示す"],
      difficulty: "beginner",
      iconName: "Ear",
      isPremium: true,
    },
    {
      title: "Consultative Selling",
      titleJa: "コンサルティング営業",
      category: "提案",
      description: "An approach where the salesperson acts as a trusted advisor, focusing on the customer's needs rather than pushing products.",
      descriptionJa: "営業担当者が信頼されるアドバイザーとして行動し、製品を押し売りするのではなく顧客のニーズに焦点を当てるアプローチです。",
      goodExample: "Based on what you've shared about your challenges, I think we have two options that could work well. Let me walk you through the pros and cons of each.",
      goodExampleJa: "お話しいただいた課題を踏まえると、2つの選択肢が有効だと思います。それぞれのメリット・デメリットをご説明させてください。",
      badExample: "Our premium package is the best option for everyone.",
      badExampleJa: "弊社のプレミアムパッケージはどなたにも最適な選択肢です。",
      tips: ["Research the customer's business beforehand", "Present options, not ultimatums", "Focus on value, not features"],
      tipsJa: ["事前に顧客のビジネスを調査する", "最後通告ではなく選択肢を提示する", "機能ではなく価値に焦点を当てる"],
      difficulty: "intermediate",
      iconName: "Lightbulb",
      isPremium: true,
    },
    {
      title: "Closing Techniques",
      titleJa: "クロージングテクニック",
      category: "クロージング",
      description: "Various methods to effectively close a deal and secure customer commitment.",
      descriptionJa: "効果的に商談を成立させ、顧客のコミットメントを得るための様々な手法です。",
      goodExample: "It sounds like this solution addresses all your key concerns. Shall we discuss the implementation timeline?",
      goodExampleJa: "このソリューションがお客様の主要な懸念事項すべてに対応しているようですね。導入スケジュールについて話し合いましょうか？",
      badExample: "So, are you going to buy or not?",
      badExampleJa: "では、購入されますか、されませんか？",
      tips: ["Use assumptive close naturally", "Summarize agreed benefits before closing", "Offer next steps, not pressure"],
      tipsJa: ["自然に仮定的クロージングを使う", "クロージング前に合意した利点を要約する", "プレッシャーではなく次のステップを提案する"],
      difficulty: "advanced",
      iconName: "Handshake",
      isPremium: true,
    },
  ];

  if (cardCount === 0) {
    for (const card of skillCardsData) {
      await storage.createSkillCard(card);
    }
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

  if (cardCount === 0 || scenarioCount === 0) {
    console.log("Seed data inserted successfully");
  }
}
