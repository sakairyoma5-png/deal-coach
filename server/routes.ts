import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import OpenAI from "openai";
import { seedDatabase } from "./seed";

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
          cautious: "慎重型：決断に時間がかかり、リスクを非常に気にする。データや実績を重視し、導入事例や保証を求める。急かされると不信感を持つ。",
          decisive: "即決型：スピード感を重視し、要点を簡潔に聞きたい。メリットが明確なら即決するが、回りくどい説明には苛立つ。",
          analytical: "分析型：論理的思考を好み、詳細なデータや比較資料を求める。感情的なアピールには響かず、ROIや具体的数値を重視する。",
          friendly: "友好型：人間関係を大切にし、信頼関係の構築を重視する。フレンドリーだが、本音を言わないこともある。雑談を好む。",
          skeptical: "懐疑型：営業に対して警戒心が強く、売り込みを嫌う。自分で調べた情報を持っており、矛盾点を突いてくる。",
          busy: "多忙型：とにかく時間がない。要点だけを短く聞きたい。長い説明は途中で遮る。短時間で価値を伝えられないと興味を失う。",
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

        systemMessage = `あなたは営業ロープレの顧客役です。以下の設定に基づいて、リアルな顧客として振る舞ってください。

性格タイプ: ${personalityDescriptions[personalityType] || personalityDescriptions.cautious}

${difficultyInstructions[difficulty] || difficultyInstructions.medium}

営業担当が提案する商品/サービス: ${product}
営業担当のゴール: ${goal}

ルール:
- 日本語で会話してください
- 設定された性格タイプに忠実に振る舞ってください
- 難易度に応じた態度で応答してください
- 顧客としてリアルに反応し、性格に応じた質問や反論をしてください
- 最初の挨拶から始めてください
- 簡潔に（2-3文程度で）応答してください
- 顧客の名前は適当に設定してください（例：田中、佐藤、鈴木など）`;

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

        systemMessage = `あなたは営業ロープレの顧客役です。以下の詳細設定に基づいて、リアルな顧客として振る舞ってください。

営業側の会社情報: ${myCompany}
顧客側の会社情報: ${theirCompany}
これまでの関係性: ${relationship}
今回の商談フェーズ: ${phase}
提案する商品/サービス: ${product}
その他の情報: ${additionalInfo}

${customDifficultyInstructions[customDifficulty] || customDifficultyInstructions.medium}

ルール:
- 日本語で会話してください
- 上記の情報を総合的に判断し、適切な人格・態度・反応パターンを自分で決定してください
- 商談フェーズに応じた適切な態度を取ってください（初期接触なら警戒、クロージングなら具体的条件の確認など）
- 難易度に応じた態度で応答してください
- 顧客としてリアルに反応してください
- 最初の挨拶から始めてください
- 簡潔に（2-3文程度で）応答してください
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

      const msgs = session.messages as any[];
      const conversationText = msgs
        .filter((m: any) => m.role !== "system")
        .map((m: any) => `${m.role === "user" ? "営業担当" : "顧客"}: ${m.content}`)
        .join("\n");

      const analysisPrompt = `以下の営業ロープレの会話を分析し、JSON形式で評価してください。

会話内容:
${conversationText}

以下のJSON形式で回答してください（JSON以外は出力しないでください）:
{
  "listening": <0-100の数値: 傾聴力スコア>,
  "questioning": <0-100の数値: 質問力スコア>,
  "empathy": <0-100の数値: 共感力スコア>,
  "closing": <0-100の数値: クロージング力スコア>,
  "overallScore": <0-100の数値: 総合スコア>,
  "feedback": "<英語でのフィードバック>",
  "feedbackJa": "<日本語でのフィードバック（2-3文）>",
  "strengths": ["<日本語の強み1>", "<日本語の強み2>"],
  "weaknesses": ["<日本語の改善点1>", "<日本語の改善点2>"]
}`;

      const analysis = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [{ role: "user", content: analysisPrompt }],
        max_completion_tokens: 1024,
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
        listening: result.listening || 50,
        questioning: result.questioning || 50,
        empathy: result.empathy || 50,
        closing: result.closing || 50,
        overallScore: result.overallScore || 50,
        feedback: result.feedback,
        feedbackJa: result.feedbackJa,
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
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

      const systemPrompt = `あなたは営業トレーニングのAIコーチです。以下のロープレの会話と評価結果を踏まえ、ユーザーと対話形式でフィードバックを行ってください。

会話内容:
${conversationText}

評価結果:
- 傾聴力: ${feedback.listening}/100
- 質問力: ${feedback.questioning}/100
- 共感力: ${feedback.empathy}/100
- クロージング力: ${feedback.closing}/100
- 総合スコア: ${feedback.overallScore}/100
- 強み: ${(feedback.strengths || []).join("、")}
- 改善点: ${(feedback.weaknesses || []).join("、")}

ルール:
- 日本語で会話してください
- 最初のメッセージでは、全体の評価サマリーと具体的な改善ポイントを2-3個挙げてください
- ユーザーの質問に対して、具体的なアドバイスや営業テクニックを教えてください
- 関連する営業スキルの概念（例：FOMO、アンカリング、SPIN営業法、ミラーリングなど）を積極的に紹介してください
- 簡潔に（3-5文程度で）応答してください`;

      const initialAnalysis = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "今のロープレの結果を振り返ってください。" },
        ],
        max_completion_tokens: 1024,
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
        max_completion_tokens: 1024,
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

  app.post("/api/skill-cards/:id/practice", isAuthenticated, async (req: any, res) => {
    try {
      const cardId = parseInt(req.params.id);
      const card = await storage.getSkillCard(cardId);
      if (!card) {
        return res.status(404).json({ message: "Skill card not found" });
      }

      const prompt = `営業トレーニングの練習問題を1つ作成してください。

