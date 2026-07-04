#!/usr/bin/env bash
# Push Supabase env vars from .env.local to Vercel.
# Usage: ./scripts/set-vercel-env.sh
# Requires: npx vercel login && npx vercel link (once)

set -euo pipefail

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — create it from .env.example first."
  exit 1
fi

# shellcheck disable=SC1091
source .env.local

vars=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
)

for name in "${vars[@]}"; do
  value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "Skip $name (empty in .env.local)"
    continue
  fi
  echo "Setting $name on Vercel (production, preview, development)..."
  printf '%s' "$value" | npx vercel@latest env add "$name" production
  printf '%s' "$value" | npx vercel@latest env add "$name" preview
  printf '%s' "$value" | npx vercel@latest env add "$name" development
done

echo "Done. Redeploy from the Vercel dashboard or run: npx vercel --prod"
