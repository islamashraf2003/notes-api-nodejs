# Sign-up OTP Verification — Design

**Date:** 2026-08-17
**Status:** Approved, not yet implemented

## Goal

Email a one-time code when an account is created, and let the account holder
exchange that code for `isConfirmed: true` on their user document.

The `User` model already carries an unused `isConfirmed` flag defaulting to
`false`. Nothing currently sets it. This design gives it a way to become true.

## Decisions

Five choices shape the work. Each was made deliberately; the alternatives are
recorded so a later reader knows they were considered rather than missed.

| Decision | Choice | Alternative rejected |
|---|---|---|
| What verification gates | Nothing. `isConfirmed` is recorded but never enforced. | Blocking sign-in for unverified users |
| OTP storage | Plaintext on the user document, with an expiry timestamp | bcrypt hash plus an attempt counter |
| Email | One combined email: greeting and code together | A separate welcome email alongside the OTP email |
| Verify endpoint | `POST /users/verify-otp` with `{ email, otp }`, unauthenticated | `{ otp }` plus a Bearer token via `authenticate` |
| Resend | Not built | `POST /users/resend-otp` |

### Accepted tradeoffs

These follow directly from the choices above and are recorded so the cost stays
visible:

1. **Plaintext storage.** Anyone with read access to MongoDB can see live codes.
   Chosen for debuggability while developing.
2. **No attempt limit.** A 6-digit code has a million possibilities and the
   endpoint is unauthenticated, so the code is brute-forceable inside its
   10-minute window by anyone willing to script it. Clearing the code on success
   makes it single-use, which is the only mitigation present.
3. **No resend path.** Once a code expires, that account cannot be verified
   without editing the database by hand.
4. **Verification is decorative.** Because sign-in ignores `isConfirmed`, an
   unverified user retains full access to every endpoint. The flag is a record,
   not a gate.

## Non-goals

- Changing `validateSignIn` or any note endpoint
- Rate limiting the verify endpoint
- Any frontend or confirmation page
- Backfilling existing user documents

## Design

### Schema

[src/models/User.js](../../../src/models/User.js) gains two fields, both
`select: false` so they never reach a response by accident — the same protection
already applied to `password`:

```js
otp: { type: String, default: null, select: false },
otpExpiresAt: { type: Date, default: null, select: false },
```

Both are nullable rather than absent, so a verified user and a
never-verified user have the same document shape.

### `src/utilities/generateOtp.js` (new)

Three exports:

- `OTP_EXPIRY_MINUTES = 10` — the single place the lifetime is defined
- `generateOtp()` — a 6-character numeric string, `crypto.randomInt(0, 1_000_000)`
  zero-padded via `padStart(6, "0")`. `crypto.randomInt` rather than
  `Math.random()`, because a predictable code defeats the purpose of having one.
  Padding matters: without it, `randomInt` returning `4271` yields a 4-digit
  code that fails the middleware's own 6-digit check.
- `otpExpiryDate()` — `new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)`

### Sign-up

In `signUp` ([src/modules/user/controllers/users.controllers.js](../../../src/modules/user/controllers/users.controllers.js)):

1. Generate the code and expiry before `User.create`, and pass both into the same
   create call — one write, no window where a user exists without a code.
2. Send it via `sendOtpEmail({ email, name, otp })`, which replaces
   `sendWelcomeEmail`. Still not awaited, still with `.catch` logging to the
   console: the account exists, so a mail failure must not turn a successful
   sign-up into a 500.
3. The 201 body keeps its existing `data` shape. Only `message` changes, to
   `"Account created successfully, check your email for the verification code"`.

Because `sendOtpEmail` is not awaited, a mail failure leaves an account holding a
code that was never delivered and cannot be resent. That is the resend tradeoff
above, surfacing in practice.

### Email

`sendWelcomeEmail` in [src/utilities/sendEmail.js](../../../src/utilities/sendEmail.js)
is replaced by:

```js
sendOtpEmail({ email, name, otp })
```

Subject: `"Verify your Note App account"`. Body: greeting by name, one line of
instruction naming the 10-minute expiry, then the code itself.

`emailTemplate` gains an optional `code` parameter. When present it renders the
digits in their own bordered block at ~28px with wide letter-spacing, rather
than inline in the message paragraph — a code buried mid-sentence is the most
common way OTP emails get misread. The parameter is optional, so existing calls
are unaffected.

### `POST /users/verify-otp`

Two new pieces, mirroring the split the codebase already uses — `validateSignUp`
validates the body only, and controllers talk to the database.

**`src/middleware/validateVerifyOtp.js`** reuses `validateSignUp`'s conventions:
the same `EMAIL_REGEX`, the same field-keyed `errors` map, the same
`400 { message: "Validation failed", errors }` response. It checks that `email`
is present and well-formed and that `otp` is exactly six digits (`/^\d{6}$/`),
then lower-cases and trims `email` so the lookup matches the model's
`lowercase: true` storage.

**`verifyOtp` controller** loads the user with
`.select("+otp +otpExpiresAt")` — without the explicit select, both fields come
back `undefined` and every comparison fails.

| Case | Status | Message |
|---|---|---|
| No user with that email | 404 | Email not found |
| `isConfirmed` already `true` | 409 | This account is already verified |
| `otp` missing or `null` | 400 | No verification code for this account |
| `otpExpiresAt` earlier than now | 400 | Verification code has expired |
| `otp` does not match | 400 | Invalid verification code |
| Match | 200 | Account verified successfully |

404 and 409 reuse wording already present in `validateSignIn` and `signUp`, so
the API stays internally consistent.

On success: set `isConfirmed = true`, set both OTP fields to `null`, save. The
nulling is what makes a code single-use.

Expiry is checked before the code comparison, so an expired-and-wrong code
reports expiry — the more useful of the two facts.

Route registration in [src/modules/user/routes/users.routs.js](../../../src/modules/user/routes/users.routs.js):

```js
userRoute.post("/verify-otp", validateVerifyOtp, verifyOtp)
```

### Error handling

Unexpected failures follow the existing pattern: `return next(error)` from the
controller's catch, which reaches the handler in `app.js` and becomes a generic
500. No new error paths.

## Testing

The project has no test runner (`npm test` is the placeholder), so verification
is manual and evidence-based:

1. A scratch script asserting `generateOtp()` returns six digits across many
   iterations (catching the padding bug specifically), and that `otpExpiryDate()`
   lands ten minutes ahead.
2. A live round-trip against the running server with MongoDB up: sign up, read
   the code from the delivered email, verify it, and confirm `isConfirmed`
   flipped and both OTP fields are `null`.
3. Each error branch driven directly: unknown email, already-verified account,
   wrong code, and an expired code (by backdating `otpExpiresAt` in the
   database).

## Files touched

| File | Change |
|---|---|
| `src/models/User.js` | Two new fields |
| `src/utilities/generateOtp.js` | New |
| `src/utilities/emailTemplate.js` | Optional `code` parameter |
| `src/utilities/sendEmail.js` | `sendWelcomeEmail` → `sendOtpEmail` |
| `src/middleware/validateVerifyOtp.js` | New |
| `src/modules/user/controllers/users.controllers.js` | `signUp` updated, `verifyOtp` added |
| `src/modules/user/routes/users.routs.js` | One route |
