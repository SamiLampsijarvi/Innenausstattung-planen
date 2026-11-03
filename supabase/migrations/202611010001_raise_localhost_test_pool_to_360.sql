-- The operator approved 60 additional cents exclusively for the local,
-- manually started image-test pool. Per-attempt and provider limits stay put.
alter table public.localhost_image_test_pool
  drop constraint if exists localhost_image_test_pool_maximum_total_cents_check;

alter table public.localhost_image_test_pool
  alter column maximum_total_cents set default 360;

update public.localhost_image_test_pool
set maximum_total_cents = 360
where id and maximum_total_cents = 300;

alter table public.localhost_image_test_pool
  add constraint localhost_image_test_pool_maximum_total_cents_check
  check (maximum_total_cents = 360);
