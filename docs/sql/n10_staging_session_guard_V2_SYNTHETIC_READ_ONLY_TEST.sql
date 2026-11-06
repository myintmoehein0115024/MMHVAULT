-- N10 session V2 guard: synthetic read-only PostgreSQL truth table.
-- REVIEW ONLY. All UUIDs and sessions below are invented static fixtures.
-- Does NOT invoke installed auth RPC, verify any signed JWT, access Auth users,
-- inspect passwords or recovery words, write data, activate QA or deploy code.
-- Run only via SELECT on the explicitly connected Auth-Staging project.
WITH
factor_rows(id,user_id,status) AS (
 VALUES
  ('11111111-1111-4111-8111-111111111101'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'verified'),
  ('11111111-1111-4111-8111-111111111102'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'unverified'),
  ('33333333-3333-4333-8333-333333333301'::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,'verified')
),
session_rows(id,user_id,aal,factor_id,not_after) AS (
 VALUES
  ('aaaaaaaa-1111-4111-8111-111111111111'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal2','11111111-1111-4111-8111-111111111101'::uuid,now()+interval '1 hour'),
  ('aaaaaaaa-2222-4222-8222-222222222222'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal1',NULL::uuid,now()+interval '1 hour'),
  ('bbbbbbbb-1111-4111-8111-111111111111'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'aal1',NULL::uuid,now()+interval '1 hour'),
  ('bbbbbbbb-2222-4222-8222-222222222222'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'aal2','11111111-1111-4111-8111-111111111101'::uuid,now()+interval '1 hour'),
  ('aaaaaaaa-3333-4333-8333-333333333333'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal2','11111111-1111-4111-8111-111111111102'::uuid,now()+interval '1 hour'),
  ('cccccccc-1111-4111-8111-111111111111'::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,'aal2','11111111-1111-4111-8111-111111111101'::uuid,now()+interval '1 hour'),
  ('aaaaaaaa-4444-4444-8444-444444444444'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal2','11111111-1111-4111-8111-111111111101'::uuid,now()-interval '1 hour'),
  ('aaaaaaaa-5555-4555-8555-555555555555'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal2',NULL::uuid,now()+interval '1 hour'),
  ('bbbbbbbb-3333-4333-8333-333333333333'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'aal1','11111111-1111-4111-8111-111111111101'::uuid,now()+interval '1 hour'),
  ('cccccccc-2222-4222-8222-222222222222'::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,'aal2','33333333-3333-4333-8333-333333333301'::uuid,now()+interval '1 hour')
),
expectations(label,session_id,claimed_uid,expected_aal,should_allow) AS (
 VALUES
 ('valid verified same-owner AAL2', 'aaaaaaaa-1111-4111-8111-111111111111'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal2',true),
 ('AAL1 blocked after MFA enrollment', 'aaaaaaaa-2222-4222-8222-222222222222'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal1',false),
 ('valid unenrolled AAL1','bbbbbbbb-1111-4111-8111-111111111111'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'aal1',true),
 ('foreign factor owner denied','bbbbbbbb-2222-4222-8222-222222222222'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'aal2',false),
 ('unverified factor denied','aaaaaaaa-3333-4333-8333-333333333333'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal2',false),
 ('wrong factor for C denied','cccccccc-1111-4111-8111-111111111111'::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,'aal2',false),
 ('expired AAL2 denied','aaaaaaaa-4444-4444-8444-444444444444'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal2',false),
 ('AAL2 without factor denied','aaaaaaaa-5555-4555-8555-555555555555'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal2',false),
 ('AAL1 attached to foreign factor denied','bbbbbbbb-3333-4333-8333-333333333333'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'aal1',false),
 ('cross-owner user claim denied','aaaaaaaa-1111-4111-8111-111111111111'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'aal2',false),
 ('AAL mismatch AAL2 to AAL1 denied','aaaaaaaa-1111-4111-8111-111111111111'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal1',false),
 ('AAL mismatch AAL1 to AAL2 denied','bbbbbbbb-1111-4111-8111-111111111111'::uuid,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'aal2',false),
 ('missing AAL claim denied','aaaaaaaa-1111-4111-8111-111111111111'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,NULL::text,false),
 ('unknown AAL claim denied','aaaaaaaa-1111-4111-8111-111111111111'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal0',false),
 ('valid verified same-owner C AAL2','cccccccc-2222-4222-8222-222222222222'::uuid,'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,'aal2',true),
 ('unknown session ID denied','dddddddd-4444-4444-8444-444444444444'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,'aal2',false)
),
evaluated AS (
 SELECT e.label,e.should_allow,EXISTS(
  SELECT 1 FROM session_rows AS s
  WHERE s.id=e.session_id AND s.user_id=e.claimed_uid
    AND (s.not_after IS NULL OR s.not_after>now())
    AND (
      (e.expected_aal='aal1'
       AND s.aal='aal1' AND s.factor_id IS NULL
       AND NOT EXISTS (
        SELECT 1 FROM factor_rows AS f
        WHERE f.user_id=e.claimed_uid AND f.status='verified'
       ))
      OR
      (e.expected_aal='aal2'
       AND s.aal='aal2' AND s.factor_id IS NOT NULL
       AND EXISTS (
        SELECT 1 FROM factor_rows AS f
        WHERE f.id=s.factor_id AND f.user_id=e.claimed_uid
          AND f.status='verified'
       ))
    )
 ) AS actual_allow
 FROM expectations AS e
)
SELECT count(*)::integer AS test_cases,
 count(*) FILTER(WHERE actual_allow=should_allow)::integer AS passed,
 count(*) FILTER(WHERE actual_allow IS DISTINCT FROM should_allow)::integer AS failed,
 COALESCE(string_agg(label,', ' ORDER BY label)
          FILTER(WHERE actual_allow IS DISTINCT FROM should_allow),'') AS failed_labels
FROM evaluated;
-- This tests only the proposed logic against fabricated rows, not deployed
-- RLS, Auth-signed JWTs, or any live Staging recovery API.
