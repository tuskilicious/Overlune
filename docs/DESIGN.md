# Overlune: Design System

## Principles
1. **Themes are the product.** Each one must look like a paid pack.
2. **One choice restyles everything:** scenes, chat, alerts and the editor preview.
3. **Guard beginners from ugly results.** Theme defaults come first. Color and font overrides live under "Advanced".
4. **Legible on stream:** readable at 720p on a phone, with WCAG AA contrast for text over its surface.
5. **Light on CPU:** CSS or canvas effects only, and every animation has a reduced-motion version.

## Theme token set
Every theme defines exactly these tokens (`src/themes/types.ts`):

| Token | Purpose |
|---|---|
| `bg` | Scene background (color or gradient) |
| `surface` | Cards, chat bubbles, alert boxes |
| `primary` | Main brand color |
| `accent` | Highlights, badges, countdown |
| `text` / `textMuted` | Body text on `surface` |
| `fontHeading` / `fontBody` | `@fontsource` families (OFL) |
| `radius` | Corner radius (px) |
| `border` | Border style for surfaces |
| `shadow` | Box shadow for surfaces: a glow, a soft shadow, or `none` |
| `bgEffect` | Background effect id (e.g. `grid`, `steam`, `fireflies`) |
| `enter` / `exit` | Entrance and exit animation ids + duration |
| `alertAnim` | Alert animation id |
| `alertSound` | Default sound file (in `public/sounds`, licensed) |
| `badgeStyle` | How role badges render in this theme |

## The themes
The starting palettes below are suggestions. Verify contrast before shipping each theme.

### Launch set
**1. Clean Slate:** minimal, one accent color. Pilot of the scene layout redesign (T6.35).
- Colors: bg `#121418`, surface `#1C1F26`, primary `#E8EAED`, accent `#4F8CFF`, muted `#8A919E`
- Fonts: Inter / Inter
- Shape: radius 8, subtle slide and fade (300ms)

**2. Neon Grid:** cyberpunk.
- Colors: bg `#07060D`, surface `#120F24`, primary `#00F0FF`, accent `#FF2BD6`, text `#EAF6FF`
- Fonts: Orbitron / Rajdhani
- Shape: radius 2, glowing edges
- Effects: perspective grid background, glitch-in alerts

**3. Cozy Café:** warm and lo-fi.
- Colors: bg `#F4EADB`, surface `#FFF8EE`, primary `#6B4A35`, accent `#9C5A2C` (shipped; the first pick `#D98E5A` failed AA on the surface), muted `#7A6354`, text `#3B2A20`
- Fonts: Fredoka / Nunito
- Shape: radius 20, soft shadows
- Effects: steam wisps, gentle bounce

### Right after launch
**4. Arcade 8-Bit**
- Colors: bg `#1A1030`, surface `#2B1B4F`, primary `#FFD23F`, accent `#3EE6A0`, pixel drop shadow `#FF5C7A`, muted `#C9BDEB` (shipped), text `#FFFFFF`
- Fonts: Press Start 2P / VT323
- Shape: radius 0, stepped animations
- Effects: CRT scanlines

**5. Pastel Cloud**
- Colors: bg gradient `#FDE7F0`→`#E3ECFF`, surface white at 80%, accents `#B79CFF` `#FF9ECF`, text `#4B3F6B`
- Shipped: bg `#FDE7F0` fading into an 18% tint of primary (drawn by the clouds effect, so color overrides still work), opaque white surface (keeps chat readable over gameplay), primary `#7B5BD6`, accent `#B0367D`, muted `#6E6290`. The suggested pastels fail AA on white.
- Fonts: Baloo 2 / Quicksand
- Shape: radius 24
- Effects: floating clouds

**6. Forest Night**
- Colors: bg `#0B1A14`, surface `#12281F`, accent `#9BE564`, moon `#E9F1D6` (shipped as `primary`), muted `#9DB5A7` (shipped), text `#E3EFE6`
- Fonts: Lora / Nunito Sans
- Shape: radius 12
- Effects: fireflies, moonlight glow

**7. Bold Esports**
- Colors: bg `#0E0E10`, surface `#1A1A1E`, accent `#FF2E3A` (alt `#1E6BFF`), text `#FFFFFF`
- Shipped: primary `#FFFFFF`, accent `#FF2E3A`, muted `#A0A0AB`. The blue alt is not used (3.8:1 on the surface fails AA for text). No shadow, since clip-path cuts it off.
- Fonts: Anton / Barlow
- Shape: angled clip-path, fast wipes

