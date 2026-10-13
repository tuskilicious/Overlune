# Backups and restore

Overlune's only server data is the production D1 database `overlune-production`: accounts (`users`) and sign-ins (`sessions`). Two layers protect it (CLAUDE.md §4):

| Layer | What | Covers |
|---|---|---|
| **D1 Time Travel** | Cloudflare's point-in-time restore, on by default | Any minute in the last 7 days (30 on Workers Paid) |
| **Nightly encrypted copy** | `tuskilicious/overlune-backups` (private): a GitHub Actions job dumps production every night at 02:00 IST, encrypts it with the owner's [age](https://age-encryption.org) public key and commits `backups/overlune-production-YYYY-MM-DD.sql.age` | Anything older than 7 days, or losing the Cloudflare account. Kept forever |

**How the nightly copy works.** The job's token (`CLOUDFLARE_D1_BACKUP_TOKEN`) has only Account > D1 > Read. `wrangler d1 export` needs a token that can write (and blocks the database while it runs), so the job runs `dump.mjs` in that repo instead: read-only `SELECT`s through D1's query API, written out as `CREATE TABLE` and `INSERT` statements. The plain SQL exists only inside the job; only the encrypted file is committed. The private key never touches GitHub or Cloudflare: the owner keeps it offline, with a second copy. Without it no copy can be decrypted.

**If a night fails,** GitHub emails the owner. A dump with no `CREATE TABLE` in it counts as a failure.

## Restore with Time Travel (first choice, within 7 days)

1. Pick the moment before the damage, in UTC, and check it:
   `npx wrangler d1 time-travel info overlune-production --env production --timestamp=2026-10-13T00:00:00Z`
2. Restore. This overwrites the database in place, and prints a bookmark that undoes the restore:
   `npx wrangler d1 time-travel restore overlune-production --env production --timestamp=2026-10-13T00:00:00Z`
3. Check `https://overlune.in/api/health` (it reports the schema version) and sign in.

## Restore from the nightly copy

1. Download the night's file from `tuskilicious/overlune-backups/backups/`.
2. Decrypt it on your own machine:
   `age -d -i overlune-backup.key -o dump.sql overlune-production-YYYY-MM-DD.sql.age`
3. Load it into an **empty** database (the dump creates its tables, so it fails on one that already has them):
   `npx wrangler d1 create overlune-restore`, then
   `npx wrangler d1 execute overlune-restore --remote --file dump.sql`
4. Compare row counts with the copy (`SELECT count(*) FROM users`, and the same for `sessions`, `app_meta`, `d1_migrations`).
5. To make it production: put the new database's id in `wrangler.jsonc` (`env.production.d1_databases`), merge, and check `/api/health`.
6. Delete `dump.sql`: it holds account data in plain text.

## Restore drills

Restore a real copy before launch and after major schema changes (CLAUDE.md §4). Log each one here.

| Date | Copy | Into | Result |
|---|---|---|---|
| 2026-10-13 | `overlune-production-2026-10-13.sql.age`, the first nightly copy | A new, empty D1 database, `overlune-restore-drill`, deleted afterwards | Passed. Decrypted with the owner's offline key; loaded with `wrangler d1 execute --file`; 4 tables, the `sessions_by_user` index, 2 `d1_migrations` rows and 1 `app_meta` row (`schema=2`), identical to production. Production had no accounts yet, so `users` and `sessions` were empty: redo at T7.9 with real rows. |
