-- MMHVAULT APP V11 · READ ONLY PRODUCTION AUDIT.
-- SELECT ONLY: no mutation, no user IDs, no names, no financial amounts returned.
-- Run only as an authorized administrator; account metadata is private.
-- The historical account currency is never inferred from transaction text.
-- Profile totals are aggregate counts and may change with ongoing usage.

WITH account_names AS (
  SELECT c.user_id, lower(trim(a.value->>'name')) AS name
  FROM public.personal_configuration c
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(c.config->'accounts')='array'
      THEN c.config->'accounts' ELSE '[]'::jsonb END
  ) a(value)
), tx_refs AS (
  SELECT user_id, from_account AS name FROM public.transactions
  WHERE nullif(trim(from_account),'') IS NOT NULL
  UNION ALL
  SELECT user_id, to_account AS name FROM public.transactions
  WHERE nullif(trim(to_account),'') IS NOT NULL
)
SELECT
  count(*) AS total_account_references,
  count(*) FILTER(WHERE a.name IS NOT NULL) AS matched_references,
  count(*) FILTER(WHERE a.name IS NULL) AS unmatched_references,
  count(DISTINCT (r.user_id,lower(trim(r.name))))
    FILTER(WHERE a.name IS NULL) AS distinct_unmatched_owner_account_pairs
FROM tx_refs r
LEFT JOIN account_names a ON r.user_id=a.user_id AND lower(trim(r.name))=a.name;

-- Duplicate display names (case/whitespace-insensitive) are dangerous because
-- historical transaction links use text rather than a foreign-key account ID.
WITH account_names AS (
  SELECT c.user_id, lower(trim(a.value->>'name')) AS name
  FROM public.personal_configuration c
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(c.config->'accounts')='array'
      THEN c.config->'accounts' ELSE '[]'::jsonb END
  ) a(value)
)
SELECT count(*) AS duplicate_owner_account_name_groups
FROM (
  SELECT user_id,name FROM account_names
  WHERE name IS NOT NULL AND name<>''
  GROUP BY user_id,name HAVING count(*)>1
) duplicates;

-- THB account metadata is checked, not silently rewritten.
WITH accounts AS (
  SELECT lower(trim(a.value->>'name')) AS name,
    upper(trim(a.value->>'currency')) AS currency
  FROM public.personal_configuration c
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(c.config->'accounts')='array'
      THEN c.config->'accounts' ELSE '[]'::jsonb END
  ) a(value)
)
SELECT count(*) FILTER(WHERE name IN ('baht','bath') AND currency<>'THB')
  AS baht_currency_mismatch_count
FROM accounts;
