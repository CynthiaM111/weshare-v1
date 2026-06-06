#!/usr/bin/env bash
# One-time setup: store BOTH sandbox and production credentials, then flip with pawapay-use-*.sh
#
# Usage (replace tokens, run from repo root):
#   bash supabase/scripts/pawapay-secrets-template.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

# Stale SUPABASE_ACCESS_TOKEN (e.g. a PawaPay JWT) overrides `supabase login` and breaks the CLI.
unset SUPABASE_ACCESS_TOKEN

: "${PAWAPAY_SANDBOX_API_TOKEN:?Set PAWAPAY_SANDBOX_API_TOKEN}"
: "${PAWAPAY_PRODUCTION_API_TOKEN:?Set PAWAPAY_PRODUCTION_API_TOKEN}"

npx supabase secrets set \
  PAWAPAY_ENV=sandbox \
  PAWAPAY_SANDBOX_BASE_URL=https://api.sandbox.pawapay.io \
  PAWAPAY_SANDBOX_API_TOKEN="$PAWAPAY_SANDBOX_API_TOKEN" \
  PAWAPAY_PRODUCTION_BASE_URL=https://api.pawapay.io \
  PAWAPAY_PRODUCTION_API_TOKEN="$PAWAPAY_PRODUCTION_API_TOKEN"

echo "Stored both environments. Active: sandbox (run pawapay-use-production.sh when going live)"
