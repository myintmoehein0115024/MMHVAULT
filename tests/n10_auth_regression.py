"""N10 login regression contract. Static checks, NOT live authentication tests."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "login.html").read_text(encoding="utf-8")
JS = (ROOT / "js/mmhvault-n10-a7-69-username.js").read_text(encoding="utf-8")
MFA_SQL = (ROOT / "docs/sql/n10_mfa_gate_candidate_staging_only.sql").read_text(encoding="utf-8")


class N10AuthContract(unittest.TestCase):
    def test_unified_identifier_input(self):
        self.assertRegex(HTML, r'<input\s+id="signinEmail"\s+type="text"')
        self.assertIn("Email or Username", HTML)
        self.assertIn("!v.includes('@')", JS)
        self.assertIn("if(!smartUsername())return;", JS)
        self.assertRegex(HTML, r'if\(!/\^\[\^\\s@\]\+@')

    def test_username_registration_has_recovery_backup(self):
        for marker in ("prepare_signup", "phrase_prepared", "signup_success",
                       "backupAgree.checked", "mmhN10RecoveryDialog",
                       "mmhA769ModalConfirm", "recovery_words?.length!==10"):
            self.assertIn(marker, JS)

    def test_recovery_login_separate_from_main_form(self):
        for marker in ("mmhN10RecoveryLoginOverlay", "showRecoveryLogin()",
                       "chooseMode('phrase')", "closeRecoveryLogin()",
                       "mmhN10RecoveryClose"):
            self.assertIn(marker, JS)
        self.assertIn("setAttribute('role','dialog')", JS)

    def test_mfa_challenge_and_aal2_handoff(self):
        for marker in ("mmhMfaDialogV783", "getAuthenticatorAssuranceLevel",
                       "currentLevel!=='aal2'", "data-open", "verifiedRedirectV946"):
            self.assertIn(marker, HTML + JS)
        self.assertIn("auth.mfa.challenge", HTML)
        self.assertIn("auth.mfa.verify", HTML)
        # A failed verified redirect must not dismiss the MFA challenge UI.
        self.assertIn("if(redirected!==true)throw Error('verified_redirect_failed')", HTML)
        self.assertLess(HTML.index("if(redirected!==true)throw Error('verified_redirect_failed')"), HTML.rindex("layer.dataset.owner='';layer.dataset.open='false';layer.hidden=true;"))

    def test_fail_closed_candidate_and_privileged_rpc_guidance(self):
        for marker in ("coalesce(", "auth.uid() is not null",
                       "auth.mfa_factors", "verified", "false",
                       "SECURITY DEFINER", "RPC"):
            self.assertIn(marker, MFA_SQL)
        self.assertIn("NEVER auto-apply to production", MFA_SQL)

    def test_callback_does_not_trust_cached_session(self):
        self.assertIn("authCallbackPendingV945", HTML)
        self.assertIn("An old INITIAL_SESSION cannot complete an OAuth callback.", HTML)
        self.assertIn("A bad or stale code should be recoverable without a loop.", HTML)
        self.assertIn("recoveryCallbackPendingV944", HTML)
        self.assertIn("requiresRecoveryEvent:true", HTML)

    def test_mfa_challenge_isolated_and_exit_available(self):
        self.assertIn('aria-modal="true"', HTML)
        self.assertIn('id="mmhMfaSignOutV783"', HTML)
        self.assertIn("auth.signOut({scope:'local'})", HTML)
        self.assertIn("data-mfa-code", HTML)
        self.assertIn("if(!/^\\d{6}$/.test(value))", HTML)
        self.assertIn("layer.dataset.open='true'", HTML)

    def test_recovery_phrase_only_in_memory_client_side(self):
        self.assertIn("prepared.phrase.fill('')", JS)
        self.assertIn("inputWords.forEach(el=>el.value='')", JS)
        self.assertIn("window.addEventListener('pagehide'", JS)
        self.assertIn("captcha_token:captchaToken", JS)
        self.assertIn("credentials:'omit'", JS)

    def test_public_mfa_policy_inventory_and_safe_rollback(self):
        migration = (ROOT / "docs/sql/n10_mfa_public_policy_candidate_NOT_FOR_DEPLOYMENT.sql").read_text(encoding="utf-8")
        rollback = (ROOT / "docs/sql/n10_mfa_policy_rollback_CANDIDATE.sql").read_text(encoding="utf-8")
        targets = re.findall(r"^    '([a-z0-9_]+)'[,]?$", migration, flags=re.MULTILINE)
        self.assertEqual(len(targets), 59)
        self.assertEqual(len(set(targets)), 59)
        self.assertIn("transactions", targets)
        self.assertIn("crypto_wallet_movements", targets)
        self.assertIn("life_habit_entries", targets)
        self.assertIn("business_accounts", targets)
        self.assertNotIn("mmh_n10a769_recovery_phrases", targets)
        self.assertIn("AS RESTRICTIVE FOR ALL TO authenticated", migration)
        self.assertIn("coalesce(", migration.lower())
        self.assertIn("mmh_n10_mfa_required", rollback)
        self.assertIn("Intentionally retain the helper", rollback)
        self.assertIn("unexpected_tables", migration)
        self.assertIn("NOT c.relrowsecurity", migration)
        self.assertIn("c.relname <> ALL(protected_tables)", migration)
        self.assertIn("N10 unreviewed public table inventory", migration)
        self.assertIn("MMHVAULT-N10-MFA-RESTRICTIVE-V1", migration)
        self.assertIn("obj_description(p.oid, 'pg_policy')", rollback)
        self.assertIn("MMHVAULT-N10-MFA-RESTRICTIVE-V1", rollback)

    def test_storage_and_privileged_rpc_candidates(self):
        storage = (ROOT / "docs/sql/n10_mfa_storage_policy_candidate_NOT_FOR_DEPLOYMENT.sql").read_text(encoding="utf-8")
        wallet = (ROOT / "docs/sql/n10_mfa_wallet_rpc_candidate_NOT_FOR_DEPLOYMENT.sql").read_text(encoding="utf-8")
        for name in ('receipts', 'mmh-feedback', 'mmh-business-assets'):
            self.assertIn(name, storage)
        self.assertIn("AS RESTRICTIVE FOR ALL TO authenticated", storage)
        self.assertIn("mmh_n10_security.mfa_access_ok()", storage)
        self.assertIn("public IS TRUE", storage)
        self.assertIn("mmh_delete_crypto_wallet_movement_v4(p_id uuid)", wallet)
        self.assertIn("SET search_path = ''", wallet)
        self.assertIn("IF NOT COALESCE(mmh_n10_security.mfa_access_ok(), false)", wallet)
        self.assertLess(wallet.index("IF NOT COALESCE("), wallet.index("SELECT * INTO r"))
        self.assertIn("m.user_id=u", wallet)
        for table in ("public.investments", "public.transactions"):
            self.assertIn(table, wallet)

    def test_preflight_and_all_three_rollbacks_have_exact_scopes(self):
        sqlroot = ROOT / "docs/sql"
        public_sql = (sqlroot / "n10_mfa_public_policy_candidate_NOT_FOR_DEPLOYMENT.sql").read_text(encoding="utf-8")
        preflight = (sqlroot / "n10_mfa_release_readonly_preflight.sql").read_text(encoding="utf-8")
        storage = (sqlroot / "n10_mfa_storage_policy_candidate_NOT_FOR_DEPLOYMENT.sql").read_text(encoding="utf-8")
        storage_back = (sqlroot / "n10_mfa_storage_rollback_CANDIDATE.sql").read_text(encoding="utf-8")
        wallet = (sqlroot / "n10_mfa_wallet_rpc_candidate_NOT_FOR_DEPLOYMENT.sql").read_text(encoding="utf-8")
        wallet_back = (sqlroot / "n10_mfa_wallet_rpc_rollback_CANDIDATE.sql").read_text(encoding="utf-8")
        public_targets = set(re.findall(r"^    '([a-z0-9_]+)'[,]?$", public_sql, flags=re.MULTILINE))
        expected_in_preflight = preflight.split("WITH expected(name)",1)[1].split("infra(name)",1)[0]
        preflight_targets = set(re.findall(r"'([a-z0-9_]+)'", expected_in_preflight))
        self.assertEqual(len(public_targets), 59)
        self.assertEqual(public_targets, preflight_targets)
        for check in (
            "protected_59_rls_ok", "infra_5_rls_ok", "all_public_tables_rls",
            "all_three_storage_buckets_private",
            "all_original_storage_owner_policies_present",
            "wallet_original_owner_and_definer_ok",
            "wallet_anon_execute_denied", "legacy_view_runs_as_invoker"
        ):
            self.assertIn(check, preflight)
        self.assertIn("MMHVAULT-N10-MFA-STORAGE-RESTRICTIVE-V1", storage)
        self.assertIn("MMHVAULT-N10-MFA-STORAGE-RESTRICTIVE-V1", storage_back)
        self.assertIn("obj_description(p.oid,'pg_policy')", storage_back)
        self.assertIn("DROP POLICY mmh_n10_private_storage_mfa_guard", storage_back)
        self.assertNotIn("DELETE FROM storage.objects", storage_back)
        self.assertIn("MMHVAULT-N10-WALLET-MFA-V1", wallet)
        self.assertIn("MMHVAULT-N10-WALLET-MFA-V1", wallet_back)
        self.assertIn("obj_description(p.oid,'pg_proc')", wallet_back)
        self.assertIn("SET search_path TO 'public'", wallet_back)
        self.assertIn("CREATE OR REPLACE FUNCTION public.mmh_delete_crypto_wallet_movement_v4", wallet_back)
        self.assertIn("CREATE OR REPLACE FUNCTION public.mmh_delete_crypto_wallet_movement_v4", wallet)
        self.assertIn("mmh_n10_security.mfa_access_ok()", wallet)
        self.assertNotIn("mmh_n10_security.mfa_access_ok()", wallet_back.split("CREATE OR REPLACE FUNCTION", 1)[1])

    def test_atomic_release_and_rollback_bundle_match_source_fragments(self):
        root = ROOT / "docs/sql"
        release = (root / "n10_mfa_atomic_release_NOT_FOR_DEPLOYMENT.sql").read_text(encoding="utf-8")
        rollback = (root / "n10_mfa_atomic_rollback_NOT_FOR_DEPLOYMENT.sql").read_text(encoding="utf-8")
        for source, paths in (
            (release, [
                "n10_mfa_public_policy_candidate_NOT_FOR_DEPLOYMENT.sql",
                "n10_mfa_storage_policy_candidate_NOT_FOR_DEPLOYMENT.sql",
                "n10_mfa_wallet_rpc_candidate_NOT_FOR_DEPLOYMENT.sql"
            ]),
            (rollback, [
                "n10_mfa_wallet_rpc_rollback_CANDIDATE.sql",
                "n10_mfa_storage_rollback_CANDIDATE.sql",
                "n10_mfa_policy_rollback_CANDIDATE.sql"
            ]),
        ):
            self.assertEqual(len(re.findall(r"^BEGIN;$", source, re.MULTILINE)), 1)
            self.assertEqual(len(re.findall(r"^COMMIT;$", source, re.MULTILINE)), 1)
            self.assertIn("NOT FOR DEPLOYMENT", source if source == release else source.upper().replace("NOT AUTHORIZED", "NOT FOR DEPLOYMENT"))
            for path in paths:
                fragment = (root / path).read_text(encoding="utf-8")
                fragment = re.sub(r"^BEGIN;\s*$", "", fragment, flags=re.MULTILINE)
                fragment = re.sub(r"^COMMIT;\s*$", "", fragment, flags=re.MULTILINE).strip()
                self.assertIn(fragment, source, path)
        self.assertIn("IF marked <> 59", rollback)
        self.assertIn("MMHVAULT-N10-MFA-STORAGE-RESTRICTIVE-V1", rollback)
        self.assertIn("MMHVAULT-N10-WALLET-MFA-V1", rollback)
        workflow = (ROOT / ".github/workflows/n10-auth-static-check.yml").read_text(encoding="utf-8")
        self.assertIn("docs/sql/n10_mfa_*.sql", workflow)

    def test_edge_sensitive_api_candidates_require_mfa_before_access(self):
        root = ROOT / "security/n10-edge-candidates"
        push = (root / "mmh-push-test/index.ts").read_text(encoding="utf-8")
        ai = (root / "mmh-financial-assistant/index.ts").read_text(encoding="utf-8")
        for src in (push, ai):
            self.assertIn("MFA_REQUIRED", src)
            self.assertIn("MFA_CHECK_UNAVAILABLE", src)
            self.assertIn("Not deployed", src)
        self.assertIn("auth.mfa_factors", push)
        self.assertIn("payload?.sub === user.id", push)
        self.assertIn("payload?.aal === \"aal2\"", push)
        self.assertLess(push.index("if (mfaRequired)"), push.index("const subs = await sql"))
        self.assertLess(push.index("MFA_REQUIRED"), push.index("from vault.decrypted_secrets"))
        self.assertIn("getAuthenticatorAssuranceLevel(jwt)", ai)
        self.assertIn('import { evaluateMfaAssurance } from "./mfa-assurance.mjs"', ai)
        self.assertIn('const decision = evaluateMfaAssurance(assurance, hasVerifiedFactor)', ai)
        self.assertIn('user.factors.some(', ai)
        self.assertIn('decision === "unavailable"', ai)
        self.assertIn('decision === "required"', ai)
        helper = (root / "mmh-financial-assistant/mfa-assurance.mjs").read_text(encoding="utf-8")
        self.assertIn('nextLevel !== "aal1" && nextLevel !== "aal2"', helper)
        self.assertIn('authHasVerifiedFactor === true', helper)
        self.assertIn('nextLevel !== "aal1" && nextLevel !== "aal2"', helper)
        self.assertIn('return "unavailable"', helper)
        self.assertLess(ai.index("MFA_REQUIRED"), ai.index("let body: any"))
        self.assertLess(ai.index("MFA_REQUIRED"), ai.index("const transactions = await readRows("))

    def test_private_storage_links_are_short_lived(self):
        # Signed URLs act as bearer links even after local sign-out, and
        # private object responses can also remain cached at CDN edges.
        # This contract covers frontend-issued URLs; it cannot revoke
        # previously issued links or rewrite old objects' cache metadata.
        app = (ROOT / "app.html").read_text(encoding="utf-8")
        urls = re.findall(r"\.createSignedUrl\([^\n;]{0,100}?\)", app)
        self.assertEqual(len(urls), 8, "Review any new or removed signing path")
        expiries = [int(value) for value in re.findall(
            r"\.createSignedUrl\([^\n;]*?,\s*(\d+)\s*\)", app)]
        self.assertEqual(len(expiries), 8)
        self.assertLessEqual(max(expiries), 300)
        self.assertEqual(min(expiries), 60)
        caches = [int(x) for x in re.findall(
            r"cacheControl\s*:\s*['\"](\d+)['\"]", app)]
        self.assertEqual(len(caches), 6)
        self.assertLessEqual(max(caches), 60)
        self.assertIn("expires:Date.now()+4*60*1000", app)
        self.assertNotIn("expires:Date.now()+55*60*1000", app)

    def test_recovery_phrase_verify_requires_mfa_when_enrolled(self):
        # Sensitive recovery-phrase verification must not be callable on AAL1
        # after the user voluntarily enrolls Authenticator. Never require
        # MFA from a valid unenrolled AAL1 account.
        source = (ROOT / "security/n10-edge-candidates/mmh-n10a783-phrase-verify/index.ts").read_text(encoding="utf-8")
        self.assertIn("NOT DEPLOYED", source)
        self.assertIn("getAuthenticatorAssuranceLevel(jwt)", source)
        self.assertIn("hasVerifiedFactor && nextLevel!=='aal2'", source)
        self.assertIn("nextLevel==='aal2'&&currentLevel!=='aal2'", source)
        self.assertIn("mfa_state_unavailable", source)
        self.assertIn("mfa_required", source)
        self.assertLess(source.index("const mfaDecision=await checkMfa("),
                        source.index("if(body?.action==='status')"))
        self.assertLess(source.index("const mfaDecision=await checkMfa("),
                        source.index("if(body?.action!=='verify_saved_phrase')"))
        self.assertIn("user.app_metadata?.mmhvault_auth_kind!=='username_only'", source)
        self.assertIn("sameHex(verifier,records[0].verifier)", source)

    def test_no_new_production_server_changes(self):
        # The workflow never deploys or migrates production resources.
        workflow = (ROOT / ".github/workflows/n10-auth-static-check.yml").read_text(encoding="utf-8")
        self.assertNotIn("supabase db push", workflow)
        self.assertNotIn("supabase functions deploy", workflow)
        self.assertNotIn("git push origin main", workflow)


if __name__ == "__main__":
    unittest.main()
