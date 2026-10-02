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

## The 8 themes
The starting palettes below are suggestions. Verify contrast before shipping each theme.

### Launch set
**1. Clean Slate:** minimal, one accent color.
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

## Overlay layout rules
- Canvas is always 1920×1080. Keep a 64px safe margin on scenes.
- Chat default size is 400×600, transparent background, bottom-up.
- Alerts render centered-top by default, with no background outside the alert box.
- Error states use the theme's surface and text colors, stay readable, and never flash.

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
| Look card | The theme's real Starting Soon scene, held still, plus its name. Gallery: `<button>`, 4 across (2 at 800px and below). Editor: radio, 3 across | hover (Haze border), selected (Lune Violet border via `:has(:checked)`), focus-visible | Card scenes never animate (`editor-shot`), so 8 cards stay light. |
| Link row | Name · Width · Height, a faint raw link (48ch max, still selectable), the filled Copy button | copied ("✓ Copied"), stale ("Changed since you copied it"), copy failed ("Press Ctrl+C") | The copy status is a `role="status"` that stays in the DOM. |
| Steps bar | Sticky `<nav aria-label="Steps">` with three links | current step: accent, 3px underline, `aria-current="step"` | Jumps scroll and move focus; they never change the address, which holds the settings. |
| Preview | Scaled overlay in a 16:9 (or chat-sized) box | — | `aria-hidden` and `inert`, because it repeats the form. Sticky column above 800px; docked "Show preview" bar at 800px and below. |
| Callout | Deep Space box with a 4px Lune Violet left bar (square corners on that side) | — | Save reminder, "You're set" line, legal disclaimer. One per region. |

- **Responsive:** one breakpoint at 800px. Wider: a 300–400px form column beside the previews. Narrower: one column, docked preview, gallery 2 across. The editor is for desktop windows, often squeezed next to OBS; there is no mobile editor (PRD).
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
- Say "free" and "no account" plainly. No unmeasured claims (the "under 10 minutes" line waits for T5.7).

### Anti-patterns
- Don't add a second filled button style or a new accent color; use outline buttons.
- Don't use `innerHTML` or `dangerouslySetInnerHTML` anywhere, including the legal pages (they go through `src/lib/markdown.ts`).
- Don't animate look cards or put video in the chrome.
- Don't hide a live region with `display: none`, and don't show state with color alone.
- Don't add fonts, sounds or images to the chrome without recording them in `docs/ASSETS.md`.

### UI review checklist
- [ ] Colors, fonts, sizes and spacing come from the tokens above, with no unexplained raw values.
- [ ] Every new control has a label and a visible focus ring, and works by keyboard.
- [ ] Hover, focus-visible, selected, disabled, invalid and empty states are handled where they apply.
- [ ] Copy follows the tone rules; labels name what the streamer sees.
- [ ] Checked at 1366×768 and at 600px wide; long text wraps or truncates as described.
- [ ] axe stays clean in e2e, and `tests/unit/editor/contrast.test.ts` covers any new color pair.
