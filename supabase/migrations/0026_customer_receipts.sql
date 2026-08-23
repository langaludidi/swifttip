-- SwiftTip MVP v3 — anonymous customer receipt access without customer accounts.
-- Receipt tokens are unguessable and expose only customer-facing transaction facts.

alter table public.tips
  add column if not exists customer_receipt_token uuid not null default gen_random_uuid();

create unique index if not exists tips_customer_receipt_token_key
  on public.tips(customer_receipt_token);

create or replace function public.get_customer_receipt_access(
  p_reference text,
  p_idempotency_key text
)
returns table(receipt_token uuid)
language plpgsql
stable
security definer
set search_path = public, private
as $$
declare
  v_tip_id uuid;
begin
  if length(trim(coalesce(p_idempotency_key,''))) < 8 then raise exception 'Idempotency key is required'; end if;
  select ik.resource_id into v_tip_id
  from private.idempotency_keys ik
  join public.tips t on t.id=ik.resource_id
  where ik.operation='create_tip'
    and ik.idempotency_key=p_idempotency_key
    and t.swifttip_reference=p_reference
  limit 1;
  if v_tip_id is null then return; end if;
  return query select t.customer_receipt_token from public.tips t where t.id=v_tip_id;
end;
$$;

create or replace function public.get_public_tip_receipt(p_receipt_token uuid)
returns table(
  swifttip_reference text,
  worker_display_name text,
  worker_role text,
  venue_name text,
  gross_gratuity_cents bigint,
  customer_fee_cents bigint,
  customer_total_cents bigint,
  currency char(3),
  tip_status text,
  payment_state text,
  created_at timestamptz,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = public, private
as $$
  select t.swifttip_reference,t.worker_display_name_snapshot,t.worker_role_snapshot,t.venue_name_snapshot,
         t.gross_gratuity_cents,t.customer_fee_cents,t.customer_total_cents,t.currency,t.tip_status,
         coalesce(pa.payment_state,'not_started') as payment_state,t.created_at,t.completed_at
  from public.tips t
  left join lateral (
    select p.payment_state
    from public.payment_attempts p
    where p.tip_id=t.id
    order by p.created_at desc
    limit 1
  ) pa on true
  where t.customer_receipt_token=p_receipt_token;
$$;

revoke all on function public.get_customer_receipt_access(text,text) from public;
revoke all on function public.get_public_tip_receipt(uuid) from public;
grant execute on function public.get_customer_receipt_access(text,text) to anon,authenticated;
grant execute on function public.get_public_tip_receipt(uuid) to anon,authenticated;
