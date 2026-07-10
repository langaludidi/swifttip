-- ============================================================================
-- 0005 — worker provisioning: auto-create wallet + unique QR slug
-- On every new workers row, create the wallet and an active qr_codes slug so the
-- public /tip/:slug link works immediately after signup. Runs as the definer so
-- it bypasses RLS (clients never write wallets/qr_codes directly). Run after 0004.
-- ============================================================================
create or replace function handle_new_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_base text;
  v_slug text;
begin
  -- wallet (idempotent)
  insert into wallets (worker_id) values (new.id)
  on conflict (worker_id) do nothing;

  -- build a human-ish slug from the worker's name, then guarantee uniqueness
  select full_name into v_name from profiles where id = new.profile_id;
  v_base := trim(both '-' from regexp_replace(lower(coalesce(v_name, 'worker')), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'worker'; end if;

  v_slug := v_base;
  while exists (select 1 from qr_codes where slug = v_slug) loop
    v_slug := v_base || '-' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into qr_codes (worker_id, slug, active) values (new.id, v_slug, true);
  return new;
end;
$$;

drop trigger if exists on_worker_created on workers;
create trigger on_worker_created
  after insert on workers
  for each row execute function handle_new_worker();
