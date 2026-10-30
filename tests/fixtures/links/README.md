# Saved overlay links

Real overlay links, one JSON file each, grouped by schema version (`v1/`, `v2/`, …). They stand in for links streamers have already pasted into OBS. CI checks that every one still loads (`tests/unit/settings/old-links.test.ts`).

Rules:
- **Never edit or regenerate a fixture.** If an old link stops loading, fix the code (add a migration), not the fixture.
- **Add a fixture** whenever the settings schema changes or a new overlay ships.
- Format: `{ "overlay": "starting", "created": "YYYY-MM-DD", "link": "/o/starting#1.…" }`. Query flags go before the `#` as in real links, e.g. a saved overlay's `?live=<id>` (T12.4).
- No logos or other external URLs, so tests never touch the network.
