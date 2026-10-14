# SMS Authentication Baseline Audit Report

**Repository:** `weshare-v1`  
**Date:** 2026-10-14  
**Audit Scope:** SMS Authentication, Supabase Client & Backend Configuration, Database State, Profiles, Payments Inventory, Notifications, Secrets & Documentation Alignment  
**Audit Mode:** Read-only (Source unmodified)  

---

## 1. Supabase Client Setup

### 1.1 Client Configuration & Storage Adapter
- **File:** `apps/mobile/weshare/lib/supabase.ts`
  - **Storage Adapter** ([`lib/supabase.ts:27`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/lib/supabase.ts#L27)): Uses `@react-native-async-storage/async-storage` for native platforms and a no-op fallback (`serverStorage`, lines 10–14) when executing in SSR web environments:
    ```typescript
    storage: isWebServer ? serverStorage : AsyncStorage,
    ```
  - **`persistSession`** ([`lib/supabase.ts:29`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/lib/supabase.ts#L29)): Explicitly set to `!isWebServer` (`true` on native iOS/Android).
  - **`autoRefreshToken`** ([`lib/supabase.ts:28`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/lib/supabase.ts#L28)): Explicitly set to `!isWebServer` (`true` on native iOS/Android).
  - **`detectSessionInUrl`** ([`lib/supabase.ts:30`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/lib/supabase.ts#L30)): Disabled (`false`), avoiding URL hash parsing collisions on mobile deep links.
  - **URL Polyfill** ([`lib/supabase.ts:2`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/lib/supabase.ts#L2)): Imports `react-native-url-polyfill/auto` at the entry of the module to resolve Hermes engine URL parsing bugs.
  - **Env Validation** ([`lib/supabase.ts:19-23`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/lib/supabase.ts#L19-L23)): Throws early with actionable error message if `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing.

### 1.2 AppState Handling
AppState is handled across two dedicated lifecycle hooks rather than inside `lib/supabase.ts`:
1. **Auth Auto-Refresh & Expiry Verification:**
   - **File:** `apps/mobile/weshare/hooks/use-session.tsx`
   - **Lines 78–93:** Mounts an `AppState` listener (`AppState.addEventListener('change', ...)`).
     - When `state === 'active'`, calls `supabase.auth.startAutoRefresh()` and triggers `tryRefreshSession()` ([`use-session.tsx:82-83`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/hooks/use-session.tsx#L82-L83)).
     - When backgrounded/inactive, calls `supabase.auth.stopAutoRefresh()` ([`use-session.tsx:85`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/hooks/use-session.tsx#L85)) to conserve battery and avoid token refresh failures in sleep states.
     - Unmount safely cleans up: `sub.remove(); supabase.auth.stopAutoRefresh();` ([`use-session.tsx:90-91`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/hooks/use-session.tsx#L90-L91)).
2. **Push Token / Notification Synchronization:**
   - **File:** `apps/mobile/weshare/app/_layout.tsx`
   - **Lines 30–33:** Calls `syncDeviceNotifications(userId)` whenever app transitions to `active`.

### 1.3 `onAuthStateChange` Listeners & Hydration
- **Number of Listeners:** Exactly **1** listener exists across the entire mobile codebase.
- **Listener Location:** `apps/mobile/weshare/hooks/use-session.tsx` ([lines 121–123](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/hooks/use-session.tsx#L121-L123)):
  ```typescript
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
    void syncAuth(event, s);
  });
  ```
- **Session Hydration Mechanism:**
  - Initial hydration relies on Supabase JS v2's immediate emission of the `INITIAL_SESSION` event through `onAuthStateChange` ([`use-session.tsx:98-117`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/hooks/use-session.tsx#L98-L117)).
  - An async ticket ref (`syncTicketRef.current`, line 106) prevents out-of-order state updates during fast reconnections.
  - Initial `loading` state starts at `true` ([`use-session.tsx:37`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/hooks/use-session.tsx#L37)) and resolves to `false` on completion of first sync ([lines 102, 116](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/hooks/use-session.tsx#L102)).
  - Splash screen is held visible by `useSplashReady(loading)` in `apps/mobile/weshare/app/_layout.tsx:24, 36-40` until session loading completes.
  - Manual hydration helper `loadSession()` is defined in `apps/mobile/weshare/lib/auth/session.ts:39-44` via `supabase.auth.getSession()` for imperative navigation resolution.

### 1.4 Route Guards & Layout Protection
- **Layout Level:** `apps/mobile/weshare/app/(tabs)/_layout.tsx` contains **no layout-level route guards** (lines 10–14 confirm Find Ride is public to allow guests to browse trips without login).
- **Component-Level Route Guard (`AuthGate`):**
  - **File:** `apps/mobile/weshare/components/ui/AuthGate.tsx:25-86`
  - Screens check `session` from `useSession()`. If `null`, they render `<AuthGate redirectPath="..." />`.
  - Guarded screens:
    - Post a Ride: `apps/mobile/weshare/app/(tabs)/post-ride.tsx:43-55`
    - My Rides: `apps/mobile/weshare/app/(tabs)/my-rides.tsx:57-69`
    - My Bookings: `apps/mobile/weshare/app/(tabs)/my-bookings.tsx:52-64`
    - Notifications: `apps/mobile/weshare/app/(tabs)/notifications.tsx:85-96`
    - Profile: `apps/mobile/weshare/app/(tabs)/profile.tsx:130-141`
    - Booking Confirmation: `apps/mobile/weshare/app/(tabs)/bookings/confirm.tsx:136-147`
    - Driver Verification: `apps/mobile/weshare/app/(tabs)/driver-verification.tsx:95-107`
- **Inverted Guard (`useRedirectIfAuthenticated`):**
  - **File:** `apps/mobile/weshare/hooks/use-redirect-if-authenticated.ts:20-37`
  - Applied on `/auth` (`apps/mobile/weshare/app/auth/index.tsx:34`) and `/auth/otp` (`apps/mobile/weshare/app/auth/otp.tsx:42`) to prevent signed-in users from remaining in the auth flow.
- **Session Expiry Overlay:**
  - `apps/mobile/weshare/components/SessionExpiredScreen.tsx:18-80` mounted globally at root `apps/mobile/weshare/app/_layout.tsx:50`.

---

## 2. Existing Authentication Flow

### 2.1 Auth Flow Analysis
- **Email Auth:** **0%**. No email sign-in, sign-up, or password recovery paths exist in the codebase.
- **Anonymous Auth:** **0%**. No `signInAnonymously()` calls exist. Unauthenticated users simply browse public read-only endpoints.
- **Phone Auth:** **100%** of mobile authentication is phone-based SMS OTP.

### 2.2 Grep & Code Evidence
- **`signInWithOtp`:**
  - `apps/mobile/weshare/lib/auth/otp.ts:30-36`:
    ```typescript
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneE164,
      options: {
        channel: 'sms',
        shouldCreateUser: true,
      },
    });
    ```
- **`verifyOtp`:**
  - `apps/mobile/weshare/lib/auth/otp.ts:45-49`:
    ```typescript
    const { error } = await supabase.auth.verifyOtp({
      phone: phoneE164,
      token,
      type: 'sms',
    });
    ```
- **`sms` / SMS Provider:**
  - Primary provider is **Africa's Talking**, invoked via Supabase Auth "Send SMS" Hook.
  - `supabase/functions/send-sms/index.ts:2`: Header doc: *"Supabase Auth Send SMS Hook → Africa's Talking (or dev bypass for internal testing)."*
  - `supabase/functions/send-sms/index.ts:27-32`: Base URL router:
    - Sandbox: `https://api.sandbox.africastalking.com/version1/messaging`
    - Production: `https://api.africastalking.com/version1/messaging`
  - `supabase/functions/send-sms/index.ts:34-58`: `sendViaAfricasTalking(phone, message, username, apiKey, senderId)`
- **`pindo`:**
  - **0 occurrences** across the entire repository.
- **`twilio`:**
  - **0 active integrations**. Twilio is only referenced as a negative disclaimer:
    - `supabase/config.toml:20`: *"Phone OTP — Africa's Talking via Send SMS Hook (no Twilio)"*
    - `supabase/config.toml:44`: *"Providers → Phone → Enable (leave Twilio / built-in SMS provider empty)"*
    - `apps/mobile/weshare/lib/auth/otp.ts:14`: Catches and sanitizes `"twilio"` in Supabase error strings into user-friendly messages.
- **`otp`:**
  - `apps/mobile/weshare/lib/auth/otp.ts`: Core client OTP management (`sendOtp`, `verifyOtp`, `fetchDevOtpCode`).
  - `apps/mobile/weshare/app/auth/otp.tsx`: UI screen with 6-box pin input, resend timer (30s), dev test phone auto-fill (`123456`).
  - `supabase/functions/dev-otp-peek/index.ts`: Dev edge function to inspect generated OTPs when `OTP_DEV_BYPASS=true`.
  - `supabase/functions/_shared/otp-dev-bypass.ts`: Table storage helper for dev OTP display.
  - `supabase/migrations/20250607120000_dev_otp_display.sql`: DB table for holding temporary OTPs.

---

## 3. Supabase Project State

### 3.1 Directory & Migration Structure
- **`supabase/` Directory:** Present in root.
- **Migrations Inventory (`supabase/migrations/`):**
  1. `20250602120000_rides_status_started.sql` (modifies `rides.status` check constraint)
  2. `20250603120000_bookings_status_started.sql` (modifies `bookings.status` check constraint)
  3. `20250603130000_rides_passenger_booking_select.sql` (RLS policy for booked rides)
  4. `20250607120000_dev_otp_display.sql` (creates `dev_otp_display` table)
  5. `20250608120000_driver_verifications.sql` (creates `driver_verifications` table, adds `profiles.is_super_admin`)
  6. `20250609120000_admin_site_alerts.sql` (creates `admin_site_alerts` table & trigger)
  7. `20250610120000_fix_profiles_rls_recursion.sql` (fixes infinite recursion in profiles RLS policies)
  8. `20250610130000_driver_booking_details.sql` (RPC function `get_driver_booking_details`)
  9. `20250610140000_restrict_driver_verification_read.sql` (drops public read on driver verifications)
  10. `20250611120000_app_metric_events.sql` (creates `app_metric_events` table)
  11. `20250611130000_app_metric_funnel.sql` (alters `app_metric_events.event_type` check constraint)
  12. `20250929120000_push_tokens.sql` (creates `push_tokens` table & `register_push_token` RPC)

### 3.2 Schema Synchronization & Missing Baseline
- **Execution of `supabase migration list`:** Cannot run against remote project from this environment (no linked CLI session / no remote credentials in git).
- **Critical Finding — Missing Baseline Migrations:**
  - The repository **does not contain initial DDL migrations** for the core tables:
    - `public.profiles`
    - `public.rides`
    - `public.bookings`
    - `public.payments`
    - `public.notifications`
  - The migrations begin at `20250602120000_rides_status_started.sql` amending an already-existing `public.rides` table.
  - The `notifications` table schema is only documented as an SQL code comment inside `apps/mobile/weshare/lib/notifications.ts:7-22`.
  - RPC function `insert_notification` is not in migrations, but invoked in code (`notify.ts:14`, `notifications.ts:79`).
  - **Impact:** Running `supabase db reset` locally or deploying to a clean Supabase project is impossible without extracting the baseline schema from the live database.

### 3.3 `config.toml` Settings
- **File:** `supabase/config.toml`
- **Function Configurations:**
  - `functions.pawapay-webhook`: `verify_jwt = false` ([lines 2–3](file:///home/kimani/Projects/weshare-v1/supabase/config.toml#L2-L3))
  - `functions.send-sms`: `verify_jwt = false` ([lines 6–7](file:///home/kimani/Projects/weshare-v1/supabase/config.toml#L6-L7))
  - `functions.dev-otp-peek`: `verify_jwt = false` ([lines 9–10](file:///home/kimani/Projects/weshare-v1/supabase/config.toml#L9-L10))
- **Auth Provider & Hook Instructions ([lines 20–54](file:///home/kimani/Projects/weshare-v1/supabase/config.toml#L20-L54)):**
  - Phone Provider: Enabled without Twilio credentials.
  - Send SMS Hook: Enabled and directed to `https://<project-ref>.supabase.co/functions/v1/send-sms`.
  - Secrets documented: `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID`, `SEND_SMS_HOOK_SECRET`.
  - Dev test numbers: `+250780000001` through `+250780000006` with static OTP `123456`.

### 3.4 Existing Edge Functions
- `send-sms`: Hook endpoint that intercepts OTPs from Supabase Auth and sends SMS via Africa's Talking.
- `dev-otp-peek`: Gated endpoint (`OTP_DEV_BYPASS=true`) to return current OTP for in-app test display.
- `pawapay-deposit`: Initiates mobile money payment via PawaPay API.
- `pawapay-payout`: Initiates payout to driver phone via PawaPay.
- `pawapay-check-status`: Checks status of a payment deposit.
- `pawapay-check-payout-status`: Checks status of a payout.
- `pawapay-webhook`: Processes callback notifications from PawaPay.
- `send-push`: Sends push notifications to Expo Push service using stored push tokens.

---

## 4. `profiles` Table Analysis

### 4.1 Schema & Columns
Reconstructed from code usage and schema migrations:
- `id`: `uuid primary key references auth.users(id) on delete cascade`
- `phone`: `text` (stores normalized E.164 phone)
- `full_name`: `text` (user's display name)
- `avatar_url`: `text` (optional)
- `is_super_admin`: `boolean not null default false` (added in `20250608120000_driver_verifications.sql:4-5`)
- `created_at`: `timestamptz not null default now()`
- `updated_at`: `timestamptz not null default now()`

### 4.2 Triggers on `auth.users`
- **Zero triggers exist on `auth.users`** in the repository.
- There is **no database-level trigger** to automatically create a `public.profiles` row when a user signs up in `auth.users`.
- Profile creation is executed entirely client-side:
  - In `apps/mobile/weshare/app/auth/signup.tsx:59-62`, after OTP verification:
    ```typescript
    await upsertProfile(session.userId, {
      fullName: name.trim(),
      phoneE164: session.phoneE164,
    });
    ```
  - In `apps/mobile/weshare/lib/auth/users.ts:74-79`:
    ```typescript
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: fields.fullName,
      phone: fields.phoneE164,
      updated_at: new Date().toISOString(),
    });
    ```
- **Risk:** If a user closes the app immediately after OTP verification before completing the signup screen, an `auth.users` record exists without a corresponding `public.profiles` record. Subsequent queries joining `profiles` will fail or return `null`.

### 4.3 Triggers on `public.profiles`
- `profiles_auto_approve_dev_test_driver` ([`supabase/migrations/20250608120000_driver_verifications.sql:81-85`](file:///home/kimani/Projects/weshare-v1/supabase/migrations/20250608120000_driver_verifications.sql#L81-L85)):
  - Executes `after insert or update of phone on public.profiles`.
  - Automatically provisions and approves a `driver_verifications` row if the phone matches test numbers `+250780000001`–`006`.

### 4.4 RLS Policies Using `auth.uid()`
From `supabase/migrations/20250610120000_fix_profiles_rls_recursion.sql`:
- **SELECT Policy (`Profiles selective read`, lines 21–30):**
  ```sql
  create policy "Profiles selective read"
    on public.profiles for select to authenticated
    using (
      id = auth.uid()
      or public.passenger_has_active_booking_with_driver(id)
      or public.driver_has_passenger_on_ride(id)
      or public.auth_is_super_admin()
    );
  ```
- **INSERT Policy (`Users insert own profile`, lines 32–37):**
  ```sql
  create policy "Users insert own profile"
    on public.profiles for insert to authenticated
    with check (id = auth.uid());
  ```
- **UPDATE Policy (`Users update own profile`, lines 39–45):**
  ```sql
  create policy "Users update own profile"
    on public.profiles for update to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());
  ```

### 4.5 Does Profile Creation Assume an Email?
- **NO.** Neither `public.profiles` nor the application logic (`UserProfile` in `lib/auth/users.ts:3-10`, `upsertProfile` in `lib/auth/users.ts:70-81`) assumes, requires, or writes an email field.

---

## 5. Payments Module Inventory (Read-Only)

### 5.1 Data Read from User, Profile, and Session
- **File:** `apps/mobile/weshare/lib/payments.ts`
  - Reads `session.userId` as `passengerId` ([line 113](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/lib/payments.ts#L113)).
  - Reads `driverId` and `driverPhone` from the ride / booking record ([lines 113, 248-249](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/lib/payments.ts#L113)).
  - Reads `passengerPhone` from user profile ([line 115](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/lib/payments.ts#L115)).
- **File:** `supabase/functions/pawapay-deposit/index.ts`
  - Validates `passenger_id === user.id` from JWT ([line 37](file:///home/kimani/Projects/weshare-v1/supabase/functions/pawapay-deposit/index.ts#L37)).
  - Reads `passenger_phone`, normalizes to MSISDN for PawaPay MoMo request.
- **File:** `supabase/functions/pawapay-payout/index.ts`
  - Validates `driver_id === user.id` from JWT ([lines 63–75](file:///home/kimani/Projects/weshare-v1/supabase/functions/pawapay-payout/index.ts#L63-L75)).
  - Infers Rwandan mobile operator (`MTN_MOMO_RWA` for `078`/`079`, `AIRTEL_OAPI_RWA` for `072`/`073`) directly from `driver_phone` ([lines 21–26](file:///home/kimani/Projects/weshare-v1/supabase/functions/pawapay-payout/index.ts#L21-L26)).

### 5.2 Payment Events and Outbox Tables
- **Outbox Tables:** **NONE**. There is no transactional outbox table in Postgres (such as `payment_outbox` or `event_log`).
- **Payment Lifecycle Events:**
  1. `initiatePayment` (`apps/mobile/weshare/lib/payments.ts:109-131`): Invokes `pawapay-deposit` edge function, creating row in `payments` with `escrow_status: 'held'`, `deposit_status: 'pending'`.
  2. `checkPaymentStatus` (`payments.ts:134-142`): Polls `pawapay-check-status`.
  3. PawaPay Webhook Callback (`supabase/functions/pawapay-webhook/index.ts:33-84`):
     - On deposit `COMPLETED`: Updates `payments.deposit_status = 'completed'`, calls `notifyUser` for driver and passenger.
     - On deposit `FAILED`: Updates `payments.deposit_status = 'failed'`, cancels booking, calls `notifyUser`.
     - On payout `COMPLETED`: Updates `payments.payout_status = 'completed'`, `payments.escrow_status = 'released'`, calls `notifyUser` for driver.
     - On payout `FAILED`: Updates `payments.payout_status = 'failed'`, `payments.escrow_status = 'disputed'`, calls `notifyUser` for driver.
     - On refund: Sets `payments.escrow_status = 'refunded'`, calls `notifyUser` for passenger.
  4. `verifyGpsAndPayout` (`apps/mobile/weshare/lib/payments.ts:244-307`): Client-driven payout gate. Compares driver's current coordinates against destination location ([line 276](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/lib/payments.ts#L276)). If within 5km, initiates payout; if >5km, marks payment `disputed`.

---

## 6. Notifications Table & Push Token Handling

### 6.1 `notifications` Table
- **Location in Code:** Defined as an SQL instruction comment in `apps/mobile/weshare/lib/notifications.ts:7-22` (not present in `supabase/migrations/`).
- **Schema:**
  ```sql
  create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    type text not null,
    title text not null,
    message text not null,
    read boolean not null default false,
    ride_id uuid references public.rides (id) on delete set null,
    booking_id uuid references public.bookings (id) on delete set null,
    created_at timestamptz not null default now()
  );
  ```
- **Notification Types ([`lib/notifications.ts:34-42`](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/lib/notifications.ts#L34-L42)):**
  `new_booking`, `payment_received`, `booking_pending`, `booking_confirmed`, `booking_cancelled`, `ride_cancelled`, `ride_started`, `ride_completed`.
- **Insertion RPC (`insert_notification`):**
  - Invoked at `apps/mobile/weshare/lib/notifications.ts:79` and `supabase/functions/_shared/notify.ts:14`.
  - RPC body is not committed in `supabase/migrations/`.

### 6.2 `push_tokens` Table & Handling
- **Migration:** `supabase/migrations/20250929120000_push_tokens.sql`
  ```sql
  create table if not exists public.push_tokens (
    token text primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    platform text,
    updated_at timestamptz not null default now()
  );
  ```
- **Registration RPC:** `public.register_push_token(p_token text, p_platform text)` ([lines 19–40](file:///home/kimani/Projects/weshare-v1/supabase/migrations/20250929120000_push_tokens.sql#L19-L40)). `SECURITY DEFINER` function enforcing `auth.uid() is not null` and upserting on `token`.
- **Client Push Token Flow:**
  - `apps/mobile/weshare/lib/device-notifications.ts:49-65`:
    1. Obtains Expo push token via `Notifications.getExpoPushTokenAsync({ projectId })`.
    2. Calls `supabase.rpc('register_push_token', { p_token, p_platform: Platform.OS })`.
  - Scheduled Ride Reminders: `syncRideReminders()` in `apps/mobile/weshare/lib/device-notifications.ts:78-154` schedules local Android/iOS notifications 30 minutes before departure.
- **Push Delivery:**
  - `supabase/functions/_shared/notify.ts:25-52`: Reads tokens for `user_id` from `push_tokens` and POSTs directly to `https://exp.host/--/api/v2/push/send`.
  - `supabase/functions/send-push/index.ts`: Dedicated edge function verifying user JWT and dispatching push payload.

---

## 7. Secrets Handling & Exposure Audit

### 7.1 Environment Files & Gitignore
- **`.gitignore` ([lines 27–30](file:///home/kimani/Projects/weshare-v1/.gitignore#L27-L30)):**
  ```gitignore
  .env*.local
  .env
  .env.production
  ```
- **Status:** No `.env`, `.env.local`, or `.env.production` files are tracked in Git.
- **Example Files Present:**
  - `apps/mobile/weshare/.env.example`
  - `apps/mobile/weshare/.env.production.example`
  - `apps/web/.env.example`

### 7.2 EAS Configuration
- **File:** `apps/mobile/weshare/eas.json`
- **Build Profiles:**
  - `development`: Targets sandbox.
  - `preview`: Generates APK targeting sandbox.
  - `internal` ([lines 33–36](file:///home/kimani/Projects/weshare-v1/apps/mobile/weshare/eas.json#L33-L36)):
    ```json
    "env": {
      "EXPO_PUBLIC_APP_ENV": "production",
      "EXPO_PUBLIC_OTP_DEV_BYPASS": "true"
    }
    ```
    *(See Risk 3 below).*
  - `production`: Targets production with dev mode disabled.

### 7.3 Committed Secrets & Credential Exposures
1. **`google-services.json` Committed in Repository:**
   - **File:** `apps/mobile/weshare/google-services.json` (tracked in Git commit `676dfaa2136...`).
   - Contains:
     - Firebase Project ID: `corner-70a1e`
     - Google Mobile SDK App IDs: `1:899702669451:android:ac2f5fa4770c0f570fd48e`, `1:899702669451:android:db67149683d2d1280fd48e`
     - Google API Key: `AIzaSyCouJGC6Nw2NRW7NS9aJhR2wokOjYQl5x0`
     - OAuth Client IDs: `899702669451-2nk8tic847gjvv3m57rb5okdic1bs0vc.apps.googleusercontent.com`
   - `google-services.json` is **not ignored** in `.gitignore`.
2. **Hardcoded Admin Passcode & Secret Fallbacks:**
   - **File:** `apps/web/lib/admin-auth.ts:4, 7`:
     ```typescript
     const ADMIN_VERIFY_CODE = (process.env.ADMIN_VERIFY_CODE ?? (isProduction ? '' : '3589')).trim();
     const ADMIN_SESSION_SECRET = (process.env.ADMIN_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? (isProduction ? '' : 'weshare-admin-dev')).trim();
     ```
   - Defaults to `'3589'` and `'weshare-admin-dev'` in non-production. Documented in `apps/web/.env.example:6`.
3. **Insecure Web Client Auth Header:**
   - **File:** `packages/shared/src/client.ts:24-28`:
     ```typescript
     if (this.userId) {
       headers['x-user-id'] = this.userId;
     }
     ```
   - Legacy web API uses an unauthenticated `x-user-id` header without cryptographic signatures or JWT validation.

---

## 8. Contradictions with the README & Top Risks

### 8.1 Contradictions with `README.md`
| Area | Claim in `README.md` | Actual Code Implementation | Evidence (file:line) |
|---|---|---|---|
| **OTP Verification** | *"OTP verification is deferred to a future phase (auto-verification enabled for MVP)."* (L182) | Full SMS OTP verification via Supabase Auth and Africa's Talking is active. | `lib/auth/otp.ts:45`, `send-sms/index.ts:2` |
| **Session Persistence** | *"Authentication uses localStorage for session management (simplified for MVP)."* (L180) | Uses `@react-native-async-storage/async-storage` with automatic refresh token rotation. | `lib/supabase.ts:27`, `use-session.tsx:78` |
| **Payment Gateway** | *"Mobile Money API keys (MTN_API_KEY, AIRTEL_API_KEY)"* for direct telco API calls (L65) | Integrated via **PawaPay** aggregator (`pawapay-deposit`, `pawapay-payout`). | `lib/payments.ts:118`, `supabase/config.toml:13` |
| **Web Auth Framework** | Specifies `NEXTAUTH_SECRET` and `NEXTAUTH_URL` (L64) | NextAuth is completely absent. Web admin uses custom HMAC session cookie. | `apps/web/lib/admin-auth.ts:18` |
| **Role-Based Access** | Claims RBAC with "Agency" role (L22) | Database schema and mobile app enforce only User and `is_super_admin`. Agency exists only as an unused TypeScript type. | `packages/shared/src/types.ts:4`, `driver_verifications.sql:4` |

### 8.2 Top Architectural & Security Risks

1. **Missing Baseline Database Migrations (Disaster Recovery Hazard):**
   - **Severity:** High
   - **Detail:** `supabase/migrations/` lacks table creation scripts for `profiles`, `rides`, `bookings`, `payments`, and `notifications`.
   - **Impact:** Any automated CI/CD pipeline, staging instance, or new developer environment running `supabase db reset` will crash immediately on missing table errors.
2. **`dev-otp-peek` Unauthenticated Endpoint:**
   - **Severity:** High
   - **Detail:** `dev-otp-peek` has `verify_jwt = false` in `supabase/config.toml:9-10`.
   - **Impact:** The function relies exclusively on the `OTP_DEV_BYPASS` environment variable. If `OTP_DEV_BYPASS=true` is enabled in production (or configured via `supabase/scripts/internal-testing-enable.sh`), any actor can request the 6-digit OTP for any user phone number via a simple POST request.
3. **Internal EAS Profile Pairs Production Mode with OTP Bypass:**
   - **Severity:** High
   - **Detail:** `apps/mobile/weshare/eas.json:33-36` sets `"EXPO_PUBLIC_APP_ENV": "production"` and `"EXPO_PUBLIC_OTP_DEV_BYPASS": "true"` simultaneously.
   - **Impact:** Testers with internal Play Store builds run against production databases while OTP codes are polled and displayed in the UI. Furthermore, `isGpsDevModeEnabled()` in `lib/app-env.ts:21` returns `true` whenever OTP bypass is active, inadvertently bypassing destination GPS payout checks in production.
4. **Committed Firebase Credentials (`google-services.json`):**
   - **Severity:** Medium
   - **Detail:** `apps/mobile/weshare/google-services.json` is committed in Git and missing from `.gitignore`.
   - **Impact:** Leaks Google API keys and Firebase project configurations.
5. **No Database Trigger on User Creation (`auth.users` -> `profiles`):**
   - **Severity:** Medium
   - **Detail:** Profile creation depends entirely on a client-side call to `upsertProfile` on the `/auth/signup` screen.
   - **Impact:** If the user kills the app or loses connection after entering the SMS OTP, an authenticated account exists without a profile row, breaking relational integrity in bookings and rides.
6. **Insecure Notifications RLS Policy:**
   - **Severity:** Medium
   - **Detail:** Policy documented in `apps/mobile/weshare/lib/notifications.ts:30-31`:
     `create policy "Authenticated insert notifications" on public.notifications for insert to authenticated with check (true);`
   - **Impact:** Any authenticated user can insert arbitrary notification records directly into any other user's notification feed.

