-- Read-only acceptance for the linked project. Never creates test data.
-- Run outside `supabase test db`: this is an operator report, not pgTAP.
begin read only;
select jsonb_build_object(
  'checked_at', current_timestamp,
  'migration_present', exists(select 1 from supabase_migrations.schema_migrations where version = '202608310001'),
  'private_tables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('image_test_campaign','image_test_members','image_test_photos','image_test_attempts','image_test_results') and c.relrowsecurity),
  'direct_table_grants', (select count(*) from information_schema.role_table_grants
    where table_schema = 'public' and table_name like 'image_test_%'
      and grantee in ('PUBLIC','anon','authenticated','service_role')),
  'client_callable_functions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'image_test_%'
      and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))),
  'unsafe_function_configuration', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'image_test_%'
      and (not p.prosecdef or not coalesce('search_path=""' = any(p.proconfig),false))),
  'campaign', (select to_jsonb(c) from public.image_test_campaign c),
  'members', (select count(*) from public.image_test_members),
  'photos', (select count(*) from public.image_test_photos),
  'attempts', (select count(*) from public.image_test_attempts),
  'results', (select count(*) from public.image_test_results),
  'constraints', (select jsonb_agg(pg_get_constraintdef(oid)) from pg_constraint
    where conrelid in ('public.image_test_campaign'::regclass,'public.image_test_photos'::regclass)),
  'retention_job', (select jsonb_agg(jsonb_build_object('jobid',jobid,'schedule',schedule,'active',active,'command',command))
    from cron.job where jobname = 'image-test-result-retention'),
  'recent_retention_runs', (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from
    (select status,start_time,end_time from cron.job_run_details where jobid in
      (select jobid from cron.job where jobname = 'image-test-result-retention') order by start_time desc limit 3) r)
) as acceptance;
commit;
