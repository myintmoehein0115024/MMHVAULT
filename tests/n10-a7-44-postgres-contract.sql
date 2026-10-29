-- N10-A7.44 assertions against a fresh disposable postgres:17 database.
-- The production database is NEVER accessed by this test.
DO $test$
BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.mmh_n10a740_username_links'::regclass)
  THEN RAISE EXCEPTION 'username table RLS disabled'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.mmh_n10a740_attempt_buckets'::regclass)
  THEN RAISE EXCEPTION 'limiter RLS disabled'; END IF;
 IF (SELECT prosecdef FROM pg_proc WHERE oid='public.mmh_n10a740_take_attempt(text,integer,integer)'::regprocedure)
  THEN RAISE EXCEPTION 'limit function has definer privileges'; END IF;
 IF has_function_privilege('anon','public.mmh_n10a740_take_attempt(text,integer,integer)','EXECUTE')
 OR has_function_privilege('authenticated','public.mmh_n10a740_take_attempt(text,integer,integer)','EXECUTE')
  THEN RAISE EXCEPTION 'RPC exposed to client roles'; END IF;
 IF NOT has_function_privilege('service_role','public.mmh_n10a740_take_attempt(text,integer,integer)','EXECUTE')
  THEN RAISE EXCEPTION 'server missing RPC permission'; END IF;
 IF has_table_privilege('anon','public.mmh_n10a740_username_links','SELECT')
 OR has_table_privilege('authenticated','public.mmh_n10a740_username_links','SELECT')
 OR has_table_privilege('anon','public.mmh_n10a740_attempt_buckets','INSERT')
 OR has_table_privilege('authenticated','public.mmh_n10a740_attempt_buckets','INSERT')
  THEN RAISE EXCEPTION 'private auth tables exposed to client'; END IF;
END
$test$;

-- Simulate Supabase's privileged service role, as configured in production Postgres.
SET ROLE service_role;
INSERT INTO public.mmh_n10a740_username_links(username_key,user_id)
VALUES ('testalpha','11111111-1111-4111-8111-111111111111');
DO $test$
BEGIN
 -- Claiming an occupied username with another UID must fail atomically.
 BEGIN
  INSERT INTO public.mmh_n10a740_username_links(username_key,user_id)
  VALUES ('testalpha','22222222-2222-4222-8222-222222222222');
  RAISE EXCEPTION 'duplicate username was accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 -- A single UID must not link a second username.
 BEGIN
  INSERT INTO public.mmh_n10a740_username_links(username_key,user_id)
  VALUES ('testbravo','11111111-1111-4111-8111-111111111111');
  RAISE EXCEPTION 'second name for UID was accepted';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 -- Reserved and malformed user names must be rejected by DB, not only JS.
 BEGIN
  INSERT INTO public.mmh_n10a740_username_links(username_key,user_id)
  VALUES ('admin','22222222-2222-4222-8222-222222222222');
  RAISE EXCEPTION 'reserved username accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO public.mmh_n10a740_username_links(username_key,user_id)
  VALUES ('UPPERCASE','22222222-2222-4222-8222-222222222222');
  RAISE EXCEPTION 'uppercase username accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF NOT public.mmh_n10a740_take_attempt(repeat('a',64),2,600) THEN
  RAISE EXCEPTION 'first attempt denied'; END IF;
 IF NOT public.mmh_n10a740_take_attempt(repeat('a',64),2,600) THEN
  RAISE EXCEPTION 'second attempt denied'; END IF;
 IF public.mmh_n10a740_take_attempt(repeat('a',64),2,600) THEN
  RAISE EXCEPTION 'third attempt improperly allowed'; END IF;
 IF NOT public.mmh_n10a740_take_attempt(repeat('b',64),1,600) THEN
  RAISE EXCEPTION 'separate HMAC bucket improperly denied'; END IF;
END
$test$;
RESET ROLE;
DO $test$
BEGIN
 IF (SELECT attempt_count FROM public.mmh_n10a740_attempt_buckets WHERE bucket_key=repeat('a',64))<>3
  THEN RAISE EXCEPTION 'attempt count persistence failed'; END IF;
 IF (SELECT count(*) FROM public.mmh_n10a740_username_links)<>1
  THEN RAISE EXCEPTION 'username collision changed rows'; END IF;
END
$test$;
