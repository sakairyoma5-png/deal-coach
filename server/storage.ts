import {
  subscriptions, skillCards, roleplayScenarios, roleplaySessions, skillDiagnoses, userProgress, userSkillProgress, skillCardStudyLogs, scheduledStudies,
  organizations, organizationMembers, practiceLogs, curriculumAssignments, orgNotifications,
  type Subscription, type InsertSubscription,
  type SkillCard, type InsertSkillCard,
  type RoleplayScenario, type InsertRoleplayScenario,
  type RoleplaySession, type InsertRoleplaySession,
  type SkillDiagnosis, type InsertSkillDiagnosis,
  type UserProgress, type InsertUserProgress,
  type UserSkillProgress, type InsertUserSkillProgress,
  type SkillCardStudyLog,
  type ScheduledStudy,
  type Organization, type InsertOrganization,
  type OrganizationMember, type InsertOrganizationMember,
  type PracticeLog, type InsertPracticeLog,
  type CurriculumAssignment, type InsertCurriculumAssignment,
  type OrgNotification, type InsertOrgNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray, gte, lte } from "drizzle-orm";
import { users } from "@shared/schema";

export interface IStorage {
  getSubscription(userId: string): Promise<Subscription | undefined>;
  upsertSubscription(data: InsertSubscription): Promise<Subscription>;

  getAllSkillCards(): Promise<SkillCard[]>;
  getSkillCard(id: number): Promise<SkillCard | undefined>;
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

  getSkillCardByTitleJa(titleJa: string): Promise<SkillCard | undefined>;
  getSkillCardsByIds(ids: number[]): Promise<SkillCard[]>;

  getUserSkillProgress(userId: string): Promise<UserSkillProgress[]>;
  markSkillCompleted(userId: string, skillCardId: number): Promise<UserSkillProgress>;
  isSkillCompleted(userId: string, skillCardId: number): Promise<boolean>;

  deleteAllSkillCards(): Promise<void>;

  getSkillCardCount(): Promise<number>;
  getScenarioCount(): Promise<number>;

  getTodayStudyLogs(userId: string): Promise<SkillCardStudyLog[]>;
  getRecentStudyLogs(userId: string, days?: number): Promise<SkillCardStudyLog[]>;
  createStudyLog(userId: string, skillCardId: number): Promise<SkillCardStudyLog>;
  hasStudiedToday(userId: string, skillCardId: number): Promise<boolean>;

  getScheduledStudies(userId: string, month: string): Promise<ScheduledStudy[]>;
  createScheduledStudy(userId: string, skillCardId: number, scheduledDate: string): Promise<ScheduledStudy>;
  deleteScheduledStudy(id: number, userId: string): Promise<void>;

  updateSubscriptionByStripeCustomerId(stripeCustomerId: string, data: Partial<Subscription>): Promise<Subscription | undefined>;
  getSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | undefined>;

  createOrganization(data: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationByInviteCode(code: string): Promise<Organization | undefined>;
  getUserOrganizations(userId: string): Promise<(Organization & { role: string })[]>;

  addOrgMember(data: InsertOrganizationMember): Promise<OrganizationMember>;
  getOrgMembers(orgId: number): Promise<(OrganizationMember & { displayName: string | null; email: string | null })[]>;
  getOrgMemberRole(orgId: number, userId: string): Promise<string | null>;
  removeOrgMember(orgId: number, userId: string): Promise<void>;
  updateOrgMemberRole(orgId: number, userId: string, role: string): Promise<OrganizationMember | undefined>;

  createPracticeLog(data: InsertPracticeLog): Promise<PracticeLog>;
  getPracticeLogsByOrg(orgId: number, limit?: number): Promise<PracticeLog[]>;
  getPracticeLogsByUser(userId: string, limit?: number): Promise<PracticeLog[]>;
  getWeeklyPracticeStats(orgId: number, weekStart: string): Promise<{ userId: string; count: number; avgScore: number }[]>;

  createCurriculumAssignment(data: InsertCurriculumAssignment): Promise<CurriculumAssignment>;
  getCurriculumByOrg(orgId: number): Promise<CurriculumAssignment[]>;
  getCurriculumByWeek(orgId: number, weekStart: string): Promise<CurriculumAssignment[]>;
  deleteCurriculumAssignment(id: number, orgId: number): Promise<void>;

  createOrgNotification(data: InsertOrgNotification): Promise<OrgNotification>;
  getOrgNotifications(userId: string): Promise<OrgNotification[]>;
  markNotificationRead(id: number, userId: string): Promise<void>;

  getUserOrgId(userId: string): Promise<number | null>;
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

  async getSkillCard(id: number): Promise<SkillCard | undefined> {
    const [card] = await db.select().from(skillCards).where(eq(skillCards.id, id));
    return card;
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

  async getSkillCardByTitleJa(titleJa: string): Promise<SkillCard | undefined> {
    const [card] = await db.select().from(skillCards).where(eq(skillCards.titleJa, titleJa));
    return card;
  }

  async getSkillCardsByIds(ids: number[]): Promise<SkillCard[]> {
    if (ids.length === 0) return [];
    return db.select().from(skillCards).where(inArray(skillCards.id, ids));
  }

  async getUserSkillProgress(userId: string): Promise<UserSkillProgress[]> {
    return db.select().from(userSkillProgress).where(eq(userSkillProgress.userId, userId));
  }

  async markSkillCompleted(userId: string, skillCardId: number): Promise<UserSkillProgress> {
    const existing = await db.select().from(userSkillProgress)
      .where(and(eq(userSkillProgress.userId, userId), eq(userSkillProgress.skillCardId, skillCardId)));
    if (existing.length > 0) return existing[0];
    const [p] = await db.insert(userSkillProgress).values({ userId, skillCardId }).returning();
    return p;
  }

  async isSkillCompleted(userId: string, skillCardId: number): Promise<boolean> {
    const [p] = await db.select().from(userSkillProgress)
      .where(and(eq(userSkillProgress.userId, userId), eq(userSkillProgress.skillCardId, skillCardId)));
    return !!p;
  }

  async deleteAllSkillCards(): Promise<void> {
    await db.delete(userSkillProgress);
    await db.delete(skillCards);
  }

  async getSkillCardCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(skillCards);
    return Number(result[0]?.count || 0);
  }

  async getScenarioCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(roleplayScenarios).where(sql`${roleplayScenarios.userId} IS NULL`);
    return Number(result[0]?.count || 0);
  }

