-- SwiftTip MVP v3 — covering indexes for pricing review actor references.

create index if not exists pricing_versions_submitted_by_user_id_idx
  on public.pricing_versions(submitted_by_user_id)
  where submitted_by_user_id is not null;

create index if not exists pricing_versions_reviewed_by_user_id_idx
  on public.pricing_versions(reviewed_by_user_id)
  where reviewed_by_user_id is not null;
