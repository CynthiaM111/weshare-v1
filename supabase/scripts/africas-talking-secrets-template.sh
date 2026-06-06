#!/usr/bin/env bash
# Store Africa's Talking credentials for the send-sms Auth Hook.
#
# Usage:
#   export AT_USERNAME="sandbox"          # or your production app username
#   export AT_API_KEY="your_at_api_key"
#   export AT_SENDER_ID="WeShare"         # optional; register sender ID for production RW
#   export SEND_SMS_HOOK_SECRET="v1,whsec_..."  # from Supabase Auth → Hooks → Send SMS
#   bash supabase/scripts/africas-talking-secrets-template.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."
unset SUPABASE_ACCESS_TOKEN

: "${AT_USERNAME:?Set AT_USERNAME (sandbox or production app username)}"
: "${AT_API_KEY:?Set AT_API_KEY from Africa's Talking dashboard}"
: "${SEND_SMS_HOOK_SECRET:?Set SEND_SMS_HOOK_SECRET from Supabase Auth → Hooks → Send SMS}"

AT_SENDER_ID="${AT_SENDER_ID:-WeShare}"

npx supabase secrets set \
  AT_USERNAME="$AT_USERNAME" \
  AT_API_KEY="$AT_API_KEY" \
  AT_SENDER_ID="$AT_SENDER_ID" \
  SEND_SMS_HOOK_SECRET="$SEND_SMS_HOOK_SECRET"

echo "Africa's Talking secrets saved. Deploy: npx supabase functions deploy send-sms"
echo "Then enable Send SMS hook in Supabase Dashboard → Authentication → Hooks."