  async getTodayStudyLogs(userId: string): Promise<SkillCardStudyLog[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return db.select().from(skillCardStudyLogs)
      .where(and(
        eq(skillCardStudyLogs.userId, userId),
        gte(skillCardStudyLogs.studiedAt, todayStart),
      ))
      .orderBy(desc(skillCardStudyLogs.studiedAt));
  }

  async getRecentStudyLogs(userId: string, days = 30): Promise<SkillCardStudyLog[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return db.select().from(skillCardStudyLogs)
      .where(and(
        eq(skillCardStudyLogs.userId, userId),
        gte(skillCardStudyLogs.studiedAt, since),
      ))
      .orderBy(desc(skillCardStudyLogs.studiedAt));
  }

  async createStudyLog(userId: string, skillCardId: number): Promise<SkillCardStudyLog> {
    const [log] = await db.insert(skillCardStudyLogs).values({ userId, skillCardId }).returning();
    return log;
  }

  async hasStudiedToday(userId: string, skillCardId: number): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [log] = await db.select().from(skillCardStudyLogs)
      .where(and(
        eq(skillCardStudyLogs.userId, userId),
        eq(skillCardStudyLogs.skillCardId, skillCardId),
        gte(skillCardStudyLogs.studiedAt, todayStart),
      ))
      .limit(1);
    return !!log;
  }

  async getScheduledStudies(userId: string, month: string): Promise<ScheduledStudy[]> {
    return db.select().from(scheduledStudies)
      .where(and(
        eq(scheduledStudies.userId, userId),
        sql`${scheduledStudies.scheduledDate} LIKE ${month + '%'}`,
      ))
      .orderBy(scheduledStudies.scheduledDate);
  }

  async createScheduledStudy(userId: string, skillCardId: number, scheduledDate: string): Promise<ScheduledStudy> {
    const [s] = await db.insert(scheduledStudies).values({ userId, skillCardId, scheduledDate }).returning();
    return s;
  }

  async deleteScheduledStudy(id: number, userId: string): Promise<void> {
    await db.delete(scheduledStudies).where(and(eq(scheduledStudies.id, id), eq(scheduledStudies.userId, userId)));
  }

  async updateSubscriptionByStripeCustomerId(stripeCustomerId: string, data: Partial<Subscription>): Promise<Subscription | undefined> {
    const [sub] = await db.update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.stripeCustomerId, stripeCustomerId))
      .returning();
    return sub;
  }

  async getSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, stripeCustomerId));
    return sub;
  }

  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(data).returning();
    return org;
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationByInviteCode(code: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.inviteCode, code));
    return org;
  }

  async getUserOrganizations(userId: string): Promise<(Organization & { role: string })[]> {
    const memberships = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));
    if (memberships.length === 0) return [];
    const orgIds = memberships.map(m => m.orgId);
    const orgs = await db.select().from(organizations).where(inArray(organizations.id, orgIds));
    return orgs.map(org => {
      const membership = memberships.find(m => m.orgId === org.id)!;
      return { ...org, role: membership.role };
    });
  }

  async addOrgMember(data: InsertOrganizationMember): Promise<OrganizationMember> {
    const existing = await db.select().from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, data.orgId), eq(organizationMembers.userId, data.userId)));
    if (existing.length > 0) return existing[0];
    const [member] = await db.insert(organizationMembers).values(data).returning();
    return member;
  }

  async getOrgMembers(orgId: number): Promise<(OrganizationMember & { displayName: string | null; email: string | null })[]> {
    const members = await db.select().from(organizationMembers).where(eq(organizationMembers.orgId, orgId));
    if (members.length === 0) return [];
    const userIds = members.map(m => m.userId);
    const userRows = await db.select().from(users).where(inArray(users.id, userIds));
    return members.map(m => {
      const user = userRows.find(u => u.id === m.userId);
      return { ...m, displayName: user?.displayName || user?.firstName || null, email: user?.email || null };
    });
  }

  async getOrgMemberRole(orgId: number, userId: string): Promise<string | null> {
    const [member] = await db.select().from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
    return member?.role || null;
  }

  async removeOrgMember(orgId: number, userId: string): Promise<void> {
    await db.delete(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
  }

  async updateOrgMemberRole(orgId: number, userId: string, role: string): Promise<OrganizationMember | undefined> {
    const [member] = await db.update(organizationMembers).set({ role })
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)))
      .returning();
    return member;
  }

  async createPracticeLog(data: InsertPracticeLog): Promise<PracticeLog> {
    const [log] = await db.insert(practiceLogs).values(data).returning();
    return log;
  }

  async getPracticeLogsByOrg(orgId: number, limit = 50): Promise<PracticeLog[]> {
    return db.select().from(practiceLogs)
      .where(eq(practiceLogs.orgId, orgId))
      .orderBy(desc(practiceLogs.practicedAt))
      .limit(limit);
  }

  async getPracticeLogsByUser(userId: string, limit = 50): Promise<PracticeLog[]> {
    return db.select().from(practiceLogs)
      .where(eq(practiceLogs.userId, userId))
      .orderBy(desc(practiceLogs.practicedAt))
      .limit(limit);
  }

  async getWeeklyPracticeStats(orgId: number, weekStart: string): Promise<{ userId: string; count: number; avgScore: number }[]> {
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 7);
    const logs = await db.select().from(practiceLogs)
      .where(and(
        eq(practiceLogs.orgId, orgId),
        gte(practiceLogs.practicedAt, weekStartDate),
        lte(practiceLogs.practicedAt, weekEndDate),
      ));
    const statsMap = new Map<string, { count: number; totalScore: number }>();
    for (const log of logs) {
      const existing = statsMap.get(log.userId) || { count: 0, totalScore: 0 };
      existing.count++;
      existing.totalScore += log.score || 0;
      statsMap.set(log.userId, existing);
    }
    return Array.from(statsMap.entries()).map(([userId, stats]) => ({
      userId,
      count: stats.count,
      avgScore: stats.count > 0 ? Math.round(stats.totalScore / stats.count) : 0,
    }));
  }

  async createCurriculumAssignment(data: InsertCurriculumAssignment): Promise<CurriculumAssignment> {
    const [assignment] = await db.insert(curriculumAssignments).values(data).returning();
    return assignment;
  }

  async getCurriculumByOrg(orgId: number): Promise<CurriculumAssignment[]> {
    return db.select().from(curriculumAssignments)
      .where(eq(curriculumAssignments.orgId, orgId))
      .orderBy(desc(curriculumAssignments.createdAt));
  }

  async getCurriculumByWeek(orgId: number, weekStart: string): Promise<CurriculumAssignment[]> {
    return db.select().from(curriculumAssignments)
      .where(and(
        eq(curriculumAssignments.orgId, orgId),
        eq(curriculumAssignments.weekStart, weekStart),
      ));
  }

  async deleteCurriculumAssignment(id: number, orgId: number): Promise<void> {
    await db.delete(curriculumAssignments)
      .where(and(eq(curriculumAssignments.id, id), eq(curriculumAssignments.orgId, orgId)));
  }

  async createOrgNotification(data: InsertOrgNotification): Promise<OrgNotification> {
    const [notif] = await db.insert(orgNotifications).values(data).returning();
    return notif;
  }

  async getOrgNotifications(userId: string): Promise<OrgNotification[]> {
    return db.select().from(orgNotifications)
      .where(eq(orgNotifications.userId, userId))
      .orderBy(desc(orgNotifications.createdAt))
      .limit(20);
  }

  async markNotificationRead(id: number, userId: string): Promise<void> {
    await db.update(orgNotifications).set({ isRead: true })
      .where(and(eq(orgNotifications.id, id), eq(orgNotifications.userId, userId)));
  }

  async getUserOrgId(userId: string): Promise<number | null> {
    const [membership] = await db.select().from(organizationMembers)
      .where(eq(organizationMembers.userId, userId))
      .limit(1);
    return membership?.orgId || null;
  }
}

export const storage = new DatabaseStorage();
