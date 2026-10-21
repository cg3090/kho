# Netlify + Supabase deployment audit

This repository currently has **two different runtime database paths**. Deployment must not be considered complete merely because `/api/db/status` can connect to PostgreSQL.

## Verified current architecture

- `netlify/functions/api.ts` forwards web requests to the Hono app from `src/server/app.ts`.
- `src/server/app.ts` implements most CRUD/auth routes through `getDb(c.env)` from `src/db/d1Client.ts`, which uses Drizzle's **Cloudflare D1** adapter.
- The `/api/db/status` route tests PostgreSQL via `pg`, but `/api/db/state` reads **D1**, and `/api/db/collection/:key` writes **D1**. A successful PostgreSQL status does not prove application data is stored in Supabase.
- In Node environments without a Cloudflare D1 binding, `getDb` falls back to local `.d1-local` SQLite. This is not safe persistent storage for serverless Netlify Functions.
- `prisma/schema.prisma` uses PostgreSQL `DATABASE_URL`, but the current Hono business routes have not been switched to Prisma.
- `server.ts` starts an Express/Vite local server. Netlify does **not** start that server.

## Security blockers before public launch

1. `/api/auth/login` constructs predictable tokens in the format `cf-token-${user.id}-${Date.now()}`. `/api/auth/me` parses the user ID from an unverified token and falls back to an ADMIN user when lookup fails. Replace with signed, validated sessions and verified permissions.
2. `/api/db/connect` accepts database connection details in a client-supplied request. Do not expose this ability without strong administrative authorization and host restrictions.
3. Protect all mutation and admin APIs with server-side authorization; CORS is not authentication.
4. Never expose `DATABASE_URL`, `POSTGRES_URL` or `SUPABASE_SERVICE_ROLE_KEY` through `VITE_*` variables.

## Migration plan (non-destructive)

1. Decide on Supabase PostgreSQL as the authoritative datastore and inventory all D1 data and endpoint behaviors.
2. Introduce a PostgreSQL repository/service implementation with transaction tests for authentication, stock movement, reversal, webshop orders and accounting. Do not silently route unsupported mutations to ephemeral SQLite.
3. Add signed auth, authorization middleware and integration tests before public deployment.
4. Back up the source D1 and target PostgreSQL databases; run schema and data migration only after review. Do not run `prisma db push`, mock purge, D1 reset or automatic seeding during deployment.
5. Verify records, stock balances, debts and journals against the source before switching production traffic.
6. Configure Netlify environment variables for server-only database credentials. Verify `/api/health`, `/api/db/status` and a protected authenticated read/write transaction using a dedicated test account.
7. Only after these checks, enable the production deployment and remove D1 local fallback from Netlify runtime.

## Build configuration

Current `vite.config.ts` uses the default `dist` output. `npm run build` runs `prisma generate && vite build`. Netlify configuration already specifies `publish = "dist"` and `netlify/functions`.

Review the Netlify function dependency bundling for `fs`, `node:sqlite`, native Prisma engines, and `pg` before confirming production compatibility.

**Status:** audit completed; no production migration or public-API switch performed.
