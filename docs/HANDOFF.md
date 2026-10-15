# Handoff: where the work stands (2026-10-15)

For any agent picking up Overlune (Codex, Claude Code, others). Read `CLAUDE.md` first: its rules always win. Keep this file current: update it at the end of a working session.

## The project in one paragraph
**Overlune** (overlune.in, repo `tuskilicious/Overlune`) is a free, open-source stream overlay maker.

- **Stack:** React + Vite on Cloudflare Pages, with Pages Functions + D1 for optional Twitch sign-in (v2).
- **Settings:** they live in the overlay link's fragment (`#1.<lz-string>`, zod schema, additive-only: old links must keep working).
- **Looks:** 16 (themes), each with Starting Soon, BRB, Ending, Offline, Just Chatting and Reaction scenes, plus chat, alerts, a webcam frame and Live (chat, alerts and frame in one source).
- **Canvas editor:** Phase 9; moves every part of a scene.
- **Release:** 2.1.0 (T10.10), released 2026-10-15. PR #255 merged after owner approval and all three checks passed; annotated tag `v2.1.0` and the GitHub release are published. Cloudflare Pages deployed main successfully; overlune.in serves `overlune@2.1.0+07d573d`, matching the merge commit.
- **Vertical:** Phase 10 complete; `?canvas=vertical`, 1080×1920.

## How the owner works (follow this)
- **One task, one branch, one PR.** Plan, build, run `npm run lint`, `npm run typecheck` and `npm test`, plus the Playwright e2e suite (`npx playwright test`), then commit, push and open a PR.
- **Merging:** the owner says "merge". Then wait for all three CI checks (`checks`, `gitleaks`, Cloudflare Pages) to pass before `gh pr merge N --merge`.
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

## State as of 2026-10-15

### Merged today
- #243: phone fixes.
- #244: the editor's Horizontal / Vertical switch (T10.4).
- #245: vertical art fixed for all 16 looks (T10.5–T10.8).
- #246: Star on GitHub in the nav.
- #247: overlay playbook performance fixes. Entrances lost their blur, Vaporwave's sun stripes no longer slide, Session's grain lost its blend, and scenes replay their entrance on OBS `obsSourceActiveChanged`.
- #250: canvas placement clamps to the frame, plus "Show safe areas and thirds".

### Open PRs
`docs/phase-11-plan`: documentation-only T11.1 planning PR for Eclipse, Rain City, Paper Cut and Aurora Tundra; awaits the owner's review and merge instruction. Release #255 and its handoff #256 are merged, as are Dependabot's #248 and #249 and the look-layouts test fix #253.

### Done with the owner's OBS check (2026-10-15)
T10.2–T10.10 are ticked: the owner reported the vertical OBS check and the phone safe-zone check passed. The phone check was a private TikTok or YouTube live with no words under the apps' buttons or comments. Both are logged in `docs/OBS-TESTING.md`; OBS version and CPU not recorded. DESIGN.md's safe-zone numbers are unchanged.

### Waiting on the owner
- **T11.1 planning review.** The 2.1.0 release is complete. Phase 11 now has scope in PRD.md, proposed directions in DESIGN.md, and tasks in TASKS.md. The proposed palettes, compositions and type roles need the owner's choice in T11.2 before implementation; no new look has shipped.
- **Vaporwave's sun stripes** now hold still (performance). If the owner wants motion back, rebuild the stripes so they move with transform only.

### Next tasks (in order)
1. **Phase 11: four new looks.**
   - The looks: Eclipse, Rain City, Paper Cut and Aurora Tundra, each with "the lune" (a crescent moon in that look's own material).
   - They follow DESIGN.md's bar for a new look, the owner's kits (`docs/KIT-REFERENCE.md`) and the overlay playbook.
   - They're vertical-ready from the start.
   - Review T11.1's planning PR, then T11.2's two composition candidates per look. Build the selected complete kits one at a time (T11.3–T11.6), then the catalog review and release (T11.7).
2. Phases 12–14 (saved overlays, connections, dock + Android app) are planned in TASKS.md; not started.

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
- **Dev server address:** it answers on `http://[::1]:5173`, and Playwright reuses any server on 5173.
  - Another checkout or session using that server will test the wrong code, or drop connections mid-run.
  - When in doubt, run Playwright on its own port with a temporary config at the repo root, and delete it before committing.
- **Colour scheme:** Playwright runs with `colorScheme: "dark"` (the site has light and dark modes); light-mode tests pick light themselves.
- **Screenshot baselines** (`*.visual.spec.ts`) are Linux-only and made in CI.
  - When one fails after an intended change, download the run's `playwright-results` artifact.
  - Copy the actual image over `tests/e2e/*.visual.spec.ts-snapshots/…`, as the README says.
- **Layout-measuring tests** must wait for `document.fonts.ready` and settled or reduced motion.
- **Known console messages:** "Cannot read properties of null (reading 'style')" recurred during the 2.1.0 full run (2026-10-15), with a stack pointing to `RulerStrip` in `src/landing/LandingPage.tsx:456` (`tape.current!.style`). ResizeObserver loop messages also appeared. The full run passed (517 tests; one Linux-only screenshot test skipped on Windows); investigate separately from the release paperwork.
- **Other habits:**
  - Restart the dev server after switching branches (Vite can serve stale CSS).
  - Use `gh run download` for artifacts, not PowerShell redirection.
