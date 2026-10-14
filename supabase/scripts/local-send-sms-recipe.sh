#!/usr/bin/env bash
# Recipe to run and test send-sms locally with standard-webhooks signatures.
set -euo pipefail

SECRET="MfKQ9r8GKYqrTwjUpUWDkrGhQqYjwZYi"
SECRET_BASE64="whsec_$SECRET"
PORT=54321
HOOK_URL="http://localhost:54321/functions/v1/send-sms"
MSG_ID="msg_$(date +%s)"
TIMESTAMP="$(date +%s)"

PAYLOAD='{"user":{"phone":"+250788123456"},"sms":{"otp":"654321"}}'

echo "================================================================="
echo "Local Run Recipe for Supabase Auth Send SMS Hook (send-sms)"
echo "================================================================="
echo "1. Serve the function locally:"
echo "   npx supabase functions serve send-sms --no-verify-jwt"
echo ""
echo "2. Required Environment Variables:"
echo "   SEND_SMS_HOOK_SECRET=\"$SECRET_BASE64\""
echo "   PINDO_API_TOKEN=\"<your-token>\""
echo "   SMS_PRIMARY=\"pindo\""
echo "   SMS_FALLBACK=\"africas_talking\""
echo "   SMS_SENDER=\"WeShare\""
echo ""
echo "3. Generating valid standard-webhooks signature..."

# Generate signature using Deno and standardwebhooks
SIGNATURE=$(/home/kimani/.deno/bin/deno eval "
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
const wh = new Webhook('$SECRET');
const sig = wh.sign('$MSG_ID', new Date($TIMESTAMP * 1000), '$PAYLOAD');
console.log(sig);
")

echo "Generated Signature: $SIGNATURE"
echo ""
echo "4. Sample curl invocation:"
cat << EOF
curl -i -X POST "$HOOK_URL" \\
  -H "Content-Type: application/json" \\
  -H "webhook-id: $MSG_ID" \\
  -H "webhook-timestamp: $TIMESTAMP" \\
  -H "webhook-signature: $SIGNATURE" \\
  -d '$PAYLOAD'
EOF

echo ""
echo "5. For Pindo DLR Webhook recipe:"
cat << EOF
curl -i -X POST "http://localhost:54321/functions/v1/pindo-dlr-webhook?token=\${PINDO_DLR_SECRET}" \\
  -H "Content-Type: application/json" \\
  -d '{"sms_id":"12345","status":"DELIVRD","retries_count":0,"modified_at":"2026-10-14T20:00:00Z"}'
EOF
