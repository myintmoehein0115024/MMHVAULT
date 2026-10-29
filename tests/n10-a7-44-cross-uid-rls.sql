-- N10-A7.44: Test real SELECT/INSERT/UPDATE/DELETE RLS semantics for two fake UIDs.
-- Applies only to disposable CI Postgres, never production.
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $qa$
DECLARE t text; rows_seen int; affected int;
BEGIN
 FOR t IN SELECT unnest(ARRAY['n10a744_budgets','n10a744_business_accounts','n10a744_investments','n10a744_life_funds','n10a744_life_habits','n10a744_life_schedule_events','n10a744_personal_configuration','n10a744_transactions']) LOOP
  EXECUTE format('SELECT count(*) FROM public.%I',t) INTO rows_seen;
  IF rows_seen<>1 THEN RAISE EXCEPTION 'A can see non-owned rows in %: %',t,rows_seen; END IF;
  EXECUTE format('UPDATE public.%I SET note = ''intrusion'' WHERE user_id = ''22222222-2222-4222-8222-222222222222''',t);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'A can modify B rows in %',t; END IF;
  EXECUTE format('DELETE FROM public.%I WHERE user_id = ''22222222-2222-4222-8222-222222222222''',t);
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'A can delete B rows in %',t; END IF;
  BEGIN
   EXECUTE format('INSERT INTO public.%I(id,user_id,note) VALUES (''33333333-3333-4333-8333-333333333333'',''22222222-2222-4222-8222-222222222222'',''forged'')',t);
   RAISE EXCEPTION 'A can insert rows owned by B in %',t;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
   EXECUTE format('UPDATE public.%I SET user_id = ''22222222-2222-4222-8222-222222222222'' WHERE user_id = ''11111111-1111-4111-8111-111111111111''',t);
   RAISE EXCEPTION 'A can reassign own rows to B in %',t;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
 END LOOP;
END
$qa$;
SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
DO $qa$
DECLARE t text; n int;
BEGIN
 FOR t IN SELECT unnest(ARRAY['n10a744_budgets','n10a744_business_accounts','n10a744_investments','n10a744_life_funds','n10a744_life_habits','n10a744_life_schedule_events','n10a744_personal_configuration','n10a744_transactions']) LOOP
  EXECUTE format('SELECT count(*) FROM public.%I',t) INTO n;
  IF n<>1 THEN RAISE EXCEPTION 'B can see non-owned rows in %: %',t,n; END IF;
 END LOOP;
END
$qa$;
RESET ROLE;
DO $qa$
DECLARE t text; n int;
BEGIN
 FOR t IN SELECT unnest(ARRAY['n10a744_budgets','n10a744_business_accounts','n10a744_investments','n10a744_life_funds','n10a744_life_habits','n10a744_life_schedule_events','n10a744_personal_configuration','n10a744_transactions']) LOOP
  EXECUTE format('SELECT count(*) FROM public.%I',t) INTO n;
  IF n<>2 THEN RAISE EXCEPTION 'Test mutated real snapshot fixture rows: %',t; END IF;
 END LOOP;
END
$qa$;
