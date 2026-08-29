drop policy if exists "Users read own active room photos" on storage.objects;
drop policy if exists "Users upload own active room photos" on storage.objects;
drop policy if exists "Users update own active room photos" on storage.objects;
drop policy if exists "Users delete own active room photos" on storage.objects;

create policy "Users read own active room photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'room-photos'
    and (storage.foldername(storage.objects.name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.projects project
      where project.id::text = (storage.foldername(storage.objects.name))[2]
        and project.user_id = (select auth.uid())
        and project.deleted_at is null
    )
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  );

create policy "Users upload own active room photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'room-photos'
    and public.has_active_consent('photo_storage')
    and (storage.foldername(storage.objects.name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.projects project
      where project.id::text = (storage.foldername(storage.objects.name))[2]
        and project.user_id = (select auth.uid())
        and project.deleted_at is null
    )
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  );

create policy "Users update own active room photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'room-photos'
    and (storage.foldername(storage.objects.name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.projects project
      where project.id::text = (storage.foldername(storage.objects.name))[2]
        and project.user_id = (select auth.uid())
        and project.deleted_at is null
    )
  )
  with check (
    bucket_id = 'room-photos'
    and public.has_active_consent('photo_storage')
    and (storage.foldername(storage.objects.name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.projects project
      where project.id::text = (storage.foldername(storage.objects.name))[2]
        and project.user_id = (select auth.uid())
        and project.deleted_at is null
    )
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  );

create policy "Users delete own active room photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'room-photos'
    and (storage.foldername(storage.objects.name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.projects project
      where project.id::text = (storage.foldername(storage.objects.name))[2]
        and project.user_id = (select auth.uid())
        and project.deleted_at is null
    )
    and not exists (
      select 1 from public.account_deletion_requests request
      where request.user_id = (select auth.uid())
    )
  );
