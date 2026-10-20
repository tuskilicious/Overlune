# Handoff: where the work stands (2026-10-20)

For any agent picking up Overlune (Codex, Claude Code, others). Read `CLAUDE.md` first: its rules always win. Keep this file current: update it at the end of a working session.

## The project in one paragraph
**Overlune** (overlune.in, repo `tuskilicious/Overlune`) is a free, open-source stream overlay maker.

- **Stack:** React + Vite on Cloudflare Pages, with Pages Functions + D1 for optional Twitch sign-in (v2).
- **Settings:** they live in the overlay link's fragment (`#1.<lz-string>`, zod schema, additive-only: old links must keep working).
- **Looks:** 20, the newest Eclipse, Rain City, Paper Cut and Aurora Tundra (Phase 11). Each has its own page at `/looks/<id>` and Starting Soon, BRB, Ending, Offline, Just Chatting and Reaction scenes, plus chat, alerts, a webcam frame and Live (chat, alerts and frame in one source).
- **Canvas editor:** Phase 9; moves every part of a scene.
- **Release:** 2.2.0 (T11.7) prepared 2026-10-20: Phase 11's four looks plus Phase 15 (prerendered pages, look pages, sitemap). 2.1.0 was released 2026-10-15 (tag `v2.1.0`).
- **Vertical:** Phase 10 complete; `?canvas=vertical`, 1080×1920.

## How the owner works (follow this)
- **One task, one branch, one PR.** Plan, build, run `npm run lint`, `npm run typecheck` and `npm test`, plus the Playwright e2e suite (`npx playwright test`), then commit, push and open a PR.
- **Shared work:** the owner works with Claude Code too. Check for changes from the other agent before committing, stage only the current task's files, and leave this handoff current.
- **Merging:** the owner says "merge". Then wait for all three CI checks (`checks`, `gitleaks`, `deploy`) to pass before `gh pr merge N --merge`. `deploy` publishes the PR's preview from Actions; there is no separate Cloudflare Pages check any more.
- **Stacked PRs:** retarget to main (`gh pr edit N --base main`) before merging, and don't delete a base branch while a child PR still points at it.
- **Overlay tasks stay unticked** in `docs/TASKS.md` until the owner reports their OBS check passed. Never log an OBS pass the owner didn't state.
- **Git safety:**
  - Never skip hooks (`--no-verify`).
  - Never force-push, and run no destructive git without the owner's explicit OK.
  - Hooks run gitleaks, eslint and prettier through husky; in a fresh worktree run `npx husky` first.
- **Commit style:** small commits with clear messages. Write UI copy for beginners ("Link to paste into OBS", not "Browser Source URL").
- **Account commands:** show `cf` or `wrangler` commands that change the account before running them. Use `cf` unless a Wrangler config applies (`wrangler.jsonc` exists here, so wrangler is fine for the Pages project and D1).
- **Owner approval first:** privacy policy and terms edits, new dependencies, any backend, payments or AI.
- **The owner's private age key** (`overlune-backup.key`) is theirs alone: never use it.

## Hard rules worth repeating
- **No secrets in overlay links:** never put login tokens or secrets in an overlay URL. Streamers show their screens.
- **Chat text is hostile input:** render it as React elements, never `innerHTML` or `dangerouslySetInnerHTML`.
- **Images:** user image URLs are `https:` only.
- **21st.dev:** a reference for the editor and landing page only, never for overlays.
  - Port the behavior; copy code only under a stated license, and add no new dependencies.
  - Never run its `npx shadcn add` lines: they put the API key in a URL.
  - The owner likes to see 2–3 candidates and pick one.
