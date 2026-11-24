-- N10 Auth-Staging — V2 session guard EMERGENCY FAIL-CLOSED DISABLE.
-- REVIEW ONLY / NOT APPROVED TO EXECUTE. No restoration of weaker legacy RPC.
-- Scope: ONLY the new, dedicated V2 RPC execution grant in Auth-Staging.
-- Must be run only after a separate authorized deployment / incident decision.
-- Revoking service-role access intentionally makes Vault backup/reveal fail
-- closed. This does not erase recovery phrases, accounts or financial data.
-- Do not grant to anon or authenticated. Do not touch the legacy signature.
BEGIN;
DO $gate$
BEGIN
 IF to_regprocedure('public.mmh_n10_recovery_session_active(uuid,uuid,text)') IS NULL THEN
   RAISE EXCEPTION 'V2 signature not installed; no change made';
 END IF;
 IF to_regprocedure('public.mmh_n10_recovery_session_active(uuid,uuid)') IS NOT NULL THEN
   RAISE EXCEPTION 'Legacy RPC unexpectedly present; manual incident review required';
 END IF;
END;
$gate$;
REVOKE EXECUTE ON FUNCTION public.mmh_n10_recovery_session_active(uuid,uuid,text)
 FROM service_role;
COMMIT;
-- Verify service_role/anon/authenticated EXECUTE all false for V2.
-- To resume: require fresh explicit authorization, signed exact-service
-- AAL1/AAL2 acceptance, and reviewed service-role-only GRANT migration.
