import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import OpenAI from "openai";
import { seedDatabase } from "./seed";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function withOrgSeatLock<T>(orgId: number, fn: (tx: typeof db) => Promise<T>): Promise<T> {
  const lockId = 100000 + orgId;
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);
    return await fn(tx);
  });
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sub = await storage.getSubscription(userId);
      res.json(sub || { plan: "free", status: "active" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.get("/api/skill-cards", isAuthenticated, async (req, res) => {
    try {
      const cards = await storage.getAllSkillCards();
      res.json(cards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch skill cards" });
    }
  });

  app.get("/api/scenarios", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scenarios = await storage.getScenarios(userId);
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scenarios" });
    }
  });

  app.post("/api/roleplay/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { mode, config } = req.body;

      let systemMessage = "";

      if (mode === "personality") {
        const personalityDescriptions: Record<string, string> = {
          cautious: `慎重型：決断に時間がかかり、リスクを非常に気にする。
- 口癖:「それは分かるんですが、万が一○○になった場合は？」「他社さんでの実績はありますか？」
- 行動パターン: 一つ質問に答えるとさらに深堀りの質問をしてくる。導入事例・保証・サポート体制の詳細を求める。
- 反応の変化: 具体的なデータや事例を示されると少し安心する。「ちなみに」と言って核心的な質問をすることが多い。急かされると即座に防御に入る。`,
          decisive: `即決型：スピード感を重視し、結論ファーストで話を聞きたい。
- 口癖:「で、結局いくらで何ができるの？」「前置きはいいから本題に入ってもらえますか」
- 行動パターン: 3分以内に興味を引けなければ会議を切り上げようとする。メリットが明確なら「じゃあ来週から始められる？」と即座に動く。
- 反応の変化: 簡潔で的を射た説明には好意的。曖昧な回答や「確認して後日」には苛立つ。競合との差別化ポイントを端的に聞きたがる。`,
          analytical: `分析型：論理的思考を好み、裏付けデータなしには動かない。
- 口癖:「それを裏付けるデータはありますか？」「ROIで考えると何ヶ月で回収できますか？」
- 行動パターン: 事前に競合製品を調査済みで比較表を持っている。感情的なアピールには「それはいいとして、数字を見せてください」と冷たく返す。
- 反応の変化: 具体的な数値（導入企業での○%改善、○ヶ月でROI達成等）を示されると興味を示す。逆に数字の根拠が曖昧だと信頼を失う。`,
          friendly: `友好型：人間関係を大切にし、雰囲気の良い商談を好む。
- 口癖:「それいいですね！」「うちのチームにも合いそう」「ところで、御社の方は趣味とかあります？」
- 行動パターン: にこやかに話を聞くが、実は本音を言わない。「いいですね」と言いながら内心では別の懸念を持っている。雑談が長くなりがち。
- 反応の変化: 信頼関係ができると「実は正直に言うと...」と本音を漏らす。逆に事務的な対応をされると表面的なやり取りに終始する。YESと言っても実はNOの場合がある。`,
          skeptical: `懐疑型：営業の言うことを基本的に信じない。自分で調べた情報を持っている。
- 口癖:「御社のサイトにはこう書いてあったけど、実際はどうなんですか？」「それ、他社も同じこと言ってましたよ」
- 行動パターン: 営業のトークの矛盾や誇張を見つけると即座に指摘する。競合の情報をすでに収集済みで比較してくる。「本当のところ」を知りたがる。
- 反応の変化: 正直にデメリットも伝える営業には好感を持つ。逆に良いことばかり言う営業は一層疑う。具体的な顧客の声や裏側の話に興味を示す。`,
          busy: `多忙型：常にスケジュールが詰まっていて時間がない。
- 口癖:「あと5分しかないんで手短にお願いします」「それ、資料にまとめて送ってもらえますか？」
- 行動パターン: 会議中にスマホをチラチラ見る。話が長いと「ちょっと次の予定がありまして」と切り上げようとする。ただし、自社の課題にピンポイントで刺さる話には急に集中する。
- 反応の変化: 短い時間で核心を突ける営業には「もう少し聞かせてください」と時間を延長する。逆に前置きが長いと「じゃあ資料だけ送ってください」で終わる。`,
        };

        const personalityType = config.personalityType || "cautious";
        const product = config.product || "不明な商品";
        const goal = config.goal || "商談成立";
        const difficulty = config.difficulty || "medium";

        const difficultyInstructions: Record<string, string> = {
          easy: `難易度: 初級（協力的な顧客）
- 営業担当の提案に興味を示し、前向きに話を聞いてください
- 質問は素直で、反論はほとんどしません
- 営業担当が詰まった時はヒントを出してあげてください
- 比較的簡単に情報を共有し、課題やニーズを率直に話してください`,
          medium: `難易度: 中級（標準的な顧客）
- 適度に質問や反論をしてください
- 価格やROIについて合理的な質問をしてください
- 競合との比較や導入リスクについて確認してください
- すぐには決断せず、検討する姿勢を見せてください`,
          hard: `難易度: 上級（厳しい顧客）
- 積極的に反論し、営業担当の論理の穴を突いてください
- 競合情報を持ち出し、価格交渉を厳しく行ってください
- 予想外の質問や条件を突きつけてください
- 簡単には納得せず、具体的な根拠やデータを要求してください
- 時には話題を逸らしたり、別の課題を持ち出したりしてください`,
        };

        systemMessage = `あなたは営業ロープレの顧客役です。以下の設定に基づいて、実在するBtoB商談の顧客のようにリアルに振る舞ってください。

性格タイプ:
${personalityDescriptions[personalityType] || personalityDescriptions.cautious}

${difficultyInstructions[difficulty] || difficultyInstructions.medium}

営業担当が提案する商品/サービス: ${product}
営業担当のゴール: ${goal}

演技ルール:
- 日本語で会話してください
- 性格タイプの口癖や行動パターンを実際に使ってください
- 自分の会社名・業種・従業員数・現在使っている競合製品名など、具体的な設定を自分で作り、一貫して使ってください
- 具体的な数字を交えて話してください（「月間○件の問い合わせ」「年間○○万円のコスト」「○名の部署」等）
- 同じフレーズの繰り返しは絶対に避け、毎回異なる反応・表現をしてください
- 営業の対応が良ければ態度を軟化させ、不十分なら態度を硬化させてください。態度の変化を明確に表現してください
- 最初の挨拶から始めてください。挨拶は性格タイプに合った口調で。
- 2-4文程度で応答してください。短すぎる1文だけの返答は避けてください
- 顧客の名前・役職・会社情報は最初の発言で自然に設定してください`;

      } else if (mode === "custom") {
        const myCompany = config.myCompany || "";
        const theirCompany = config.theirCompany || "";
        const relationship = config.relationship || "";
        const phase = config.phase || "";
        const product = config.product || "";
        const additionalInfo = config.additionalInfo || "";
        const customDifficulty = config.difficulty || "medium";

        const customDifficultyInstructions: Record<string, string> = {
          easy: `難易度: 初級（協力的な顧客）
- 前向きに話を聞き、課題やニーズを率直に共有してください
- 反論はほとんどせず、営業担当が詰まった時はヒントを出してください`,
          medium: `難易度: 中級（標準的な顧客）
- 適度に質問や反論をし、価格やROIについて合理的に確認してください
- すぐには決断せず、検討する姿勢を見せてください`,
          hard: `難易度: 上級（厳しい顧客）
- 積極的に反論し、論理の穴を突いてください
- 競合情報を持ち出し、予想外の条件を突きつけてください
- 簡単には納得せず、具体的な根拠やデータを要求してください`,
        };

        systemMessage = `あなたは営業ロープレの顧客役です。以下の詳細設定に基づいて、実在するBtoB商談の顧客のようにリアルに振る舞ってください。

営業側の会社情報: ${myCompany}
顧客側の会社情報: ${theirCompany}
これまでの関係性: ${relationship}
今回の商談フェーズ: ${phase}
提案する商品/サービス: ${product}
その他の情報: ${additionalInfo}

${customDifficultyInstructions[customDifficulty] || customDifficultyInstructions.medium}

演技ルール:
- 日本語で会話してください
- 上記の情報を総合的に判断し、適切な人格・態度・反応パターンを自分で決定してください
- 顧客側の会社の規模・業界特有の課題・社内力学（上司の意向、予算権限、過去の導入経験）を自分で具体的に設定し、一貫して使ってください
- 商談フェーズに応じた適切な態度を取ってください（初期接触なら警戒と情報収集、提案段階なら具体的条件の確認、クロージングなら社内稟議の話題など）
- 具体的な数字を交えて話してください（「月間○件」「年間○○万円」「○名の部署」「○ヶ月前に」等）
- 同じフレーズの繰り返しは絶対に避け、毎回異なる反応・表現をしてください
- 営業の対応が良ければ態度を軟化させ、不十分なら態度を硬化させてください
- 2-4文程度で応答してください。短すぎる1文だけの返答は避けてください
- 顧客の名前・役職は設定から推測して自然に設定してください`;

      } else {
        return res.status(400).json({ message: "Invalid mode" });
      }

      const initialResponse = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: "商談を開始してください。顧客として最初の挨拶をしてください。" },
        ],
        max_completion_tokens: 512,
      });

      const assistantGreeting = initialResponse.choices[0]?.message?.content || "こんにちは。本日はお時間をいただきありがとうございます。";

      const messages = [
        { role: "system", content: systemMessage },
        { role: "assistant", content: assistantGreeting },
      ];

      const session = await storage.createSession({
        userId,
        mode,
        config,
        messages: messages,
      });

      await storage.createProgress({
        userId,
        activityType: "roleplay",
      });

      res.json({ sessionId: session.id, messages });
    } catch (error) {
      console.error("Error starting roleplay:", error);
      res.status(500).json({ message: "Failed to start roleplay session" });
    }
  });

  app.post("/api/roleplay/custom-prepare", isAuthenticated, async (req: any, res) => {
    try {
      const { config } = req.body;

      const prompt = `以下の商談設定情報を確認し、ロープレを開始するにあたって不足している情報や確認したい点があれば、質問してください。十分な情報がある場合は「準備完了」と回答してください。

営業側の会社情報: ${config.myCompany || "未入力"}
顧客側の会社情報: ${config.theirCompany || "未入力"}
これまでの関係性: ${config.relationship || "未入力"}
今回の商談フェーズ: ${config.phase || "未入力"}
提案する商品/サービス: ${config.product || "未入力"}
その他の情報: ${config.additionalInfo || "未入力"}

日本語で質問してください。質問は最大3つまでにし、JSON形式で回答してください:
{
  "ready": true/false,
  "questions": ["質問1", "質問2"] // readyがfalseの場合のみ
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 512,
        response_format: { type: "json_object" },
      });

      const resultText = response.choices[0]?.message?.content || '{"ready": true, "questions": []}';
      let result;
      try {
        result = JSON.parse(resultText);
      } catch {
        result = { ready: true, questions: [] };
      }

      res.json(result);
    } catch (error) {
      console.error("Error in custom prepare:", error);
      res.status(500).json({ message: "Failed to prepare custom roleplay" });
    }
  });

  app.post("/api/roleplay/message", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, message } = req.body;

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const msgs = session.messages as any[];
      msgs.push({ role: "user", content: message });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: msgs,
        stream: true,
        max_completion_tokens: 512,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      msgs.push({ role: "assistant", content: fullResponse });
      await storage.updateSession(sessionId, { messages: msgs });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in roleplay message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "Failed to process message" });
      }
    }
  });

  app.post("/api/roleplay/end", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.body;

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const recentStudyLogs = await storage.getRecentStudyLogs(userId, 14);
      let recentStudyContext = "";
      if (recentStudyLogs.length > 0) {
        const studiedCardIds = Array.from(new Set(recentStudyLogs.map(l => l.skillCardId)));
        const studiedCards = await storage.getSkillCardsByIds(studiedCardIds);
        if (studiedCards.length > 0) {
          recentStudyContext = `\n\n直近2週間でこのユーザーが学習したスキルカード:\n${studiedCards.map(c => `- ${c.titleJa}（${c.category}）: ${c.descriptionJa?.slice(0, 60) || ""}`).join("\n")}\n\n上記の学習内容を踏まえて、学んだスキルが実践できているかどうかも評価に含めてください。`;
        }
      }

      const msgs = session.messages as any[];
      const conversationText = msgs
        .filter((m: any) => m.role !== "system")
        .map((m: any) => `${m.role === "user" ? "営業担当" : "顧客"}: ${m.content}`)
        .join("\n");

      const analysisPrompt = `あなたは20年以上のBtoB営業経験を持つベテラン営業マネージャーです。以下のロープレ会話を詳細に分析し、具体的なフィードバックを提供してください。

【会話内容】
${conversationText}
${recentStudyContext}

分析ルール:
1. strengths/weaknessesでは、必ず実際の会話から具体的な発言を「」で引用してください
2. feedbackJaでは「○○の場面で○○と言ったのは効果的だった」「○○の質問に対して○○と答えたのは改善の余地がある」のように具体的な場面に言及してください
3. weaknessesには「こう言えばよかった」という代替の発言例を必ず含めてください
4. 各スコアは実際の会話の内容に基づいて厳密に評価してください。お世辞は不要です

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "listening": 0-100の数値（顧客の発言をきちんと拾えているか、オウム返しや要約ができているか）,
  "questioning": 0-100の数値（効果的なオープン/クローズド質問を使い分けているか、深堀りできているか）,
  "empathy": 0-100の数値（顧客の感情や立場に寄り添った発言があるか、共感の言葉を適切に使えているか）,
  "closing": 0-100の数値（次のアクションの提案、合意形成、時間軸の設定ができているか）,
  "overallScore": 0-100の数値（総合的な商談力）,
  "feedback": "English feedback summary",
  "feedbackJa": "具体的な場面に言及した日本語フィードバック（3-4文。実際の発言を引用）",
  "strengths": ["実際の発言を「」で引用した具体的な強み1", "具体的な強み2"],
  "weaknesses": ["実際の場面を指摘し代替発言例を含む改善点1", "代替発言例を含む改善点2"]
}`;

      const analysis = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "user", content: analysisPrompt },
        ],
        max_completion_tokens: 1536,
        response_format: { type: "json_object" },
      });

      const resultText = analysis.choices[0]?.message?.content || "{}";
      let result;
      try {
        result = JSON.parse(resultText);
      } catch {
        result = {
          listening: 50, questioning: 50, empathy: 50, closing: 50,
          overallScore: 50, feedback: "Analysis failed", feedbackJa: "分析に失敗しました",
          strengths: [], weaknesses: [],
        };
      }

      await storage.updateSession(sessionId, {
        feedback: result,
        score: result.overallScore,
        completedAt: new Date(),
      });

      const diagnosis = await storage.createDiagnosis({
        userId,
        sessionId,
        listening: result.listening ?? 50,
        questioning: result.questioning ?? 50,
        empathy: result.empathy ?? 50,
        closing: result.closing ?? 50,
        overallScore: result.overallScore ?? 50,
        feedback: result.feedback,
        feedbackJa: result.feedbackJa,
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
      });

      const userOrgId = await storage.getUserOrgId(userId);
      await storage.createPracticeLog({
        orgId: userOrgId,
        userId,
        sessionId,
        score: result.overallScore ?? 50,
        listening: result.listening ?? 50,
        questioning: result.questioning ?? 50,
        empathy: result.empathy ?? 50,
        closing: result.closing ?? 50,
        practiceType: "roleplay",
      });

      res.json(diagnosis);
    } catch (error) {
      console.error("Error ending roleplay:", error);
      res.status(500).json({ message: "Failed to end roleplay session" });
    }
  });

  app.get("/api/diagnosis/latest", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const diagnosis = await storage.getLatestDiagnosis(userId);
      res.json(diagnosis || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch diagnosis" });
    }
  });

  app.get("/api/diagnosis/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getDiagnosisHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch diagnosis history" });
    }
  });

  app.get("/api/progress/recent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getRecentProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post("/api/feedback/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId } = req.body;

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      if (!session.feedback) return res.status(400).json({ message: "Session not completed" });

      const feedback = session.feedback as any;
      const msgs = session.messages as any[];
      const conversationText = msgs
        .filter((m: any) => m.role !== "system")
        .map((m: any) => `${m.role === "user" ? "営業担当" : "顧客"}: ${m.content}`)
        .join("\n");

      const recentLogs = await storage.getRecentStudyLogs(userId, 14);
      let studyContext = "";
      if (recentLogs.length > 0) {
        const cardIds = Array.from(new Set(recentLogs.map(l => l.skillCardId)));
        const studiedCards = await storage.getSkillCardsByIds(cardIds);
        if (studiedCards.length > 0) {
          studyContext = `\n\nこのユーザーが直近2週間で学習したスキルカード:\n${studiedCards.map(c => `- ${c.titleJa}（${c.category}）`).join("\n")}\n上記のスキルの活用度についてもフィードバックに含めてください。`;
        }
      }

      const systemPrompt = `あなたは元トップセールス出身の営業コーチです。15年間で3000件以上の商談経験を持ち、現在は営業組織のトレーニングを専門としています。以下のロープレの会話と評価結果を踏まえ、ユーザーと対話形式で実践的なフィードバックを行ってください。

【実際の会話内容】
${conversationText}

【評価結果】
- 傾聴力: ${feedback.listening ?? 50}/100
- 質問力: ${feedback.questioning ?? 50}/100
- 共感力: ${feedback.empathy ?? 50}/100
- クロージング力: ${feedback.closing ?? 50}/100
- 総合スコア: ${feedback.overallScore ?? 50}/100
- 強み: ${(feedback.strengths || []).length > 0 ? (feedback.strengths || []).join("、") : "（会話内容から判断してください）"}
- 改善点: ${(feedback.weaknesses || []).length > 0 ? (feedback.weaknesses || []).join("、") : "（会話内容から判断してください）"}
${studyContext}

コーチングルール:
- 日本語で会話してください
- 最初のメッセージでは：
  1. まず一番印象的だった場面（良い点）を実際の発言を「」で引用して褒めてください
  2. 次に最も改善インパクトが大きいポイントを1-2個、「あの場面ではこう言ってみてください：『具体的な代替発言例』」という形で提案してください
  3. 関連する営業フレームワーク（SPIN、BANT、チャレンジャーセール、MEDDIC等）を1つ紹介し、この会話のどこで使えたかを説明してください
- フォローアップの会話では：
  - ユーザーの質問に対し、実際の会話の場面を引用しながら回答してください
  - 「次にこう聞いてみてください」「この場面ではこう切り返すと効果的です」のような具体的な発言例を必ず含めてください
  - 抽象的なアドバイス（「傾聴力を高めましょう」等）ではなく、すぐに使えるフレーズやテクニックを教えてください
- 4-6文程度で応答してください`;

      const initialAnalysis = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "今のロープレの結果を振り返ってください。特に良かった点と、具体的にどう改善できるかを教えてください。" },
        ],
        max_completion_tokens: 1536,
      });

      const coachMessage = initialAnalysis.choices[0]?.message?.content || "フィードバックの生成に失敗しました。";

      const skillCardAnalysisPrompt = `以下の営業ロープレの改善点を踏まえ、学習すべき営業スキルや心理学的概念を2-3個提案してください。

改善点: ${(feedback.weaknesses || []).join("、")}
会話概要: ${conversationText.slice(0, 500)}

以下のJSON形式で回答してください。全てのフィールドを日本語で詳しく記入してください:
{
  "skills": [
    {
      "titleJa": "スキル名（日本語）",
      "title": "Skill Name (English)",
      "category": "カテゴリ（ヒアリング/ラポール構築/提案/クロージング/心理学/交渉術のいずれか）",
      "descriptionJa": "このスキルの説明（2-3文）",
      "description": "Description in English",
      "goodExampleJa": "良い例（具体的な会話例）",
      "goodExample": "Good example in English",
      "badExampleJa": "悪い例（具体的な会話例）",
      "badExample": "Bad example in English",
      "tipsJa": ["コツ1", "コツ2", "コツ3"],
      "tips": ["Tip 1", "Tip 2", "Tip 3"],
      "whyEffectiveJa": "なぜこの技術が効果的なのか（心理学的・行動科学的な裏付け、2-3文）",
      "whyEffective": "Why effective in English",
      "mechanismJa": "このスキルがどう作用するか（メカニズム解説、2-3文）",
      "mechanism": "Mechanism in English",
      "usageScenarioJa": "商談のどの場面で使うか（具体的な活用シーン）",
      "usageScenario": "Usage scenario in English",
      "failurePatternsJa": ["よくある失敗パターン1", "失敗パターン2", "失敗パターン3"],
      "failurePatterns": ["Failure 1", "Failure 2", "Failure 3"],
      "checklistJa": ["商談前チェック1", "チェック2", "チェック3"],
      "checklist": ["Check 1", "Check 2", "Check 3"],
      "successStoryJa": "この技術を使った成功事例（具体的な数値を含む、2-3文）",
      "successStory": "Success story in English",
      "difficulty": "beginner/intermediate/advanced"
    }
  ]
}`;

      const skillAnalysis = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: skillCardAnalysisPrompt }],
        max_completion_tokens: 2048,
        response_format: { type: "json_object" },
      });

      let generatedCards: any[] = [];
      try {
        const skillResult = JSON.parse(skillAnalysis.choices[0]?.message?.content || '{"skills":[]}');
        const skills = skillResult.skills || [];

        for (const skill of skills) {
          const existing = await storage.getSkillCardByTitleJa(skill.titleJa);
          if (!existing) {
            const card = await storage.createSkillCard({
              title: skill.title || skill.titleJa,
              titleJa: skill.titleJa,
              category: skill.category || "その他",
              description: skill.description || skill.descriptionJa,
              descriptionJa: skill.descriptionJa,
              goodExample: skill.goodExample || skill.goodExampleJa,
              goodExampleJa: skill.goodExampleJa,
              badExample: skill.badExample || skill.badExampleJa,
              badExampleJa: skill.badExampleJa,
              tips: skill.tips || skill.tipsJa || [],
              tipsJa: skill.tipsJa || [],
              whyEffective: skill.whyEffective || null,
              whyEffectiveJa: skill.whyEffectiveJa || null,
              mechanism: skill.mechanism || null,
              mechanismJa: skill.mechanismJa || null,
              usageScenario: skill.usageScenario || null,
              usageScenarioJa: skill.usageScenarioJa || null,
              failurePatterns: skill.failurePatterns || null,
              failurePatternsJa: skill.failurePatternsJa || null,
              checklist: skill.checklist || null,
              checklistJa: skill.checklistJa || null,
              successStory: skill.successStory || null,
              successStoryJa: skill.successStoryJa || null,
              difficulty: skill.difficulty || "intermediate",
              iconName: "Sparkles",
              isPremium: false,
              isAiGenerated: true,
              sourceSessionId: sessionId,
            });
            generatedCards.push(card);
          } else {
            generatedCards.push(existing);
          }
        }
      } catch (e) {
        console.error("Error generating skill cards:", e);
      }

      const feedbackChatMessages = [
        { role: "system", content: systemPrompt },
        { role: "assistant", content: coachMessage },
      ];

      await storage.updateSession(sessionId, { feedbackChatMessages });

      res.json({
        message: coachMessage,
        generatedCards,
        diagnosis: feedback,
      });
    } catch (error) {
      console.error("Error starting feedback:", error);
      res.status(500).json({ message: "Failed to start feedback" });
    }
  });

  app.post("/api/feedback/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { sessionId, message } = req.body;

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      if (session.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const chatMessages = (session.feedbackChatMessages as any[]) || [];
      chatMessages.push({ role: "user", content: message });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 1536,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      chatMessages.push({ role: "assistant", content: fullResponse });
      await storage.updateSession(sessionId, { feedbackChatMessages: chatMessages });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in feedback chat:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "Failed to process feedback message" });
      }
    }
  });

  app.get("/api/study-logs/today", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const logs = await storage.getTodayStudyLogs(userId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's study logs" });
    }
  });

  app.get("/api/study-logs/recent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const days = parseInt(req.query.days as string) || 30;
      const logs = await storage.getRecentStudyLogs(userId, days);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent study logs" });
    }
  });

  app.post("/api/study-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { skillCardId } = req.body;
      if (!skillCardId) return res.status(400).json({ message: "skillCardId is required" });

      const alreadyStudied = await storage.hasStudiedToday(userId, skillCardId);
      if (alreadyStudied) {
        return res.json({ alreadyStudied: true, message: "Already studied today" });
      }

      const log = await storage.createStudyLog(userId, skillCardId);

      await storage.createProgress({
        userId,
        skillCardId,
        activityType: "skill_study",
      });

      res.json({ alreadyStudied: false, log });
    } catch (error) {
      res.status(500).json({ message: "Failed to create study log" });
    }
  });

  app.post("/api/skill-cards/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const skillCardId = parseInt(req.params.id);
      const progress = await storage.markSkillCompleted(userId, skillCardId);

      await storage.createProgress({
        userId,
        skillCardId,
        activityType: "skill_card",
      });

      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark skill as completed" });
    }
  });

  app.get("/api/skill-progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserSkillProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch skill progress" });
    }
  });

  app.get("/api/recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const latestDiagnosis = await storage.getLatestDiagnosis(userId);
      if (!latestDiagnosis) {
        return res.json({ cards: [], reason: "まだ診断結果がありません。ロープレを試してみましょう。" });
      }

      const allCards = await storage.getAllSkillCards();
      const weaknesses = latestDiagnosis.weaknesses || [];
      const feedbackJa = latestDiagnosis.feedbackJa || "";

      const prompt = `以下の営業スキル診断結果と、利用可能なスキルカード一覧から、このユーザーに最も関連性の高いスキルカードを最大5つ選んでください。

診断結果:
- 傾聴力: ${latestDiagnosis.listening}/100
- 質問力: ${latestDiagnosis.questioning}/100
- 共感力: ${latestDiagnosis.empathy}/100
- クロージング力: ${latestDiagnosis.closing}/100
- 改善点: ${weaknesses.join("、")}
- フィードバック: ${feedbackJa}

利用可能なスキルカード:
${allCards.map(c => `ID:${c.id} - ${c.titleJa}（${c.category}）`).join("\n")}

JSON形式で回答してください:
{
  "cardIds": [1, 2, 3],
  "reason": "おすすめの理由（日本語1-2文）"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 512,
        response_format: { type: "json_object" },
      });

      let result;
      try {
        result = JSON.parse(response.choices[0]?.message?.content || '{}');
      } catch {
        result = { cardIds: [], reason: "おすすめを生成できませんでした。" };
      }

      const recommendedCards = await storage.getSkillCardsByIds(result.cardIds || []);

      res.json({
        cards: recommendedCards,
        reason: result.reason || "",
      });
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ message: "Failed to get recommendations" });
    }
  });

  app.post("/api/skill-cards/:id/practice/start", isAuthenticated, async (req: any, res) => {
    try {
      const cardId = parseInt(req.params.id);
      const card = await storage.getSkillCard(cardId);
      if (!card) {
        return res.status(404).json({ message: "Skill card not found" });
      }

      const prompt = `あなたは営業トレーニング用のシナリオ作成者です。「${card.titleJa}」（${card.category}）を練習するBtoB商談シナリオを作ってください。スキル説明: ${card.descriptionJa}。業種は製造業・IT・小売・医療・建設・物流・金融・教育・飲食からランダムに選んでください。以下のJSON形式で回答してください。{"scenario":"商談背景（業種・会社名・規模・課題を3文で）","salesRole":"営業の役割と会社名","meetingGoal":"商談の目的","customerName":"顧客の名前と役職","customerRole":"顧客の会社と役職詳細","customerPersonality":"顧客の性格","hiddenConcerns":"顧客の隠れた懸念"}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const rawContent = response.choices[0]?.message?.content || '{}';
      console.log("[practice/start] AI raw response:", rawContent.slice(0, 500));
      let result;
      try {
        const parsed = JSON.parse(rawContent);
        result = {
          scenario: parsed.scenario || `${card.titleJa}を実践する商談場面です。`,
          salesRole: parsed.salesRole || "ITソリューションベンダーの法人営業担当",
          meetingGoal: parsed.meetingGoal || "初回ヒアリング。顧客の課題を把握し、次回の提案に繋げる。",
          customerName: parsed.customerName || "田中部長",
          customerRole: parsed.customerRole || "中堅企業の情報システム部長",
          customerPersonality: parsed.customerPersonality || "慎重で実績を重視するタイプ",
          hiddenConcerns: parsed.hiddenConcerns || "予算が限られている",
          skillName: card.titleJa,
        };
      } catch {
        result = {
          scenario: `従業員250名の食品加工メーカー・丸善食品株式会社。製造ラインの品質管理に課題を抱えており、不良品率が業界平均の1.5倍。前任のシステム担当が退職し、現在は現場リーダーが兼任で対応中。`,
          salesRole: "製造業向けIoTソリューションを提供するテクノバンス社の法人営業担当",
          meetingGoal: "初回ヒアリング。製造ラインの課題を具体的に把握し、IoTモニタリングの提案に繋げる。",
          customerName: "鈴木製造部長",
          customerRole: "従業員250名の食品加工メーカー・丸善食品の製造部長",
          customerPersonality: "現場叩き上げで理論より実践を重視、ITに苦手意識がある",
          hiddenConcerns: "実は来期の予算が既に他のプロジェクトで使われそうで、稟議が通るか不安",
          skillName: card.titleJa,
        };
      }

      res.json(result);
    } catch (error) {
      console.error("Error starting practice:", error);
      res.status(500).json({ message: "練習の開始に失敗しました" });
    }
  });

  app.post("/api/skill-cards/:id/practice/quiz", isAuthenticated, async (req: any, res) => {
    try {
      const cardId = parseInt(req.params.id);
      const { scenario, customerName, customerRole, customerPersonality, hiddenConcerns, questionNumber, previousSituations } = req.body;

      const card = await storage.getSkillCard(cardId);
      if (!card) {
        return res.status(404).json({ message: "Skill card not found" });
      }

      const qNum = parseInt(questionNumber) || 1;
      const prevSits = Array.isArray(previousSituations) ? previousSituations.join('、') : '';

      const prompt = `あなたは営業トレーニングの出題者です。「${card.titleJa}」のスキルを問う選択式問題を1問作ってください。スキル説明: ${card.descriptionJa}。ヒント: ${(card.tipsJa || []).slice(0, 2).join('、')}。シナリオ: ${scenario}。顧客: ${customerName}（${customerRole}）、性格: ${customerPersonality}。${prevSits ? `既出の状況（重複しないでください）: ${prevSits}。` : ''}問題${qNum}/5。商談中の具体的な場面で、顧客が発言した後に営業としてどう対応すべきかを問う問題を作ってください。

【重要】選択肢のtextは「営業の対応方針」を「〜する」で終わる簡潔な文で書いてください。台詞（「〜ですよね」「〜しませんか？」）は書かないでください。です/ます調や「である」も使わないでください。
良い例: 「顧客の懸念を受け止め、同業種での導入実績とROIデータを提示したうえで、小規模パイロットの実施を提案する」
良い例: 「まず現場の具体的な課題をヒアリングし、優先度を整理してから解決策を提示する」
良い例: 「価格交渉には応じず、自社製品の全機能を一方的に説明する」
悪い例: 「〜を提案するである」「〜を急ぐである」（「である」は付けない）
悪い例: 「まずは顧客の懸念を受け止め、共感を示します」（です/ます調は使わない）
悪い例: 「それは大変ですね。具体的にどのような場面でお困りですか？」（台詞は書かない）

explanationも「〜ため。」「〜から。」で終わる簡潔な文にしてください。「である」は使わないでください。

以下のJSON形式で回答してください。{"situation":"商談中の具体的な場面説明（1文）","customerStatement":"顧客の発言（1-2文、自然な口語）","choices":[{"text":"対応方針A（「〜する」で終わる1-2文）","isCorrect":false,"explanation":"なぜこの対応が適切/不適切か"},{"text":"対応方針B","isCorrect":true,"explanation":"理由"},{"text":"対応方針C","isCorrect":false,"explanation":"理由"},{"text":"対応方針D","isCorrect":false,"explanation":"理由"}]}。正解は1つだけにしてください。不正解の選択肢は、よくある間違い（一方的な売り込み、顧客の言葉を無視、唐突な提案など）にしてください。`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const rawContent = response.choices[0]?.message?.content || '{}';
      console.log(`[practice/quiz] Q${qNum} AI raw response:`, rawContent.slice(0, 500));

      let question;
      try {
        const parsed = JSON.parse(rawContent);
        let choices: { text: string; isCorrect: boolean; explanation: string }[] = Array.isArray(parsed.choices) ? parsed.choices.map((c: any) => ({
          text: c.text || "",
          isCorrect: c.isCorrect === true,
          explanation: c.explanation || "",
        })) : [];

        const correctCount = choices.filter(c => c.isCorrect).length;
        if (correctCount > 1) {
          let foundFirst = false;
          choices = choices.map(c => {
            if (c.isCorrect && !foundFirst) { foundFirst = true; return c; }
            if (c.isCorrect) return { ...c, isCorrect: false };
            return c;
          });
        }
        if (correctCount === 0 && choices.length > 0) {
          choices[0].isCorrect = true;
        }

        if (choices.length > 4) choices = choices.slice(0, 4);
        while (choices.length < 4) {
          choices.push({ text: "特に対応を変えず、用意した提案資料の説明を続ける", isCorrect: false, explanation: "顧客の発言を無視して一方的に進めるため、信頼関係を損なう可能性がある。" });
        }

        question = {
          situation: parsed.situation || "商談の序盤、顧客が課題について話し始めた場面",
          customerStatement: parsed.customerStatement || "正直なところ、今のやり方でもなんとかなっているんですよね。",
          choices,
          questionNumber: qNum,
          correctIndex: choices.findIndex(c => c.isCorrect),
        };
      } catch {
        question = {
          situation: "商談の序盤、顧客が現状の課題について話し始めた場面",
          customerStatement: "正直なところ、今のやり方でもなんとかなっているんですよね。",
          choices: [
            { text: "現在のやり方で上手くいっている部分を具体的にヒアリングし、顧客の現状認識を深掘りする", isCorrect: true, explanation: "顧客を否定せず現状を理解しようとする姿勢が信頼構築につながるため。" },
            { text: "現状維持のリスクを強調し、早急な対応の必要性を訴える", isCorrect: false, explanation: "顧客の判断を否定する形になり、防御的な反応を引き出してしまうため。" },
            { text: "この顧客は見込みが薄いと判断し、他の担当者へのアプローチに切り替える", isCorrect: false, explanation: "顧客を軽視している印象を与え、関係悪化につながるため。" },
            { text: "顧客の発言を遮り、自社の導入事例と実績データを一方的に提示する", isCorrect: false, explanation: "顧客の状況を理解する前に事例を押し付けるのは逆効果であるため。" },
          ],
          questionNumber: qNum,
          correctIndex: 0,
        };
      }

      res.json(question);
    } catch (error) {
      console.error("Error generating quiz question:", error);
      res.status(500).json({ message: "問題の生成に失敗しました" });
    }
  });

  app.post("/api/skill-cards/:id/practice/evaluate", isAuthenticated, async (req: any, res) => {
    try {
      const cardId = parseInt(req.params.id);
      const { answers, scenario } = req.body;
      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: "回答データが必要です" });
      }

      const card = await storage.getSkillCard(cardId);
      if (!card) {
        return res.status(404).json({ message: "Skill card not found" });
      }

      if (answers.length < 1 || answers.length > 5) {
        return res.status(400).json({ message: "回答は1〜5問です" });
      }
      const correctCount = answers.filter((a: { selectedIndex: number; correctIndex: number }) =>
        typeof a.selectedIndex === 'number' && typeof a.correctIndex === 'number' && a.selectedIndex === a.correctIndex
      ).length;
      const totalQuestions = answers.length;
      const scorePercent = Math.round((correctCount / totalQuestions) * 100);

      const practiceUserId = req.user.claims.sub;
      const practiceOrgId = await storage.getUserOrgId(practiceUserId);
      await storage.createPracticeLog({
        orgId: practiceOrgId,
        userId: practiceUserId,
        skillCardId: cardId,
        score: scorePercent,
        practiceType: "skill_card",
      });

      res.json({
        correctCount,
        totalQuestions,
        scorePercent,
      });
    } catch (error) {
      console.error("Error evaluating practice:", error);
      res.status(500).json({ message: "評価の記録に失敗しました" });
    }
  });

  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      console.error("Error getting publishable key:", error);
      res.status(500).json({ message: "Failed to get publishable key" });
    }
  });

  app.get("/api/stripe/prices", async (_req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.list({ active: true, limit: 20 });
      const basicProduct = products.data.find((p) => p.metadata?.plan === "basic") ||
        products.data.find((p) => p.name === "DealCoach Basic");
      const proProduct = products.data.find((p) => p.metadata?.plan === "pro") ||
        products.data.find((p) => p.name === "DealCoach Pro");

      const prices = await stripe.prices.list({ active: true, limit: 20 });

      const findPrice = (productId: string, interval: "month" | "year") =>
        prices.data.find((p) => p.product === productId && p.recurring?.interval === interval);

      const result: Record<string, { monthlyPriceId: string | null; annualPriceId: string | null }> = {
        basic: { monthlyPriceId: null, annualPriceId: null },
        pro: { monthlyPriceId: null, annualPriceId: null },
      };

      if (basicProduct) {
        const monthly = findPrice(basicProduct.id, "month");
        const annual = findPrice(basicProduct.id, "year");
        result.basic = { monthlyPriceId: monthly?.id || null, annualPriceId: annual?.id || null };
      }
      if (proProduct) {
        const monthly = findPrice(proProduct.id, "month");
        const annual = findPrice(proProduct.id, "year");
        result.pro = { monthlyPriceId: monthly?.id || null, annualPriceId: annual?.id || null };
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching Stripe prices:", error);
      res.status(500).json({ message: "Failed to fetch prices" });
    }
  });

  app.post("/api/stripe/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { priceId, plan, billingCycle } = req.body;
      if (!priceId) return res.status(400).json({ message: "priceId required" });

      const stripe = await getUncachableStripeClient();
      let sub = await storage.getSubscription(userId);
      let customerId = sub?.stripeCustomerId;

      if (customerId) {
        try {
          await stripe.customers.retrieve(customerId);
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.code === "resource_missing") {
            customerId = null;
          } else {
            throw e;
          }
        }
      }

      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { userId },
        });
        customerId = customer.id;
        await storage.upsertSubscription({
          userId,
          plan: sub?.plan || "free",
          status: sub?.status || "active",
          stripeCustomerId: customerId,
          ...(sub?.billingCycle ? { billingCycle: sub.billingCycle } : {}),
        });
        sub = await storage.getSubscription(userId);
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}/pricing?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: { userId, plan: plan || "basic", billingCycle: billingCycle || "monthly" },
        subscription_data: {
          metadata: { userId, plan: plan || "basic", billingCycle: billingCycle || "monthly" },
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/portal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sub = await storage.getSubscription(userId);
      if (!sub?.stripeCustomerId) {
        return res.status(400).json({ message: "No active subscription" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${baseUrl}/pricing`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  app.post("/api/stripe/sync-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const sub = await storage.getSubscription(userId);
      if (!sub?.stripeCustomerId) {
        return res.json({ plan: "free", status: "active" });
      }

      const result = await db.execute(
        sql`SELECT * FROM stripe.subscriptions WHERE customer = ${sub.stripeCustomerId} AND status IN ('active', 'trialing') ORDER BY created DESC LIMIT 1`
      );
      const stripeSub = result.rows[0] as any;

      if (stripeSub) {
        let plan = "basic";
        let billingCycle = "monthly";

        if (stripeSub.metadata) {
          const meta = typeof stripeSub.metadata === 'string' ? JSON.parse(stripeSub.metadata) : stripeSub.metadata;
          if (meta.plan) plan = meta.plan;
          if (meta.billingCycle) billingCycle = meta.billingCycle;
        }

        if (plan === "basic") {
          try {
            const items = typeof stripeSub.items === 'string' ? JSON.parse(stripeSub.items) : stripeSub.items;
            const itemsData = items?.data || [];
            if (itemsData.length > 0) {
              const priceId = itemsData[0]?.price?.id || itemsData[0]?.plan?.id;
              if (priceId) {
                const priceMeta = itemsData[0]?.price?.metadata || itemsData[0]?.plan?.metadata;
                if (priceMeta) {
                  const pm = typeof priceMeta === 'string' ? JSON.parse(priceMeta) : priceMeta;
                  if (pm.plan) plan = pm.plan;
                  if (pm.billingCycle) billingCycle = pm.billingCycle;
                }
              }
            }
          } catch (e) {
            console.error("Error parsing items for plan detection:", e);
          }
        }

        const updated = await storage.upsertSubscription({
          userId,
          plan,
          billingCycle,
          status: stripeSub.status === "active" ? "active" : "inactive",
          stripeCustomerId: sub.stripeCustomerId,
          stripeSubscriptionId: stripeSub.id,
        });
        return res.json(updated);
      }

      res.json(sub);
    } catch (error) {
      console.error("Error syncing subscription:", error);
      res.status(500).json({ message: "Failed to sync subscription" });
    }
  });

  app.get("/api/calendar/scheduled", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { month } = req.query;
      if (!month) return res.status(400).json({ message: "month parameter required (YYYY-MM)" });
      const studies = await storage.getScheduledStudies(userId, month as string);
      res.json(studies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scheduled studies" });
    }
  });

  app.post("/api/calendar/schedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { skillCardId, scheduledDate } = req.body;
      if (!skillCardId || !scheduledDate) return res.status(400).json({ message: "skillCardId and scheduledDate required" });
      const study = await storage.createScheduledStudy(userId, skillCardId, scheduledDate);
      res.json(study);
    } catch (error) {
      res.status(500).json({ message: "Failed to schedule study" });
    }
  });

  app.delete("/api/calendar/schedule/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await storage.deleteScheduledStudy(id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete scheduled study" });
    }
  });

  app.get("/api/calendar/study-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { month } = req.query;
      if (!month) return res.status(400).json({ message: "month parameter required (YYYY-MM)" });
      const days = 90;
      const logs = await storage.getRecentStudyLogs(userId, days);
      const monthStr = month as string;
      const filtered = logs.filter(l => {
        const d = new Date(l.studiedAt!);
        const logMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return logMonth === monthStr;
      });
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch study logs" });
    }
  });

  // Organization endpoints

  app.post("/api/org", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "組織名を入力してください" });
      }
      const inviteCode = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const org = await storage.createOrganization({ name: name.trim(), createdBy: userId, inviteCode });
      await storage.addOrgMember({ orgId: org.id, userId, role: "admin" });

      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.list({ active: true, limit: 20 });
      const enterpriseProduct = products.data.find((p) => p.metadata?.plan === "enterprise") ||
        products.data.find((p) => p.name === "DealCoach Enterprise");

      if (enterpriseProduct) {
        const prices = await stripe.prices.list({ product: enterpriseProduct.id, active: true, limit: 5 });
        const monthlyPrice = prices.data.find((p) => p.recurring?.interval === "month");

        if (monthlyPrice) {
          const customer = await stripe.customers.create({
            metadata: { userId, orgId: String(org.id) },
            name: name.trim(),
          });

          await storage.updateOrganization(org.id, {
            stripeCustomerId: customer.id,
          });

          const baseUrl = `${req.protocol}://${req.get("host")}`;
          const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            payment_method_types: ["card"],
            line_items: [{ price: monthlyPrice.id, quantity: 1 }],
            mode: "subscription",
            success_url: `${baseUrl}/org/${org.id}/settings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/org?canceled=true`,
            metadata: { userId, orgId: String(org.id), plan: "enterprise" },
          });

          return res.json({ ...org, checkoutUrl: session.url });
        }
      }

      res.json(org);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "組織の作成に失敗しました" });
    }
  });

  app.post("/api/org/:id/checkout-success", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const { sessionId } = req.body;

      const role = await storage.getOrgMemberRole(orgId, userId);
      if (role !== "admin") return res.status(403).json({ message: "管理者のみ実行できます" });

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.metadata?.orgId !== String(orgId)) {
        return res.status(403).json({ message: "この決済セッションはこの組織に対応していません" });
      }
      if (session.metadata?.userId !== userId) {
        return res.status(403).json({ message: "この決済セッションの所有者ではありません" });
      }

      if (session.payment_status === "paid" && session.subscription) {
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;

        await storage.updateOrganization(orgId, {
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: "active",
          stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
        });

        const org = await storage.getOrganization(orgId);
        return res.json(org);
      }

      res.status(400).json({ message: "決済が完了していません" });
    } catch (error) {
      console.error("Error processing checkout success:", error);
      res.status(500).json({ message: "決済の確認に失敗しました" });
    }
  });

  app.get("/api/org", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgs = await storage.getUserOrganizations(userId);
      res.json(orgs);
    } catch (error) {
      res.status(500).json({ message: "組織の取得に失敗しました" });
    }
  });

  app.get("/api/org/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const role = await storage.getOrgMemberRole(orgId, userId);
      if (!role) return res.status(403).json({ message: "この組織のメンバーではありません" });
      const org = await storage.getOrganization(orgId);
      if (!org) return res.status(404).json({ message: "組織が見つかりません" });
      res.json({ ...org, role });
    } catch (error) {
      res.status(500).json({ message: "組織の取得に失敗しました" });
    }
  });

  app.post("/api/org/:id/invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const role = await storage.getOrgMemberRole(orgId, userId);
      if (role !== "admin") return res.status(403).json({ message: "管理者のみ招待できます" });
      const org = await storage.getOrganization(orgId);
      if (!org) return res.status(404).json({ message: "組織が見つかりません" });
      if (org.subscriptionStatus !== "active") {
        return res.status(400).json({ message: "法人プランが有効ではありません。決済を完了してください。" });
      }
      res.json({ inviteCode: org.inviteCode });
    } catch (error) {
      res.status(500).json({ message: "招待コードの取得に失敗しました" });
    }
  });

  app.post("/api/org/join/:code", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.params;
      const org = await storage.getOrganizationByInviteCode(code);
      if (!org) return res.status(404).json({ message: "招待コードが無効です" });

      const existingRole = await storage.getOrgMemberRole(org.id, userId);
      if (existingRole) return res.status(400).json({ message: "既にこの組織に参加しています" });

      if (org.subscriptionStatus !== "active" || !org.stripeSubscriptionId) {
        return res.status(400).json({ message: "この組織の法人プランが有効ではありません。管理者にお問い合わせください。" });
      }

      await withOrgSeatLock(org.id, async (tx) => {
        await storage.addOrgMember({ orgId: org.id, userId, role: "member" });

        try {
          const stripe = await getUncachableStripeClient();
          const newMemberCount = await storage.getOrgMemberCount(org.id);
          const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId!);

          await stripe.subscriptions.update(org.stripeSubscriptionId!, {
            items: [{
              id: subscription.items.data[0].id,
              quantity: newMemberCount,
            }],
            proration_behavior: "create_prorations",
          });
        } catch (stripeError) {
          console.error("Error updating Stripe seat count on join:", stripeError);
          await storage.removeOrgMember(org.id, userId);
          throw stripeError;
        }
      });

      res.json(org);
    } catch (error: any) {
      console.error("Error joining organization:", error);
      res.status(500).json({ message: "組織への参加に失敗しました" });
    }
  });

  app.get("/api/org/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const role = await storage.getOrgMemberRole(orgId, userId);
      if (!role) return res.status(403).json({ message: "この組織のメンバーではありません" });
      const members = await storage.getOrgMembers(orgId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "メンバーの取得に失敗しました" });
    }
  });

  app.patch("/api/org/:id/members/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const targetUserId = req.params.userId;
      const { role: newRole } = req.body;
      const currentRole = await storage.getOrgMemberRole(orgId, currentUserId);
      if (currentRole !== "admin") return res.status(403).json({ message: "管理者のみロールを変更できます" });
      if (!["admin", "member"].includes(newRole)) return res.status(400).json({ message: "無効なロールです" });
      const updated = await storage.updateOrgMemberRole(orgId, targetUserId, newRole);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "ロールの変更に失敗しました" });
    }
  });

  app.delete("/api/org/:id/members/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const targetUserId = req.params.userId;
      const currentRole = await storage.getOrgMemberRole(orgId, currentUserId);
      if (currentRole !== "admin" && currentUserId !== targetUserId) {
        return res.status(403).json({ message: "管理者のみメンバーを削除できます" });
      }

      const org = await storage.getOrganization(orgId);

      if (org?.stripeSubscriptionId && org.subscriptionStatus === "active") {
        const memberRole = await storage.getOrgMemberRole(orgId, targetUserId);
        await withOrgSeatLock(orgId, async (tx) => {
          await storage.removeOrgMember(orgId, targetUserId);

          try {
            const stripe = await getUncachableStripeClient();
            const memberCount = await storage.getOrgMemberCount(orgId);

            if (memberCount === 0) {
              await stripe.subscriptions.cancel(org.stripeSubscriptionId!);
              await storage.updateOrganization(orgId, { subscriptionStatus: "canceled" });
            } else {
              const subscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId!);
              await stripe.subscriptions.update(org.stripeSubscriptionId!, {
                items: [{
                  id: subscription.items.data[0].id,
                  quantity: memberCount,
                }],
                proration_behavior: "create_prorations",
              });
            }
          } catch (stripeError) {
            console.error("Error updating Stripe seat count on remove:", stripeError);
            await storage.addOrgMember({ orgId, userId: targetUserId, role: memberRole || "member" });
            throw stripeError;
          }
        });
      } else {
        await storage.removeOrgMember(orgId, targetUserId);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "メンバーの削除に失敗しました" });
    }
  });

  app.get("/api/org/:id/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const role = await storage.getOrgMemberRole(orgId, userId);
      if (role !== "admin") return res.status(403).json({ message: "管理者のみアクセスできます" });

      const members = await storage.getOrgMembers(orgId);
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      weekStartDate.setHours(0, 0, 0, 0);
      const weekStart = weekStartDate.toISOString().split("T")[0];

      const weeklyStats = await storage.getWeeklyPracticeStats(orgId, weekStart);
      const allLogs = await storage.getPracticeLogsByOrg(orgId, 200);
      const allCards = await storage.getAllSkillCards();

      const currentWeekCurriculum = await storage.getCurriculumByWeek(orgId, weekStart);

      const memberDashboard = members.map(member => {
        const memberStats = weeklyStats.find(s => s.userId === member.userId);
        const memberLogs = allLogs.filter(l => l.userId === member.userId);
        const latestLog = memberLogs[0];

        const completedCardIds = new Set(
          memberLogs.filter(l => l.skillCardId).map(l => l.skillCardId!)
        );
        const completionRate = allCards.length > 0
          ? Math.round((completedCardIds.size / allCards.length) * 100)
          : 0;

        const curriculumCompleted = currentWeekCurriculum.filter(c =>
          memberLogs.some(l =>
            l.skillCardId === c.skillCardId &&
            l.practicedAt && new Date(l.practicedAt) >= weekStartDate
          )
        ).length;

        return {
          userId: member.userId,
          displayName: member.displayName,
          email: member.email,
          role: member.role,
          weeklyPracticeCount: memberStats?.count || 0,
          avgScore: memberStats?.avgScore || 0,
          latestScore: latestLog?.score || null,
          latestListening: latestLog?.listening || null,
          latestQuestioning: latestLog?.questioning || null,
          latestEmpathy: latestLog?.empathy || null,
          latestClosing: latestLog?.closing || null,
          completionRate,
          curriculumTotal: currentWeekCurriculum.length,
          curriculumCompleted,
        };
      });

      const nonParticipants = memberDashboard.filter(m => m.weeklyPracticeCount === 0);

      res.json({
        members: memberDashboard,
        nonParticipants,
        weekStart,
        totalMembers: members.length,
        totalCards: allCards.length,
        curriculum: currentWeekCurriculum,
      });
    } catch (error) {
      console.error("Error fetching org dashboard:", error);
      res.status(500).json({ message: "ダッシュボードの取得に失敗しました" });
    }
  });

  app.get("/api/org/:id/practice-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const role = await storage.getOrgMemberRole(orgId, userId);
      if (!role) return res.status(403).json({ message: "この組織のメンバーではありません" });
      const logs = await storage.getPracticeLogsByOrg(orgId, 100);
      const members = await storage.getOrgMembers(orgId);
      const cards = await storage.getAllSkillCards();

      const enrichedLogs = logs.map(log => {
        const member = members.find(m => m.userId === log.userId);
        const card = cards.find(c => c.id === log.skillCardId);
        return {
          ...log,
          displayName: member?.displayName || "不明",
          skillCardTitle: card?.titleJa || "不明",
        };
      });
      res.json(enrichedLogs);
    } catch (error) {
      res.status(500).json({ message: "練習ログの取得に失敗しました" });
    }
  });

  app.post("/api/org/:id/curriculum", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const role = await storage.getOrgMemberRole(orgId, userId);
      if (role !== "admin") return res.status(403).json({ message: "管理者のみカリキュラムを指定できます" });
      const { skillCardId, weekStart, weekEnd } = req.body;
      if (!skillCardId || !weekStart || !weekEnd) {
        return res.status(400).json({ message: "skillCardId, weekStart, weekEnd が必要です" });
      }
      const assignment = await storage.createCurriculumAssignment({
        orgId, skillCardId, assignedBy: userId, weekStart, weekEnd,
      });

      const members = await storage.getOrgMembers(orgId);
      const card = await storage.getSkillCard(skillCardId);
      for (const member of members) {
        if (member.userId !== userId) {
          await storage.createOrgNotification({
            orgId,
            userId: member.userId,
            type: "curriculum",
            message: `今週のカリキュラムに「${card?.titleJa || "スキルカード"}」が追加されました`,
            isRead: false,
          });
        }
      }

      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "カリキュラムの指定に失敗しました" });
    }
  });

  app.get("/api/org/:id/curriculum", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const role = await storage.getOrgMemberRole(orgId, userId);
      if (!role) return res.status(403).json({ message: "この組織のメンバーではありません" });
      const { weekStart } = req.query;
      const curriculum = weekStart
        ? await storage.getCurriculumByWeek(orgId, weekStart as string)
        : await storage.getCurriculumByOrg(orgId);
      res.json(curriculum);
    } catch (error) {
      res.status(500).json({ message: "カリキュラムの取得に失敗しました" });
    }
  });

  app.delete("/api/org/:id/curriculum/:assignmentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const assignmentId = parseInt(req.params.assignmentId);
      const role = await storage.getOrgMemberRole(orgId, userId);
      if (role !== "admin") return res.status(403).json({ message: "管理者のみ削除できます" });
      await storage.deleteCurriculumAssignment(assignmentId, orgId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "カリキュラムの削除に失敗しました" });
    }
  });

  app.get("/api/org/:id/trends", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = parseInt(req.params.id);
      const role = await storage.getOrgMemberRole(orgId, userId);
      if (!role) return res.status(403).json({ message: "この組織のメンバーではありません" });

      const logs = await storage.getPracticeLogsByOrg(orgId, 500);
      const weeklyData: Record<string, { scores: number[]; listening: number[]; questioning: number[]; empathy: number[]; closing: number[]; count: number }> = {};

      for (const log of logs) {
        if (!log.practicedAt) continue;
        const date = new Date(log.practicedAt);
        const dayOfWeek = date.getDay();
        const weekStartDate = new Date(date);
        weekStartDate.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const weekKey = weekStartDate.toISOString().split("T")[0];

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { scores: [], listening: [], questioning: [], empathy: [], closing: [], count: 0 };
        }
        weeklyData[weekKey].count++;
        if (log.score) weeklyData[weekKey].scores.push(log.score);
        if (log.listening) weeklyData[weekKey].listening.push(log.listening);
        if (log.questioning) weeklyData[weekKey].questioning.push(log.questioning);
        if (log.empathy) weeklyData[weekKey].empathy.push(log.empathy);
        if (log.closing) weeklyData[weekKey].closing.push(log.closing);
      }

      const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

      const trends = Object.entries(weeklyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, data]) => ({
          week,
          avgScore: avg(data.scores),
          avgListening: avg(data.listening),
          avgQuestioning: avg(data.questioning),
          avgEmpathy: avg(data.empathy),
          avgClosing: avg(data.closing),
          practiceCount: data.count,
        }));

      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "成長推移の取得に失敗しました" });
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getOrgNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "通知の取得に失敗しました" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      await storage.markNotificationRead(id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "通知の既読化に失敗しました" });
    }
  });

  seedDatabase().catch(console.error);

  return httpServer;
}
