-- Crumb: the database for the website's pickup orders.
-- Paste this whole file into Supabase → SQL Editor → New query, then press Run.
-- It's safe to run again: it only creates what's missing and replaces the policy.

-- 1. The orders table. Each "check" is a rule the database enforces on every new order,
--    even if someone skips the website and sends data straight to the database.
create table if not exists public.orders (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 1 and 80),
  email      text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  item       text not null check (char_length(item) between 1 and 60),
  quantity   integer not null check (quantity between 1 and 12),
  pickup_at  timestamptz not null,
  notes      text not null default '' check (char_length(notes) <= 500)
);

-- 2. Row Level Security (RLS): once it's on, nobody can do anything through the API
--    unless a policy below allows it.
alter table public.orders enable row level security;

-- 3. Let the website's visitors send orders through the API. (Many Supabase projects allow this
--    by default. Writing it here makes it work in every project.) The policy below still decides which orders get in.
grant insert on table public.orders to anon, authenticated;

-- 4. The one policy.
-- Who can do what: anyone (signed in or not) can place an order, for a pickup time from now up to 60 days ahead.
drop policy if exists "Anyone can place an order" on public.orders;
create policy "Anyone can place an order"
  on public.orders for insert
  to anon, authenticated
  with check (pickup_at > now() and pickup_at < now() + interval '60 days');

-- There is no select, update or delete policy, on purpose: nobody can read, change or delete
-- orders through the API, so a visitor can never see someone else's name or email.
-- You, the owner, read orders in Supabase → Table Editor → orders. The dashboard isn't limited
-- by these policies, because you're signed in to Supabase as the project's owner.
