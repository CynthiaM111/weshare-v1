#!/usr/bin/env bash
# Internal Play testing: production PawaPay + in-app OTP display (no AT SMS).
# Requires migration 20250607120000_dev_otp_display.sql applied.
#
# Mobile build: EAS profile "internal" (EXPO_PUBLIC_OTP_DEV_BYPASS=true).
#
set -euo pipefail
cd "$(dirname "$0")/.."
unset SUPABASE_ACCESS_TOKEN

npx supabase secrets set OTP_DEV_BYPASS=true PAWAPAY_ENV=production

echo "Internal testing mode ON:"
echo "  - OTP_DEV_BYPASS=true  → codes shown in app (no Africa's Talking SMS)"
echo "  - PAWAPAY_ENV=production"
echo ""
echo "Deploy functions: npx supabase functions deploy send-sms dev-otp-peek"
echo "Apply migration if needed: npx supabase db push"
echo "Build app: eas build --profile internal --platform android"
echo ""
echo "Before public launch run: bash supabase/scripts/internal-testing-disable.sh"
