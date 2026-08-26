create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  living_room jsonb not null default '{"style":"","postcode":"","budget":1500,"furnitureReview":{"status":"not_started","generalNote":"","items":[]},"drafts":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Users read own projects" on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create own projects" on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update own projects" on public.projects
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete own projects" on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  created_at timestamptz not null default now()
);

alter table public.project_photos enable row level security;

create policy "Users read own photo metadata" on public.project_photos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create own photo metadata" on public.project_photos
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.projects where id = project_id and user_id = (select auth.uid()))
  );
create policy "Users delete own photo metadata" on public.project_photos
  for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-photos', 'room-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users read own room photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users upload own room photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users update own room photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users delete own room photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
