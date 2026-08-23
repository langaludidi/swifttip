# SwiftTip MVP v3 — Controlled Identity Test Pack

Status: **PREPARED / DO NOT EXECUTE UNTIL STAGE A PASSES**

This pack is the execution sheet for the first controlled Admin, Venue and Worker identities. It does not authorise legal publication, pricing activation, public Tip intake, provider activation or real money.

## 1. Entry gate

Do not provision any identity until all of the following are true:

- current `mvp-v3-greenfield-build` head has a trusted successful `npm run ci` result;
- the same head has a READY greenfield Preview;
- `/api/health` reports `environment=staging` and `supabaseConfigSource=environment`;
- `/api/health` reports `paymentsEnabled=false` and `liveMoneyReady=false`;
- canonical database state remains economically closed;
- if the database changed, `018_pre_pilot_control_plane.sql` has been rerun and passed;
- approved test email/phone identifiers and custodians are recorded outside the repository.

If any item is missing, outcome = `BLOCKED`.

## 2. Identity register — external evidence only

Do not fill personal contact values into this repository file.

| Actor | Evidence ID | Required identifier | Intended authority | Provisioning method | Cleanup |
|---|---|---|---|---|---|
| Super Admin | ID-ADM-01 | approved email | Super Admin, MFA required | controlled Admin bootstrap | revoke membership; remove Auth only after dependency review |
| Venue Admin | ID-VEN-01 | approved email | exact `[PREPILOT]` Venue only | first email OTP sign-in, then Admin invitation | revoke/end Venue membership |
| Worker | ID-WRK-01 | approved SA mobile | own Worker profile only | controlled Worker Auth bootstrap | close supported Worker lifecycle; remove Auth only after dependency review |
| Venue Viewer | ID-VEN-02 | approved email | optional read-only Venue role | first email OTP sign-in, then Admin invitation | revoke membership |

## 3. Admin test cases

### ADM-01 — unknown/unprovisioned email

Expected: generic OTP response must not disclose whether the identity is authorised. No Admin authority is created.

### ADM-02 — provision Admin

Run the controlled provisioning command only with the approved email and intended role. Capture Auth user ID, Admin membership ID and audit reference. Do not capture secrets.

### ADM-03 — invalid/expired OTP

Expected: authentication fails safely. No Admin session/authority.

### ADM-04 — valid OTP at AAL1

Expected: active membership is recognised, but AAL2-required Admin operations remain blocked.

### ADM-05 — TOTP enrolment

Expected: one controlled TOTP factor is enrolled. If an interrupted setup leaves an unverified factor, the application may clear that incomplete factor; verified factors must not be silently removed.

Never store QR seed/secret in screenshots or logs.

### ADM-06 — AAL2 challenge

Expected: correct TOTP elevates the session to AAL2 and allows only the role-authorised Admin operations.

### ADM-07 — role boundary

Expected: an Admin role cannot execute functions outside its permitted role set.

### ADM-08 — sign-out and session-age boundary

Expected: sign-out invalidates the application session. A stale/expired Admin session must re-authenticate and re-satisfy MFA requirements where applicable.

## 4. Venue test cases

### VEN-01 — unaffiliated email OTP sign-in

Expected: Auth identity may exist, but no Venue authority or operational data is granted before invitation.

### VEN-02 — create test Venue

Create one clearly marked `[PREPILOT]` Venue. Expected initial state is pending review, not active.

### VEN-03 — explicit Venue approval

Admin approves the exact Venue. Capture Venue ID, state transition and audit reference.

### VEN-04 — exact-user invitation

Invite the exact authenticated Venue user to the exact active test Venue. Expected: no authority over any other Venue.

### VEN-05 — unpublished Venue Terms boundary

Expected current-state result: acceptance/activation cannot treat unpublished/ineffective Venue Terms as operative. Record `BLOCKED`, not `FAIL`, if the legal gate is the only blocker.

### VEN-06 — Viewer/Admin separation