- **No Lucide icons** (the owner's call). The site uses its own icons in `src/components/Icon.tsx` and `icon.css`.
- **Overlays follow the owner's overlay playbook** (DESIGN.md, "The overlay playbook"):
  - Animate transform and opacity only: no animated filter, shadow, mask or blend.
  - No full-frame blend modes on loops.
  - Motion tiers drop whole layers.
  - Every animation has a reduced-motion version (`?rm=1` and "Less motion").
  - Clear the platform's controls and safe zones; vertical is its own layout.
  - Placement clamps to the frame.
  - Long text wraps or shrinks.
  - Clean up every timer and listener.

## State as of 2026-10-20

### Shipped since 2.1.0 (all merged, released as 2.2.0 by T11.7)
- **Phase 11, four new looks:** Eclipse (#259), Rain City (#260), Paper Cut (#261), Aurora Tundra (#262). T11.1 to T11.7 are ticked; each look has an owner-reported horizontal and vertical OBS pass in `docs/OBS-TESTING.md` (Paper Cut's confirmed 2026-10-20).
- **Production polish (#263, #264):** Rain City's countdown separators lost their tiles (`data-sep` in `Countdown.tsx`; after Rain City's OBS pass, covered by e2e only); the support email is overlune@proton.me (owner-requested, legal pages dated 2026-10-20); signed-out `/api/me` answers an empty 204, not a 401; structured data, four more "Good to know" questions, `robots.txt`.
- **Phase 15, found in search (#265 to #269):**
  - `scripts/prerender.mjs` runs after `vite build` (CI only, needs Playwright's Chromium). It saves `/`, `/guide`, `/privacy`, `/terms`, the 404 page and every look's page as ready HTML. Inline styles move into `dist/assets/prerender/*.css` (the CSP is `style-src 'self'`), `app.html` is the untouched shell, and `_redirects` sends `/o/*` to it.
  - **Look pages** (`/looks/<id>`, `src/editor/LookPage.tsx`, meta in `src/lib/look-pages.ts`): every look in the registry gets one, with pictures of its real Starting Soon overlay on both canvases, taken by the prerender with a fixed clock (byte-identical between builds). "Use <look>" opens `/editor?look=<id>`, which picks the look on top of the saved overlay and then drops `?look`.
  - **Sitemap:** `sitemap()` in `src/lib/page-meta.ts`, written by the build and served by the dev server; a unit test checks it against `App.tsx`'s routes and every look.
  - **Links open pages at the top** (`ScrollToTop` in `App.tsx`; Back, Forward and `#` links keep their place).
- **Deploys run from GitHub Actions** (live 2026-10-20): `ci.yml`'s `deploy` job runs `wrangler pages deploy` after `checks` pass, for PR previews (`<branch>.overlune.pages.dev`) and main. Cloudflare's own builds are off. Secrets: `CLOUDFLARE_PAGES_TOKEN`, `SENTRY_AUTH_TOKEN`; variables: `CLOUDFLARE_ACCOUNT_ID`, `DEPLOY_FROM_ACTIONS`.

### Waiting on the owner
- **2.2.0 release PR:** merge after the owner's approval and all three checks; then tag `v2.2.0`, publish the GitHub release, and confirm overlune.in serves the new build.
- **Search Console:** the owner added overlune.in and submitted `https://overlune.in/sitemap.xml` on 2026-10-20; its first read was still pending.
- **Two portrait notes from the T11.7 review,** left as passed: Aurora Tundra's crescent tip sits about 5px under the YouTube handle (a long handle or a third social could meet it), and Eclipse's crescent runs off the top edge (under the apps' header on a phone). Any fix is an overlay change and needs an OBS check.
- **Vaporwave's sun stripes** hold still (performance). If the owner wants motion back, rebuild them to move with transform only.

### Next tasks
1. **Phase 12, saved overlays** (planned, needs three owner decisions first): where the Durable Object runs (a small separate Worker, recommended, or moving the site to Workers), edits reaching OBS on an "Update OBS" button or by autosave, and 10 saved overlays per account or another limit.
2. Phases 13 and 14 (connections, the dock and the Android app) are planned in TASKS.md; not started.
3. Codex's Clean Slate refresh continues on its own branch (`codex/refresh-clean-slate`) in its own folder.

## Where things live (vertical and canvas)
- **`src/overlays/measure.ts`:**
  - `CanvasId` ("landscape" | "portrait"), `CanvasContext` and `linkCanvas`.
  - `designOf`: 1920×1080 and 1080×1920.
  - `canvasOf(settings, canvas)`: the box the scene is drawn on, and its scale.
  - `rescale` and `measureLayout`.
  - `safeZone`: 60 left, 140 right, 240 top, 680 bottom.
- **Layouts:** `settings.layouts.landscape` and `settings.layouts.portrait`, each `{ size, scenes }`, in box units.
- **Portrait CSS** sits at the end of `src/overlays/layouts.css`.
  - It's the shared portrait default, then each look's art moved for the tall frame.
  - It outranks each look's own rules with `.scene[data-canvas="portrait"][data-theme]`.
- **Title fit:** `SceneFrame.tsx` fits the title. In portrait it measures the parts' own boxes (two levels deep), never the scroll height.
- **Camera scenes:** `CamScene.tsx` holds `camDefaults` per canvas. The camera is a CSS mask hole.
- **Editor:** `EditorPage.tsx` (`vertical` state → `canvasId`). Its children:
  - `canvas/Canvas.tsx` (`canvasId` prop, `clampMove`, the guides);
  - `canvas/Panels.tsx` (`CanvasSize`, `SafeZone`);
  - `ObsLinks.tsx` (vertical links carry `?canvas=vertical` before the `#`).
- **OBS events:** in `src/main.tsx` (pause when hidden) and `src/overlays/FromLink.tsx` (`replay` remounts full-screen scenes when they go on air).

## Testing gotchas
- **Direction board:** open `docs/phase-11-directions.html` as a local file or with a separate static server. Vite's page-preview plugin expects the app's HTML metadata and rejects this standalone document; requesting it through Vite also broadcasts an error overlay to other open app pages. Keep board checks separate from the app suite.
- **Dev server address:** it answers on `http://[::1]:5173`, and Playwright reuses any server on 5173.
  - Another checkout or session using that server will test the wrong code, or drop connections mid-run.
  - When in doubt, run Playwright on its own port with a temporary config at the repo root, and delete it before committing.
- **Colour scheme:** Playwright runs with `colorScheme: "dark"` (the site has light and dark modes); light-mode tests pick light themselves.
- **Heavy local runs:** T11.6's four-worker trial split the Undo test's typing burst and timed out Rain City's PNG export. Both passed alone; the final two-worker full run passed all 615 Windows tests without changing assertions or timeouts. The 40-element canvas test passed in 17.3 seconds. Keep other browser/build work out of a full run.
- **Screenshot baselines** (`*.visual.spec.ts`) are Linux-only and made in CI.
  - When one fails after an intended change, download the run's `playwright-results` artifact.
  - Copy the actual image over `tests/e2e/*.visual.spec.ts-snapshots/…`, as the README says.
- **Layout-measuring tests** must wait for `document.fonts.ready` and settled or reduced motion.
- **Known console messages:** the `RulerStrip` null-style error from the 2.1.0 run is fixed (#263, a guard for a late frame). "ResizeObserver loop completed with undelivered notifications" still shows in the dev server's log during full e2e runs (2026-10-20, 622 passed); harmless so far.
- **Prerender locally:** `npm run build && npm run prerender` (about 90 seconds: 40 look pictures), then `npx wrangler pages dev dist --port 8788 --ip 127.0.0.1` to try Pages' routing. Stop old `wrangler pages dev` processes first, or the port hangs.
- **Other habits:**
  - Restart the dev server after switching branches (Vite can serve stale CSS).
  - Use `gh run download` for artifacts, not PowerShell redirection.
