# External Integrations

**Analysis Date:** 2026-04-03

## Supabase (Primary Backend)

**Type:** PostgreSQL Database + Auth + Storage + RLS

**Connection:**
- URL: `NEXT_PUBLIC_SUPABASE_URL` (env var)
- Anon Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (env var, browser-safe)
- Service Role Key: `SUPABASE_SERVICE_ROLE_KEY` (env var, server-only)

**What it's used for:**
- User authentication (Supabase Auth)
- PostgreSQL database (all application data)
- Row Level Security policies (data access control)
- Storage buckets (strain images)
- Realtime subscriptions (disabled - using polling instead)

**Supabase Storage Buckets:**
- `strains-images` - Public bucket for strain photos
  - Configured via supabase-schema.sql
  - RLS policies for strain image admin override

**Database Schema (key tables):**
- `profiles` - User profiles (extends Supabase Auth)
- `strains` - Strain catalog (470+ strains)
- `ratings` - Strain ratings with reviews
- `user_strain_relations` - Favorites and wishlist
- `user_collection` - Private notes, batch info
- `organizations` - Clubs and pharmacies
- `organization_members` - Membership with roles (gründer, admin, member, viewer)
- `organization_invites` - Invite tokens
- `follows`, `follow_requests` - Social graph
- `user_activities` - Activity feed events
- `user_badges` - Badge achievements
- `push_subscriptions` - Web Push subscriptions
- `filter_presets` - Saved filter configurations
- `gdpr_deletion_requests`, `gdpr_export_jobs`, `user_consents` - GDPR compliance
- `push_subscriptions` - Push notification endpoints

**RLS Policy Pattern:**
- `is_active_org_member()` SECURITY DEFINER helper function avoids recursion in org membership checks
- Profiles are publicly readable
- Organization data is publicly readable
- Personal user data is private with RLS

**Files:**
- `src/lib/supabase/client.ts` - Browser client (lazy singleton)
- `src/lib/supabase/server.ts` - Server-side client (per-request)
- `supabase-schema.sql` - Complete schema with RLS policies

---

## Vercel (Deployment)

**Type:** Hosting and CI/CD

**Configuration:**
- vercel.json defines build/dev/install commands
- .env.vercel for deployment environment variables

**What it's used for:**
- Production hosting (https://greenlog.app)
- Automatic deployments from git
- Edge middleware execution
- Environment variable management

**Middleware:**
- Rate limiting at edge (in-memory, resets on cold start)
- 100 requests/minute for API, 1000 for pages

---

## Sentry (Error Tracking)

**Type:** Error tracking and performance monitoring

**DSN:** `NEXT_PUBLIC_SENTRY_DSN` (client), `SENTRY_DSN` (server)

**Configuration:**
- sentry.client.config.ts - Client-side tracking
- sentry.server.config.ts - Server-side tracking
- sentry.edge.config.ts - Edge runtime tracking
- tracePropagationTargets: `["localhost", /^(api\.)?greenlog.app$/]`
- replaysSessionSampleRate: 0.1 (10% of sessions)
- Only enabled in production (NODE_ENV === "production")

**What it's used for:**
- Error monitoring in production
- Performance traces
- Session replay for debugging

---

## Web Push Notifications

**Type:** Browser push notifications

**VAPID Keys:**
- Public Key: `VAPID_PUBLIC_KEY` (browser-safe)
- Private Key: `VAPID_PRIVATE_KEY` (server-only)
- Subject: `mailto:admin@greenlog.app` or `NEXT_PUBLIC_SITE_URL`

**Implementation:**
- web-push 3.6.7 library
- push_subscriptions table stores endpoint/p256dh/auth
- sendPushToUser() function in `src/lib/push.ts`
- Automatic cleanup of expired subscriptions (410 Gone responses)

**API Routes:**
- `/api/push/subscribe` - Store push subscription
- `/api/push/unsubscribe` - Remove subscription
- `/api/push/vapid-public-key` - Serve VAPID public key

---

## Leafly (External Strain Data)

**Type:** Web scraping for strain information

**What it's used for:**
- Strain data import (THC, CBD, terpenes, flavors, effects)
- Strain image URLs
- Description scraping

**Implementation:**
- `/api/import/leafly/route.ts` - POST endpoint
- Scrapes __NEXT_DATA__ from Leafly strain pages
- Falls back to meta tags and keyword matching
- No API key required (scraping public pages)

**Scrape Scripts:**
- `scripts/import-leafly-batch.mjs` and similar batch scripts
- Used during initial data population

---

## GDPR Compliance APIs

**Type:** User data management

**Endpoints:**
- `/api/gdpr/export` - Export user data
- `/api/gdpr/delete` - Delete/anonymize user account
- `/api/gdpr/consent` - Record consent preferences

**Special Handling:**
- Users with active org memberships: data is anonymized (legal requirement - 3 year retention)
- Users without memberships: full deletion including Supabase Auth user
- Service role client required for GDPR operations

**Tables:**
- `gdpr_deletion_requests` - Tracks deletion status
- `gdpr_export_jobs` - Tracks export jobs
- `user_consents` - Stores consent records

---

## Image CDN (Strain Images)

**Type:** External image hosting via Supabase Storage

**Domains configured in next.config.ts:**
- `uwjyvvvykyueuxtdkscs.supabase.co` - Supabase Storage
- `www.leafly.com` - Leafly images
- `images.leafly.com` - Leafly CDN images

**What it's used for:**
- Strain photographs in Supabase Storage bucket
- Remote pattern configuration allows Next.js Image optimization

---

## Environment Variables Summary

**Required for Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-only service role key

**Optional APIs:**
- `MINIMAX_API_KEY` - AI features (not currently used in main branch)
- `GITHUB_TOKEN` - CI/CD workflows

**App Configuration:**
- `APP_ADMIN_IDS` - Comma-separated user IDs with admin privileges
- `FEEDBACK_ALLOWED_CREATOR_IDS` - Users allowed to create tickets
- `NEXT_PUBLIC_SITE_URL` - Production URL (https://greenlog.app)

**Monitoring:**
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking
- `SENTRY_ORG`, `SENTRY_PROJECT` - Sentry project config
- `SENTRY_AUTH_TOKEN` - CI/CD only (not in .env.local)

**Push Notifications:**
- `VAPID_PUBLIC_KEY` - Web push public key
- `VAPID_PRIVATE_KEY` - Web push private key

---

## Deployment Configuration

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

**middleware.ts:**
- Edge middleware for rate limiting
- Matcher excludes _next/static, _next/image, etc.
- In-memory rate limit store (not persistent across cold starts)

---

## External Services Status

| Service | Status | Purpose |
|---------|--------|---------|
| Supabase | Active | Database, Auth, Storage |
| Vercel | Active | Hosting |
| Sentry | Active | Error tracking |
| Web Push | Active | Browser notifications |
| Leafly | Active (scraping) | Strain data import |
| MiniMax | Not used | Reserved for AI features |
| GitHub | CI/CD | Reserved for workflows |

---

*Integration audit: 2026-04-03*
