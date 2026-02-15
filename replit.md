# DealCoach - AI営業スキルトレーニングプラットフォーム

## Overview
AI-powered sales skill training platform with roleplay practice, skill diagnosis, and structured learning content. Japanese-focused UI.

## Architecture
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OIDC) - Google, GitHub, X, Apple, email/password
- **AI**: OpenAI via Replit AI Integrations (gpt-5-nano for roleplay/analysis)

## Key Features
1. Landing page (unauthenticated) with 6 feature cards
2. Dashboard with skill scores, AI-powered recommendations, activity
3. Enriched skill card learning (50 cards, 6 categories) with per-user completion tracking
   - Rich content: whyEffective, mechanism, usageScenario, failurePatterns, checklist, successStory
   - Category filtering and search
   - AI practice exercises with evaluation
4. AI roleplay with 2 modes: personality-type selection (6 types + 3 difficulty levels) and custom free-form with AI pre-questioning
5. Post-roleplay feedback chat with AI coach (SSE streaming, follow-up questions)
6. AI auto-generated skill cards from roleplay weaknesses (shared globally, deduped by titleJa, includes all enriched fields)
7. Skill diagnosis (4-axis: listening, questioning, empathy, closing)
8. Pricing page (3 tiers: Free, Basic, Pro) - UI only, no Stripe
9. Mobile-first design with bottom navigation
10. Dark/light mode toggle

## Project Structure
- `client/src/pages/` - Landing, Dashboard, Skills, Roleplay, Diagnosis, Pricing
- `client/src/components/` - ThemeProvider, ThemeToggle, BottomNav, UI components
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - DatabaseStorage with Drizzle
- `server/seed.ts` - Seed orchestrator
- `server/seed-cards-1.ts` - Skill cards 1-25 seed data
- `server/seed-cards-2.ts` - Skill cards 26-50 seed data
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
- `POST /api/skill-cards/:id/practice` - Generate AI practice exercise for a skill card
- `POST /api/skill-cards/:id/practice/evaluate` - Evaluate user's practice answer with AI
- `GET /api/skill-progress` - User's skill card completion progress
- `GET /api/recommendations` - AI-powered skill card recommendations based on latest diagnosis
- `GET /api/diagnosis/latest` - Latest skill diagnosis
- `GET /api/diagnosis/history` - Diagnosis history
- `GET /api/progress/recent` - Recent activity

## Database Tables
users, sessions (auth), subscriptions, skill_cards (with isAiGenerated, sourceSessionId), roleplay_scenarios, roleplay_sessions (with feedbackChatMessages), skill_diagnoses, user_progress, user_skill_progress, conversations, messages

## Dev Commands
- `npm run dev` - Start dev server
- `npm run db:push` - Push schema changes

## User Preferences
- Japanese UI language
- Mobile-first responsive design
- Instagram-style bottom navigation
- Skill cards are global/shared; user progress (履修済み) tracked per-user in user_skill_progress
- Recommendations show relevant cards even if already completed
- AI auto-generates skill cards without asking permission
