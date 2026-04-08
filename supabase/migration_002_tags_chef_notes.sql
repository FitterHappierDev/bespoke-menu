-- Migration 002: add dishes.tags column (idempotent)
alter table dishes add column if not exists tags jsonb not null default '[]'::jsonb;
