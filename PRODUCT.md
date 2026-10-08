# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
New Twitch streamers, 0 to 6 months in and usually not yet Affiliate, on OBS Studio or Streamlabs Desktop on a mid- or low-end PC. They care how their stream looks but have no design skills, no budget, and don't know what a "Browser Source" is. Secondary: small streamers who want a quick refresh without paying for a pack.

Their viewers are the second audience of every overlay: people watching on Twitch, often at 720p on a phone, who glance at a scene for a few seconds.

## Product Purpose
Overlune (overlune.in) gets a new streamer from zero to a stream that looks professionally designed, with no account and no payment. A streamer picks one look, personalizes it, and pastes one link per overlay into OBS. Success is a matching, working stream: scenes, chat and alerts that look like a paid pack and keep working without the streamer touching the links again.

## Positioning
Free, open-source and account-free, with taste and cohesion as the edge: one choice restyles every surface (Starting Soon, BRB, Stream Ending, chat, alerts, webcam frame, Twitch panels and offline banner), so the stream reads as one brand. Setup is written for beginners. Built live on stream by a streamer who uses it.

## Operating Context
- Overlays run as OBS (or Streamlabs) Browser Sources at 1920×1080 for scenes, inside OBS's own Chromium, often on low-end PCs while a game runs.
- Streamers show their screens on stream, so overlay links never carry secrets.
- Settings live in the overlay link (versioned, compressed, validated) and in the browser. "Your link is your save file."
- Chat comes from Twitch IRC, read anonymously.

## Capabilities and Constraints
- v1 is a static site: no backend, database, accounts, payments or AI.
- The overlay link format is a public contract: every payload is versioned and old links must keep loading.
- Chat text is hostile input: rendered as React elements, never as HTML.
- Overlays use CSS or canvas effects only (no video backgrounds), stay light on CPU, and every animation has a reduced-motion version.
- Fonts, sounds and art must be free-licensed and recorded in docs/ASSETS.md; new dependencies need the maintainer's approval.
- Out of scope: Twitch login, follow and donation alerts, TTS, now-playing, goal bars, YouTube and Kick chat (docs/PRD.md).

## Brand Commitments
- Overlune's own chrome (landing, editor, guide) follows docs/BRAND.md: violet palette, Quicksand and Nunito.
- Each look is its own visual world and does not inherit the chrome's brand.
- UI copy is written for beginners ("Link to paste into OBS", not "Browser Source URL").

## Evidence on Hand
- The maintainer's own overlay kits ("Tuskilicious" and "ICARUS", 2026-09) set the quality bar for future looks.
- No testimonials, user counts or press exist; do not invent them.

## Product Principles
1. Looks are the product: each must look like a paid pack.
2. One choice restyles everything, so the set reads as one brand.
3. Guard beginners from ugly results: good defaults first, overrides tucked away.
4. Legible on stream: readable at 720p on a phone, WCAG AA for text on its surface.
5. Never break a pasted link.

## Accessibility & Inclusion
The editor meets WCAG AA contrast with full keyboard navigation and visible focus. Overlays support reduced motion.
