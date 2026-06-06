#!/usr/bin/env bash
# Switch linked Supabase project to PawaPay production.
set -euo pipefail
cd "$(dirname "$0")/.."
unset SUPABASE_ACCESS_TOKEN
npx supabase secrets set PAWAPAY_ENV=production
echo "PawaPay backend: PRODUCTION (api.pawapay.io)"
echo "Callback URLs: production dashboard → pawapay-webhook/deposit and /payout"
