import { chromium } from 'playwright';
import { db } from '../server/db';
import { users, skillDiagnoses, skillCards, userSkillProgress } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

const BASE_URL = 'http://localhost:5000';
const OUTPUT_DIR = './public/guide';
const DEMO_USER_ID = '__guide_screenshot_demo__';

async function seedDemoData() {
  const existing = await db.select().from(users).where(eq(users.id, DEMO_USER_ID));
  if (existing.length === 0) {
    await db.insert(users).values({
      id: DEMO_USER_ID,
      email: 'demo@dealcoach.test',
      firstName: 'デモ',
      lastName: 'ユーザー',
      displayName: 'デモユーザー',
      tosAccepted: true,
      tosAcceptedAt: new Date(),
    });
  } else {
    await db.update(users).set({ tosAccepted: true, tosAcceptedAt: new Date() }).where(eq(users.id, DEMO_USER_ID));
  }

  const existingDiagnosis = await db.select().from(skillDiagnoses).where(eq(skillDiagnoses.userId, DEMO_USER_ID));
  if (existingDiagnosis.length === 0) {
    await db.insert(skillDiagnoses).values({
      userId: DEMO_USER_ID,
      listening: 72,
      questioning: 65,
      empathy: 80,
      closing: 58,
      overallScore: 69,
      feedback: 'Good progress on empathy skills.',
      feedbackJa: '共感力が高く、顧客との信頼関係構築に強みがあります。クロージング力を強化することで、商談成約率の向上が期待できます。',
      strengths: ['顧客の気持ちに寄り添った応答', 'オープンクエスチョンの活用'],
      weaknesses: ['クロージングのタイミング', '価格交渉への対応'],
    });
  }

  const allCards = await db.select({ id: skillCards.id }).from(skillCards).limit(8);
  for (const card of allCards.slice(0, 5)) {
    const existingProgress = await db.select().from(userSkillProgress)
      .where(sql`${userSkillProgress.userId} = ${DEMO_USER_ID} AND ${userSkillProgress.skillCardId} = ${card.id}`);
    if (existingProgress.length === 0) {
      await db.insert(userSkillProgress).values({
        userId: DEMO_USER_ID,
        skillCardId: card.id,
        completed: true,
        completedAt: new Date(),
      });
    }
  }
}

async function cleanDemoData() {
  await db.delete(userSkillProgress).where(eq(userSkillProgress.userId, DEMO_USER_ID));
  await db.delete(skillDiagnoses).where(eq(skillDiagnoses.userId, DEMO_USER_ID));
  await db.delete(users).where(eq(users.id, DEMO_USER_ID));
}

