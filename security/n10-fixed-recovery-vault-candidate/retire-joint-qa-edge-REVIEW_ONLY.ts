// N10 Auth-Staging joint MFA/Vault QA — RETIREMENT CANDIDATE ONLY.
// NOT DEPLOYED. Do not deploy without distinct owner approval.
// Intended exact deployed slug: mmh-n10-qa-joint-mfa-vault-20261101
// Auth-Staging project: ldivswlhtgmznzwhzsoi ONLY.
// Existing Edge gateway setting MUST remain verify_jwt=true.
// This is a fail-closed, permanent retirement response. It does NOT
// re-enable or circumvent any LOCKED QA flow.
// No authenticated actions, secret reads, database calls, recovery
// phrases, user identifiers, CORS access or rollback-by-revival.
Deno.serve((_req: Request) => {
  return new Response(JSON.stringify({code:'qa_retired'}), {
    status:410,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'none'",
      'Cross-Origin-Resource-Policy':'same-origin'
    }
  });
});
