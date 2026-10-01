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

## Editor UI
- The editor uses Clean Slate tokens for its own chrome, so it stays neutral next to any theme preview.
- Visible focus rings, full keyboard navigation, and labels on every control.
