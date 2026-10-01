create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  target_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists deadlines_owner_target_idx
  on public.deadlines (owner_id, target_at);

alter table public.deadlines enable row level security;

create policy "Users can read their own deadlines"
  on public.deadlines for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own deadlines"
  on public.deadlines for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own deadlines"
  on public.deadlines for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own deadlines"
  on public.deadlines for delete to authenticated
  using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.deadlines to authenticated;
