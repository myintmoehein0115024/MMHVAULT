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
        self.assertLess(HTML.index("if(redirected!==true)throw Error('verified_redirect_failed')"), HTML.index("layer.dataset.owner='';layer.dataset.open='false';layer.hidden=true;"))

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

    def test_no_new_production_server_changes(self):
        # The workflow never deploys or migrates production resources.
        workflow = (ROOT / ".github/workflows/n10-auth-static-check.yml").read_text(encoding="utf-8")
        self.assertNotIn("supabase db push", workflow)
        self.assertNotIn("supabase functions deploy", workflow)
        self.assertNotIn("git push origin main", workflow)


if __name__ == "__main__":
    unittest.main()
