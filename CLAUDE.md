# DeepBrain Educational Game Platform

## Overview
An integrated educational gaming platform that serves as a unified portal for multiple cognitive training games. The platform manages user authentication, progress tracking, billing, and game access across a collection of educational titles.

## Architecture

### Stack
**Backend (Railway)**
- FastAPI + SQLAlchemy + PostgreSQL
- JWT authentication with cross-subdomain cookies
- Stripe integration for subscriptions
- Redis caching (optional)

**Frontend (Cloudflare Pages)**
- Next.js 15 + React 18 + TypeScript
- Tailwind CSS for styling
- next-intl for i18n (English/Chinese)
- Google OAuth integration

### Deployment
- Frontend: Cloudflare Pages (Next.js standalone)
- Backend: Railway (FastAPI)
- Database: PostgreSQL with Alembic migrations
- Local Development: Docker Compose with hot reload

## Core Features

### 1. Authentication System
- Email/password + Google OAuth
- JWT tokens in HttpOnly cookies
- Cross-subdomain authentication for embedded games
- Per-game token generation with configurable expiry

### 2. User Management
- Profile management (avatar, DOB, country)
- Multi-currency economy (coins, diamonds, flowers)
- Daily check-ins with streak tracking
- 6D cognitive scoring (memory, logic, focus, reaction, strategy, spatial)

### 3. Game Integration
Games categorized by cognitive dimensions with three integration patterns:
- **Token-based**: Embedded games receive JWT for auth validation
- **Analytics-tracked**: External games log play activity via API
- **External links**: Games on separate subdomains

Configuration-driven game registry allows adding new games without code changes.

### 4. Learning Module
- Topic/module-based assessments
- Practice reports with detailed analytics
- Question-level attempt tracking
- Diamond/subscription-gated course access
- Study time aggregation

### 5. Billing & Membership
- Stripe subscriptions (Free/Plus/Premium)
- Monthly/annual billing with 7-day trials
- One-time purchases (coins, diamonds)
- Customer portal for subscription management
- Webhook-driven subscription lifecycle

### 6. Social Features
- Leaderboards with cognitive dimension rankings
- Game likes/favorites
- Notification system
- AI chat (Monkey Chat)

## Key Design Patterns

### Backend Architecture
- **RESTful API**: Domain-based routers (auth, user, games, billing)
- **Dependency Injection**: FastAPI Depends() for DB sessions and auth
- **Response Wrapper**: Consistent `APIResponse` schema
- **Normalized Schema**: Foreign keys, indexes, cascading deletes

### Frontend Organization
- **Locale-aware routing**: `[locale]` dynamic segments
- **Layout colocation**: Shared AppShell for authenticated routes
- **Custom hooks**: `useAuth`, `useCognitiveScores`, `useGameLauncher`
- **API services**: Domain-specific client wrappers with type safety

### Configuration-Driven
- Game registry for dynamic game additions
- Shop items configuration
- Learning commerce config for course unlocks
- Cognitive dimension mappings

## Data Models

```
User (central entity)
├── UserRewards (currency balances)
├── UserCognitiveScores (6D assessments)
├── UserGameAccess (per-game tracking)
├── UserGameReward (per-game mode stats)
├── UserGamePlayByDay (daily engagement)
├── UserLearningTopicProgress (learning tracking)
├── UserLearningPracticeReport (test results)
├── UserCourseEntitlement (paid access)
└── UserCheckIn / UserTaskClaim (daily/monthly tasks)
```

## File Structure

```
backend/api/
├── main.py              # FastAPI app, CORS, route registration
├── models.py            # SQLAlchemy ORM models
├── schemas.py           # Pydantic models
├── database.py          # DB connection & migrations
├── auth.py              # JWT utilities
├── config/              # Game/shop/learning configurations
└── routes/              # Domain routers (auth, user, games, billing)

frontend/main_page/
├── app/[locale]/        # Locale-specific routes
│   ├── (app)/          # Authenticated routes
│   │   ├── dashboard/
│   │   ├── braingames/
│   │   ├── training/
│   │   ├── learning/
│   │   └── membership/
├── components/          # React components
├── services/            # API clients
├── hooks/               # Custom React hooks
├── config/              # Game registry, learning config
└── types/               # TypeScript interfaces
```

## Key Insights

1. **Modular Game Integration**: Games are loosely coupled via JWT tokens - new games only need config entries
2. **Membership-Gated Content**: Learning modules locked behind subscription tiers
3. **Multi-Currency Economy**: Coins (earned), Diamonds (paid), Flowers (activity rewards)
4. **Cross-Domain Security**: HttpOnly cookies + SameSite=lax for sibling subdomains
5. **Comprehensive Audit Trail**: Every user action logged for analytics
6. **Progressive Enhancement**: Games work with or without tokens depending on integration type

## Development Workflow

1. Create game in separate repository
2. Branch from `main` with game name
3. Add game configuration entries (no code changes needed for backend)
4. Update frontend game registry and launch logic
5. Submit PR for admin approval

## Notable Games

- **QuantumGo**: Strategic Go with quantum pair mechanics
- **FogChess**: Chess with fog-of-war elements
- **ChessMater**: Chess variant with special mechanics
- **Sudoku Battle**: Competitive Sudoku gameplay
- **Dash Dot Simulator**: Spatial reasoning game
