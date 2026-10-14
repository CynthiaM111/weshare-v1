# WeShare SMS Authentication & Delivery Smoke Testing Guide

This guide details step-by-step procedures to smoke test the Send SMS Hook, rate limiters, provider failover, delivery receipt webhooks, and monitoring views across local and staging environments.

---

## 1. Local Testing with `local-send-sms-recipe.sh`

A pre-configured executable script is provided at `supabase/scripts/local-send-sms-recipe.sh`.

### Prerequisites
1. Local Supabase stack running:
   ```bash
   npx supabase status
   ```
2. Start the `send-sms` function locally:
   ```bash
   npx supabase functions serve send-sms --no-verify-jwt
   ```

### Execution
Run the smoke recipe in a separate terminal:
```bash
bash supabase/scripts/local-send-sms-recipe.sh
```

### Expected Behavior
1. Generates a signed Webhook payload with timestamp and HMAC signature using standard-webhooks secret.
2. Sends POST to `http://localhost:54321/functions/v1/send-sms`.
3. Verifies reservation in `sms_send_log` and provider invocation.
4. Checks that bad signatures or tampered payloads return `401 Unauthorized`.
5. Proves that consecutive calls within 60s return cooldown rate limit errors.

---

## 2. Dev Bypass & Sandbox Testing

For internal development without sending paid carrier SMS:

### Internal Test Numbers (+250780000001 – +250780000006)
- Configured in Supabase Auth as test numbers with fixed OTP `123456`.
- Bypasses SMS provider calls; no external network requests made.

### Dev OTP Bypass (`OTP_DEV_BYPASS=true`)
When testing real Rwandan numbers during internal QA builds:
1. Ensure the recipient number is included in `DEV_BYPASS_NUMBERS` in Edge Function secrets.
2. The hook intercepts the OTP and stores it in `dev_otp_display`.
3. The internal QA build fetches and displays the OTP on-screen.
4. Verify non-allowlisted numbers continue to send real SMS.

---

## 3. Rate Limiting Smoke Tests

Test the three-layer rate limiting enforced by `public.auth_sms_reserve`:

### A. 60-Second Cooldown
1. Request OTP for `+250788111222`.
   - **Result:** Success, SMS sent.
2. Immediately request OTP again (< 60s) for `+250788111222`.
   - **Result:** Denied with generic hook error. Database records `cooldown` rejection.

### B. Hourly Cap (2 Sends per Hour)
1. Request OTP at T=0.
2. Request OTP at T=61s.
3. Request OTP at T=122s.
   - **Result:** Denied with generic hook error. Database records `hourly_cap` rejection.

### C. Concurrency Invariant Test
Run the automated parallel reservation test:
```bash
bash supabase/tests/concurrency_test.sh
```
- **Result:** Fires 10 concurrent requests; exactly 2 succeed and 8 are rejected (`SUCCESS: 2, DENIED: 8`).

---

## 4. Provider Failover, Deadline Budget & Circuit Breaker Smoke Test

