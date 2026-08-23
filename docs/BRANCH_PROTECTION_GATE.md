# SwiftTip MVP v3 — Branch Protection Gate

Status: **PREPARED / NOT YET ENABLED**

Target branch: `mvp-v3-greenfield-build`

The branch is currently unprotected. Protection must be enabled only after the exact GitHub Actions check name has been observed on a successful current-head CI run; do not guess a required status-check name and accidentally deadlock the branch.

## Required end state

Once the current head has a successful CI run, configure branch protection for `mvp-v3-greenfield-build` with these minimum controls:

- require a pull request before merge for material changes once active development moves out of the current direct-hardening phase;
- require the verified SwiftTip CI status check to pass;
- require branches to be up to date before merge where practical;
- block force pushes;
- block branch deletion;
- do not allow required checks to be bypassed casually;
- keep Production promotion separate from greenfield branch protection.

Do not make Vercel Preview success the only branch gate. The repository CI command is the canonical source-level gate because it runs architecture, DB contract, generated-schema freshness, migration safety, TypeScript, unit tests and Next.js build together.

## CI command protected by the gate

`npm run ci`

Current workflow characteristics:

- Node 22;
- lockfile-backed npm cache;
- deterministic `npm ci --no-audit --no-fund`;
- `SWIFTTIP_ENV=development`;
- `PAYMENTS_ENABLED=false`;
- `PAYMENT_PROVIDER=unconfigured`.

## Activation procedure

1. Record the exact greenfield Git SHA.
2. Obtain one successful GitHub Actions CI run for that SHA or a later head containing the same fixes.
3. Record the exact check name reported by GitHub.
4. Enable branch protection requiring that exact check.
5. Push a harmless documentation-only change or use a temporary validation branch/PR to verify the rule blocks merge when CI is absent/failing and permits it when CI is green.
6. Record the protection verification in `PRE_PILOT_EVIDENCE_MATRIX.md` as PP-007.

## Important boundary

Branch protection does **not** authorise:

- merge to the legacy/default branch;
- changing the repository default branch;
- Vercel Production promotion;
- legal publication;
- pricing activation;
- public Tip intake;
- payment-provider activation; or
- real-money operation.

Those remain separate explicit decisions.
