-- SwiftTip MVP v3 — immutable terms content integrity.
-- Publishing remains a later explicit legal/commercial action. This migration publishes nothing.

alter table public.terms_versions
  add column if not exists title text,
  add column if not exists content_body text,
  add column if not exists content_format text not null default 'markdown';

alter table public.terms_versions
  drop constraint if exists terms_versions_content_format_check;
alter table public.terms_versions
  add constraint terms_versions_content_format_check
  check (content_format in ('markdown','plain_text'));

create or replace function private.validate_terms_content()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_hash text;
begin
  if new.title is not null and length(trim(new.title))=0 then raise exception 'Terms title cannot be blank'; end if;
  if new.content_body is not null and length(trim(new.content_body))=0 then raise exception 'Terms content cannot be blank'; end if;

  if new.content_body is not null then
    v_hash := encode(digest(convert_to(new.content_body,'UTF8'),'sha256'),'hex');
    if new.content_hash <> v_hash then raise exception 'Terms content hash does not match content body'; end if;
  end if;

  if new.published_at is not null then
    if new.title is null or new.content_body is null then raise exception 'Published terms require title and content'; end if;
    if new.effective_from is null then raise exception 'Published terms require an effective date'; end if;
  end if;

  if tg_op='UPDATE' and old.published_at is not null then
    if new.terms_type is distinct from old.terms_type
       or new.version_code is distinct from old.version_code
       or new.title is distinct from old.title
       or new.content_body is distinct from old.content_body
       or new.content_format is distinct from old.content_format
       or new.content_hash is distinct from old.content_hash
       or new.effective_from is distinct from old.effective_from then
      raise exception 'Published terms content is immutable; create a new version instead';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_terms_content_trigger on public.terms_versions;
create trigger validate_terms_content_trigger
before insert or update on public.terms_versions
for each row execute function private.validate_terms_content();

create or replace function public.get_effective_terms(p_terms_type text)
returns table(
  terms_type text,
  version_code text,
  title text,
  content_body text,
  content_format text,
  content_hash text,
  published_at timestamptz,
  effective_from timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select tv.terms_type,tv.version_code,tv.title,tv.content_body,tv.content_format,tv.content_hash,tv.published_at,tv.effective_from
  from public.terms_versions tv
  where tv.terms_type=p_terms_type
    and tv.published_at is not null
    and tv.effective_from<=now()
    and (tv.retired_at is null or tv.retired_at>now())
  order by tv.effective_from desc
  limit 1;
$$;

revoke all on function private.validate_terms_content() from public,anon,authenticated;
revoke all on function public.get_effective_terms(text) from public;
grant execute on function public.get_effective_terms(text) to anon,authenticated;
