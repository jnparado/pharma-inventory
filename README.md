# PharmaStock — Pharmacy Inventory Management

A pharmacy inventory system built with Next.js (App Router), TypeScript, Tailwind CSS, and Supabase.

## Features

- **Product management** — medicine name, SKU, category, unit, reorder level
- **Supplier management** — distributor contacts and details
- **Batch tracking** — every stock-in creates a batch with its own batch number, expiry date, and prices
- **FEFO stock out** — dispensing deducts from the batch expiring soonest first; expired batches are never dispensed
- **Purchase & sales history** — full transaction log of every stock movement
- **Low-stock alerts** — dashboard flags products at or below their reorder level
- **Expiry monitor** — batches grouped into expired / ≤30 days / ≤90 days, with suggested discounts for near-expiry stock and total value at risk

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com/dashboard](https://supabase.com/dashboard) with these tables: `products`, `categories`, `suppliers`, `product_batches`, and `inventory_transactions`.

3. **Configure environment variables.** Copy `.env.example` to `.env.local` and fill in the values from **Settings → API** in your Supabase project:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push the repo to GitHub and import it in [Vercel](https://vercel.com/new).
2. In **Project Settings → Environment Variables**, add all three variables (same names as `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Enable each variable for **Production**, **Preview**, and **Development**.
4. **Redeploy** the latest deployment (env vars only apply after a new build).

Or sync from your local `.env.local` after `npx vercel login` and `npx vercel link`:

```bash
./scripts/set-vercel-env.sh
```

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Dashboard: stats, low-stock alerts, expiring batches |
| `app/products/` | Product catalog (add/delete, stock levels) |
| `app/suppliers/` | Supplier directory |
| `app/stock/` | Stock in (receive batches), stock out (FEFO), transaction history |
| `app/expiry/` | Expiry monitor with discount suggestions |
| `app/actions.ts` | Server actions (CRUD + FEFO stock logic) |
| `lib/data.ts` | Server-side Supabase queries |
| `lib/supabase/` | Supabase client helpers (browser + server) |

## Notes

- The database tables are currently unrestricted (no RLS). Add Supabase Auth and row-level security policies before using this in production.
- Never commit real API keys. Keep secrets in `.env.local` and Vercel environment variables only.
