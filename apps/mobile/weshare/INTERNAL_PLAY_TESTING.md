# WeShare — Internal Play Testing Guide

Quick checklist for testers on the **internal** Android build (`com.wesharerw.app`).

---

## Before you start

| Item | Detail |
|------|--------|
| **Install** | Play Console → Internal testing → join link → install from Play Store |
| **Phone** | Real Android device (Rwanda +250) |
| **Accounts** | Use **2 phones** if possible (1 driver, 1 passenger) |
| **OTP** | **No SMS** — code appears **on screen** after Send code |
| **GPS** | **Bypassed** — start/complete rides without being at pickup/drop-off |
| **Payments** | **Test numbers** = instant, no PIN · **Real numbers** = real MoMo + PIN |

---

## What this build is

| Feature | Test numbers `+250780000001`–`006` | Real +250 MoMo numbers |
|---------|-----------------------------------|------------------------|
| OTP sign-in | Code **`123456`** on screen | Code on screen (no SMS) |
| MoMo pay / payout | **Instant mock** (no PIN, no RWF moved) | **Real PawaPay** + PIN on phone |
| GPS start/complete | Uses ride **from/to coords** (anywhere) | Same bypass in this build |
| Driver verification | Auto-approved | Auto-approved if using test number |

Requires server: `OTP_DEV_BYPASS=true` + `PAWAPAY_ENV=production` (`bash supabase/scripts/internal-testing-enable.sh`).

---

## 1. Sign up & login

| Step | What to do | Pass if |
|------|------------|---------|
| New user | Enter +250 number → Send code | OTP on screen (test: `123456`) |
| Verify | Enter 6-digit code | Lands in app (Find Ride tab) |
| Session | Kill app, reopen | Still logged in |

---

## 2. Passenger — find & book

| Step | What to do | Pass if |
|------|------------|---------|
| Search | **Find Ride** → From/To → **Go** | Suggestions + map load |
| Book | **Book seat** → confirm | Fare + 5% fee correct |
| Pay (test #) | MoMo field `780000001`–`006` → **Pay** | Instant success, no PIN prompt |
| Pay (real #) | Real MTN/Airtel number → **Pay** | MoMo PIN prompt on phone; completes |
| After pay | — | Booking under **Bookings** (pending until driver confirms) |

**Important:** Driver must **Confirm** only after passenger paid (notification: **“Paid booking request 💰”**).

---

## 3. Driver — post & complete ride

| Step | What to do | Pass if |
|------|------------|---------|
| Verify | **Profile → Driver verification** | Submit vehicle details (test # = auto-approved) |
| Post | **Post Ride** → publish | Shows in **My Rides** |
| Confirm | Confirm paid booking | Status → confirmed |
| Start | **Start ride** (any location OK) | Status → started |
| Complete | **Complete ride** (any location OK) | GPS verified; payout message (mock or real MoMo) |

---

## 4. Two testing modes in one app

**Cheap end-to-end (no MoMo cost):**
- Passenger + driver both use `+250780000001` / `002` etc.
- Full flow: book → pay → confirm → start → complete

**Real MoMo smoke test:**
- Use real MTN/Airtel numbers, small amounts (e.g. RWF 6,000)
- Expect PIN prompt on passenger phone; real RWF moves

---

## 5. Report issues with

Steps → expected → actual → phone model → screenshot

---

## Known limitations (not bugs)

| Limitation | Why |
|------------|-----|
| No SMS OTP | Internal only — launch uses Africa's Talking |
| GPS bypass | Internal only — launch uses real device location |
| MoMo mock | Only `780000001`–`006` when `OTP_DEV_BYPASS=true` on server |
| iOS | Android internal testing only this round |

---

## Before public launch

```bash
bash supabase/scripts/internal-testing-disable.sh
```

Turns off OTP bypass, MoMo mock, and restores SMS. Use production build profile (no `EXPO_PUBLIC_OTP_DEV_BYPASS`).

---

## Quick happy-path (~10 min, test numbers)

1. **Phone A (driver):** `780000002` → verify → post ride  
2. **Phone B (passenger):** `780000001` → book → pay (instant)  
3. **Phone A:** Confirm → Start → Complete  
4. Both: check **Bookings** / **My Rides**
