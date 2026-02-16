# DealCoach - AI営業スキルトレーニングプラットフォーム

## Overview
AI-powered sales skill training platform with roleplay practice, skill diagnosis, and structured learning content. Japanese-focused UI.

## Architecture
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM + Stripe schema (managed by stripe-replit-sync)
- **Auth**: Replit Auth (OIDC) - Google, GitHub, X, Apple, email/password
- **AI**: OpenAI via Replit AI Integrations (gpt-5-nano for roleplay/analysis)
- **Payments**: Stripe (via Replit connector, stripe-replit-sync for webhooks/data sync)

## Key Features
1. Landing page (unauthenticated) with 6 feature cards
2. Dashboard with skill scores, AI-powered recommendations, activity, calendar link
3. Enriched skill card learning (50 cards, 6 categories) with per-user completion tracking
   - Rich content: whyEffective, mechanism, usageScenario, failurePatterns, checklist, successStory
   - Category filtering and search
   - AI practice exercises with evaluation
4. AI roleplay with 2 modes: personality-type selection (6 types + 3 difficulty levels) and custom free-form with AI pre-questioning
5. Post-roleplay feedback chat with AI coach (SSE streaming, follow-up questions)
6. AI auto-generated skill cards from roleplay weaknesses (shared globally, deduped by titleJa, includes all enriched fields)
7. Chat-based skill card practice: AI plays customer role in BtoB sales scenarios, multi-turn conversation with evaluation
8. Skill diagnosis (4-axis: listening, questioning, empathy, closing)
9. Pricing page (3 tiers: Free ¥0, Basic ¥3,000/月, Pro ¥4,500/月) - Stripe Checkout integration with monthly/annual billing
10. Subscription management & cancellation via Stripe Customer Portal
11. Learning calendar: monthly view showing study history + scheduled studies with add/delete
12. Mobile-first design with bottom navigation (Home, Skills, RP, Diag, Cal)
13. Dark/light mode toggle

## Project Structure
- `client/src/pages/` - Landing, Dashboard, Skills, Roleplay, Diagnosis, Pricing, Calendar
- `client/src/components/` - ThemeProvider, ThemeToggle, BottomNav, UI components
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - DatabaseStorage with Drizzle
- `server/stripeClient.ts` - Stripe client via Replit connector
- `server/webhookHandlers.ts` - Stripe webhook processing
- `server/seed.ts` - Seed orchestrator
- `server/seed-cards-1.ts` - Skill cards 1-25 seed data
- `server/seed-cards-2.ts` - Skill cards 26-50 seed data
- `server/seed-stripe.ts` - Stripe product/price seeding script
- `shared/schema.ts` - All Drizzle schemas and types
- `server/replit_integrations/auth/` - Replit Auth module

## API Endpoints
- `GET /api/auth/user` - Current user
- `GET /api/subscription` - User subscription
- `GET /api/skill-cards` - All skill cards
- `GET /api/scenarios` - Roleplay scenarios (legacy)
- `POST /api/roleplay/start` - Start roleplay session (mode: personality|custom + config + difficulty)
- `POST /api/roleplay/custom-prepare` - AI pre-questioning for custom mode
- `POST /api/roleplay/message` - Send message (SSE streaming)
- `POST /api/roleplay/end` - End session, get diagnosis
- `POST /api/feedback/start` - Start feedback chat (analyzes session, auto-generates skill cards)
- `POST /api/feedback/chat` - Follow-up feedback conversation (SSE streaming)
- `POST /api/skill-cards/:id/complete` - Mark skill card as completed by user
- `POST /api/skill-cards/:id/practice/start` - Start chat-based practice (generates scenario + customer's first message)
- `POST /api/skill-cards/:id/practice/message` - Send message in practice chat (AI responds as customer)
- `POST /api/skill-cards/:id/practice/evaluate` - Evaluate full practice conversation with AI
- `GET /api/skill-progress` - User's skill card completion progress
- `GET /api/recommendations` - AI-powered skill card recommendations based on latest diagnosis
- `GET /api/diagnosis/latest` - Latest skill diagnosis
- `GET /api/diagnosis/history` - Diagnosis history
- `GET /api/progress/recent` - Recent activity
- `GET /api/study-logs/today` - Today's skill card study logs for current user
- `GET /api/study-logs/recent?days=N` - Recent study logs (default 30 days)
- `POST /api/study-logs` - Record a skill card study (body: { skillCardId })
- `GET /api/stripe/publishable-key` - Stripe publishable key
- `GET /api/stripe/prices` - Dynamic price IDs from Stripe (by product metadata/name lookup)
- `POST /api/stripe/checkout` - Create Stripe Checkout session (body: { priceId, plan, billingCycle })
- `POST /api/stripe/portal` - Create Stripe Customer Portal session (for plan management/cancellation)
- `POST /api/stripe/sync-subscription` - Sync subscription status from Stripe to local DB
- `POST /api/stripe/webhook` - Stripe webhook endpoint (raw body, registered before express.json)
- `GET /api/calendar/study-logs?month=YYYY-MM` - Study logs for a given month
- `GET /api/calendar/scheduled?month=YYYY-MM` - Scheduled studies for a given month
- `POST /api/calendar/schedule` - Add scheduled study (body: { skillCardId, scheduledDate })
- `DELETE /api/calendar/schedule/:id` - Delete a scheduled study

## Database Tables
users, sessions (auth), subscriptions (with stripeCustomerId, stripeSubscriptionId), skill_cards (with isAiGenerated, sourceSessionId), roleplay_scenarios, roleplay_sessions (with feedbackChatMessages), skill_diagnoses, user_progress, user_skill_progress, skill_card_study_logs, scheduled_studies, conversations, messages

## Stripe Integration
- Products created via Stripe API (seed-stripe.ts): DealCoach Basic, DealCoach Pro
- Each product has monthly and annual prices in JPY
- Price IDs are fetched dynamically via /api/stripe/prices (no hardcoded IDs)
- Products looked up by metadata.plan ("basic"/"pro") with name fallback
- Auto-seeding of Stripe products on startup if missing (all environments)
- stripeClient.ts: Replit connector first, fallback to STRIPE_SECRET_KEY/STRIPE_PUBLISHABLE_KEY env vars
- stripe-replit-sync manages stripe schema tables (products, prices, subscriptions, customers)
- Webhook registered BEFORE express.json() in index.ts
- Subscription status: stored in local subscriptions table, synced from Stripe on checkout success
- Cancellation: via Stripe Customer Portal (cancel_at_period_end, access until period end)

## Skill Card Study System
- All plans: Study logs recorded when opening a skill card (tracks learning history)
- Free plan: 1日3枚まで制限。カード選択時に確認ダイアログ表示。学習済みカードは再閲覧可能
- Basic/Pro: 制限なし、確認ダイアログなし、学習記録は同様に蓄積
- Roleplay AI evaluation includes recent study history (14 days) for contextualized feedback

## Dev Commands
- `npm run dev` - Start dev server
- `npm run db:push` - Push schema changes
- `npx tsx server/seed-stripe.ts` - Seed Stripe products (run once)

## User Preferences
- Japanese UI language
- Mobile-first responsive design
- Instagram-style bottom navigation
- Skill cards are global/shared; user progress (履修済み) tracked per-user in user_skill_progress
- Recommendations show relevant cards even if already completed
- AI auto-generates skill cards without asking permission
