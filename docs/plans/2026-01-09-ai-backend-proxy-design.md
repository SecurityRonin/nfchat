# AI Backend Proxy Design

## Overview

Lightweight backend to proxy AI calls with rate limiting, bot protection, and data retention for security research.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (SPA)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  DuckDB-WASM │  │  Chat UI    │  │  Turnstile Widget   │ │
│  │  (SQL exec)  │  │             │  │  (bot protection)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL BACKEND                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  /api/chat  │  │ /api/auth   │  │  /api/stripe        │ │
│  │  (AI proxy) │  │ (GitHub)    │  │  (webhooks)         │ │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘ │
│         │                                                   │
│  ┌──────▼──────────────────────────────────────────────────┐│
│  │              Vercel Postgres                            ││
│  │  users | conversations | credits | rate_limits          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Anthropic API  │
                    └─────────────────┘
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | Vercel | Unified platform with frontend |
| Database | Vercel Postgres | Integrated, SQL for research |
| Auth | GitHub OAuth | Low friction for dev audience |
| Bot protection | Cloudflare Turnstile | Free, invisible CAPTCHA |
| Payment | Stripe credit packs | Simple, predictable for users |
| Data flow | AI-driven fetching | AI requests what it needs |
| BYOK | Not supported | All calls through proxy for research |

## Rate Limiting Tiers

| Tier | Queries/day | How to access |
|------|-------------|---------------|
| Free | 2 | Anyone |
| Authenticated | 10 | GitHub login |
| Paid | Buy credits | Stripe purchase |

## Credit Packs

| Pack | Credits | Price | Per query |
|------|---------|-------|-----------|
| Starter | 20 | $5 | $0.25 |
| Pro | 100 | $20 | $0.20 |
| Team | 500 | $75 | $0.15 |

## AI-Driven Data Fetching Flow

```
User: "Which IPs are doing port scans?"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Client → Backend                                    │
│ POST /api/chat                                              │
│ { question, turnstileToken, sessionId }                     │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Backend validates & asks AI what data it needs      │
│ → Verify Turnstile token                                    │
│ → Check rate limit (2/10/credits)                           │
│ → Ask Claude: "What SQL queries do you need?"               │
│ ← Claude returns: ["SELECT IPV4_SRC_ADDR, COUNT(DISTINCT    │
│    L4_DST_PORT) as ports FROM flows GROUP BY 1 HAVING       │
│    ports > 100 ORDER BY ports DESC LIMIT 20"]               │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Backend → Client (data request)                     │
│ { type: "data_needed", queries: [...] }                     │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Client executes SQL locally via DuckDB-WASM         │
│ → Validates SQL (SELECT only, LIMIT enforced)               │
│ → Runs queries, collects results                            │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Client → Backend (with data)                        │
│ POST /api/chat                                              │
│ { question, queryResults, sessionId }                       │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Backend sends to Claude with context                │
│ → Store full conversation in Postgres (research)            │
│ → Decrement credits/rate limit                              │
│ → Stream response to client                                 │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

```sql
-- Users (from GitHub OAuth)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id     BIGINT UNIQUE NOT NULL,
  github_login  VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  credits       INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting (daily usage tracking)
CREATE TABLE rate_limits (
  user_id       UUID REFERENCES users(id),
  anonymous_ip  VARCHAR(45),  -- For non-authenticated users
  date          DATE DEFAULT CURRENT_DATE,
  count         INTEGER DEFAULT 0,
  PRIMARY KEY (COALESCE(user_id, anonymous_ip::uuid), date)
);

-- Conversations (research data)
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),  -- NULL if anonymous
  session_id    VARCHAR(64) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Messages within conversations
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  role          VARCHAR(20) NOT NULL,  -- 'user', 'assistant', 'data_request'
  content       JSONB NOT NULL,        -- question, SQL queries, results, response
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe credit purchases
CREATE TABLE purchases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) NOT NULL,
  stripe_id     VARCHAR(255) NOT NULL,
  credits       INTEGER NOT NULL,
  amount_cents  INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/github` | GET | GitHub OAuth redirect |
| `/api/auth/callback` | GET | OAuth callback, create session |
| `/api/auth/me` | GET | Get current user & credits |
| `/api/auth/logout` | POST | Clear session |
| `/api/chat` | POST | AI query (2-step flow) |
| `/api/stripe/checkout` | POST | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Handle payment success |

## User Consent

Shown before first AI query:

```
┌─────────────────────────────────────────────────────────────┐
│                    Research Disclosure                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  By using nfchat's AI analysis, you agree that:             │
│                                                             │
│  • Your questions and query results will be retained        │
│  • Data may be used for security research purposes          │
│  • Aggregated insights may be published (anonymized)        │
│                                                             │
│  Your contributions help improve network threat detection   │
│  for the security community.                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [ ] I understand and consent to data retention      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              [ Cancel ]    [ Accept & Continue ]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Store `consent_given_at` in localStorage
- Re-prompt if consent > 90 days old
- Show "Research mode" badge in chat header

## Client-Side SQL Validation

Before executing AI-requested SQL:

```typescript
function validateSQL(sql: string): boolean {
  const normalized = sql.trim().toUpperCase();

  // Only SELECT allowed
  if (!normalized.startsWith('SELECT')) return false;

  // No dangerous keywords
  const forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE'];
  if (forbidden.some(kw => normalized.includes(kw))) return false;

  // Must have LIMIT (add if missing)
  if (!normalized.includes('LIMIT')) {
    sql += ' LIMIT 10000';
  }

  return true;
}
```

## Environment Variables

```env
# Vercel Postgres
POSTGRES_URL=

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Cloudflare Turnstile
TURNSTILE_SECRET_KEY=

# Anthropic
ANTHROPIC_API_KEY=
```

## Implementation Order

1. Set up Vercel Postgres, create schema
2. Implement GitHub OAuth flow
3. Add Turnstile bot protection
4. Build `/api/chat` endpoint with AI-driven flow
5. Add rate limiting logic
6. Implement Stripe checkout & webhooks
7. Add consent modal to frontend
8. Update Chat component for 2-step flow
