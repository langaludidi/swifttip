-- ============================================================================
-- workers.active defaulted to true, so every new signup was immediately
-- publicly tippable (visible on the public tip page, accepted by create-tip)
-- with zero verification. A worker should only become active once verified.
-- Existing rows are untouched — this only changes what future signups get.
-- ============================================================================
alter table public.workers alter column active set default false;
