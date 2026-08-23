-- SwiftTip MVP v3 — foundational schemas
create extension if not exists pgcrypto;

create schema if not exists private;
create schema if not exists audit;

revoke all on schema private from public, anon, authenticated;
revoke all on schema audit from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