**8. Vaporwave Sunset**
- Colors: bg gradient `#2B0F4C`→`#FF6B6B`→`#FFB86B`, surface `#1B0B33` at 80%, accents `#FF71CE` `#01CDFE`, text `#FFFBF5`
- Fonts: Audiowide / Space Grotesk
- Effects: chrome headings, striped sun, palm silhouettes
- Shipped: bg `#2B0F4C` stays purple to 68% of the height, then fades to coral and orange at the horizon, so text never sits on the light part. Opaque surface (hex, for the contrast checks), primary `#01CDFE` (the band across the chrome titles), accent `#FF71CE`, muted `#C9B6E4`, radius 6, pink glow. Palms are `public/images/themes/vaporwave-palms.svg` (the CSP blocks `data:` images). Static, so no reduced-motion version is needed.

**9. Daylight** (T6.89, the light look streamers asked for)
- Colors: bg `#EEF1F6` (cool paper), surface `#FFFFFF`, titles and text ink `#141821`, accent vermilion `#C93A1C`, muted `#5B6272`
- Fonts: Space Grotesk / Nunito Sans
- Effects: none; a soft shadow under surfaces, hairline border `#D9DEE7`, radius 14
- Contrast: text, muted and accent all pass AA on both bg and surface (accent 4.5:1 on bg, 5.1:1 on white). Reuses Clean Slate's alert sound.

### Kit-inspired looks (T6.109-T6.111)
Built to the bar of the maintainer's own kits (Tuskilicious, ICARUS): each look is a world with one signature motif, not a palette swap. Directions came from impeccable's direction round (seed `c833f7e1`), picked by the owner.

**10. Abyss** (T6.109): the stream as a dive. The water is unlit and the only light is alive.
- Colors: bg `#040B14` (the effect lightens the top to `#0B2233`), surface `#071521`, titles `#E3F2F4`, text `#D6E6EE`, muted `#8FB3C1`, accent bioluminescent `#5CF2D6`
- Fonts: Unbounded (headline 136px, weight 500; countdown 84px) / Manrope
- Shape: radius 4; surfaces split by a hairline seam (`#16343A`), never a shadow or glow
- Light rule: the accent (and any glow) is kept for living things: the headline's last word, the countdown (digits breathe, 4.5s), the newest chat message (a faint accent wash), the alert (accent seam and a soft glow below), glowing motes in the snow
- Effect (`abyss`): last surface light slanting in from the top left and fading into the water; marine snow sinking in two full-width layers (far 80s, near 54s), three motes glowing. Transform only; still under reduced motion.
- Sound: reuses Forest Night's alert sound.

**11. Session** (T6.110): every scene is a frame of a jazz-session anime: Starting Soon the title card, BRB the eyecatch, the ending the end card.
- Colors: mustard ground `#E0B23C`, teal `#146B6E` and brick `#B23A2E` bars, cream surface `#F1E6CF`, ink `#0E0E0E` for titles, text and outlines, muted `#4F4334`; the headline's last word in brick
- Fonts: Archivo Black (uppercase headline 168px, line-height 0.84, tracking -0.045em) / Archivo
- Shape: radius 0, 3px ink outlines, no shadows; ink icon tiles; hard wipes (350ms in, 250ms out) like a cut on the beat
- Effect (`session`): one diagonal teal bar and a thin brick bar across the open top, kept clear of a three-line title, so text only sits on mustard; print grain (`public/images/themes/print-grain.svg`, SVG noise) multiplied over every color. Static.
- Adaptations: the lines sit tight but never overlap (legible at 720p); the title card's figure silhouettes need commissioned art and are left out.
- Sound: reuses Cozy Café's alert sound.

