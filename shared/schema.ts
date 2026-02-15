import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";
export * from "./models/chat";

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  plan: text("plan").notNull().default("free"),
  billingCycle: text("billing_cycle").default("monthly"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const skillCards = pgTable("skill_cards", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleJa: text("title_ja").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  descriptionJa: text("description_ja").notNull(),
  goodExample: text("good_example").notNull(),
  goodExampleJa: text("good_example_ja").notNull(),
  badExample: text("bad_example").notNull(),
  badExampleJa: text("bad_example_ja").notNull(),
  tips: text("tips").array().notNull(),
  tipsJa: text("tips_ja").array().notNull(),
  difficulty: text("difficulty").notNull().default("beginner"),
  iconName: text("icon_name").notNull().default("BookOpen"),
  isPremium: boolean("is_premium").notNull().default(false),
});

export const roleplayScenarios = pgTable("roleplay_scenarios", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  title: text("title").notNull(),
  titleJa: text("title_ja").notNull(),
  customerName: text("customer_name").notNull(),
  customerRole: text("customer_role").notNull(),
  companyName: text("company_name").notNull(),
  industry: text("industry").notNull(),
  productService: text("product_service").notNull(),
  situation: text("situation").notNull(),
  difficulty: text("difficulty").notNull().default("medium"),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roleplaySessions = pgTable("roleplay_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  scenarioId: integer("scenario_id").notNull(),
  messages: jsonb("messages").notNull().default([]),
  feedback: jsonb("feedback"),
  score: integer("score"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const skillDiagnoses = pgTable("skill_diagnoses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  sessionId: integer("session_id"),
  listening: integer("listening").notNull().default(0),
  questioning: integer("questioning").notNull().default(0),
  empathy: integer("empathy").notNull().default(0),
  closing: integer("closing").notNull().default(0),
  overallScore: integer("overall_score").notNull().default(0),
  feedback: text("feedback"),
  feedbackJa: text("feedback_ja"),
  strengths: text("strengths").array(),
  weaknesses: text("weaknesses").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  skillCardId: integer("skill_card_id"),
  completedAt: timestamp("completed_at"),
  practiceDate: timestamp("practice_date").defaultNow(),
  activityType: text("activity_type").notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSkillCardSchema = createInsertSchema(skillCards).omit({ id: true });
export const insertRoleplayScenarioSchema = createInsertSchema(roleplayScenarios).omit({ id: true, createdAt: true });
export const insertRoleplaySessionSchema = createInsertSchema(roleplaySessions).omit({ id: true, createdAt: true });
export const insertSkillDiagnosisSchema = createInsertSchema(skillDiagnoses).omit({ id: true, createdAt: true });
export const insertUserProgressSchema = createInsertSchema(userProgress).omit({ id: true });

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type SkillCard = typeof skillCards.$inferSelect;
export type InsertSkillCard = z.infer<typeof insertSkillCardSchema>;
export type RoleplayScenario = typeof roleplayScenarios.$inferSelect;
export type InsertRoleplayScenario = z.infer<typeof insertRoleplayScenarioSchema>;
export type RoleplaySession = typeof roleplaySessions.$inferSelect;
export type InsertRoleplaySession = z.infer<typeof insertRoleplaySessionSchema>;
export type SkillDiagnosis = typeof skillDiagnoses.$inferSelect;
export type InsertSkillDiagnosis = z.infer<typeof insertSkillDiagnosisSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
