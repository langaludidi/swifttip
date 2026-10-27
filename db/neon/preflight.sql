-- Read-only target inventory. Execute only on an explicitly selected development branch.
-- No secrets, user records, auth configuration values or personal information.
select jsonb_build_object(
  'postgres_version', current_setting('server_version'),
  'schemas', (select jsonb_agg(schema_name order by schema_name)
    from information_schema.schemata
    where schema_name not in ('pg_catalog','information_schema') and schema_name not like 'pg_toast%'),
  'tables', (select jsonb_agg(jsonb_build_object('schema',table_schema,'name',table_name) order by table_schema,table_name)
    from information_schema.tables where table_schema not in ('pg_catalog','information_schema')),
  'extensions', (select jsonb_agg(extname order by extname) from pg_extension),
  'legacy_roles', (select jsonb_agg(jsonb_build_object('name',rolname,'login',rolcanlogin,'bypass_rls',rolbypassrls) order by rolname)
    from pg_roles where rolname in ('anon','authenticated','service_role')),
  'application_constraints', (select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',co.conname,'type',co.contype,'definition',pg_get_constraintdef(co.oid)) order by n.nspname,c.relname,co.conname)
    from pg_constraint co join pg_class c on c.oid=co.conrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','private','audit'))
) as migration_preflight;
