# SwiftTip Migration Deployment Gate

Status: pre-live engineering control.

SwiftTip financial, identity, legal and settlement data must not rely on automatic destructive rollback. Database changes are promoted forward through a controlled gate.

## 1. Repository gate

Every migration must:

1. use the numbered `NNNN_snake_case.sql` format;
2. pass `npm run migration:safety`;
3. pass `npm run db-contracts:check`;
4. pass the complete `npm run ci` pipeline;
5. preserve existing financial and audit records unless an independently reviewed destructive change is explicitly required.

The safety script blocks `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`, and `ALTER TABLE ... DROP COLUMN` unless the migration contains:

`-- SWIFTTIP-DESTRUCTIVE-REVIEW: APPROVED`

That marker is not permission by itself. It records that the additional destructive-change review below has been completed.

## 2. Destructive-change review

Before adding the approval marker, record:

- why a forward-only additive migration is insufficient;
- data affected and approximate row counts;
- backup / point-in-time recovery posture;
- export or preservation method for affected financial/audit data;
- forward-recovery SQL if deployment partially succeeds;
- application compatibility during the migration window;
- named reviewer separate from the author.

No destructive financial-data migration should be deployed solely because an automated rollback script exists.

## 3. Supabase test gate

Before applying a new migration to the canonical SwiftTip project:

1. apply it to an isolated Supabase development branch or disposable test database;
2. run all SQL regression suites under `supabase/tests`;
3. run the Supabase security advisor;
4. inspect performance advisor changes where the migration affects indexes, joins or high-volume transaction tables;
5. verify expected RLS, grants and SECURITY DEFINER boundaries;
6. test the immediately affected application flow against that database.

A migration that cannot be tested on an isolated database is not pilot-ready.

## 4. Canonical-project promotion

Promotion to the canonical project requires:

- repository gate PASS;
- isolated database gate PASS;
- migration name/version recorded;
- current backup/recovery posture understood;
- `PAYMENTS_ENABLED=false` for pre-provider/pre-live changes unless a separately approved live-change procedure applies.

Apply one migration at a time. After each migration:

1. confirm migration history;
2. run the relevant regression suite(s);
3. inspect security advisor output;
4. verify no unexpected live records or configuration changes were introduced.

## 5. Recovery principle

Prefer corrective forward migrations over reverting schema history. If an application deployment must be rolled back, the database must remain compatible with both the old and new application version for the defined deployment window wherever practical.

For high-risk changes, use expand/migrate/contract:

1. **Expand** — add nullable/new structures without removing old ones.
2. **Migrate** — backfill or dual-write and verify.
3. **Contract** — remove old structures only after the old application path is no longer in service and destructive review is complete.

## 6. Current pre-live rule

No migration may activate pricing, live payment intake, a payment provider, Worker settlement, or a pilot cohort merely as a side effect of a schema change. Commercial activation remains a separate explicit decision.
