-- Koo accounts and credits. Run in Supabase → SQL Editor → paste → Run. Safe to run again.
-- Login itself (email/password, Google, sessions, logout) is Supabase Auth: users live in auth.users.
-- These tables hang off it. The browser can only READ its own rows; credits change only through apply_credits(),
-- which only the server (secret key = service_role) may call.

-- One row per user: profile details.
create table if not exists public.accounts (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- One row per user: the current balance. numeric so fractional prices stay possible later.
create table if not exists public.credits (
  user_id    uuid primary key references public.accounts (id) on delete cascade,
  balance    numeric(12, 2) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- Every change to a balance, for history and audits. `ref` (payment id, request id…) is unique per reason, so a
-- retried payment webhook can never add the same credits twice.
create table if not exists public.credit_ledger (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.accounts (id) on delete cascade,
  delta         numeric(12, 2) not null check (delta <> 0),
  balance_after numeric(12, 2) not null,
  reason        text not null check (reason in ('signup_bonus', 'purchase', 'usage', 'refund', 'admin')),
  ref           text,
  created_at    timestamptz not null default now(),
  unique (reason, ref)
);
create index if not exists credit_ledger_user on public.credit_ledger (user_id, created_at desc);

-- The only way credits change: add (delta > 0) or spend (delta < 0), atomically, never below zero.
-- Returns the new balance. Raises 'insufficient_credits' if a spend would go negative.
-- Same (reason, ref) twice = no-op that returns the current balance (idempotent).
create or replace function public.apply_credits(p_user uuid, p_delta numeric, p_reason text, p_ref text default null)
returns numeric language plpgsql security definer set search_path = '' as $$
declare new_balance numeric;
begin
  if p_ref is not null and exists (select 1 from public.credit_ledger where reason = p_reason and ref = p_ref) then
    select balance into new_balance from public.credits where user_id = p_user;
    return new_balance;
  end if;
  update public.credits set balance = balance + p_delta, updated_at = now()
    where user_id = p_user and balance + p_delta >= 0
    returning balance into new_balance;
  if not found then raise exception 'insufficient_credits'; end if;
  -- A concurrent call with the same (reason, ref) fails here on the unique key, which rolls back the update too.
  insert into public.credit_ledger (user_id, delta, balance_after, reason, ref) values (p_user, p_delta, new_balance, p_reason, p_ref);
  return new_balance;
end $$;
revoke all on function public.apply_credits(uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.apply_credits(uuid, numeric, text, text) to service_role;

-- New user (email or Google) → account + balance + 50 free credits (= SIGNUP_BONUS in lib/pricing.ts).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.accounts (id, email, full_name, avatar_url)
    values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
    on conflict (id) do nothing;
  insert into public.credits (user_id) values (new.id) on conflict (user_id) do nothing;
  perform public.apply_credits(new.id, 50, 'signup_bonus', new.id::text);
  return new;
end $$;
drop trigger if exists on_signup on auth.users;          -- from the earlier draft schema
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Keep the account's email in step when the user changes it.
create or replace function public.handle_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.accounts set email = new.email where id = new.id;
  return new;
end $$;
drop trigger if exists on_auth_email_changed on auth.users;
create trigger on_auth_email_changed after update of email on auth.users for each row execute function public.handle_email_change();

-- Users who signed up before this ran get the same setup.
insert into public.accounts (id, email) select id, email from auth.users on conflict (id) do nothing;
insert into public.credits (user_id) select id from auth.users on conflict (user_id) do nothing;
select public.apply_credits(id, 50, 'signup_bonus', id::text) from auth.users;

-- Row level security: each signed-in user reads only their own rows. No insert/delete policies = no client writes.
alter table public.accounts enable row level security;
alter table public.credits enable row level security;
alter table public.credit_ledger enable row level security;

drop policy if exists "read own account" on public.accounts;
create policy "read own account" on public.accounts for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "edit own profile" on public.accounts;
create policy "edit own profile" on public.accounts for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke update on public.accounts from anon, authenticated;
grant update (full_name, avatar_url) on public.accounts to authenticated; -- name and picture only, never email or id

drop policy if exists "read own balance" on public.credits;
create policy "read own balance" on public.credits for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "read own history" on public.credit_ledger;
create policy "read own history" on public.credit_ledger for select to authenticated using ((select auth.uid()) = user_id);
