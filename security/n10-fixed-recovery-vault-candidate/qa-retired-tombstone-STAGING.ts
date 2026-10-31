// N10 MMHVAULT Auth-Staging — retired QA endpoint (permanent closed stub).
// Project: ldivswlhtgmznzwhzsoi ONLY. No secrets, auth admin,
// database, Vault, user identity, recovery words, or mutation operations.
// Deliberately has no request-origin CORS and no action routing.
// Supabase Edge gateway MUST retain verify_jwt=true.
Deno.serve((_req: Request) => {
  return new Response(JSON.stringify({code:'qa_retired'}), {
    status:410,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store, max-age=0',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'none'"
    }
  });
});
