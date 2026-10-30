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
        self.assertIn('role="dialog"', JS)

    def test_mfa_challenge_and_aal2_handoff(self):
        for marker in ("mmhMfaDialogV783", "getAuthenticatorAssuranceLevel",
                       "currentLevel!=='aal2'", "data-open", "verifiedRedirectV946"):
            self.assertIn(marker, HTML + JS)
        self.assertIn("auth.mfa.challenge", HTML)
        self.assertIn("auth.mfa.verify", HTML)

    def test_fail_closed_candidate_and_privileged_rpc_guidance(self):
        for marker in ("coalesce(", "auth.uid() is not null",
                       "auth.mfa_factors", "verified", "false",
                       "SECURITY DEFINER", "RPC"):
            self.assertIn(marker, MFA_SQL)
        self.assertIn("NEVER auto-apply to production", MFA_SQL)

    def test_no_new_production_server_changes(self):
        # The workflow never deploys or migrates production resources.
        workflow = (ROOT / ".github/workflows/n10-auth-static-check.yml").read_text(encoding="utf-8")
        self.assertNotIn("supabase db push", workflow)
        self.assertNotIn("supabase functions deploy", workflow)
        self.assertNotIn("git push origin main", workflow)


if __name__ == "__main__":
    unittest.main()
