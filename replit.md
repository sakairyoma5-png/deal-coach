# DealCoach - AI営業スキルトレーニングプラットフォーム

## Overview
AI-powered sales skill training platform with roleplay practice, skill diagnosis, structured learning content, and corporate/B2B organization management. Japanese-focused UI.

## Architecture
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM + Stripe schema (managed by stripe-replit-sync)
- **Auth**: Replit Auth (OIDC) - Google, GitHub, X, Apple, email/password
- **AI**: OpenAI via Replit AI Integrations (gpt-5-nano for roleplay/analysis)
- **Payments**: Stripe (via Replit connector, stripe-replit-sync for webhooks/data sync)

## Key Features
1. Landing page (unauthenticated) with 6 feature cards + corporate/enterprise section
2. Dashboard with skill scores, AI-powered recommendations, activity, org section, curriculum display
3. Enriched skill card learning (50 cards, 6 categories) with per-user completion tracking
   - Rich content: whyEffective, mechanism, usageScenario, failurePatterns, checklist, successStory
   - Category filtering and search
   - AI practice exercises with evaluation
4. AI roleplay with 2 modes: personality-type selection (6 types + 3 difficulty levels) and custom free-form with AI pre-questioning
5. Post-roleplay feedback chat with AI coach (SSE streaming, follow-up questions)
6. AI auto-generated skill cards from roleplay weaknesses (shared globally, deduped by titleJa, includes all enriched fields)
7. Quiz-style skill card practice: AI generates BtoB sales scenarios, 5 multiple-choice questions per session (customer statement → pick best sales response from 4 options)
8. Skill diagnosis (4-axis: listening, questioning, empathy, closing)
9. Pricing page (3 tiers: Free ¥0, Basic ¥3,000/月, Pro ¥4,500/月) - Stripe Checkout integration with monthly/annual billing
10. Enterprise/法人 plan: ¥10,000/user/month per-seat billing via Stripe (organization-level subscription)
11. Subscription management & cancellation via Stripe Customer Portal
11. Learning calendar: monthly view showing study history + scheduled studies with add/delete
12. Mobile-first design with bottom navigation (Home, Skills, RP, Diag, Org)
13. Dark/light mode toggle
14. **Legal compliance**:
    - Terms of Service page (/terms) - Japanese SaaS terms
    - 特定商取引法に基づく表記 page (/legal) - legal business info
    - Privacy Policy page (/privacy) - Japanese privacy policy
    - ToS consent gate: login → must agree to ToS before accessing any feature
    - tosAccepted + tosAcceptedAt tracked per user in DB
    - Footer links on landing page to /terms, /legal, /privacy
15. **Organization management** (corporate/B2B):
    - Create organizations with Stripe Checkout for enterprise plan (¥10,000/user/month)
    - Per-seat billing: member join → quantity+1, member leave → quantity-1
    - organizations table has stripeCustomerId, stripeSubscriptionId, subscriptionStatus
    - Admin/member roles
    - Subscription status displayed on org settings page
    - Invite blocked if subscription not active
    - Admin dashboard: member scores, weekly practice counts, non-participants, completion rates
    - Practice log auto-recording (roleplay + skill card practice)
    - Curriculum assignment by admin (weekly skill cards)
    - Growth trend charts (weekly score changes, 4-axis breakdown)
    - In-app notifications for curriculum assignments
15. Profile page with display name editing

## Project Structure
- `client/src/pages/` - Landing, Dashboard, Skills, Roleplay, Diagnosis, Pricing, Calendar, Profile, Organization, OrgSettings, OrgDashboard, Terms, Legal, Privacy, TosConsent, Guide
- `client/src/components/` - ThemeProvider, ThemeToggle, BottomNav, NotificationBell, UI components
- `server/routes.ts` - All API endpoints (individual + organization)
- `server/storage.ts` - DatabaseStorage with Drizzle (IStorage interface)
- `server/stripeClient.ts` - Stripe client via Replit connector
- `server/webhookHandlers.ts` - Stripe webhook processing
- `server/seed.ts` - Seed orchestrator
- `server/seed-cards-1.ts` - Skill cards 1-25 seed data
- `server/seed-cards-2.ts` - Skill cards 26-50 seed data
- `server/seed-stripe.ts` - Stripe product/price seeding script
- `shared/schema.ts` - All Drizzle schemas and types
- `server/replit_integrations/auth/` - Replit Auth module