async function captureScreenshots() {
  console.log('Seeding demo data...');
  await seedDemoData();

  const browser = await chromium.launch({ headless: true });

  console.log('Capturing landing page...');
  const unauthCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const landingPage = await unauthCtx.newPage();
  await landingPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await landingPage.waitForTimeout(500);
  await landingPage.screenshot({ path: `${OUTPUT_DIR}/landing.png`, fullPage: false });
  console.log('  Saved landing.png');

  console.log('Capturing pricing page...');
  await landingPage.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle' });
  await landingPage.waitForTimeout(500);
  await landingPage.screenshot({ path: `${OUTPUT_DIR}/pricing.png`, fullPage: false });
  console.log('  Saved pricing.png');
  await unauthCtx.close();

  console.log('Setting up authenticated session...');
  const authCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await authCtx.newPage();

  await page.route('**/api/auth/user', async (route) => {
    const response = await route.fetch();
    const status = response.status();
    if (status !== 200) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: DEMO_USER_ID,
          email: 'demo@dealcoach.test',
          firstName: 'デモ',
          lastName: 'ユーザー',
          displayName: 'デモユーザー',
          profileImageUrl: null,
          tosAccepted: true,
          tosAcceptedAt: new Date().toISOString(),
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ plan: 'pro', status: 'active' }),
    });
  });

  await page.route('**/api/diagnosis/latest', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        userId: DEMO_USER_ID,
        listening: 72,
        questioning: 65,
        empathy: 80,
        closing: 58,
        overallScore: 69,
        feedbackJa: '共感力が高く、顧客との信頼関係構築に強みがあります。',
        strengths: ['顧客の気持ちに寄り添った応答', 'オープンクエスチョンの活用'],
        weaknesses: ['クロージングのタイミング', '価格交渉への対応'],
        createdAt: new Date().toISOString(),
      }),
    });
  });

  await page.route('**/api/progress/recent', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, activityType: 'roleplay', createdAt: new Date().toISOString() },
        { id: 2, activityType: 'study', createdAt: new Date(Date.now() - 86400000).toISOString() },
      ]),
    });
  });

  await page.route('**/api/recommendations', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ cards: [], reason: '' }),
    });
  });

  await page.route('**/api/study-logs/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/api/org', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/notifications', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/api/skill-progress', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/api/skill-cards', async (route) => {
    if (route.request().method() === 'GET' && !route.request().url().includes('/practice')) {
      const sampleCards = [
        { id: 1, titleJa: 'アクティブリスニング', category: 'ヒアリング', descriptionJa: '顧客の話を注意深く聞き、理解を示すスキル', difficulty: 'beginner' },
        { id: 2, titleJa: 'オープンクエスチョン', category: 'ヒアリング', descriptionJa: '相手が自由に回答できる質問で情報を引き出す', difficulty: 'beginner' },
        { id: 3, titleJa: 'ラポール構築', category: 'ラポール構築', descriptionJa: '初対面の顧客と信頼関係を築く', difficulty: 'intermediate' },
        { id: 4, titleJa: 'ニーズ分析', category: '提案', descriptionJa: '顧客の潜在的なニーズを引き出し分析する', difficulty: 'intermediate' },
        { id: 5, titleJa: 'クロージングテクニック', category: 'クロージング', descriptionJa: '商談を成約に導くための効果的な手法', difficulty: 'advanced' },
        { id: 6, titleJa: 'ミラーリング', category: 'ラポール構築', descriptionJa: '相手の言動を自然に反映し親近感を高める', difficulty: 'beginner' },
        { id: 7, titleJa: '反論対応', category: 'クロージング', descriptionJa: '顧客の反論に適切に対応する方法', difficulty: 'advanced' },
        { id: 8, titleJa: 'SPIN話法', category: 'ヒアリング', descriptionJa: '状況・問題・示唆・解決質問で商談を進める', difficulty: 'intermediate' },
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sampleCards),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/diagnosis/history', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 1,
        userId: DEMO_USER_ID,
        listening: 72,
        questioning: 65,
        empathy: 80,
        closing: 58,
        overallScore: 69,
        createdAt: new Date().toISOString(),
      }]),
    });
  });

  await page.route('**/api/calendar/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  const screenshotPages = [
    { path: 'dashboard.png', url: '/' },
    { path: 'skills.png', url: '/skills' },
    { path: 'roleplay.png', url: '/roleplay' },
    { path: 'diagnosis.png', url: '/diagnosis' },
    { path: 'calendar.png', url: '/calendar' },
  ];

  for (const s of screenshotPages) {
    try {
      console.log(`Capturing ${s.path}...`);
      await page.goto(`${BASE_URL}${s.url}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUTPUT_DIR}/${s.path}`, fullPage: false });
      console.log(`  Saved ${s.path}`);
    } catch (e) {
      console.error(`  Failed to capture ${s.path}:`, e);
    }
  }

  await authCtx.close();
  await browser.close();

  console.log('All screenshots captured!');
}

captureScreenshots()
  .then(() => cleanDemoData())
  .catch(async (e) => {
    console.error('Screenshot capture failed:', e);
    await cleanDemoData().catch(() => {});
  })
  .finally(() => process.exit(0));
