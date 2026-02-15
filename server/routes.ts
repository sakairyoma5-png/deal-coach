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
      const { scenarioId } = req.body;

      const scenario = await storage.getScenario(scenarioId);
      if (!scenario) return res.status(404).json({ message: "Scenario not found" });

      const systemMessage = `あなたは営業ロープレの顧客役です。以下の設定に基づいて、リアルな顧客として振る舞ってください。

顧客情報:
- 名前: ${scenario.customerName}
- 役職: ${scenario.customerRole}
- 会社: ${scenario.companyName}
- 業界: ${scenario.industry}
- 商品/サービス: ${scenario.productService}
- 状況: ${scenario.situation}
- 難易度: ${scenario.difficulty === 'easy' ? '初級（協力的な顧客）' : scenario.difficulty === 'medium' ? '中級（標準的な顧客）' : '上級（厳しい顧客）'}

ルール:
- 日本語で会話してください
- 顧客としてリアルに反応してください
- 難易度に応じて質問や反論をしてください
- 最初の挨拶から始めてください
- 簡潔に（2-3文程度で）応答してください`;

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
        scenarioId,
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
