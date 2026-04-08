-- Bespoke Menu Planner — Sprint 1 schema
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('protein','veg')),
  emoji text not null default '',
  recipe_url text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  description text not null default '',
  is_new boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists dishes_name_key on dishes (lower(name));

create table if not exists weekly_menus (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  status text not null default 'draft' check (status in ('draft','published','confirmed','feedback_open','feedback_submitted')),
  published_at timestamptz,
  confirmed_at timestamptz,
  chef_notes jsonb,
  created_at timestamptz not null default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references weekly_menus(id) on delete cascade,
  dish_id uuid not null references dishes(id),
  type text not null check (type in ('protein','veg')),
  position int not null,
  family_note text not null default ''
);

create table if not exists daily_feedback (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  dish_id uuid not null references dishes(id),
  rating text check (rating in ('loved','ok','disliked')),
  note text not null default '',
  rated_at timestamptz,
  batch_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists feedback_batches (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  submitted_at timestamptz not null default now(),
  dish_count int not null default 0,
  summary jsonb not null default '{}'::jsonb
);

create table if not exists chef_proposals (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  dish_name text not null,
  type text not null check (type in ('protein','veg')),
  ingredients jsonb not null default '[]'::jsonb,
  recipe_url text not null default '',
  chef_notes text not null default '',
  prep_time_min int,
  emoji text not null default '',
  status text not null default 'proposed' check (status in ('proposed','accepted','declined')),
  created_at timestamptz not null default now()
);

create table if not exists dish_ratings (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references dishes(id) on delete cascade,
  rating text not null check (rating in ('loved','ok','disliked')),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists config (
  id uuid primary key default gen_random_uuid(),
  system_prompt text not null default '',
  allergy_constraints text not null default '',
  dietary_rules jsonb not null default '{"low_sodium":true,"low_carb":true,"no_added_sugar":true,"lean_portion_reduction":true,"introduce_new_dishes":true}'::jsonb,
  taste_profile text not null default '',
  chef_max_protein int not null default 5,
  chef_max_veg int not null default 5,
  family_email text not null default '',
  chef_email text not null default '',
  notification_prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Seed config row
insert into config (system_prompt, allergy_constraints) values (
  'You are a culinary AI assistant specialized in creating personalized weekly meal plans.

Generate exactly 5 protein-centric dishes and 5 vegetable-centric sides that adhere to the following constraints:

DIETARY RULES:
- Low Sodium: Use citrus, vinegars, and aromatics for flavor instead of salt
- Low Carb: Avoid refined sugars and flour-based thickeners. Limit high-starch vegetables
- No Added Sugar: Zero refined sugar in any dish

PORTION PREFERENCES:
- Prefer leaner protein portions (approximately 20% reduction from standard sizes)

OUTPUT FORMAT:
For each dish, provide:
1. Dish name (clear and appetizing)
2. Emoji (single emoji representing the dish)
3. Recipe URL (link to a verified online recipe)
4. Dietary tags (which constraints it meets)
5. Key ingredients list (5-7 main ingredients)
6. Description (one sentence highlighting preparation style and key flavors)

Introduce 1-2 completely new dishes per week while maintaining variety.',
  'No shellfish
No tree nuts'
);
