# Overlune: Future scope

Realistic goals after v1.0.0 (2026-10-03). These are goals, not promises: nothing here is approved scope until it moves into `docs/PRD.md` and `docs/TASKS.md`. Until then, CLAUDE.md's v1 rules (no backend, no accounts) still apply.

Sizes are rough, for one maintainer working with Claude: **S** a day or two, **M** about a week, **L** several weeks.

## Where v1 stands
- Live at overlune.in (v1.5.0): four scenes, Twitch chat, Twitch alerts, a webcam frame, a socials ticker, 16 looks, Twitch panels and an offline banner, an OBS scene collection file, an editor and a setup guide. No accounts, no backend.
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

## v2: accounts and a backend (Cloudflare)
The owner chose Cloudflare (2026-10-09), replacing the earlier Supabase plan: Pages Functions for server code, D1 for the database (with Time Travel for point-in-time restore), Durable Objects for live updates and R2 for uploads, all next to the site on overlune.in. It doesn't pause idle projects, and its free plan covers Phase 1 and an early Phase 2. Details: `docs/STACK.md` "Backend".

The moment Phase 1 code lands, CLAUDE.md sections 4 (data), 5 (auth) and 8 (abuse) apply, and pre-launch checklist items 2 to 4 are no longer N/A. D1 has no row-level security, so access control lives in one server-side data layer, checked by user A vs user B tests in CI.

| Phase | Goal | Size | Done when |
|---|---|---|---|
| **1. Foundation** (approved, `docs/TASKS.md` Phase 7) | Optional "Sign in with Twitch"; sessions; a profiles table behind one data layer; access-control tests in CI; rate limits; Time Travel plus an off-site nightly backup and a real test restore; privacy policy and terms rewritten (what's stored, how to delete it, minimum age 13). | L | A streamer can sign in and out, user A can't read or change user B's data through any route (tested in CI), and a test restore worked. |
| **2. Saved overlays** | Save an overlay to your account and get a short link that never changes. Edits in the editor reach OBS live through a Durable Object, with no re-paste. The link also carries a snapshot, so the overlay still shows if the API is down. | L | Edit → OBS updates within seconds; API off → the overlay still renders; every old link still loads. |
| **3. Follow alerts** | Twitch EventSub sends new follows to a Function, which passes them to the overlay through its Durable Object. The overlay never holds a Twitch token. | M | Follow alerts pass the OBS test; no token appears in any link or in the overlay's code. |
| **4. Logo upload** | Upload a logo image to R2 instead of finding an image link. | M | Only PNG, JPEG, WebP and GIF (checked by file content), a size limit, a per-account quota, random file names; the abuse cases are tested. |

Follow alerts could skip the backend by connecting to Streamer.bot running on the streamer's PC. That works without an account, but it means installing and setting up another app, which is too much for the beginners Overlune is for. So the backend route is the plan (confirmed with the Cloudflare choice, 2026-10-09).

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
| Cloudflare Pages, Functions, D1, Durable Objects, R2 (free plan); GitHub; Sentry (free tier) | Free |
| overlune.in | Yearly domain renewal |
| Workers Paid, only when a free limit gets close (30-day Time Travel, more requests) | $5 a month, with the owner's OK |

Paid for by GitHub Sponsors and the owner. Nothing so far costs money beyond the domain.

## Decisions for the owner
Settled on 2026-10-09: **Cloudflare** over Supabase; **backups** are D1 Time Travel plus a nightly encrypted copy outside the Cloudflare account, restore-tested (CLAUDE.md §4 updated); **follow alerts** go through the backend, not Streamer.bot.

Still open:
1. **The drag-and-drop editor:** keep it under "Later, maybe" until Phase 2 is live?
