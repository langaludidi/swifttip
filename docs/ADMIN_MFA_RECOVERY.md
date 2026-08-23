# SwiftTip Admin MFA Recovery — Controlled Procedure

Status: pre-live security control. This is not a self-service user flow.

## Principle

A verified SwiftTip Admin MFA factor must never be removed merely because the user can still receive the first-factor email OTP. Email OTP establishes AAL1 only. Recovery from a lost or inaccessible authenticator requires an out-of-band privileged procedure.

## Required conditions

Before recovery:

1. Confirm the requester is an active SwiftTip Admin through an independent channel.
2. Confirm the Admin user ID and authorised email against the Admin membership record.
3. Record a reason/ticket/reference for the recovery.
4. A Security Admin or Super Admin must authorise the recovery. For production, prefer two-person review for Super Admin recovery.
5. Use server-only Supabase service-role/Admin Auth tooling. Never expose the service-role credential in the browser, chat, URL, command history, or repository.

## Recovery action

Use the supported Supabase Admin MFA factor-management API to list the target user's factors and delete only the verified factor that is being recovered. Supabase documents that deleting a verified factor through the Admin API logs the user out of active sessions.

Do not delete rows directly from Supabase Auth tables.

After factor deletion:

1. Confirm the user's existing sessions were invalidated.
2. Require a fresh Admin email OTP sign-in.
3. Require immediate enrollment of a new TOTP authenticator before Operations access.
4. Verify the new session reaches AAL2.
5. Record the recovery event in the SwiftTip audit trail before the account is considered restored.

## Prohibited recovery shortcuts

- No "forgot authenticator" link that removes MFA from the public/Admin login UI.
- No factor reset based only on access to the Admin email inbox.
- No temporary disabling of `mfa_required` to let the user into Operations.
- No direct modification of `auth.mfa_factors` or related Auth tables.
- No reusing another Admin's factor.
- No production recovery without a recorded reason and identity check.

## Session policy

SwiftTip independently limits Admin application sessions to 8 hours and continues to require AAL2 in the database Admin authorization helper. Worker application sessions are limited to 7 days and Venue sessions to 24 hours. These application limits are additional to Supabase Auth's own session and rate-limit controls.
