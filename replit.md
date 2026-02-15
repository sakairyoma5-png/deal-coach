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
2. Dashboard with skill scores, recommendations, activity
3. Skill card learning (SPIN, Mirroring, etc.)
4. AI roleplay with streaming chat
5. Skill diagnosis (4-axis: listening, questioning, empathy, closing)
6. Pricing page (3 tiers: Free, Basic, Pro)
7. Mobile-first design with bottom navigation
8. Dark/light mode toggle

## Project Structure
- `client/src/pages/` - Landing, Dashboard, Skills, Roleplay, Diagnosis, Pricing
- `client/src/components/` - ThemeProvider, ThemeToggle, BottomNav, UI components
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - DatabaseStorage with Drizzle
- `server/seed.ts` - Seed data for skill cards and scenarios
- `shared/schema.ts` - All Drizzle schemas and types
- `server/replit_integrations/auth/` - Replit Auth module
- `server/replit_integrations/chat/` - Chat module (not used directly)

## API Endpoints
- `GET /api/auth/user` - Current user
- `GET /api/subscription` - User subscription
- `GET /api/skill-cards` - All skill cards
- `GET /api/scenarios` - Roleplay scenarios
- `POST /api/roleplay/start` - Start roleplay session
- `POST /api/roleplay/message` - Send message (SSE streaming)
- `POST /api/roleplay/end` - End session, get diagnosis
- `GET /api/diagnosis/latest` - Latest skill diagnosis
- `GET /api/diagnosis/history` - Diagnosis history
- `GET /api/progress/recent` - Recent activity

## Database Tables
users, sessions (auth), subscriptions, skill_cards, roleplay_scenarios, roleplay_sessions, skill_diagnoses, user_progress, conversations, messages (chat integration)

## Dev Commands
- `npm run dev` - Start dev server
- `npm run db:push` - Push schema changes

## User Preferences
- Japanese UI language
- Mobile-first responsive design
- Instagram-style bottom navigation
