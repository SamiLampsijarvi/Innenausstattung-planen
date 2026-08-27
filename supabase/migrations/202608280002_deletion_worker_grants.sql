revoke insert, update on table public.projects from service_role;
revoke insert, update, delete on table public.project_photos from service_role;
revoke insert, update, delete on table public.account_deletion_requests from service_role;
revoke select, update, delete on table public.deletion_audit from service_role;

grant select, delete on table public.projects to service_role;
grant select on table public.project_photos to service_role;
grant select on table public.account_deletion_requests to service_role;
grant insert on table public.deletion_audit to service_role;
