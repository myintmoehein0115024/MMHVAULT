-- N10-A7.44 offline PostgreSQL integration fixture. NO REAL USER ACCOUNTS OR PROD CONNECTION.
-- Executed only inside a disposable GitHub Actions postgres:17 service.
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
