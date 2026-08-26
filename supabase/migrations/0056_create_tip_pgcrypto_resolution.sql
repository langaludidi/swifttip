-- SwiftTip MVP v3 — restore pgcrypto resolution inside the Tip-intake RPC.
--
-- Supabase installs pgcrypto in the extensions schema. create_tip intentionally uses
-- a restricted search path, so include that managed schema for its digest() call.

alter function public.create_tip(text,bigint,text)
  set search_path = public, private, extensions, pg_temp;
