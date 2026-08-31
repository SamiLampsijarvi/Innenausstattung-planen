begin;
create extension if not exists pgtap with schema extensions;
select plan(15);
select is((select enabled from public.image_test_campaign), false, 'External execution starts disabled');
select is((select reserved_cents from public.image_test_campaign), 0, 'Campaign starts with no expenditure');
select ok(not has_function_privilege('authenticated','public.image_test_reserve(uuid,uuid,uuid,text)','execute'), 'Clients cannot reserve as other users');
select ok(not has_table_privilege('authenticated','public.image_test_results','select'), 'No direct image access');
select ok(not has_function_privilege('anon','public.image_test_state(uuid)','execute'), 'Anonymous callers cannot read accounting');
select ok(exists(select 1 from cron.job where jobname='image-test-result-retention'), 'Retention schedule exists');
insert into auth.users(id,email) values('55555555-5555-4555-8555-555555555555','phase7@example.test');
insert into public.image_test_members values('55555555-5555-4555-8555-555555555555');
insert into public.projects(id,user_id,name) values('55555555-5555-4555-8555-555555555555','55555555-5555-4555-8555-555555555555','Phase 7');
insert into public.project_photos(id,project_id,user_id,storage_path,original_name)
values('66666666-6666-4666-8666-666666666666','55555555-5555-4555-8555-555555555555','55555555-5555-4555-8555-555555555555','phase7/fixture.png','fixture.png');
select throws_ok($$select public.image_test_approve('55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666',repeat('a',64),'Japandi',1500)$$, 'P0001','photo or consent unavailable','Missing consent blocks approval');
insert into public.consent_events(user_id,consent_kind,action,policy_version) values
('55555555-5555-4555-8555-555555555555','photo_storage','granted','photo-storage-v1'),
('55555555-5555-4555-8555-555555555555','ai_processing','granted','vertex-test-v1');
select lives_ok($$select public.image_test_approve('55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666',repeat('a',64),'Japandi',1500)$$,'Own consent permits approval');
select is((select photo_count from public.image_test_campaign),1,'Approval counted persistently');
update public.image_test_campaign set enabled=true, approved_until=now()+interval '1 hour',price_review='offline fixture',reservation_cents=30;
select lives_ok($$select public.image_test_reserve('55555555-5555-4555-8555-555555555555',(select id from public.image_test_photos limit 1),'77777777-7777-4777-8777-777777777777',repeat('a',64))$$,'Server reserves before dispatch');
select is((select reserved_cents from public.image_test_campaign),30,'Budget reserved');
select is((select enabled from public.image_test_campaign),false,'A reservation disarms the campaign');
select throws_ok($$select public.image_test_reserve('55555555-5555-4555-8555-555555555555',(select id from public.image_test_photos limit 1),'77777777-7777-4777-8777-777777777777',repeat('a',64))$$,'P0001','duplicate request','Repeated request is blocked');
insert into public.consent_events(user_id,consent_kind,action,policy_version) values
('55555555-5555-4555-8555-555555555555','ai_processing','withdrawn','vertex-test-v1');
select is(public.image_test_check_dispatch('55555555-5555-4555-8555-555555555555','77777777-7777-4777-8777-777777777777'),false,'Withdrawal blocks pending dispatch');
select is((select reserved_cents from public.image_test_campaign),30,'Withdrawal does not refund reservations');
select * from finish();
rollback;
