#!/usr/bin/env bash
# Turn off dev OTP bypass before public launch; restore AT SMS delivery.
set -euo pipefail
cd "$(dirname "$0")/.."
unset SUPABASE_ACCESS_TOKEN

npx supabase secrets set OTP_DEV_BYPASS=false

echo "Internal testing OTP bypass OFF — Africa's Talking SMS will send again."
echo "MoMo mock for test numbers is also OFF (requires OTP_DEV_BYPASS=true)."
echo "Flip PAWAPAY_ENV separately if needed: bash supabase/scripts/pawapay-use-sandbox.sh"