対象スキル: ${card.titleJa}
スキル説明: ${card.descriptionJa}
カテゴリ: ${card.category}

必ず以下のJSON形式のみで回答してください。キー名は英語のまま使用し、値は日本語で書いてください:
{"scenario": "BtoB営業の具体的なシナリオ（2-3文で状況を説明）", "question": "この状況でどう対応するか具体的に聞く質問文", "hint": "回答のヒント1文", "idealPoints": ["ポイント1", "ポイント2", "ポイント3"]}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: "あなたは営業トレーニングの講師です。必ずJSON形式のみで回答してください。余計なテキストは含めないでください。" },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 1024,
        response_format: { type: "json_object" },
      });

      const rawContent = response.choices[0]?.message?.content || '';
      console.log("Practice exercise raw response:", rawContent.slice(0, 500));

      let exercise;
      try {
        let parsed = JSON.parse(rawContent);
        if (parsed.exercise) parsed = parsed.exercise;
        if (parsed.practice) parsed = parsed.practice;
        if (parsed.problem) parsed = parsed.problem;

        const scenario = parsed.scenario || parsed.シナリオ || parsed.situation || "";
        const question = parsed.question || parsed.質問 || parsed.問題 || "";
        const hint = parsed.hint || parsed.ヒント || "";
        const idealPoints = Array.isArray(parsed.idealPoints) ? parsed.idealPoints
          : Array.isArray(parsed.ideal_points) ? parsed.ideal_points
          : Array.isArray(parsed.ポイント) ? parsed.ポイント
          : [];

        if (!scenario && !question) {
          throw new Error("No valid fields found in AI response");
        }

        exercise = {
          scenario: scenario || `${card.titleJa}に関する営業シーンです。`,
          question: question || `この状況で${card.titleJa}をどのように活用しますか？`,
          hint: hint || `${card.titleJa}のポイントを意識して回答してみましょう。`,
          idealPoints: idealPoints.length > 0 ? idealPoints : (card.tipsJa?.slice(0, 3) || []),
        };
      } catch (parseErr) {
        console.error("Failed to parse practice exercise response:", parseErr);
        exercise = {
          scenario: `あなたはIT企業の営業担当です。新規顧客との初回商談で、相手の課題をヒアリングする場面を想定してください。「${card.titleJa}」のスキルを実践する機会です。`,
          question: `この商談で「${card.titleJa}」をどのように活用しますか？具体的な発言例を含めて回答してください。`,
          hint: `${card.descriptionJa?.slice(0, 50)}を意識して回答してみましょう。`,
          idealPoints: card.tipsJa?.slice(0, 3) || [],
        };
      }

      res.json(exercise);
    } catch (error) {
      console.error("Error generating practice:", error);
      res.status(500).json({ message: "Failed to generate practice exercise" });
    }
  });

  app.post("/api/skill-cards/:id/practice/evaluate", isAuthenticated, async (req: any, res) => {
    try {
      const cardId = parseInt(req.params.id);
      const { scenario, question, userAnswer } = req.body;
      if (!userAnswer || !scenario || !question) {
        return res.status(400).json({ message: "シナリオ、質問、回答はすべて必須です" });
      }

      const card = await storage.getSkillCard(cardId);
      if (!card) {
        return res.status(404).json({ message: "Skill card not found" });
      }

      const prompt = `あなたは営業スキルの指導者です。以下の練習問題に対するユーザーの回答を評価してください。

スキル: ${card.titleJa}
スキルの説明: ${card.descriptionJa}
良い例: ${card.goodExampleJa}

シナリオ: ${scenario}
質問: ${question}
ユーザーの回答: ${userAnswer}

以下のJSON形式で評価してください:
{
  "score": 1〜5の整数（5が最高）,
  "feedback": "具体的なフィードバック（3-4文。良い点と改善点を含む）",
  "improvedAnswer": "改善された模範回答の例（1-2文）"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: "あなたは営業スキルの指導者です。必ずJSON形式のみで回答してください。" },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 1024,
        response_format: { type: "json_object" },
      });

      let evaluation;
      try {
        const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
        const score = parseInt(parsed.score || parsed.スコア || parsed.rating || "3");
        evaluation = {
          score: isNaN(score) ? 3 : Math.max(1, Math.min(5, score)),
          feedback: parsed.feedback || parsed.フィードバック || parsed.評価 || "回答を評価しました。",
          improvedAnswer: parsed.improvedAnswer || parsed.improved_answer || parsed.模範回答 || "",
        };
      } catch {
        evaluation = {
          score: 3,
          feedback: "評価の生成に失敗しました。もう一度お試しください。",
          improvedAnswer: "",
        };
      }

      res.json(evaluation);
    } catch (error) {
      console.error("Error evaluating practice:", error);
      res.status(500).json({ message: "Failed to evaluate practice answer" });
    }
  });

  seedDatabase().catch(console.error);

  return httpServer;
}
