# MMHVAULT — branded authentication emails (2026-10-31)

These HTML templates use existing MMHVAULT branding and the official image at:
https://mmhvault.com/images/mmhvault-logo-transparent.png

They are **ready for hosted Supabase Email Templates** but are **not yet applied to the Auth email configuration**. The GitHub connector cannot change hosted Auth email settings. No mailer settings, SMTP sender or production Auth template has been modified.

## Template mapping / Suggested subjects
- `email-templates/reset_password.html` — MMHVAULT | Reset your password
- `email-templates/confirm_signup.html` — MMHVAULT | Verify your email
- `email-templates/magic_link.html` — MMHVAULT | Your secure sign-in link
- `email-templates/invite.html` — MMHVAULT | Private workspace invitation
- `email-templates/change_email.html` — MMHVAULT | Confirm email change
- `email-templates/reauthentication.html` — MMHVAULT | Your verification code
- `email-templates/password_changed.html` — MMHVAULT | Password changed
- `email-templates/verification_method_added.html` — MMHVAULT | Security method added

- `email-templates/email_changed.html` — MMHVAULT | Email address changed
- `email-templates/sign_in_method_linked.html` — MMHVAULT | Sign-in method linked
- `email-templates/sign_in_method_removed.html` — MMHVAULT | Sign-in method removed
- `email-templates/verification_method_removed.html` — MMHVAULT | Security method removed

## Required installation (hosted Supabase)
1. Open https://supabase.com/dashboard/project/vrypucmyrztxgiqhjspd/auth/templates
2. Select the matching template (e.g. Reset password).
3. Change the email **Subject** to the suggested subject above; paste all HTML from the matching file in the template's **Body**, then Save.
4. Send a test recovery email to a mailbox you control and verify logo, button and callback at https://mmhvault.com/login.html. Do not forward real reset links or tokens.
5. Repeat for Confirm signup, Magic link, Invite user, Change email and Reauthentication. Security notifications are only sent if enabled and the corresponding dashboard templates exist.

Each action email deliberately uses the **unmodified Supabase Go template** `{{ .ConfirmationURL }}`. Reauthentication uses `{{ .Token }}`. Do not replace either with `https://mmhvault.com/login.html`, because doing so would skip server-side confirmation. Gmail or mobile email readers may hide remote images until authorized; the brand text remains visible.

This is a branding-only change. The sending address still displays Supabase Auth while using default SMTP. A custom verified-domain SMTP provider is required to change the from-address; do not assume template HTML alone changes it.

## Safeguards
- Do not include passwords, recovery words, TOTP secrets or live tokens in PRs or chats.
- Keep confirmation links untouched, and disable click tracking / link rewriting in custom SMTP.
- Preview in Gmail and mobile; HTML tables and inline styles provide broad email-client support.
- Never claim the account was verified just because the message was delivered.
