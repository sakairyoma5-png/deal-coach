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

        systemMessage = `あなたは営業ロープレの顧客役です。以下の設定に基づいて、リアルな顧客として振る舞ってください。

性格タイプ: ${personalityDescriptions[personalityType] || personalityDescriptions.cautious}

営業担当が提案する商品/サービス: ${product}
営業担当のゴール: ${goal}

ルール:
- 日本語で会話してください
- 設定された性格タイプに忠実に振る舞ってください
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

        systemMessage = `あなたは営業ロープレの顧客役です。以下の詳細設定に基づいて、リアルな顧客として振る舞ってください。

営業側の会社情報: ${myCompany}
顧客側の会社情報: ${theirCompany}
これまでの関係性: ${relationship}
今回の商談フェーズ: ${phase}
提案する商品/サービス: ${product}
その他の情報: ${additionalInfo}

ルール:
- 日本語で会話してください
- 上記の情報を総合的に判断し、適切な人格・態度・反応パターンを自分で決定してください
- 商談フェーズに応じた適切な態度を取ってください（初期接触なら警戒、クロージングなら具体的条件の確認など）
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

  seedDatabase().catch(console.error);

  return httpServer;
}
