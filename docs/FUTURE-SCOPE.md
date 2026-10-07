# Overlune: Future scope

Realistic goals after v1.0.0 (2026-10-03). These are goals, not promises: nothing here is approved scope until it moves into `docs/PRD.md` and `docs/TASKS.md`. Until then, CLAUDE.md's v1 rules (no backend, no accounts) still apply.

Sizes are rough, for one maintainer working with Claude: **S** a day or two, **M** about a week, **L** several weeks.

## Where v1 stands
- Live at overlune.in (v1.2.0): three scenes, Twitch chat, Twitch alerts, a webcam frame, a socials ticker, 16 looks, Twitch panels and an offline banner, an OBS scene collection file, an editor and a setup guide. No accounts, no backend.
- Five streamers have used it and sent 38 points of feedback (T6.6). Most were fixed in v1 (T6.68 to T6.79). The rest are below.
- The PRD's gate for v2 ("5 real streamers using v1") is met (T5.7, T6.6).
- Funding: GitHub Sponsors is live. Overlune stays free; support unlocks nothing.

## What never changes
- **Old links never break.** Every `/o/...#1.…` link in someone's OBS keeps working.
- **The editor works signed out.** An account only adds things (saving to the cloud, follow alerts, uploads).
- **Overlays never depend on a server being up.** If the backend is down, an overlay still shows its last known look.
- **No tokens in overlay links.** Streamers show their screens.
- **Light overlays:** under 5% CPU in OBS on a mid-range PC, with a reduced-motion version of every animation.
- **Free.** No pricing, "Pro", premium looks or paywalls, ever.

## v1.x: more value with no backend
These fit today's rules (a static site) and can ship one at a time, in any order.

**Done in 1.1 (T6.87 to T6.98):** page previews, the webcam frame, a light look (Daylight), the OBS scene collection file, Twitch panels and the offline banner (with `html-to-image`), Sentry source maps, lighter overlays (Sentry loads after the page), and the React Router 8, Vite 8, Vitest 5 and Sentry 11 upgrades. Seven more looks followed in 1.2 (T6.109 to T6.111, T6.125 to T6.128).

Still open, in any order:

| Goal | Size | Why | Notes |
|---|---|---|---|
| **Seasonal looks** | S each | Asked for in feedback. | Each look still needs every scene, chat and alert, contrast checks and an OBS test. |
| **Showcase of real streamers** | S | Shows the looks on real streams. | Only with each streamer's written permission. |
| **Hindi, then other languages** | L | Asked for in feedback. | Waits (owner, 2026-10-06). The editor, guide and default overlay text. Needs a fluent reviewer for each language; ongoing work. |

### Upkeep
- **TypeScript 7:** waits for typescript-eslint to support it (8.71 needs below 6.1). We're on 6.0 (T6.97). Dependabot holds TypeScript majors until then; remove that rule in `.github/dependabot.yml` when support lands.
- **Dependabot:** merge the weekly minor-and-patch group once CI passes; take each major in its own PR with the full suite and an OBS check.

## v2: accounts and a backend (Supabase)
The owner chose Supabase (2026-10-03): sign-in, Postgres with row-level security, file storage, live updates and server functions in one place. A free project for staging and a paid one for production. Check current pricing before signing up.

The moment Phase 1 starts, CLAUDE.md sections 4 (data), 5 (auth) and 8 (abuse) apply, and pre-launch checklist items 2 to 4 are no longer N/A.

| Phase | Goal | Size | Done when |
|---|---|---|---|
| **1. Foundation** | Supabase staging and production; optional "Sign in with Twitch"; a profiles table with row-level security; access-control tests in CI; backups and a real test restore; privacy policy and terms rewritten (what's stored, how to delete it, minimum age 13). | L | A streamer can sign in and out, user A can't read or change user B's data through any route (tested in CI), and a test restore worked. |
| **2. Saved overlays** | Save an overlay to your account and get a short link that never changes. Edits in the editor reach OBS live, with no re-paste. The link also carries a snapshot, so the overlay still shows if the backend is down. | L | Edit → OBS updates within seconds; backend off → the overlay still renders; every old link still loads. |
| **3. Follow alerts** | Twitch tells a server function about new follows, which passes them to the overlay live. The overlay never holds a Twitch token. | M | Follow alerts pass the OBS test; no token appears in any link or in the overlay's code. |
| **4. Logo upload** | Upload a logo image instead of finding an image link. | M | Only PNG, JPEG, WebP and GIF (checked by file content), a size limit, a per-account quota, random file names; the abuse cases are tested. |

Follow alerts could skip the backend by connecting to Streamer.bot running on the streamer's PC. That works without an account, but it means installing and setting up another app, which is too much for the beginners Overlune is for. So the backend route is the plan.

## Later, maybe
Bigger ideas, to decide on after v2 Phase 2 and real use:
- **YouTube chat and alerts.** YouTube only shares live chat through its API, which needs a server and has a small free daily allowance that a popular overlay would use up fast. Revisit once the backend exists and the costs are clear.
- **Kick chat.** Kick's chat connection is widely used but not an official API, so it could break without warning. Check for an official option first.
- **Drag-and-drop layout editor:** move, resize and layer every element. Needs a new link schema with a migration, and every v1 link must still look the same.
- **More uploads:** backgrounds, sounds and fonts, each with its own checks.
- **Community gallery:** publish a look, remix with credit. Needs reporting, moderation and someone to moderate before it opens.
- **Help forum:** a Discord forum channel first. Build one only if Discord isn't enough.
- **Goal bars and latest-follower labels:** need Twitch sign-in, so after Phase 3.
- **A gameplay scene:** a layout for the game, webcam and chat. Comes naturally with the layout editor.

## Not planned
- Pricing, "Pro", premium looks, upgrade prompts.
- Handling donations or payments for streamers: they keep their own service.
- AI-generated art or AI features.
- Video backgrounds and video export (too heavy for low-end PCs).

## Costs
| Item | Cost |
|---|---|
| Cloudflare Pages, GitHub, Sentry (free tier) | Free |
| overlune.in | Yearly domain renewal |
| Supabase staging | Free |
| Supabase production (from v2 Phase 1) | Paid plan, monthly. Check current pricing. Point-in-time recovery costs extra. |

Paid for by GitHub Sponsors and the owner. Nothing in v1.x costs money.

## Decisions for the owner
1. **Backups:** Supabase's paid plan includes daily backups; point-in-time recovery, which CLAUDE.md asks for, is an extra monthly cost. Proposed: daily backups plus a nightly copy to a separate account, and change CLAUDE.md's backup rule to match. Needed before Phase 1.
2. **Follow alerts:** confirm the backend route over Streamer.bot.
3. **The drag-and-drop editor:** keep it under "Later, maybe" until Phase 2 is live?
