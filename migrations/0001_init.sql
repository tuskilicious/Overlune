-- 0001 (T7.2): the starting point. Accounts and sessions arrive in T7.4. This table only records the schema version,
-- so /api/health can show that migrations ran on this database.
CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;

INSERT INTO app_meta (key, value) VALUES ('schema', '1');