## API Endpoints
- `GET /api/auth/user` - Current user (includes displayName)
- `PATCH /api/auth/accept-tos` - Accept Terms of Service (sets tosAccepted=true)
- `PATCH /api/auth/profile` - Update display name (body: { displayName })
- `GET /api/subscription` - User subscription
- `GET /api/skill-cards` - All skill cards
- `GET /api/scenarios` - Roleplay scenarios (legacy)
- `POST /api/roleplay/start` - Start roleplay session (mode: personality|custom + config + difficulty)
- `POST /api/roleplay/custom-prepare` - AI pre-questioning for custom mode
- `POST /api/roleplay/message` - Send message (SSE streaming)
- `POST /api/roleplay/end` - End session, get diagnosis + auto-record practice log
- `POST /api/feedback/start` - Start feedback chat (analyzes session, auto-generates skill cards)
- `POST /api/feedback/chat` - Follow-up feedback conversation (SSE streaming)
- `POST /api/skill-cards/:id/complete` - Mark skill card as completed by user
- `POST /api/skill-cards/:id/practice/start` - Start quiz practice (generates scenario)
- `POST /api/skill-cards/:id/practice/quiz` - Generate a quiz question (customer statement + 4 choices)
- `POST /api/skill-cards/:id/practice/evaluate` - Record quiz results + practice log
- `GET /api/skill-progress` - User's skill card completion progress
- `GET /api/recommendations` - AI-powered recommendations
- `GET /api/diagnosis/latest` - Latest skill diagnosis
- `GET /api/diagnosis/history` - Diagnosis history
- `GET /api/progress/recent` - Recent activity
- `GET /api/study-logs/today` - Today's study logs
- `GET /api/study-logs/recent?days=N` - Recent study logs
- `POST /api/study-logs` - Record a skill card study
- `GET /api/stripe/publishable-key` - Stripe publishable key
- `GET /api/stripe/prices` - Dynamic price IDs
- `POST /api/stripe/checkout` - Create Checkout session
- `POST /api/stripe/portal` - Create Customer Portal session
- `POST /api/stripe/sync-subscription` - Sync subscription from Stripe
- `POST /api/stripe/webhook` - Stripe webhook
- `GET /api/calendar/study-logs?month=YYYY-MM` - Study logs for month
- `GET /api/calendar/scheduled?month=YYYY-MM` - Scheduled studies for month
- `POST /api/calendar/schedule` - Add scheduled study
- `DELETE /api/calendar/schedule/:id` - Delete scheduled study
- `POST /api/org` - Create organization (returns checkoutUrl for Stripe Checkout)
- `POST /api/org/:id/checkout-success` - Sync subscription after checkout (body: { sessionId })
- `GET /api/org` - User's organizations
- `GET /api/org/:id` - Organization detail
- `POST /api/org/:id/invite` - Get invite code (admin only)
- `POST /api/org/join/:code` - Join via invite code (auto-updates Stripe seat count)
- `GET /api/org/:id/members` - Member list
- `PATCH /api/org/:id/members/:userId` - Change member role (admin only)
- `DELETE /api/org/:id/members/:userId` - Remove member (admin only)
- `GET /api/org/:id/dashboard` - Admin dashboard data
- `GET /api/org/:id/practice-logs` - Practice logs with member/skill names
- `POST /api/org/:id/curriculum` - Assign curriculum (admin only)
- `GET /api/org/:id/curriculum` - Get curriculum (?weekStart for specific week)
- `DELETE /api/org/:id/curriculum/:assignmentId` - Delete curriculum (admin only)
- `GET /api/org/:id/trends` - Growth trends (weekly scores, 4-axis)
- `GET /api/notifications` - User notifications
- `PATCH /api/notifications/:id/read` - Mark notification read

