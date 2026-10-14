# WeShare Production Auth Configuration Checklist

This checklist documents every configuration step, environment secret, database migration, and security control required to operate WeShare's SMS authentication and notification infrastructure in production.

---

## 1. Supabase Auth & Send SMS Hook Configuration

- [ ] **Enable Phone Provider:**
  - In Supabase Dashboard → **Authentication** → **Providers** → **Phone**.
  - Toggle **Enable Phone Provider**.
  - Leave built-in Twilio/MessageBird fields empty (the Send SMS Hook replaces built-in providers).
  - Set OTP expiration to `300` seconds (5 minutes).

- [ ] **Configure Send SMS Hook:**
  - In Supabase Dashboard → **Authentication** → **Hooks** → **Send SMS Hook**.
  - Enable Hook.
  - Type: **HTTP POST (Edge Function)**.
  - URL: `https://<project-ref>.supabase.co/functions/v1/send-sms`.
  - Secret: Generate a random standard-webhooks secret (e.g. `whsec_...` or hex/base64).
  - In `supabase/config.toml`, ensure `[functions.send-sms]` has `verify_jwt = false` (hook requests originate from Supabase Auth service without a user JWT).

---

## 2. Edge Function Secrets

Configure via Supabase CLI (`supabase secrets set KEY=VALUE`) or Dashboard → **Edge Functions** → **Secrets**:

### Send SMS Hook & Providers
- [ ] `SEND_SMS_HOOK_SECRET`: Standard-webhooks signing secret copied from the Send SMS Hook configuration.
- [ ] `SMS_PRIMARY`: `pindo` (default primary SMS gateway).
- [ ] `SMS_FALLBACK`: `africas_talking` (automatic secondary fallback on error or timeout).
- [ ] `PINDO_API_TOKEN`: Pindo production bearer token.
- [ ] `AT_USERNAME`: Africa's Talking production username.
- [ ] `AT_API_KEY`: Africa's Talking production API key.
- [ ] `SMS_SENDER`: Registered alphanumeric sender ID (e.g., `WeShare`).
- [ ] `LOW_BALANCE_THRESHOLD`: Numeric balance threshold below which `SMS_BALANCE_LOW` alerts trigger (e.g., `50`).
- [ ] `ALLOWED_PREFIXES`: Comma-separated list of permitted E.164 dial codes (`+250`).

### Delivery Receipts (DLR) Webhook
- [ ] `PINDO_DLR_SECRET`: Primary secret for authenticating Pindo DLR callbacks via URL query parameter (`?secret=...`).
- [ ] `PINDO_DLR_SECRET_PREV`: Optional previous secret to support zero-downtime secret rotation.
- [ ] Webhook URL registered with Pindo support/dashboard:
  `https://<project-ref>.supabase.co/functions/v1/pindo-dlr-webhook?secret=<PINDO_DLR_SECRET>`

### Push Notifications Webhook
- [ ] `SEND_PUSH_SECRET`: Shared secret header (`x-webhook-secret`) for authenticating database triggers to `send-push`.

---

## 3. Database Migrations & Extensions

Apply all migrations sequentially (`supabase db push` or CI/CD migration runner):
- [ ] `20250601000000_baseline.sql`: Core tables (`profiles`, `rides`, `bookings`, `payments`, `notifications`).
- [ ] `20251014120000_contain_dev_otp_display.sql`: Restricts `dev_otp_display` to service role only.
- [ ] `20251014130000_sms_send_limits_and_delivery_logging.sql`:
  - `sms_send_log` table with RLS enabled and zero client policies.
  - `auth_sms_reserve` with transactional advisory locking `pg_advisory_xact_lock(hashtext(phone))`.
  - Rate limits: 60s cooldown, 2 sends/hr, 24h global cap.
  - `auth_sms_mark` for status updates.
  - `sms_delivery_rates` security-invoker view.
  - Automated 30-day log purge via `pg_cron`.
  - Human escalation alerts via `log_admin_sms_alert` to `admin_site_alerts` (throttled to 1/hour per alert type).
- [ ] `20251014140000_harden_notifications_server_side.sql`:
  - `notifications` table additions: `event_key` (unique per user), `push_sent_at`, `push_attempts`.
  - Drops permissive insert policy; revokes INSERT/DELETE/RPC execution from `anon` and `authenticated`.
  - Server-side notification triggers on `bookings`, `payments`, and `rides`.
  - Database webhook via `pg_net` to `send-push`.
  - Scheduled push retry sweep (`sweep_pending_notification_pushes`) every 5 minutes.
  - `on_auth_user_phone_confirmed` trigger on `auth.users` to automatically provision `profiles`.
  - Scheduled 7-day unconfirmed user purge via `pg_cron`.

---

## 4. Database Settings & Config Parameters

In production Postgres, configure database settings for webhooks:
```sql
alter database postgres set app.settings.send_push_url = 'https://<project-ref>.supabase.co/functions/v1/send-push';
alter database postgres set app.settings.send_push_secret = '<SEND_PUSH_SECRET>';
```

---

## 5. Mobile App Configuration (`apps/mobile/weshare`)

- [ ] **Android Auto-Backup Exclusion:**
  Verify `apps/mobile/weshare/app.json` contains `"allowBackup": false` under `"android"`.
- [ ] **Encrypted Storage Adapter:**
  Verify `apps/mobile/weshare/lib/supabase.ts` uses `encryptedStorageAdapter` (stores 256-bit AES key in `expo-secure-store` and ciphertext in `AsyncStorage`).
- [ ] **Resend Cooldown Timer:**
  Verify `apps/mobile/weshare/lib/auth/otp.ts` enforces `RESEND_COOLDOWN_SECONDS = 60`.
- [ ] **Production Tree-Shaking:**
  Ensure release builds are built with:
  `EXPO_PUBLIC_APP_ENV=production`
  `EXPO_PUBLIC_OTP_DEV_BYPASS=false`
  Verify that `dev-otp-peek` and dev OTP UI are completely eliminated from the production JavaScript bundle.

---

## 6. Verification & Health Checks

- [ ] Run test DB migration suite: `supabase test db`.
- [ ] Run edge functions unit tests:
  - `deno test supabase/functions/send-sms/send-sms.test.ts`
  - `deno test supabase/functions/send-push/send-push.test.ts`
- [ ] Query delivery rates view as service role:
  `select * from public.sms_delivery_rates;`
- [ ] Execute smoke test script against staging/sandbox:
  See [Smoke SMS Guide](file:///home/kimani/Projects/weshare-v1/docs/smoke-sms.md).
