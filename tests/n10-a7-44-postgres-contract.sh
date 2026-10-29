#!/usr/bin/env bash
# Only run against disposable local GitHub Actions PostgreSQL.
set -euo pipefail
: "${PGHOST:?PGHOST must be set to a disposable PostgreSQL service}"
: "${PGDATABASE:?missing temporary PGDATABASE}"
if [ "${PGHOST}" != "127.0.0.1" ] && [ "${PGHOST}" != "localhost" ]; then
  echo "Refusing PostgreSQL integration test on any non-local host" >&2; exit 2
fi
if [ "${PGDATABASE}" != "mmhvault_ci_only" ]; then
  echo "Refusing PostgreSQL integration test against non-CI database" >&2; exit 2
fi
psql -X -v ON_ERROR_STOP=1 -f tests/n10-a7-44-postgres-fixture.sql
psql -X -v ON_ERROR_STOP=1 -f review/N10-A7.40-PRODUCTION-DB-CANDIDATE-NEVER-RUN.sql
psql -X -v ON_ERROR_STOP=1 -f tests/n10-a7-44-postgres-contract.sql
# 12 truly concurrent database sessions exercise ON CONFLICT counter atomicity.
for i in {1..12}; do
  psql -X -qAt -v ON_ERROR_STOP=1 -c \
  "SET ROLE service_role; SELECT public.mmh_n10a740_take_attempt(repeat('c',64), 25, 600);" >/dev/null &
done
wait
COUNT="$(psql -X -qAt -v ON_ERROR_STOP=1 -c "SELECT attempt_count FROM public.mmh_n10a740_attempt_buckets WHERE bucket_key=repeat('c',64)")"
if [ "$COUNT" != "12" ]; then
  echo "Atomic concurrency failure: expected 12, observed: $COUNT" >&2; exit 1
fi
# Restore 8 exact policy predicates from production pg_policies metadata;
# test with two entirely fake UIDs in this same disposable CI database.
psql -X -v ON_ERROR_STOP=1 -f tests/n10-a7-44-production-policy-snapshot.sql
psql -X -v ON_ERROR_STOP=1 -f tests/n10-a7-44-cross-uid-rls.sql
echo "PASS N10-A7.44 PostgreSQL 17: real constraints, service-only RPC, RLS enabled, unique username/UID and 12 concurrent limiter calls and 8 cross-UID RLS policy fixtures."