## Database Tables
users, sessions (auth), subscriptions, skill_cards, roleplay_scenarios, roleplay_sessions, skill_diagnoses, user_progress, user_skill_progress, skill_card_study_logs, scheduled_studies, conversations, messages, **organizations**, **organization_members**, **practice_logs**, **curriculum_assignments**, **org_notifications**

## Stripe Integration
- Products created via Stripe API (seed-stripe.ts): DealCoach Basic, DealCoach Pro, DealCoach Enterprise
- Each product has monthly and annual prices in JPY
- Price IDs are fetched dynamically via /api/stripe/prices (no hardcoded IDs)
- Products looked up by metadata.plan ("basic"/"pro") with name fallback
- Auto-seeding of Stripe products on startup if missing (all environments)
- stripeClient.ts: Replit connector first, fallback to STRIPE_SECRET_KEY/STRIPE_PUBLISHABLE_KEY env vars
- stripe-replit-sync manages stripe schema tables (products, prices, subscriptions, customers)
- Webhook registered BEFORE express.json() in index.ts
- Webhook handler (webhookHandlers.ts): processes stripe-replit-sync + org subscription status sync
  - Handles: customer.subscription.updated/deleted/paused, invoice.payment_failed
  - Auto-updates org subscriptionStatus on subscription state changes
- Subscription status: stored in local subscriptions table, synced from Stripe on checkout success
- Cancellation: via Stripe Customer Portal (cancel_at_period_end, access until period end)

## Skill Card Study System
- All plans: Study logs recorded when opening a skill card (tracks learning history)
- Free plan: 1日3枚まで制限。カード選択時に確認ダイアログ表示。学習済みカードは再閲覧可能
- Basic/Pro: 制限なし、確認ダイアログなし、学習記録は同様に蓄積
- Roleplay AI evaluation includes recent study history (14 days) for contextualized feedback

## Corporate/Organization System
- Organizations: create with name, auto-generate invite code
- Members: join via invite code, roles (admin/member)
- Seat count updates: PostgreSQL advisory locks (pg_advisory_xact_lock) in DB transactions prevent race conditions; Stripe failure triggers compensation rollback
- Practice logs: auto-recorded on roleplay end + skill card practice evaluate, includes orgId if user belongs to org
- Admin dashboard: member scores (overall + 4-axis), weekly practice counts, non-participants list, completion rates, curriculum progress
- Curriculum: admin assigns skill cards per week, notifications sent to members, progress tracked
- Growth trends: weekly/monthly score charts with 4-axis breakdown (recharts LineChart + RadarChart)
- Notifications: in-app bell icon with unread count, curriculum assignment notifications

## AI Model Constraints (gpt-5-nano)
- NEVER use `role: "system"` messages — returns empty content in both streaming and json_object modes
- NEVER use `stream: true` — streaming returns empty content regardless of message format; use non-streaming calls instead
- NEVER use multi-message conversations — only single `{ role: "user" }` messages work reliably; multi-turn history returns empty content
- NEVER use `response_format: { type: "json_object" }` for complex/long prompts — returns empty `{}`
- Instead: merge system instructions into the user message, and parse JSON manually from response text
- For multi-turn chat: flatten conversation history into a single user message with labeled turns (営業: / 顧客: etc.)
- For chat-style responses: use non-streaming API call and send result as single SSE event to preserve frontend SSE parsing
- For JSON responses: use regex `rawText.match(/\{[\s\S]*\}/)` to extract JSON from free-form response

## Dev Commands
- `npm run dev` - Start dev server
- `npm run db:push` - Push schema changes
- `npx tsx server/seed-stripe.ts` - Seed Stripe products (run once)

## User Preferences
- Japanese UI language
- Mobile-first responsive design
- Instagram-style bottom navigation (Home, Skills, RP, Diag, Org)
- Skill cards are global/shared; user progress (履修済み) tracked per-user in user_skill_progress
- Recommendations show relevant cards even if already completed
- AI auto-generates skill cards without asking permission