WeShare implements primary-to-secondary gateway failover (Pindo → Africa's Talking) with a strict hook deadline budget and circuit breaker.

### A. 3500ms Deadline Budget & Dynamic Fallback
- Total execution budget from hook entry is 3500ms.
- Primary provider (Pindo) receives an initial timeout allocation bounded by remaining budget.
- Fallback to Africa's Talking gets the remaining time (`budget - elapsed`).
- **Safety invariant:** If fewer than 800ms remain after Pindo's attempt, fallback is skipped to prevent Edge Runtime timeouts.

### B. Scenario: Pindo Downtime / Failover
1. Temporarily set an invalid `PINDO_API_TOKEN` or simulate network failure.
2. Request an OTP.
3. Observe Edge Function execution logs:
   - Primary provider (Pindo) fails.
   - Fallback switches to Africa's Talking with remaining budget (> 800ms).
   - Africa's Talking delivers message successfully.
   - Provider recorded in `sms_send_log` is `africas_talking`.

### C. Scenario: Circuit Breaker
If Pindo failed or timed out in $\ge 3$ of the last 5 sends recorded in `sms_send_log`:
1. The circuit breaker trips into OPEN state for 5 minutes.
2. The hook routes requests directly to Africa's Talking first, logging `CIRCUIT_BREAKER_ACTIVE`.
3. After 5 minutes, normal primary evaluation resumes.

---

## 5. Delivery Receipts (DLR) Webhook Smoke Test

Pindo posts delivery receipts to `pindo-dlr-webhook`.

### Local Test Request:
```bash
curl -i -X POST "http://localhost:54321/functions/v1/pindo-dlr-webhook?secret=weshare-dlr-secret-local" \
  -H "Content-Type: application/json" \
  -d '{
    "sms_id": "<PROVIDER_MESSAGE_ID>",
    "status": "DELIVRD",
    "retries_count": 0,
    "modified_at": "2026-10-14T20:00:00Z"
  }'
```

### Verification:
1. Status `200 OK` with `{"updated": true}`.
2. Query `sms_send_log`:
   ```sql
   select id, phone_e164, status, provider_message_id, created_at
   from public.sms_send_log
   where provider_message_id = '<PROVIDER_MESSAGE_ID>';
   ```
   Status is now `delivered`.
3. Test non-downgrade monotonic invariant:
   Post `status: "UNDELIV"` for the same `sms_id`.
   - Result: Ignored (`{"updated": false, "reason": "monotonic"}`). Row remains `delivered`.

---

## 6. Monitoring & Delivery Rates

Query delivery metrics via the service role:
```sql
select * from public.sms_delivery_rates;
```
Expected output columns:
- `provider`: `pindo` / `africas_talking`
- `window_hour`: Bucket timestamp
- `total_sent`: Count of initiated dispatches
- `delivered_count`: Count of confirmed deliveries
- `failed_count`: Count of failed/rejected dispatches
- `delivery_rate_pct`: Percentage calculation `(delivered / total * 100)`

### Admin Alerts Inspection
Check human escalation alerts logged for auth errors or low balance:
```sql
select id, alert_type, severity, title, message, created_at
from public.admin_site_alerts
where alert_type in ('SMS_PROVIDER_AUTH', 'SMS_BALANCE_LOW')
order by created_at desc;
```
Alerts are deduplicated to at most 1 per hour per alert type to avoid alert fatigue.

---

## 7. Real-Device Push Notification Smoke Test

Verify lock-screen visibility, generic copy hygiene, and deep-link routing when the app is completely killed.

### Test Procedure: App Killed → Push Arrives → Tap Opens Route
1. **Device Setup**:
   - Install the WeShare build on a physical Android device.
   - Log in with a confirmed user. Verify the device push token is registered in `public.push_tokens`:
     ```sql
     select user_id, token, platform, updated_at from public.push_tokens where user_id = '<USER_ID>';
     ```
2. **Kill the Application**:
   - Swipe away / force-stop the WeShare app from the Android App Switcher (process is terminated / killed).
   - Lock the phone screen.
3. **Trigger Server Notification**:
   - Trigger a status change (e.g., driver accepts booking or passenger confirms payment):
     ```sql
     insert into public.notifications (user_id, type, title, message, booking_id, event_key)
     values (
       '<USER_ID>',
       'booking_confirmed',
       'Booking confirmed!',
       'Sensitive internal amount details: 4000 RWF',
       '<BOOKING_ID>',
       'test:push:smoke:1'
     );
     ```
4. **Observe Lock Screen / Notification Shade**:
   - **Visual Verification**:
     - Notification arrives with high priority sound/heads-up display via the Android `rides` notification channel.
     - Visible title matches generic copy: `Booking Confirmed`.
     - Visible body matches generic copy: `Your seat has been confirmed.`
     - **Safety Assertion**: No amounts, phone numbers, or PII appear on the lock screen notification banner.
5. **Tap Notification**:
   - Tap the push banner on the locked/unlocked device.
   - **Routing Verification**:
     - The operating system launches WeShare from cold start.
     - Expo Router reads `data.route` (`/(tabs)/my-bookings`) from the push payload.
     - The app navigates directly to the target route (`My Bookings` screen) with the booking details loaded.

