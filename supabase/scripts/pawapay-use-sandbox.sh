#!/usr/bin/env bash
# Switch linked Supabase project to PawaPay sandbox (both credential sets must already be in secrets).
set -euo pipefail
cd "$(dirname "$0")/.."
unset SUPABASE_ACCESS_TOKEN
npx supabase secrets set PAWAPAY_ENV=sandbox
echo "PawaPay backend: SANDBOX (api.sandbox.pawapay.io)"
echo "Callback URLs: sandbox dashboard → pawapay-webhook/deposit and /payout"
