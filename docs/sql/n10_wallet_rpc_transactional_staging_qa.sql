-- MMHVAULT N10 wallet mutation SECURITY DEFINER QA — isolated STAGING ONLY.
-- No production database. No existing staging finance tables. No persistent writes.
-- This script intentionally ends with ROLLBACK and creates disposable schema.
-- Function logic transplanted exactly from the branch's wallet MFA candidate,
-- changing ONLY public table/function names to QA schema and MFA helper name.
-- The Auth UID/AAL claims below are SIMULATED Postgres session claims, NOT
-- Auth-signed JWTs. They exercise wallet *behavior*, not JWT authenticity.
BEGIN;
SET LOCAL statement_timeout='15000ms';
DO $pre$
BEGIN
 IF to_regnamespace('mmh_n10_wallet_qa') IS NOT NULL
   OR to_regprocedure('mmh_n10_qa_security.mfa_ok()') IS NULL
   OR NOT EXISTS (SELECT 1 FROM auth.mfa_factors WHERE status='verified')
 THEN RAISE EXCEPTION 'Isolated staging fixture preflight failed'; END IF;
END;
$pre$;
CREATE SCHEMA mmh_n10_wallet_qa;
REVOKE ALL ON SCHEMA mmh_n10_wallet_qa FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA mmh_n10_wallet_qa TO authenticated;
CREATE TABLE mmh_n10_wallet_qa.crypto_wallet_movements (
 id uuid PRIMARY KEY, user_id uuid NOT NULL,
 fee_investment_id uuid, linked_transfer_transaction_id uuid,
 linked_fee_transaction_id uuid
);
CREATE TABLE mmh_n10_wallet_qa.investments (id uuid PRIMARY KEY,user_id uuid NOT NULL);
CREATE TABLE mmh_n10_wallet_qa.transactions (id uuid PRIMARY KEY,user_id uuid NOT NULL);
ALTER TABLE mmh_n10_wallet_qa.crypto_wallet_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_wallet_qa.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mmh_n10_wallet_qa.transactions ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION mmh_n10_wallet_qa.mmh_delete_crypto_wallet_movement_v4(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  u uuid := auth.uid();
  r mmh_n10_wallet_qa.crypto_wallet_movements%rowtype;
BEGIN
  IF u IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000';
  END IF;
  -- SECURITY DEFINER bypasses the restrictive RLS policies when owner is privileged.
  -- The MFA condition MUST be evaluated directly at this privileged entry point.
  IF NOT COALESCE(mmh_n10_qa_security.mfa_ok(), false) THEN
    RAISE EXCEPTION 'Second factor required' USING ERRCODE='42501';
  END IF;

  SELECT * INTO r
  FROM mmh_n10_wallet_qa.crypto_wallet_movements m
  WHERE m.id=p_id
    AND m.user_id=u
  FOR UPDATE;

  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Wallet movement not found';
  END IF;
  DELETE FROM mmh_n10_wallet_qa.crypto_wallet_movements m
  WHERE m.id=r.id AND m.user_id=u;

  IF r.fee_investment_id IS NOT NULL THEN
    DELETE FROM mmh_n10_wallet_qa.investments i
    WHERE i.id=r.fee_investment_id AND i.user_id=u;
  END IF;
  IF r.linked_transfer_transaction_id IS NOT NULL THEN
    DELETE FROM mmh_n10_wallet_qa.transactions t
    WHERE t.id=r.linked_transfer_transaction_id AND t.user_id=u;
  END IF;
  IF r.linked_fee_transaction_id IS NOT NULL THEN
    DELETE FROM mmh_n10_wallet_qa.transactions t
    WHERE t.id=r.linked_fee_transaction_id AND t.user_id=u;
  END IF;
  RETURN TRUE;
END;
$function$;
REVOKE ALL ON FUNCTION mmh_n10_wallet_qa.mmh_delete_crypto_wallet_movement_v4(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION mmh_n10_wallet_qa.mmh_delete_crypto_wallet_movement_v4(uuid) TO authenticated;

CREATE TEMP TABLE n10_wallet_qa_result (name text,passed boolean) ON COMMIT DROP;
DO $qa$
DECLARE
 enrolled uuid; unenrolled uuid; blocked boolean; gone boolean;
 id_a uuid := '11111111-1111-4111-8111-000000000001';
 id_b uuid := '11111111-1111-4111-8111-000000000002';
 i_a uuid := '11111111-1111-4111-8111-000000000011';
 t_a uuid := '11111111-1111-4111-8111-000000000021';
 t_fee uuid := '11111111-1111-4111-8111-000000000022';
 t_b uuid := '11111111-1111-4111-8111-000000000023';
BEGIN
 SELECT user_id INTO enrolled FROM auth.mfa_factors WHERE status='verified' LIMIT 1;
 SELECT id INTO unenrolled FROM auth.users WHERE id<>enrolled
  AND NOT EXISTS (SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.users.id AND status='verified')
 LIMIT 1;
 IF enrolled IS NULL OR unenrolled IS NULL THEN
  RAISE EXCEPTION 'Test users missing in isolated Auth Staging';
 END IF;
 INSERT INTO mmh_n10_wallet_qa.investments VALUES (i_a,enrolled);
 INSERT INTO mmh_n10_wallet_qa.transactions VALUES (t_a,enrolled),(t_fee,enrolled),(t_b,unenrolled);
 INSERT INTO mmh_n10_wallet_qa.crypto_wallet_movements VALUES
   (id_a,enrolled,i_a,t_a,t_fee),
   (id_b,unenrolled,NULL,t_b,NULL);

 -- 1. Simulated enrolled AAL1 must be denied before mutation.
 PERFORM set_config('request.jwt.claims',
  jsonb_build_object('sub',enrolled::text,'aal','aal1','role','authenticated')::text,true);
 blocked := false;
 BEGIN
   PERFORM mmh_n10_wallet_qa.mmh_delete_crypto_wallet_movement_v4(id_a);
 EXCEPTION WHEN SQLSTATE '42501' THEN blocked := true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Enrolled AAL1 bypassed MFA'; END IF;
 INSERT INTO n10_wallet_qa_result VALUES('enrolled AAL1 denied',true);

 -- 2. Rejected call cannot delete either the movement or linked records.
 IF (SELECT count(*) FROM mmh_n10_wallet_qa.crypto_wallet_movements WHERE id=id_a)<>1
 OR (SELECT count(*) FROM mmh_n10_wallet_qa.transactions WHERE id IN(t_a,t_fee))<>2
 THEN RAISE EXCEPTION 'Rejected AAL1 modified wallet data'; END IF;
 INSERT INTO n10_wallet_qa_result VALUES('rejected request remains atomic',true);

 -- 3. Simulated enrolled AAL2 cannot delete a different user's movement.
 PERFORM set_config('request.jwt.claims',
  jsonb_build_object('sub',enrolled::text,'aal','aal2','role','authenticated')::text,true);
 blocked := false;
 BEGIN
   PERFORM mmh_n10_wallet_qa.mmh_delete_crypto_wallet_movement_v4(id_b);
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='Wallet movement not found' THEN blocked := true;
   ELSE RAISE; END IF;
 END;
 IF NOT blocked OR (SELECT count(*) FROM mmh_n10_wallet_qa.crypto_wallet_movements WHERE id=id_b)<>1
 THEN RAISE EXCEPTION 'Cross-account wallet mutation not blocked'; END IF;
 INSERT INTO n10_wallet_qa_result VALUES('AAL2 foreign UID denied',true);

 -- 4. Simulated enrolled AAL2 can delete its own record.
 IF NOT mmh_n10_wallet_qa.mmh_delete_crypto_wallet_movement_v4(id_a)
 THEN RAISE EXCEPTION 'AAL2 owner delete unsuccessful'; END IF;
 IF EXISTS(SELECT 1 FROM mmh_n10_wallet_qa.crypto_wallet_movements WHERE id=id_a)
 THEN RAISE EXCEPTION 'AAL2 wallet movement still exists'; END IF;
 INSERT INTO n10_wallet_qa_result VALUES('AAL2 owner wallet delete',true);

 -- 5. All three explicitly owned child records are removed.
 IF EXISTS(SELECT 1 FROM mmh_n10_wallet_qa.investments WHERE id=i_a)
 OR EXISTS(SELECT 1 FROM mmh_n10_wallet_qa.transactions WHERE id IN(t_a,t_fee))
 THEN RAISE EXCEPTION 'Linked-delete behavior changed'; END IF;
 INSERT INTO n10_wallet_qa_result VALUES('owned investment and two linked deletes',true);

 -- 6. Foreign user's movement and child record survive.
 IF NOT EXISTS(SELECT 1 FROM mmh_n10_wallet_qa.crypto_wallet_movements WHERE id=id_b)
 OR NOT EXISTS(SELECT 1 FROM mmh_n10_wallet_qa.transactions WHERE id=t_b)
 THEN RAISE EXCEPTION 'Foreign records damaged'; END IF;
 INSERT INTO n10_wallet_qa_result VALUES('foreign records untouched',true);

 -- 7. Unenrolled AAL1 still can delete its own data (no forced MFA).
 PERFORM set_config('request.jwt.claims',
  jsonb_build_object('sub',unenrolled::text,'aal','aal1','role','authenticated')::text,true);
 IF NOT mmh_n10_wallet_qa.mmh_delete_crypto_wallet_movement_v4(id_b)
 THEN RAISE EXCEPTION 'Unenrolled legacy account unexpectedly blocked'; END IF;
 IF EXISTS(SELECT 1 FROM mmh_n10_wallet_qa.transactions WHERE id=t_b)
 THEN RAISE EXCEPTION 'Unenrolled linked transfer not deleted'; END IF;
 INSERT INTO n10_wallet_qa_result VALUES('unenrolled AAL1 owns delete',true);

 -- 8. No identity must always be rejected.
 PERFORM set_config('request.jwt.claims','{}',true);
 blocked := false;
 BEGIN
  PERFORM mmh_n10_wallet_qa.mmh_delete_crypto_wallet_movement_v4(id_a);
 EXCEPTION WHEN SQLSTATE '28000' THEN blocked := true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Guest did not fail closed'; END IF;
 INSERT INTO n10_wallet_qa_result VALUES('missing user identity rejected',true);

 -- 9. Exported QA RPC may not be callable by anonymous role.
 IF has_function_privilege('anon',
    'mmh_n10_wallet_qa.mmh_delete_crypto_wallet_movement_v4(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'Anonymous can call privileged wallet QA RPC'; END IF;
 INSERT INTO n10_wallet_qa_result VALUES('anonymous EXECUTE revoked',true);
END;
$qa$;
SELECT count(*) AS cases, bool_and(passed) AS all_pass,
 string_agg(name,' | ' ORDER BY name) AS checks
FROM n10_wallet_qa_result;
ROLLBACK;
