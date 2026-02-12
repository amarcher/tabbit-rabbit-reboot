-- Clean up any auth users that don't have a matching profile
-- (caused by the pre-trigger signup attempt)
delete from auth.users
where id not in (select id from public.profiles);