**12. Shonen** (T6.111): every scene is a manga page.
- Colors: paper `#F4F3EE`, white surface, ink `#111111` for titles, text and outlines, muted `#454545`, one spot color, manga red `#D61F26` (the headline's last word, alerts)
- Fonts: Bangers (headline 196px, ink with a 14px white knockout stroke; countdown 104px) / Comic Neue
- Shape: radius 0, 4px ink outlines, no shadows; the right column sits in white inked panels (countdown and socials); the chat stack is an inked panel; alerts land with an impact (bounce)
- Effect (`shonen`): a 6px ink panel border 32px in from the edge (an outline, so it paints above the art); speed lines bursting from a focal point at the top right, clear at the center and gone before the text; a hard-cut screentone sheet over the lower left, with the subtitle in a white knockout so it stays readable. Static.
- Sound: reuses Bold Esports' alert sound.

## Overlay layout rules
- Canvas is always 1920×1080. Keep a 64px safe margin on scenes.
- Chat default size is 400×600, transparent background, bottom-up.
- Alerts render centered-top by default, with no background outside the alert box.
- Error states use the theme's surface and text colors, stay readable, and never flash.

### Scene layout (T6.35)
All the themes share one composed layout, rolled out one theme at a time (T6.35-T6.42); the original centered layout was retired in T6.43. Theme ids, settings and links never changed, so pasted links picked up the new design. Per-theme tweaks key on `data-theme` (and `data-bg` for background effects) on `.scene`, `.chat` and `.alerts`.
- **Scenes (layout v2, T6.107, after the maintainer's broadcast kits):** 88px top / 112px side / 72px bottom margins (inside the 64px safe margin). Logo top left (160px max). On the left, anchored to the bottom: a 96×8px accent rule, then a two-tone display headline (184px, -0.04em tracking, 0.94 leading, balanced, so "Starting soon" sets on two lines) whose last word takes the accent color, then the subtitle (40px, 30ch max). It shrinks to fit per T6.26 and fits again when the countdown widens as it ticks (T6.52). On the right, also bottom-anchored, one column (480px min): the countdown card (96px digits on one line, in the text color, so the accent stays with the headline) over the socials as a list, each an accent-tinted 72px icon tile with the platform name (small tracked caps) over the handle (36px bold). The open sky above both columns is where each theme's motif lives.
- **Alerts:** still centered at the top. A wider card (760-1100px) with a 6px accent band, an uppercase event label ("Raid", "New subscriber", "Resub", "Gift subs", "Cheer"), then the streamer's message at 56px; resub and cheer text below in the muted color.
- **Chat:** one panel instead of a card per message: no borders between cards, hairline separators, only the top and bottom of the stack rounded. Badges are small square-cornered tags tinted with the accent.
- Each theme can restyle these pieces in its own CSS (fonts, background effect, shapes), keyed on `data-theme`; the composition stays the same so the set reads as one product.
- **Neon Grid (T6.36):** horizon at 82% with the content kept above it; socials float on the grid floor as a glowing panel; smaller type for the wide Orbitron; the chat stack has one neon edge.
- **Cozy Café (T6.37):** the steam wisps rise in the open space (between the title block and the countdown card, and from behind the card) instead of behind the title.
- **Arcade 8-Bit (T6.38):** pixel-font sizes (title 68px, countdown 56px, done text 44px, alert title 40px per T6.55) so the title and countdown sit side by side; square accent rule; wider subtitle measure for VT323.
- **Pastel Cloud (T6.39):** both clouds drift through the upper sky, clear of a typical title block; the theme keeps its own gradient background.
- **Forest Night (T6.40):** a full moon (soft-edged disc with a halo) sits in the open top-right corner; the fireflies fade out above a typical title block, so none lands between the words. The countdown is 100px, since Lora's wide numerals made the widest day countdown wrap the title (T6.52).
- **Bold Esports (T6.41):** the angles move onto the new pieces: a slanted accent rule and a parallelogram countdown card, matching the angled alert card and chat messages. The socials row keeps its full-width hairline and wipes in with the content.
- **Vaporwave Sunset (T6.42):** the content now fills the bottom where the sun used to set, so the striped sun (480px, stripes in its lower half) rises into the open top-right sky with a coral glow, and the right palm crosses it. The sky stays purple behind all text. Smaller Audiowide sizes (title 96px, countdown 88px) keep the title on one line.

## Editor and site UI
The editor, setup guide, privacy and terms pages share one quiet, high-contrast chrome in Overlune's brand (`docs/BRAND.md`), so the colorful theme previews stay the loudest thing on the page. Tokens live in `src/editor/brand.ts` and reach CSS as variables on `.editor` (`themeVars`). "Must" rules are hard requirements; "should" rules are defaults.

### Tokens and foundations
| Token (CSS var) | Value | Use | Contrast |
|---|---|---|---|
| `--bg` | Night `#05061A` | Page ground, control fills | — |
| `--surface` | Deep Space `#0B0F3C` | Panels (fieldsets), cards, link rows, save box | — |
| `--text` | Moonlight `#F4F1FF` | Body text, labels, headings | 18.0:1 on Night, 16.4:1 on Deep Space |
| `--text-muted` | Haze `#A7A0D6` | Hints, preview headings, control outlines | 8.3:1 / 7.5:1 |
| `--accent` | Lune Violet `#A45EFC` | Links, focus rings, selected state, the one filled button | 5.3:1 / 4.9:1 |
| `--border` | `1px solid #24285C` | Panel edges only (decorative, 1.5:1) | — |
| error | `#ff8a8a` | Error text and invalid control outlines | 8.8:1 / 8.1:1 |
| `--radius` | 12px | Panels, controls, cards, previews | — |

- **Fonts:** Quicksand 600/700 (`--font-heading`) for headings, step titles, the tagline and look names on the welcome gallery. Nunito 400/700 (`--font-body`) for everything else. Links and hex values use the system monospace stack. No other fonts in the chrome.
- **Type sizes (px):** 32 page title (legal) · 22 step and section headings · 18 welcome card names · 16 body and link-row names · 15 controls · 14 labels and hints · 13 small notes (characters left, picker names, copy status) · 12 raw links only. Nothing smaller than 12.
- **Spacing (px):** 4 · 6 · 8 · 12 · 16 · 24 · 32. Fieldsets use a 12px gap and 16px padding; the page has 24px × 32px padding; steps sit 16px apart.
- New colors must come from `brand.ts` or BRAND.md. A raw hex in CSS needs a comment saying why (today only the error red).

### Components
| Component | Anatomy and variants | States | Notes |
|---|---|---|---|
| Button | Outline: Night fill, Haze 1px outline, 8×10px padding. Filled: Lune Violet with Night text, bold, **only** for "Copy link" | hover (pointer), focus-visible ring, disabled (dashed outline, muted text, `not-allowed`) | Visible text is the action ("Copy link", "Start over"). Repeated buttons get an `aria-label` that starts with the visible text ("Add their name to Raid message"). Avoid disabled buttons; say why in text instead. |
| Text field, select, textarea | Label wraps the control; hint below, linked with `aria-describedby` | focus-visible, invalid (`aria-invalid`, red outline, message in `role="alert"`), near limit ("N characters left", `aria-live="polite"`) | Every limited text field shows characters left at 10 or fewer. |
| Disclosure | Native `<details>`/`<summary>`, bold summary, closed by default | open, closed (native) | For rarely changed settings ("More chat options", "Advanced: colors and fonts"). Never hide a setting a beginner needs to finish. |
| Look filters | Pills above the editor's picker: All, Calm, Retro, Bold (`aria-pressed`); each look is in one group | pressed (Lune Violet fill) | Filtered-out looks are hidden, not removed (T6.60). |
| Look card | The theme's real Starting Soon scene with sample content (a subtitle, a countdown a day away and two `yourname` socials, `src/editor/scene-samples.ts`), held still, plus its name. Gallery: `<button>`, 4 across (2 at 800px and below). Editor: radio, 3 across | hover (Haze border), selected (Lune Violet border via `:has(:checked)`), focus-visible | Card scenes never animate (`editor-shot`), so 8 cards stay light. |
| Link row | The name with Width and Height as chips (the dots stay in the text for screen readers and the guide's size table), a faint raw link (48ch max, still selectable), the filled Copy button | copied ("✓ Copied"), stale ("Changed since you copied it"), copy failed ("Press Ctrl+C") | The copy status is a `role="status"` that stays in the DOM. |
| Steps bar | Sticky `<nav aria-label="Steps">` with three links | current step: accent, 3px underline, `aria-current="step"` | Jumps scroll and move focus; they never change the address, which holds the settings. |
| Preview | Scaled overlay in a 16:9 (or chat-sized) box | — | `aria-hidden` and `inert`, because it repeats the form. Sticky column above 800px, and never taller than fits under the header, so the scene's title (at the bottom of the frame) is in view on a 768px-tall laptop (T6.49); docked "Show preview" bar at 800px and below. |
| Callout | Deep Space box with a faint violet outline all the way round (`--callout-edge`: Lune Violet mixed 45% into Deep Space, 1px) and the usual 12px corners. No thick bar down one side (T6.53) | — | Save reminder, "You're set" line, legal disclaimer. One per region. |

- **Responsive:** from 1200px, a three-column shell (T6.60): the section list on the left (Look, Text, Socials, Chat, Alerts, Logo, Colors, Links; the section in view marked with `aria-current="location"`), the live preview in the middle (sticky; it shows the chat or alert preview while those sections are in view), and the settings on the right (340–400px) with the links at their end. 801–1199px: a 300–400px form column beside the previews, with the steps bar; the links end the form column, so the sticky preview never covers them (T6.66). 800px and below: one column, docked preview, gallery 2 across. The editor is for desktop windows, often squeezed next to OBS; there is no mobile editor (PRD).
- **Long content:** labels wrap, look names wrap to two lines, raw links truncate with an ellipsis, and overlay titles shrink to fit (T6.26).

### Accessibility (checked in tests)
- axe (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) must report no violations on the gallery, the editor (disclosures open and closed, narrow and wide), the guide, privacy and terms. These run in e2e.
- Text must be at least 4.5:1 on its background; control outlines and focus rings at least 3:1 (see the token table).
- Every control must work by keyboard and show the 2px Lune Violet `:focus-visible` ring (2px offset). When the focused control disappears, focus must move somewhere sensible (`focusSoon`).
- State must not rely on color alone: a selected look also has a checked radio, the current step is underlined, and errors have text.
- Dynamic messages use polite live regions or `role="status"`, and live regions stay in the DOM (never `display: none` while waiting for text).
- The editor honors reduced motion through the app-wide rule in `src/index.css`.

### Content and tone
Write for a streamer opening OBS for the first time: concise, confident, helpful (BRAND.md voice).
- Name what they see: "Link to paste into OBS", not "Browser Source URL"; "Their name", not `{user}`.
- Buttons are verbs, 1–3 words, sentence case: "Copy link", "Start over", "Load my overlay from a link".
- Errors say what happened and what to do: "No picture loaded from this link. Check that it opens an image in your browser, not a web page."
- Say "free" and "no account" plainly. No unmeasured claims and no promised setup times (the owner dropped "under 10 minutes" as unrealistic, 2026-10-02).

### Anti-patterns
- Don't add a second filled button style or a new accent color; use outline buttons.
- Don't use `innerHTML` or `dangerouslySetInnerHTML` anywhere, including the legal pages (they go through `src/lib/markdown.ts`).
- Don't animate look cards or put video in the chrome.
- Don't hide a live region with `display: none`, and don't show state with color alone.
- Don't add fonts, sounds or images to the chrome without recording them in `docs/ASSETS.md`.
- Don't mark a box with a thick colored bar down one side; use the callout outline (T6.53).

### Landing page (`/`)
- The one page built with Tailwind and GSAP (STACK.md). It uses the same brand tokens, exposed as Tailwind colors (`night`, `deep`, `moon`, `haze`, `violet`, …) and fonts (`font-heading`, `font-body`) in `src/landing/landing.css`.
- Images are real Overlune scenes rendered live (the editor's `Preview`) with the same sample content as the look cards, never stock photos. Only the hero moves; the rest are held still (`landing-still`).
- **Hero (T6.59):** the whole kit. A live scene in a 16:9 stream frame with a small Signal Cyan LIVE badge, two real alert cards in the same look (over the frame's empty top-left on wide screens, under it on phones), and the three scene names with the current one filled. It tours a look and a scene every 4.5 seconds. A "Pause the looks" button stops the tour and holds the scene still (WCAG 2.2.2); with reduced motion it starts paused on Vaporwave Sunset. Under the buttons, a fact row: 8 looks, Scenes, chat and alerts, One link per overlay, Free, no account.
- **Night sky (T6.59):** CSS only, static: a few small stars, a soft violet arc and a crescent moon behind the hero. No image files.
- **Glow (T6.59):** the page's one gradient is the hero frame's edge (Lune Violet to Signal Cyan) with a soft glow, and the hero's primary button gets a matching glow. No other card or button glows.
- **Overlay cards (T6.59):** Starting Soon, Be Right Back, Stream Ending, Chat and Alerts, each a live thumbnail that opens its part of the editor (`/editor?part=starting|brb|ending|chat|alerts`; a first visit picks a look first).
- **Nav (T6.59):** the link for the section in the middle of the window is underlined in Lune Violet (`aria-current="location"`).
- Motion: scroll reveals, a pinned theme gallery (1024px and wider), a word-by-word reveal that starts at 40% opacity so large text keeps 3:1 contrast, and CSS hover zooms. All GSAP runs inside `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`; with reduced motion the page is static and fully visible.
- One filled button style (Lune Violet, Night text). No meta-labels ("SECTION 01"), no invented reviews or stats.
- Responsive down to 390px with no sideways scroll (e2e check).

### UI review checklist
- [ ] Colors, fonts, sizes and spacing come from the tokens above, with no unexplained raw values.
- [ ] Every new control has a label and a visible focus ring, and works by keyboard.
- [ ] Hover, focus-visible, selected, disabled, invalid and empty states are handled where they apply.
- [ ] Copy follows the tone rules; labels name what the streamer sees.
- [ ] Checked at 1366×768 and at 600px wide; long text wraps or truncates as described.
- [ ] axe stays clean in e2e, and `tests/unit/editor/contrast.test.ts` covers any new color pair.