If the optional Viewer identity is approved, confirm Viewer cannot perform Venue Admin association decisions.

### VEN-07 — privacy boundary

Expected: Venue actor cannot directly read Worker legal identity evidence, phone/private identity table, bank/Settlement destination or control Worker Settlement.

## 5. Worker test cases

### WRK-01 — unbootstrapped phone

Expected: Worker OTP flow with `shouldCreateUser:false` does not silently create an authorised Worker identity.

### WRK-02 — controlled Auth bootstrap

Provision only the approved phone. Expected: Auth/bootstrap audit exists, but no Worker business record, Venue association, verification approval, endpoint or activation is created by bootstrap itself.

### WRK-03 — SMS OTP delivery

Expected: real delivery to the approved test phone and successful sign-in with the received OTP. Also record one invalid-code result.

Never store the OTP value.

### WRK-04 — onboarding identity separation

Create the Worker profile through the normal flow. Verify customer-facing display identity does not expose private/legal identity fields.

### WRK-05 — verification evidence lifecycle

Use only approved non-production evidence. Verify private bucket upload, immutable evidence binding, submission, Admin review and controlled removal rules. General evidence logs contain metadata references only, not raw documents.

### WRK-06 — Worker/Venue association

Worker requests association with the exact `[PREPILOT]` Venue. Venue Admin confirms or rejects. Capture both the Worker-side and Venue-side scoped views.

### WRK-07 — cross-actor privacy

Expected: Worker cannot see another Worker; Venue cannot see private Worker KYC/bank/Settlement data; Worker cannot modify authoritative business records through direct table DML.

### WRK-08 — Worker Terms boundary

Expected current state: acceptance/activation remains blocked until the current Worker Terms are legitimately published/effective and accepted.

### WRK-09 — Settlement-readiness boundary

Expected current state: Worker activation remains blocked while provider-approved Settlement readiness is absent. Do not enter fabricated bank/KYC/provider values.

### WRK-10 — sign-out/session-age boundary

Expected: session invalidation and re-authentication operate as designed.

## 6. Activation negative matrix

Execute activation attempts only to prove missing gates block progression.

| Missing gate | Expected result |
|---|---|
| identity verification incomplete | BLOCKED |
| Venue not active | BLOCKED |
| association pending/rejected/ended | BLOCKED |
| Settlement readiness absent | BLOCKED |
| current Worker Terms unpublished/not accepted | BLOCKED |

No database edit may be used to convert a blocked condition into a pass.

## 7. Customer-path hold point

Customer endpoint/quote/Tip E2E execution waits until a Worker can **legitimately** activate. Until then:

- do not enable public Tip intake;
- do not activate draft pricing;
- do not publish draft legal documents merely for testing;
- do not inject fake Payment success;
- keep payment provider `unconfigured` and `PAYMENTS_ENABLED=false`.

## 8. Required evidence for every case

Record in `PRE_PILOT_EVIDENCE_MATRIX.md`:

- test ID;
- timestamp;
- environment;
- exact Git SHA;
- database migration version;
- actor evidence ID;
- starting state;
- action;
- expected result;
- actual result;
- outcome: PASS / FAIL / BLOCKED;
- canonical record IDs;
- audit references;
- sanitized screenshot/log references;
- cleanup status;
- tester and approver.

## 9. Stop conditions

Stop all identity testing if any of the following occurs:

- current Preview is using `staging_fallback` instead of explicit environment configuration;
- a client role can access private runtime controls;
- AAL2 can be bypassed;
- an unauthorised actor can cross role/tenant boundaries;
- public projection leaks private Worker data;
- Worker activation succeeds with a required gate missing;
- public Tip intake turns on unexpectedly;
- any test requires invented legal/provider facts or real-money movement.

## 10. Cleanup

Follow `PRE_PILOT_TEST_DATA_CONVENTION.md` in order. Close authority before removing identities. Preserve audit evidence. Test data is `TEMPORARY TEST` unless explicitly reclassified for the actual P1 pilot.
