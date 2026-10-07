# Overlune: Design System

## Principles
1. **Themes are the product.** Each one must look like a paid pack.
2. **One choice restyles everything:** scenes, chat, alerts and the editor preview.
3. **Guard beginners from ugly results.** Theme defaults come first. Color and font overrides live under "Advanced".
4. **Legible on stream:** readable at 720p on a phone, with WCAG AA contrast for text over whatever it sits on: its surface, or the scene's own ground (see "Contrast as rendered").
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

### Contrast as rendered
The tokens alone don't tell you what a viewer reads: scenes put the headline, its last word and the subtitle straight on `bg`, and a look's CSS can swap a color there (`scene.css`, keyed on `data-theme`). Check the pair that actually renders.
- **Body text on a surface** (chat, alerts, countdown card, panels): 4.5:1. `tests/unit/themes/contrast.test.ts` checks `text`, `textMuted` and `accent` on `surface` for every look.
- **Text on the scene ground:** the subtitle needs 4.5:1. The headline is large text (68px and up in every look), so it and its accented last word need 3:1. The countdown and its done text sit on the countdown card (`surface`).
- **Graphics** (the accent rule, icon tiles, outlines that carry meaning): 3:1.
- **Gradient grounds** (Pastel Cloud, Vaporwave Sunset): measure against the part of the gradient behind the text, not the `bg` token (Vaporwave keeps all text on its purple top).
- **Not yet tested automatically:** the ground pairs and the CSS overrides. Until a test covers them, a look that changes `bg`, `primary`, `accent`, `textMuted` or one of the overrides below gets checked by hand.

