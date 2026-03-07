import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/auth/accept-tos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.acceptTos(userId);
      res.json(user);
    } catch (error) {
      console.error("Error accepting ToS:", error);
      res.status(500).json({ message: "利用規約の同意に失敗しました" });
    }
  });

  app.patch("/api/auth/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { displayName } = req.body;
      if (typeof displayName !== "string" || displayName.trim().length === 0) {
        return res.status(400).json({ message: "表示名を入力してください" });
      }
      if (displayName.trim().length > 50) {
        return res.status(400).json({ message: "表示名は50文字以内にしてください" });
      }
      const user = await authStorage.updateDisplayName(userId, displayName.trim());
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "プロフィールの更新に失敗しました" });
    }
  });
}
