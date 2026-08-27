grant usage on schema public to authenticated;

grant select, insert, update, delete
  on table public.projects
  to authenticated;

grant select, insert, delete
  on table public.project_photos
  to authenticated;
