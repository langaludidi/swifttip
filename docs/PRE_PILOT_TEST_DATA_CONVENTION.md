# SwiftTip MVP v3 — Pre-Pilot Test-Data Convention

Status: **MANDATORY FOR CONTROLLED IDENTITY TESTING**

This convention prevents staging test records from being mistaken for real P1 pilot records.

## 1. Record naming

Where a human-readable field permits it, controlled records must carry an obvious marker:

- Venue trading name prefix: `[PREPILOT]`
- Pilot/draft cohort name prefix: `[PREPILOT]`
- Administrative reason text: begin with `PREPILOT:`
- Support/test case subject: begin with `[PREPILOT]`

Do not place this marker inside a real person’s legal name, phone number, email address or identity document.

## 2. Identity register

Before provisioning any Auth identity, record externally in the controlled evidence matrix:

- test ID;
- approved email or phone;
- intended role;
- owner/custodian;
- provisioning timestamp;
- expected end date;
- cleanup action.

Do not commit personal email addresses, phone numbers, OTPs, TOTP secrets, service-role keys or identity documents to the repository.

## 3. Test record classification

Every controlled record is one of:

- `TEMPORARY TEST` — must be closed/removed after the exercise;
- `PILOT CANDIDATE` — may only become P1 data after explicit reclassification approval;
- `EVIDENCE ONLY` — audit/log evidence retained but no ongoing operational record required.

Default classification is `TEMPORARY TEST`.

## 4. Cleanup order

Use this order to avoid orphaned authority or active public endpoints:

1. Ensure `PAYMENTS_ENABLED=false` and public Tip intake remains OFF.
2. Disable any test Worker endpoint.
3. End Worker–Venue association.
4. Revoke/end Venue membership.
5. Revoke Admin membership if the Admin identity is temporary.
6. Suspend/deactivate test Worker through the supported lifecycle rather than rewriting history.
7. Suspend/close the test Venue if it will not be used in P1.
8. Remove verification storage objects only through the controlled evidence-removal workflow.
9. Remove Auth identities only after application-record dependencies and audit requirements have been checked.
10. Record cleanup completion in the evidence matrix.

## 5. Promotion to actual P1

A test record must never become live through inaction.

Promotion requires an explicit decision recording:

- record IDs being retained;
- why the record is genuine and suitable for P1;
- who approved reclassification;
- current Terms/pricing/provider status;
- confirmation that test-only artefacts are removed; and
- confirmation that the actor understands the live/pilot relationship.

Until then, the record remains test-only.
