import {
  subscriptions, skillCards, roleplayScenarios, roleplaySessions, skillDiagnoses, userProgress,
  type Subscription, type InsertSubscription,
  type SkillCard, type InsertSkillCard,
  type RoleplayScenario, type InsertRoleplayScenario,
  type RoleplaySession, type InsertRoleplaySession,
  type SkillDiagnosis, type InsertSkillDiagnosis,
  type UserProgress, type InsertUserProgress,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  getSubscription(userId: string): Promise<Subscription | undefined>;
  upsertSubscription(data: InsertSubscription): Promise<Subscription>;

  getAllSkillCards(): Promise<SkillCard[]>;
  createSkillCard(data: InsertSkillCard): Promise<SkillCard>;

  getScenarios(userId?: string): Promise<RoleplayScenario[]>;
  getScenario(id: number): Promise<RoleplayScenario | undefined>;
  createScenario(data: InsertRoleplayScenario): Promise<RoleplayScenario>;

  createSession(data: InsertRoleplaySession): Promise<RoleplaySession>;
  getSession(id: number): Promise<RoleplaySession | undefined>;
  updateSession(id: number, data: Partial<RoleplaySession>): Promise<RoleplaySession>;

  getLatestDiagnosis(userId: string): Promise<SkillDiagnosis | undefined>;
  getDiagnosisHistory(userId: string): Promise<SkillDiagnosis[]>;
  createDiagnosis(data: InsertSkillDiagnosis): Promise<SkillDiagnosis>;

  getRecentProgress(userId: string, limit?: number): Promise<UserProgress[]>;
  createProgress(data: InsertUserProgress): Promise<UserProgress>;

  getSkillCardCount(): Promise<number>;
  getScenarioCount(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return sub;
  }

  async upsertSubscription(data: InsertSubscription): Promise<Subscription> {
    const [sub] = await db
      .insert(subscriptions)
      .values(data)
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return sub;
  }

  async getAllSkillCards(): Promise<SkillCard[]> {
    return db.select().from(skillCards);
  }

  async createSkillCard(data: InsertSkillCard): Promise<SkillCard> {
    const [card] = await db.insert(skillCards).values(data).returning();
    return card;
  }

  async getScenarios(userId?: string): Promise<RoleplayScenario[]> {
    if (userId) {
      return db.select().from(roleplayScenarios)
        .where(
          sql`${roleplayScenarios.userId} IS NULL OR ${roleplayScenarios.userId} = ${userId}`
        );
    }
    return db.select().from(roleplayScenarios).where(sql`${roleplayScenarios.userId} IS NULL`);
  }

  async getScenario(id: number): Promise<RoleplayScenario | undefined> {
    const [s] = await db.select().from(roleplayScenarios).where(eq(roleplayScenarios.id, id));
    return s;
  }

  async createScenario(data: InsertRoleplayScenario): Promise<RoleplayScenario> {
    const [s] = await db.insert(roleplayScenarios).values(data).returning();
    return s;
  }

  async createSession(data: InsertRoleplaySession): Promise<RoleplaySession> {
    const [s] = await db.insert(roleplaySessions).values(data).returning();
    return s;
  }

  async getSession(id: number): Promise<RoleplaySession | undefined> {
    const [s] = await db.select().from(roleplaySessions).where(eq(roleplaySessions.id, id));
    return s;
  }

  async updateSession(id: number, data: Partial<RoleplaySession>): Promise<RoleplaySession> {
    const [s] = await db.update(roleplaySessions).set(data).where(eq(roleplaySessions.id, id)).returning();
    return s;
  }

  async getLatestDiagnosis(userId: string): Promise<SkillDiagnosis | undefined> {
    const [d] = await db.select().from(skillDiagnoses)
      .where(eq(skillDiagnoses.userId, userId))
      .orderBy(desc(skillDiagnoses.createdAt))
      .limit(1);
    return d;
  }

  async getDiagnosisHistory(userId: string): Promise<SkillDiagnosis[]> {
    return db.select().from(skillDiagnoses)
      .where(eq(skillDiagnoses.userId, userId))
      .orderBy(desc(skillDiagnoses.createdAt))
      .limit(10);
  }

  async createDiagnosis(data: InsertSkillDiagnosis): Promise<SkillDiagnosis> {
    const [d] = await db.insert(skillDiagnoses).values(data).returning();
    return d;
  }

  async getRecentProgress(userId: string, limit = 10): Promise<UserProgress[]> {
    return db.select().from(userProgress)
      .where(eq(userProgress.userId, userId))
      .orderBy(desc(userProgress.practiceDate))
      .limit(limit);
  }

  async createProgress(data: InsertUserProgress): Promise<UserProgress> {
    const [p] = await db.insert(userProgress).values(data).returning();
    return p;
  }

  async getSkillCardCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(skillCards);
    return Number(result[0]?.count || 0);
  }

  async getScenarioCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(roleplayScenarios).where(sql`${roleplayScenarios.userId} IS NULL`);
    return Number(result[0]?.count || 0);
  }
}

export const storage = new DatabaseStorage();
