-- ============================================================================
-- handle_new_user() trusted raw_user_meta_data.role unconditionally, casting
-- it straight into profiles.role. Since raw_user_meta_data is fully
-- client-controlled at signup (anyone can POST {"data":{"role":"admin"}} to
-- the public /auth/v1/signup endpoint with just the anon key), this let any
-- anonymous caller self-assign 'admin' or 'employer' with zero server-side
-- gate. Every RLS policy using auth_role() = 'admin' was only as strong as
-- this trigger, which offered no protection at all.
--
-- Fix: every new signup is always created as 'worker', full stop. Privileged
-- roles ('employer', 'admin') must be granted afterward through a separate,
-- already-privileged path (an admin promoting a user via a direct/service-role
-- update to profiles.role) — never through the public self-service signup.
-- ============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, phone, email)
  values (
    new.id,
    'worker',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.email
  );
  return new;
end; $$;