Overrides on the ground today, and the tightest pairs (WCAG ratios from the shipped values, 2026-10-07):
| Look | On the ground | Ratio | Why it holds |
|---|---|---|---|
| Skate Deck | Subtitle `#3A2410` instead of `textMuted` (made for the grip tape) | 8.0:1 | Override |
| Skate Deck | Last word in `accent` `#FF4FA3` | 1.7:1 on maple | It sits on its 16px white sticker outline: about 3.0:1, large text |
| Quest | Subtitle `#D9C08E`, last word `#FFB547` instead of `textMuted` and `accent` (made for parchment) | 10.4:1 each | Override |
| Session | Last word in brick `#B23A2E` | 3.0:1 | Large text only, at the limit; don't lighten the brick or the mustard |
| Pastel Cloud | Headline in `primary` `#7B5BD6` | 4.1:1 | Large text |
| Cozy Café, Daylight, Shonen | Last word in `accent` | 4.5-4.6:1 | Large text; also passes the 4.5:1 body rule, barely |
| Bold Esports | `accent` on `surface` (badges, alert band) | 4.7:1 | Passes; little room |

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
- Shipped: bg `#2B0F4C` stays purple to 68% of the height, then fades to coral and orange at the horizon, so text never sits on the light part. Opaque surface (hex, for the contrast checks), primary `#01CDFE` (the band across the chrome titles), accent `#FF71CE`, muted `#C9B6E4`, radius 6, pink glow. Palms are `public/images/themes/vaporwave-palms.svg` (the CSP blocks `data:` images). Animated since T6.134 (the floor, the sun's stripes, the palms); Lite and Still hold it.

**9. Daylight** (T6.89, the light look streamers asked for)
- Colors: bg `#EEF1F6` (cool paper), surface `#FFFFFF`, titles and text ink `#141821`, accent vermilion `#C93A1C`, muted `#5B6272`
- Fonts: Space Grotesk / Nunito Sans
- Effects: none; a soft shadow under surfaces, hairline border `#D9DEE7`, radius 14
- Contrast: text, muted and accent all pass AA on both bg and surface (accent 4.5:1 on bg, 5.1:1 on white). Reuses Clean Slate's alert sound.

### Motion (T6.117)
One motion grammar for every look, flavoured by its `enter` and `alertAnim`. All of it plays once per event and stops under reduced motion (`?rm=1`, "Less motion" or the OS setting); hidden pieces show at once.
- **Scene entrance:** the pieces land in sequence instead of as one block: logo (0ms), the accent rule drawing in from the left (500ms), the headline word by word (160ms + 90ms per word), the countdown (320ms), the socials one by one (460ms + 80ms each), the subtitle (560ms). Each uses the look's enter motion (slide-fade with an expo ease-out, bounce, stepped, or wipe). Neon Grid's last word flickers on after it lands. Vaporwave's chrome is clipped per word, since a heading's clipped background doesn't paint through children that move on their own.
- **Countdown:** each character is its own span keyed by its value, so only the digits that change remount and flip in from above (360ms); Arcade snaps in two steps.
- **Alerts:** the box arrives in the look's own motion, then a burst of the accent light behind it (Shonen: speed lines; Session: two bars slashing across; Arcade: stepped; Neon: a flicker), the name and amount pop (scale 0.6 to 1.08 to 1), and a sheen crosses the card once.

### Uplift of the original looks (T6.112)
Each original look got one signature move from its own world, to the kits' bar. All motion stops under reduced motion.
- **Neon Grid:** the headline glows like a lit neon tube (two soft text-shadows in its own colors); the last word flickers on once after the entrance.
- **Cozy Café:** warm window light from the top left and paper grain (`public/images/themes/paper-grain.svg`, the Session grain at a third of its strength).
- **Arcade 8-Bit:** a blinking accent block cursor after the title (1.1s, stepped), like an attract screen.
- **Pastel Cloud:** a four-point accent sparkle after the title that twinkles.
- **Forest Night:** a pine treeline along the bottom under the moon (`public/images/themes/forest-treeline.svg`, three ridges, generated).
- **Bold Esports:** angled accent speed slabs cutting across the top-right corner.
- **Daylight:** a Swiss-poster vermilion disc (380px) in the open top right.
- **Clean Slate** stays the quiet baseline; **Vaporwave Sunset** already had its full world.

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

### Four more looks (T6.125-T6.128)
From impeccable's second direction round (seed `c833f7e1`, reroll 1), all four picked by the owner. Every loop stops in Lite and Still.

**13. Sakura** (T6.125): a spring night in Japan.
- Colors: indigo `#11152F` (lighter `#1A1F45` at the top), surface `#1A1E3D`, petal white `#FFF3F6` titles, text `#F1ECF6`, muted `#B6AFCC`, accent sakura pink `#FF91B4`
- Fonts: Shippori Mincho (headline 168px, weight 500; countdown 88px) / Nunito
- Shape: radius 12; the rule above the title is a tapered brush stroke in the accent
- Effect (`sakura`): a paper lantern's warm glow in the open top right (light through washi); petals drifting down and across in two layers (40s far, 26s near), each a tile that slides one tile so the loop never jumps.
- Sound: reuses Pastel Cloud's alert sound.

**14. Skate Deck** (T6.126): a skate-shop deck wall.
- Colors: maple `#E8B877` with its grain, grip-tape `#151515` surface and titles, cream text `#F7F2E8` on the panels, accent hot pink `#FF4FA3`; the deck adds aqua `#19E3D1` and yellow `#FFE14D`
- Fonts: Bungee (sticker lettering 128px with a 16px white outline) / Barlow
- Shape: radius 18, 3px ink borders, no shadows; socials sit on a grip-tape panel; alerts bounce in
- Effect (`skate`): a deck lying in the open top right, rocking on its trucks (3.2s).
- Sound: reuses Arcade 8-Bit's alert sound.

**15. Phosphor** (T6.127): a green-phosphor terminal at midnight.
- Colors: black glass `#040A05`, surface `#07120A`, one ink in three strengths: titles `#9DFFAE`, text `#B9F5C6`, accent `#4DFF78`; muted `#73B583`
- Fonts: JetBrains Mono for everything (headline 128px, weight 700)
- Shape: radius 2, hairline `#1C4A27` borders; text blooms, the title leaves a faint afterimage; stepped entrances
- Effect (`phosphor`): scanlines and a vignette; a faint boot log in the open top right; a slow refresh band (7s); a cursor that breathes after the title.
- Sound: reuses Neon Grid's alert sound.

**16. Quest** (T6.128): a fantasy RPG quest log.
- Colors: dark hall `#1B130C`, gold `#F2D489` titles (the last word forge orange `#FFB547`), parchment `#F2E4C4` panels with ink `#3A2716` text, muted `#6A4D2E`, wax-seal red `#8E2A1E` accent
- Fonts: Cinzel (carved capitals 148px) / Alegreya (italic subtitle)
- Shape: radius 6, 2px gilt `#B88F3E` borders with an inner gilt line; countdown and socials on parchment panels
- Effect (`quest`): embers rising from below (18s) through a forge glow, a vignette over the hall.
- Sound: reuses Forest Night's alert sound.

## The bar for a new or reworked look
Set on 2026-10-07 from the owner's design handoff, an audit of the looks against paid packs (not in the repo). It applies to every new look and to any rework of a shipped one; shipped looks aren't redesigned only to meet it. These rules, CLAUDE.md and the sections above win over any style skill.

**Before building**, write a short plan: 4-6 named colors, the two type roles, the layout as a quick sketch, and the one memorable move. Check it against the anti-patterns below and rewrite whatever matches.

**A look is done when:**
- It has one memorable move (its signature, named in the theme file's header comment) and everything else stays quiet. Before finishing, take one decorative element away.
- Its heading face is its own, and it uses two type roles at most, clearly different from each other.
- It has its own alert sound.
- It covers every surface: Starting Soon, Be Right Back, Stream Ending, chat, alerts, webcam frame, Twitch panels and the offline banner.
- Its layout is chosen for its concept: the shared layout v2 or one of its own (see "Scene layout"), never a recolor by default.
- Its colors pass "Contrast as rendered" on the ground and on the surface.
- It reads on a phone: check the scene scaled down to 1280×720 and 640×360.
- Its motion follows the motion grammar (T6.117), uses CSS or canvas only, and every loop stops in Lite and Still.
- Its copy is sentence case and plain, and its preview content reads like a real stream (`FriendlyRaider`, not `[Username]`).
- Its fonts, sounds and art are in `docs/ASSETS.md`, and it has passed `docs/OBS-TESTING.md`.

**Anti-patterns.** Each one is allowed only when the look's concept demands it, with the reason in the theme file's header comment.
- Layout: identical rounded cards with one soft grey shadow; a gradient as decoration; blurred translucent panels (also heavy on low-end PCs); sticker tilt, an offset hard shadow or a thick black border as a shortcut for "bold"; everything centered.
- Type: labels that restate the content; middle-dot strings ("A · B · C"); an italic serif as shorthand for calm; monospace small print as shorthand for technical.
- Color: warm cream with terracotta or clay; near-black with one acid-green or vermilion accent; a tinted near-black standing in for black unless it's a named color in the palette; neon, scanlines and a grid as the default "retro" (pick a real source instead: teletext, a particular console, a print process); an accent sprinkled around instead of meaning something.
- Content: "→" on links or buttons, numbers on things that aren't a sequence, invented metrics or testimonials.
- Motion: the same fade-and-slide-up on every element. Each scene gets one orchestrated moment.

**House patterns** are shared by every look, so they aren't tells: the two-tone headline whose last word takes the accent (T6.107), the uppercase event label on alerts, and small tracked caps for the platform names in the socials list. A look doesn't add a second accented word or more caps labels on top of them.

**Known gaps (2026-10-07):**
- Sounds: eight looks reuse another look's sound: Daylight (Clean Slate's), Abyss and Quest (Forest Night's), Session (Cozy Café's), Shonen (Bold Esports'), Sakura (Pastel Cloud's), Skate Deck (Arcade 8-Bit's), Phosphor (Neon Grid's).
- Fonts: Space Grotesk is Daylight's heading and Vaporwave Sunset's body. Body faces shared by two looks: Nunito Sans (Forest Night, Daylight), Nunito (Cozy Café, Sakura), Barlow (Bold Esports, Skate Deck).
- Composition: closed in T6.134. Every look now has its own scene layout (see "Scene layout"); layout v2 stays as the starting point for new looks.
- Shipped looks that match a tell keep it until they are reworked: Bold Esports (near-black with one red), Neon Grid (neon with a grid).

## Overlay layout rules
- Canvas is always 1920×1080. Keep a 64px safe margin on scenes.
- Chat default size is 400×600, transparent background, bottom-up.
- Alerts render centered-top by default, with no background outside the alert box.
- Error states use the theme's surface and text colors, stay readable, and never flash.

### Scene layout (T6.35, T6.134)
Each look has its own scene composition (T6.134, plan and sketches in `docs/LAYOUTS.md`), built in `src/overlays/layouts.css` on the shared markup. Layout v2 (below) is the default a new look starts from. Theme ids, settings and links never changed, so pasted links picked up every new layout. Per-look rules key on `data-theme` (and `data-bg` for background effects) on `.scene`, `.chat` and `.alerts`; BRB, Stream Ending and the offline banner have no countdown, which `.scene-main:has(.countdown)` tells apart (OBS 31+).

**A look may have its own layout** (owner, 2026-10-07): looks don't have to share one composition. Paid packs differ in structure, not just color, and a layout is part of a look's world (a teletext page, a manga panel, a quest log). What every layout keeps:
- The 1920×1080 canvas, the 64px safe margin, and the open space the look's motif needs.
- The same pieces and settings: logo, headline, subtitle, countdown, socials, ticker and the error card. A layout is part of the look, never a link setting, so old links simply pick it up.
- The shared markup (`SceneFrame`): a layout changes the CSS, keyed on `data-theme`, not the components, so fit-to-screen (T6.26, T6.52) keeps working. If several looks share a layout, add it as a token through `types.ts`, with a test.
- The longest text still fits, "Contrast as rendered" holds for the new placements, it reads at 640×360, and the motion grammar and Lite and Still apply.
- The scene, BRB, Stream Ending, offline banner and panels of one look read as one layout. Compare screenshots against the current scene before shipping (`node tests/shots.mjs <dir>` and `tests/sheet.mjs`, with the dev server running).

**The layouts (T6.134).** The handoff's three mockup boards were the source: Bold (a broadcast bar), Calm (one shelf) and Retro (row bands).
- **Clean Slate, the shelf:** one surface shelf along the bottom holds the subtitle, countdown and socials in cells split by hairlines, under the headline.
- **Neon Grid, the sign over the vanishing point:** centered on the grid's vanishing point; the countdown lit like a neon sign (a primary tube round the card); the socials in a row above the horizon (82%).
- **Cozy Café, the menu card:** the headline as the shop sign on the left; one paper menu card on the right, the countdown at its head and the socials as specials with dot leaders.
- **Arcade 8-Bit, the attract screen:** centered; the socials as a high-score table, one colored band per row (ink on yellow, green and the pixel-shadow pink); pixel-font sizes as before (T6.38, T6.55).
- **Pastel Cloud, the floating stack:** centered and low in the sky; the countdown a pill, the socials a row of pills; the lower cloud rises to 18% so both clouds drift above the title.
- **Forest Night, under the moon:** the headline hangs right-aligned under the moon; the countdown and socials sit low on the left over the treeline; the fireflies keep to the left third of the sky.
- **Bold Esports, the broadcast bar:** the poster headline above one bar across the stream, the countdown in an angled red slab (ink on red, 5.2:1) and the socials beside it.
- **Vaporwave Sunset, the horizon:** the sun sets centered on a horizon at 80%, a grid floor runs to the viewer and palms frame both sides; the chrome title, subtitle and one countdown-and-socials row sit in the purple sky, which ends where the sun begins. Animated (T6.134): the floor scrolls, the sun's stripes slide into the horizon, the palms sway.
- **Daylight, the poster colophon:** the headline very large and flush left at the top, the disc top right, the details in ruled columns along the bottom.
- **Abyss, the depth gauge:** a depth scale down the right edge; the stack floats centered; the countdown reads like an instrument between two seams.
- **Session, the title card:** the ink headline at the top, the teal and brick bars across the open middle (in the grid's flexible row, so a long title squeezes them), the socials bottom left and the countdown in a cream episode box bottom right.
- **Shonen, the manga page:** a big panel for the lettering (screentone and speed lines inside), and a column of two panels running to the page border for the countdown and the socials, with white gutters and ink edges.
- **Sakura, the hanging scroll:** one tall scroll on the right in the night surface color, a dark rod at each end and the brush stroke under the top one, with everything written down it; the lantern glow moves to the open left.
- **Skate Deck, the sticker wall:** the countdown and socials as die-cut stickers (a white cut line, a soft shadow) slapped on at an angle under the deck; the lettering straight across the bottom.
- **Phosphor, the terminal window:** one full-screen window with a title bar; the boot log first, the headline at a `$` prompt, the countdown as `T-minus`, the socials as an `ls` listing.
- **Quest, the quest log:** one tall parchment panel on the left with the title, description, countdown and socials (ink, wax red and muted ink on parchment; the logo a small crest in its corner); the hall and embers stay open on the right.
- One decoration less (the handoff's rule): where a layout has its own mark (the bar, the disc, the gauge, the stickers), the short accent rule above the headline is set to zero height. The scene-fit test still measures it.

**Layout v2, the default (T6.107):**
**Scenes (layout v2, T6.107, after the maintainer's broadcast kits):** 88px top / 112px side / 72px bottom margins (inside the 64px safe margin). Logo top left (160px max). On the left, anchored to the bottom: a 96×8px accent rule, then a two-tone display headline (184px, -0.04em tracking, 0.94 leading, balanced, so "Starting soon" sets on two lines) whose last word takes the accent color, then the subtitle (40px, 30ch max). It shrinks to fit per T6.26 and fits again when the countdown widens as it ticks (T6.52). On the right, also bottom-anchored, one column (480px min): the countdown card (96px digits on one line, in the text color, so the accent stays with the headline) over the socials as a list, each an accent-tinted 72px icon tile with the platform name (small tracked caps) over the handle (36px bold). The open sky above both columns is where each theme's motif lives.

- **Alerts:** still centered at the top. A wider card (760-1100px) with a 6px accent band, an uppercase event label ("Raid", "New subscriber", "Resub", "Gift subs", "Cheer"), then the streamer's message at 56px; resub and cheer text below in the muted color.
- **Chat:** one panel instead of a card per message: no borders between cards, hairline separators, only the top and bottom of the stack rounded. Badges are small square-cornered tags tinted with the accent.

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

### Redesign after the owner's kits (T6.118)
`docs/KIT-REFERENCE.md` lists what the Tuskilicious and ICARUS kits do well; the editor took these from their control docks:
- **Panel headers** sit inside the panel (Quicksand 18px bold) over a hairline that runs to the edge, instead of breaking the panel's top border.
- **Segmented controls** for two to four choices (scene to edit, countdown kind, where the frame goes, motion): every choice visible inside one track, and a single Lune Violet highlight with Night text that slides to the picked one (T6.135); the radios stay for keyboards and screen readers.
- **Quick rows** of chips under a field: countdown picks and -1 / +1 min nudges, common webcam frame sizes (a picked size shows `aria-pressed` and fills Lune Violet, T6.135).
- **Status in the section list:** a small accent check after a part that's filled in (Socials, Chat, Logo, Colors), with "(filled in)" for screen readers.
- **Line icons** (`components/Icon.tsx`, one 2px stroke) instead of text glyphs: the check in "Copied" and the section list, the back arrow on the guide and legal pages.
- **Guide:** a row of index chips that jump to each part, and a "Before your first stream" run-through with check boxes drawn in the accent.
- Copy: success messages end with a full stop, not an exclamation mark.

### Components
| Component | Anatomy and variants | States | Notes |
|---|---|---|---|
| Button | Outline: Night fill, Haze 1px outline, 8×10px padding. Filled: Lune Violet with Night text, bold, **only** for "Copy link" | hover (pointer), focus-visible ring, disabled (dashed outline, muted text, `not-allowed`) | Visible text is the action ("Copy link", "Start over"). Repeated buttons get an `aria-label` that starts with the visible text ("Add their name to Raid message"). Avoid disabled buttons; say why in text instead. |
| Text field, select, textarea | Label wraps the control; hint below, linked with `aria-describedby` | focus-visible, invalid (`aria-invalid`, red outline, message in `role="alert"`), near limit ("N characters left", `aria-live="polite"`) | Every limited text field shows characters left at 10 or fewer. |
| Segmented control | One track (Night, 1px Haze edge, radius + 3px) holding two to four labels over native radios; a single Lune Violet highlight slides to the checked one (220ms). `:has()` counts the options and finds the checked one, so no script | hover (faint Moonlight tint), checked (Night text, bold, 5.3:1), focus-visible ring on the label | After the 21st.dev segmented controls, ported to CSS (T6.135). Up to four options. In a fieldset, the legend sits just above the track. |
| Switch | 40 × 24 track and a 16px knob on a native checkbox (`appearance: none`). Off: Haze edge and knob on Night (8.3:1); on: Lune Violet track, Night knob (5.3:1) | off, on, focus-visible ring | For on/off settings (ticker, hide commands, badges). Weekday picks keep plain checkboxes. Space toggles it, as a checkbox. |
| Slider | Native range input: an 8px track (Night, Haze edge) filled with Lune Violet up to the thumb (`--pct` set from the value), a 20px round Lune Violet thumb with a Night ring; the value in a box beside it | focus-visible ring | Alert volume. Arrow keys, Page Up/Down, Home and End, as a range input. |
| Chip | A pill-shaped outline button in a quick row (countdown picks, -1 / +1 min, frame sizes), 6×14px padding, 14px text | hover, focus-visible ring; with a state, `aria-pressed` and pressed = Lune Violet fill with Night text, bold (5.3:1) | Only chips that hold a state carry `aria-pressed` (a frame size); actions (In 15 min, No countdown) don't (T6.135). |
| Swatch | A 28px circle per color: the look's own colors once each (a gradient background isn't one), then "your own color", the native color input under a color-wheel swatch that shows the color once picked | picked: a 2px Lune Violet ring outside a surface gap, plus `aria-pressed` (or `data-picked` on your own); focus-visible ring | In Advanced: colors (T6.135). Picking the look's own value for a token clears the override. Each row is a group named by the color; the hex code sits beside the swatches and Reset beside the name. |
| Disclosure | Native `<details>`/`<summary>`, bold summary, closed by default | open, closed (native) | For rarely changed settings ("More chat options", "Advanced: colors and fonts"). Never hide a setting a beginner needs to finish. |
| Look filters | Pills above the editor's picker: All, Calm, Retro, Bold (`aria-pressed`); each look is in one group | pressed (Lune Violet fill) | Filtered-out looks are hidden, not removed (T6.60). |
| Look card | The theme's real Starting Soon scene with sample content (a subtitle, a countdown a day away and two `yourname` socials, `src/editor/scene-samples.ts`), held still, plus its name. Gallery: `<button>`, 4 across (2 at 800px and below). Editor: radio, 3 across | hover (Haze border), selected (Lune Violet border via `:has(:checked)`), focus-visible | Card scenes never animate (`editor-shot`), so a gallery of every look stays light. |
| Link row | The name with Width and Height as chips (the dots stay in the text for screen readers and the guide's size table), a faint raw link (48ch max, still selectable), the filled Copy button | copied ("✓ Copied"), stale ("Changed since you copied it"), copy failed ("Press Ctrl+C") | The copy status is a `role="status"` that stays in the DOM. |
| Steps bar | Sticky `<nav aria-label="Steps">` with three links | current step: accent, 3px underline, `aria-current="step"` | Jumps scroll and move focus; they never change the address, which holds the settings. |
| Preview | Scaled overlay in a 16:9 (or chat-sized) box | — | `aria-hidden` and `inert`, because it repeats the form. Sticky column above 800px, and never taller than fits under the header, so the scene's title (at the bottom of the frame) is in view on a 768px-tall laptop (T6.49); docked "Show preview" bar at 800px and below. |
| Callout | Deep Space box with a faint violet outline all the way round (`--callout-edge`: Lune Violet mixed 45% into Deep Space, 1px) and the usual 12px corners. No thick bar down one side (T6.53) | — | Save reminder, "You're set" line, legal disclaimer. One per region. |

- **Responsive:** from 1200px, a three-column shell (T6.60): the section list on the left (Look, Text, Socials, Chat, Alerts, Webcam frame, Channel page, Logo, Motion, Colors, Links; the section in view marked with `aria-current="location"`), the live preview in the middle (sticky; it shows the chat or alert preview while those sections are in view), and the settings on the right (340–400px) with the links at their end. 801–1199px: a 300–400px form column beside the previews, with the steps bar; the links end the form column, so the sticky preview never covers them (T6.66). 800px and below: one column, docked preview, gallery 2 across. The editor is for desktop windows, often squeezed next to OBS; there is no mobile editor (PRD).
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
- **Hero (T6.59):** the whole kit. A live scene in a 16:9 stream frame with a small Signal Cyan LIVE badge, two real alert cards in the same look (over the frame's empty top-left on wide screens, under it on phones), and the three scene names with the current one filled. It tours a look and a scene every 4.5 seconds. A "Pause the looks" button stops the tour and holds the scene still (WCAG 2.2.2); with reduced motion it starts paused on Vaporwave Sunset. Under the buttons, a fact row: the number of looks (counted from `themeIds`, never typed in), Scenes, chat and alerts, One link per overlay, Free, no account. Since T6.124 the hero is one big rounded card that, on wide windows with motion, zooms out into a drifting collage of every look as you scroll.
- **Night sky (T6.59):** CSS only, static: a few small stars, a soft violet arc and a crescent moon behind the hero. No image files.
- **Glow (T6.59, T6.124):** the hero frame's edge (Lune Violet to Signal Cyan) with a soft glow, the hero's primary button with a matching glow, and the closing call to action, a panel lit by violet radial light. Soft radial light also sits behind the page, never behind body text (BRAND.md). No other card or button glows.
- **Looks (T6.124):** the looks rise on a violet curve as a list (name and one line each) beside one big live preview that follows hover, focus and the row in the middle of the window, with scene buttons, full screen and "Use this look". Narrow windows get a picture per look.
- **Overlay cards (T6.59, T6.102, T6.124):** Starting Soon, Be Right Back, Stream Ending, Chat, Alerts and Webcam frame, tall cards in a sideways row that fill with violet from the pointer. Each is a live thumbnail that opens its part of the editor (`/editor?part=starting|brb|ending|chat|alerts|frame`; a first visit picks a look first).
- **Nav (T6.59):** the link for the section in the middle of the window is underlined in Lune Violet (`aria-current="location"`).
- Motion: scroll reveals, the pinned hero zoom (wide windows), a word-by-word reveal that starts at 40% opacity so large text keeps 3:1 contrast, and CSS hover zooms. All GSAP runs inside `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`; with reduced motion the page is static and fully visible.
- One filled button style (Lune Violet, Night text). No meta-labels ("SECTION 01"), no invented reviews or stats.
- Responsive down to 390px with no sideways scroll (e2e check).

### The hero's night (T6.129)
After the Kage reference the owner shared, rebuilt in Overlune's own palette with no code or art from it. Three ridges stand in front of the hero card's sky (far: Lune Violet haze at 30%, mid: `#2A1D7A`, near: Midnight with a crest of pines), with violet mist between them and motes in violet, cyan and moon white rising out of them (26s loop). The moon's air breathes (8s). On load the ridges rise in from the card's foot, 90ms apart, and the headline arrives a word at a time out of its own mask (72ms apart). On wide windows with motion, scrolling parts the ridges, the nearest furthest, while the card zooms out. All of it is `aria-hidden` and sits behind the hero's text; with reduced motion every piece sits where it ends. Left out on purpose: the custom cursor and its trail (cursor effects stay off this site), and the vertical Japanese text.

### UI review checklist
- [ ] Colors, fonts, sizes and spacing come from the tokens above, with no unexplained raw values.
- [ ] Every new control has a label and a visible focus ring, and works by keyboard.
- [ ] Hover, focus-visible, selected, disabled, invalid and empty states are handled where they apply.
- [ ] Copy follows the tone rules; labels name what the streamer sees.
- [ ] Checked at 1366×768 and at 600px wide; long text wraps or truncates as described.
- [ ] axe stays clean in e2e, and `tests/unit/editor/contrast.test.ts` covers any new color pair.
