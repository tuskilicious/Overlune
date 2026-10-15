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
- **Tested as rendered (T6.140):** `tests/e2e/contrast.spec.ts` renders every look's Starting Soon scene with sample content and motion off, and compares each text with the pixels actually behind it: the letters' solid insides against the same pixels with the letters hidden, so gradients, the print grain, overrides and outlines all count. Large text needs 3:1 and the rest 4.5:1, at the 10th-percentile pixel. Lettering with a thick outline (Shonen, Skate Deck) is judged against its outline; glows are left out. A look that changes `bg`, `primary`, `accent`, `textMuted` or an override below just has to keep that test green.

Overrides on the ground today, and the tightest pairs (WCAG ratios from the shipped values, 2026-10-07; Session updated 2026-10-08):
| Look | On the ground | Ratio | Why it holds |
|---|---|---|---|
| Skate Deck | Subtitle `#3A2410` instead of `textMuted` (made for the grip tape) | 8.0:1 | Override |
| Skate Deck | Last word in `accent` `#FF4FA3` | 1.7:1 on maple | It sits on its 16px white sticker outline: about 3.0:1, large text |
| Quest | Subtitle `#D9C08E`, last word `#FFB547` instead of `textMuted` and `accent` (made for parchment) | 10.4:1 each | Override |
| Session | Last word in a deeper brick `#A3332A` than the accent `#B23A2E` | 3.5:1 | The accent is exactly 3.0:1 on the mustard, and the print grain over both took part of the word to 2.7:1 as rendered (T6.140); the accent stays everywhere else. Don't lighten the brick or the mustard |
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
- Contrast: text, muted and accent all pass AA on both bg and surface (accent 4.5:1 on bg, 5.1:1 on white). Its own alert sound: a clean bell (synthesized, T6.142).

### Motion (T6.117)
One motion grammar for every look, flavoured by its `enter` and `alertAnim`. All of it plays once per event and stops under reduced motion (`?rm=1`, "Less motion" or the OS setting); hidden pieces show at once.
- **Scene entrance:** the pieces land in sequence instead of as one block: logo (0ms), the accent rule drawing in from the left (500ms), the headline word by word (160ms + 90ms per word), the countdown (320ms), the socials one by one (460ms + 80ms each), the subtitle (560ms). Each uses the look's enter motion (slide-fade with an expo ease-out, bounce, stepped, or wipe). Neon Grid's last word flickers on after it lands. Vaporwave's chrome is clipped per word, since a heading's clipped background doesn't paint through children that move on their own.
- **Countdown:** each character is its own span keyed by its value, so only the digits that change remount and flip in from above (360ms); Arcade snaps in two steps.
- **Cheap loops (T6.144):** anything that loops for the whole stream may only move, turn, scale or fade (`transform`, `translate`, `rotate`, `scale`, `opacity`), so the GPU runs it without repainting. Measured at 1080p with 4x CPU throttling, the four loops that broke this (the countdown's edge light, Abyss's breathing digits, Phosphor's refresh band) cost 13 to 26% of the main thread each; rebuilt, every look runs at 1 to 2%. One exception: Vaporwave Sunset's sun stripes slide a mask (about 12%; Lite holds it). `tests/e2e/smoke.spec.ts` fails on any other looping animation of another property.
- **Hidden in OBS (T6.144):** when OBS hides a Browser source (another scene, or the eye icon off), it tells the page, and every animation pauses until it's shown again.
- **Alerts:** the box arrives in the look's own motion, then a burst of the accent light behind it (Shonen: speed lines; Session: two bars slashing across; Arcade: stepped; Neon: a flicker), the name and amount pop (scale 0.6 to 1.08 to 1), and a sheen crosses the card once. Clean Slate's lines also follow its card in, one after another (label 150ms, message 230ms, note 310ms; 300ms each, rising 12px), in CSS: a GSAP timeline for the same alert dropped frames on a slow PC (T6.137, STACK.md).

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
- Sound: a soft sonar ping with one echo over a low hum (synthesized, T6.142).

**11. Session** (T6.110): every scene is a frame of a jazz-session anime: Starting Soon the title card, BRB the eyecatch, the ending the end card.
- Colors: mustard ground `#E0B23C`, teal `#146B6E` and brick `#B23A2E` bars, cream surface `#F1E6CF`, ink `#0E0E0E` for titles, text and outlines, muted `#4F4334`; the headline's last word in brick
- Fonts: Archivo Black (uppercase headline 168px, line-height 0.84, tracking -0.045em) / Archivo
- Shape: radius 0, 3px ink outlines, no shadows; ink icon tiles; hard wipes (350ms in, 250ms out) like a cut on the beat
- Effect (`session`): one diagonal teal bar and a thin brick bar across the open top, kept clear of a three-line title, so text only sits on mustard; print grain (`public/images/themes/print-grain.svg`, SVG noise) multiplied over every color. Static.
- Adaptations: the lines sit tight but never overlap (legible at 720p); the title card's figure silhouettes need commissioned art and are left out.
- Sound: a brush snare swish into a muted horn stab (synthesized, T6.142).

**12. Shonen** (T6.111): every scene is a manga page.
- Colors: paper `#F4F3EE`, white surface, ink `#111111` for titles, text and outlines, muted `#454545`, one spot color, manga red `#D61F26` (the headline's last word, alerts)
- Fonts: Bangers (headline 196px, ink with a 14px white knockout stroke; countdown 104px) / Comic Neue
- Shape: radius 0, 4px ink outlines, no shadows; the right column sits in white inked panels (countdown and socials); the chat stack is an inked panel; alerts land with an impact (bounce)
- Effect (`shonen`): a 6px ink panel border 32px in from the edge (an outline, so it paints above the art); speed lines bursting from a focal point at the top right, clear at the center and gone before the text; a hard-cut screentone sheet over the lower left, with the subtitle in a white knockout so it stays readable. Static.
- Sound: a whoosh into one big taiko hit (synthesized, T6.142).

### Four more looks (T6.125-T6.128)
From impeccable's second direction round (seed `c833f7e1`, reroll 1), all four picked by the owner. Every loop stops in Lite and Still.

**13. Sakura** (T6.125): a spring night in Japan.
- Colors: indigo `#11152F` (lighter `#1A1F45` at the top), surface `#1A1E3D`, petal white `#FFF3F6` titles, text `#F1ECF6`, muted `#B6AFCC`, accent sakura pink `#FF91B4`
- Fonts: Shippori Mincho (headline 168px, weight 500; countdown 88px) / Nunito
- Shape: radius 12; the rule above the title is a tapered brush stroke in the accent
- Effect (`sakura`): a paper lantern's warm glow in the open top right (light through washi); petals drifting down and across in two layers (40s far, 26s near), each a tile that slides one tile so the loop never jumps.
- Sound: a single koto-style pluck (synthesized, T6.142).

**14. Skate Deck** (T6.126): a skate-shop deck wall.
- Colors: maple `#E8B877` with its grain, grip-tape `#151515` surface and titles, cream text `#F7F2E8` on the panels, accent hot pink `#FF4FA3`; the deck adds aqua `#19E3D1` and yellow `#FFE14D`
- Fonts: Bungee (sticker lettering 128px with a 16px white outline) / Barlow
- Shape: radius 18, 3px ink borders, no shadows; socials sit on a grip-tape panel; alerts bounce in
- Effect (`skate`): a deck lying in the open top right, rocking on its trucks (3.2s).
- Sound: a board pop, then a landing click (synthesized, T6.142).

**15. Phosphor** (T6.127): a green-phosphor terminal at midnight.
- Colors: black glass `#040A05`, surface `#07120A`, one ink in three strengths: titles `#9DFFAE`, text `#B9F5C6`, accent `#4DFF78`; muted `#73B583`
- Fonts: JetBrains Mono for everything (headline 128px, weight 700)
- Shape: radius 2, hairline `#1C4A27` borders; text blooms, the title leaves a faint afterimage; stepped entrances
- Effect (`phosphor`): scanlines and a vignette; a faint boot log in the open top right; a slow refresh band (7s); a cursor that breathes after the title.
- Sound: a pair of terminal beeps, the second higher (synthesized, T6.142).

**16. Quest** (T6.128): a fantasy RPG quest log.
- Colors: dark hall `#1B130C`, gold `#F2D489` titles (the last word forge orange `#FFB547`), parchment `#F2E4C4` panels with ink `#3A2716` text, muted `#6A4D2E`, wax-seal red `#8E2A1E` accent
- Fonts: Cinzel (carved capitals 148px) / Alegreya (italic subtitle)
- Shape: radius 6, 2px gilt `#B88F3E` borders with an inner gilt line; countdown and socials on parchment panels
- Effect (`quest`): embers rising from below (18s) through a forge glow, a vignette over the hall.
- Sound: a lute strum up a chord, then a short horn call (synthesized, T6.142).

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
- Sounds: every look has its own (T6.142). The eight newest (Daylight, Abyss, Session, Shonen, Sakura, Skate Deck, Phosphor, Quest) are synthesized by `tests/make-sounds.py`, normalized to -12 LUFS (-12 to -14.7 measured; the shortest, Skate Deck's pop, measures lowest); `tests/unit/themes/sounds.test.ts` checks each look's file exists and is its own.
- Fonts: Space Grotesk is Daylight's heading and Vaporwave Sunset's body. Body faces shared by two looks: Nunito Sans (Forest Night, Daylight), Nunito (Cozy Café, Sakura), Barlow (Bold Esports, Skate Deck).
- Composition: closed in T6.134. Every look now has its own scene layout (see "Scene layout"); layout v2 stays as the starting point for new looks.
- Shipped looks that match a tell keep it until they are reworked: Bold Esports (near-black with one red), Neon Grid (neon with a grid).

## Phase 11 directions (picked 2026-10-15)
The owner picked the names and lune materials on 2026-10-13, then approved Eclipse A, Rain City B, Paper Cut B and Aurora Tundra A from [the direction board](phase-11-directions.html) on 2026-10-15. The board includes both candidates for comparison, with Starting Soon in both canvases, chat/alert/frame studies, sound ideas and motion notes. It opens offline with the bundled fonts and their licenses included. These are the selected design directions; the production kits are still to be built and OBS-tested. The bar above, KIT-REFERENCE.md and the overlay playbook apply. Keep the current safe-zone numbers and all shipped looks unchanged.

| Look | Candidate A | Candidate B | Owner's choice |
|------|-------------|-------------|----------------|
| Eclipse | Observatory rail | Orbital axis | A, Observatory rail |
| Rain City | Corner shop | Last train home | B, Last train home |
| Paper Cut | Folded folio | Window in the paper | B, Window in the paper |
| Aurora Tundra | Ice shelf | Frost arch | A, Ice shelf |

**Selected compositions.** Eclipse keeps its left title and low instrument rail, with the corona in the open right side. Rain City uses B's right-aligned station lettering and left tube sign; portrait keeps that right alignment, with its sign above and reflection below the words. Paper Cut uses B's large right-hand paper window, with title and countdown on a split baseline; portrait stacks the words above a low crescent window. Aurora Tundra keeps A's low shelf and open sky; the frost crescent sits below the portrait safe zone. These selections override the initial composition sketches below where they differ. Palettes, type roles, sound ideas and Full/Lite/Still behavior stay as described below and on the board.

**Board review.** The candidates change alignment, information placement and the shape of the lune's surrounding material, rather than only recoloring a scene. The selected looks avoid a starfield, synthwave grid, café stationery, manga panels, pine trees and underwater snow. Original SVG/CSS art and existing bundled fonts only; no new dependency. Text and safe-zone checks cover desktop and phone widths. Still mode keeps each crescent identifiable. Motion notes describe future behavior; the comparison board itself is static and is not an OBS pass.

**Shared decisions.** Each look uses two type roles, a heading face not used as another look's heading, an original alert sound, and one crescent made from its own material. The proposed faces below are already bundled; body-face reuse is allowed. Use CSS or original SVG art, not new runtime libraries or video. A lune must remain identifiable in Still mode. Do not put ambient effects over a live camera or gameplay. Text uses the theme tokens; test the rendered result over the actual art before accepting a palette.

### Eclipse: the corona
- **Material and memorable move:** a single crescent of lit lunar dust around an otherwise unlit disc, occupying the open side of an observatory title plate. Keep the crescent visible without an animated glow.
- **Proposed palette:** night violet `#12101E` (bg), instrument violet `#211E32` (surface), moon white `#F2EDE5` (primary/text), corona gold `#DBAD60` (accent), dust lilac `#B6ACCA` (muted).
- **Proposed type:** Manrope 700 for broad, measured headings; Barlow for supporting words. **Sound:** a low rounded strike with a brief high overtone, synthesized without samples.
- **Composition:** landscape has a large left-aligned title, the crescent to the right, and countdown/socials on one low instrument rail. Portrait moves the crescent above the safe zone; title, countdown and socials stack inside it. Without a countdown, the rail closes to the socials and subtitle.
  ```text
  Landscape:  logo                  crescent
              title + subtitle     open sky
              countdown | socials
  Portrait:   crescent / [logo, title, countdown, socials in safe zone]
  ```
- **Principles:** one celestial object; precise type; the gold marks the corona and emphasis. **Motion:** one short corona reveal using opacity/transform; any slow drift is Full only, Lite holds it, Still has no entrance. **Anti-pattern check:** no starfield, neon grid, glass cards or animated blur; the violet is the named night material, not an interchangeable tinted black.
  - **Built and owner-approved, T11.3 (2026-10-15):** the selected A layout is in `src/themes/eclipse.css`, scoped to Eclipse across the kit. Manrope 700 headings, Barlow body, the palette above and an original token-colored SVG corona. The portrait corona sits above y 240; camera scenes keep a small still crescent in the header, clear of the holes. Chat has one gold edge, alerts carry the crescent, the frame has a thin gold outline, and the panels and offline banner match. Removed the shared rotating countdown edge and alert sheen to keep the rail quiet. The new original alert sound measures -12.5 LUFS and -1.9 dBTP. No new dependency, font ID or link version. The owner reported the horizontal and vertical OBS checks passed and approved merge of #259; logged in OBS-TESTING.md, with OBS version and CPU not recorded.

### Rain City: the sign reflected in a wet street
- **Material and memorable move:** a crescent tube sign whose broken reflection appears in the street below. The sign and its reflection are one motif, not a second skyline decoration.
- **Proposed palette:** wet asphalt `#101A24` (bg), blue shopfront `#1B2B38` (surface), sign white `#F0F4F5` (primary), tube cyan `#71D6D1` (accent), mist white `#E8EFF2` (text), rain grey `#A8BDC8` (muted).
- **Proposed type:** Rajdhani 700 for narrow sign lettering; Archivo for supporting words. **Sound:** a short glass tap with a muted rain-like tail, synthesized without samples.
- **Composition:** landscape puts the title on a left shopfront column, countdown above a low street-level socials strip, and the sign in the right opening. Portrait lifts the sign above the safe zone and fits the shopfront column to its full width; the reflection lives below the words.
  ```text
  Landscape:  logo / title       crescent sign
              subtitle          open street
              countdown / socials / reflection
  Portrait:   sign / [shopfront text + countdown + socials] / reflection
  ```
- **Principles:** one sign; a strong vertical edge; reflections stay under the words. **Motion:** fixed rain layers translate only in Full, Lite removes them, Still also removes entrances. Reflections stay static: no animated masks or filters. **Anti-pattern check:** no synthwave floor, scanlines or glowing panel borders; the sign belongs to a street, distinct from Neon Grid and Vaporwave Sunset.
  - **Built and owner-approved, T11.4 (2026-10-15):** the selected B layout from the board, in `src/themes/rain-city.css`, scoped to Rain City across the kit. Landscape: one-line station lettering on the left (Rajdhani 700, uppercase, the last word in tube cyan), the lit sign panel on the right with an original token-coloured tube crescent, a street line at 72% with the countdown on the left and the socials stacked on the right, and the sign's still reflection in the street. Portrait: the panel and tube above the safe zone, every word right-aligned in it, the street and reflection below. Rain is a masked tile over the sign column only, moved by transform, ended at the kerb by the street layer; Lite, Still, reduced motion, portrait and the camera scenes have none. The tube switches on once (opacity only). After the owner's first look ("it looks ass"), the station got its furniture, all still: a "Platform 1 · Last train home" kicker tag above the title, a route line with stops under the subtitle, a departure board ("Departs in", each countdown character on a split-flap tile), outlined social plates, a still bloom behind the tube in its panel and soft light smears in the wet street. The owner then found the board's crescent off (uneven tips, an inner curve not true to the outer), so the tube is now a true crescent cut from two circles with matching tips, tilted like a hung sign, larger and centred in its panel. Camera scenes keep a small still sign in the header. Chat and alerts carry a cyan left edge, alerts and panels the tube; the frame is a thin cyan line. Original alert sound -13.1 LUFS, -1.4 dBTP. No new dependency, font ID or link version.

### Paper Cut: a crescent cut through layered sheets
- **Material and memorable move:** a crescent-shaped opening through overlapping blue and white paper. Depth comes from the edges of the sheets, not thick borders, tilted stickers or a stack of cards.
- **Proposed palette:** blue paper `#E8EEF4` (bg), white sheet `#FFFFFF` (surface), cut-edge ink `#243550` (primary/text), plum paper `#8540A8` (accent), pencil blue `#536176` (muted).
- **Proposed type:** Quicksand 700 for cut-letter headings; Nunito Sans for supporting words. **Sound:** two soft paper-like taps, synthesized without samples.
- **Composition:** landscape has a stepped paper edge on the left carrying the title, the cut crescent in the right sheet, and countdown/socials on two aligned folds. Portrait makes the title sheet a vertical strip inside the safe zone; the crescent opening sits above it. Camera holes remain transparent and clear of the paper art.
  ```text
  Landscape:  logo / title       cut crescent
              subtitle          open sheet
              countdown         socials
  Portrait:   cut crescent / [title sheet, subtitle, countdown, socials]
  ```
- **Principles:** readable cut edges; generous paper space; plum is one sheet and emphasis. **Motion:** sheets settle once by translation; no ambient loop is needed. Lite keeps that entrance, Still places them immediately. **Anti-pattern check:** no cream/clay pairing, sketch doodles, sticker tilt or manga panels; the material is layered cut paper rather than café stationery or Shonen ink.
  - **Built, T11.5 (2026-10-16), waiting on the owner's OBS check:** the board's B layout in `src/themes/paper-cut.css`, scoped to Paper Cut across the kit. Landscape: a white sheet laid on blue paper; a slanted plum sheet over the top right with a true crescent window (two circles, tilted) cut through to the white; "Starting / soon" in Quicksand 700, centred down the left in ink and plum, with a plum offcut above it; the countdown and socials on a blue sheet laid bottom right. Portrait: the white sheet holds the words inside the safe zone and the plum sheet and its window lie below it. Depth is the sheets' still shadows and paper grain: the plum sheet's soft shadow (blurred once, never animated) falls on the white, and the window is cut from that shadow 10px down and right, so the cut edge throws a thin shadow inside the window. The sheets settle once by translation; nothing loops; Lite and Still place them at once. Camera scenes keep the white sheet and a small plum crescent in the header. Chat messages are white slips with a plum top edge; alerts and panels carry the crescent. Original sound -13.9 LUFS, -1.0 dBTP. The PNG exporter can't embed the shadow layer's mask, so exported panels and banners leave that shadow out. No new dependency, font ID or link version.

### Aurora Tundra: a crescent caught in frost
- **Material and memorable move:** a frost crescent etched into the edge of a low ice shelf. A restrained aurora may sit high behind it; the crescent, not the aurora, identifies the look.
- **Proposed palette:** polar blue `#142D38` (bg), ice shelf `#203E49` (surface), snow white `#EFF8FA` (primary/text), pale aurora `#A7E6D2` (accent), frost grey `#B5CCD1` (muted).
- **Proposed type:** Alegreya 700 in upright display type; Manrope for supporting words. **Sound:** a clear ice-like chime with a short quiet decay, synthesized without samples.
- **Composition:** landscape places the title above a low ice shelf, with countdown at its left end, socials at its right and the crescent cut into the open right edge. Portrait puts the ice/crescent art below the safe zone, with the text column above it. Keep both camera scenes' headers and topic inside the zone.
  ```text
  Landscape:  logo / title                    sky
              subtitle                 frost crescent
              countdown ===== ice shelf ===== socials
  Portrait:   [logo, title, subtitle, countdown, socials] / frost shelf
  ```
- **Principles:** cold open space; one etched crescent; the horizon anchors the information. **Motion:** any aurora layer only translates/fades in Full and is removed in Lite; Still also removes entrances. Frost stays static. **Anti-pattern check:** no pine forest, underwater snow, decorative italic serif or full-frame blend. Compare against Forest Night and Abyss at the board checkpoint.

## Vertical layout (Phase 10)
Overlays for a portrait canvas, from `?canvas=vertical` (STACK.md): `layouts.portrait`, 1080×1920 unless the streamer picks another size, drawn at scale 1 so the type reads at phone size. The look's background and art fill all of it. The portrait layout is its own: moving something on the vertical canvas never moves it on the landscape one.

**Safe zone.** On a phone, TikTok Live and YouTube's vertical live streams draw a header at the top, a column of buttons on the right, and the live comments, gifts and message box over the lower part of the stream (TikTok's comments scroll up the lower left). Neither app publishes the sizes, and third-party guides (all measured on recorded Shorts and TikToks, not live) disagree: TikTok's top 130–240px, bottom 367–660px, right 120–300px; Shorts' top 120–380px, bottom 300–672px, right 96–201px. Overlune's planning box keeps **every word and number inside x 60–940, y 240–1240** (880×1000: 60px left, 140px right, 240px top, 680px bottom, which also clears live comments). Art, motifs, backgrounds and the camera may run to the edges. These are planning numbers, checked on a real phone in a private live test in T10.10 and corrected then; the editor draws them as a faint guide (never in OBS).

**Default portrait layouts.** Built per look from its own parts, like T9.3's measured defaults, then placed for the tall frame:
- Starting Soon, BRB, Ending, Offline: the logo at the top of the safe zone, the title block in its middle (rule, headline, subtitle) in at most three lines across 880px, the countdown card under it, the socials stacked under that. The look's own alignment, type and motif stay; its art is recomposed for the tall frame (a sun, a grid floor or a skyline moves to where it reads in portrait) rather than stretched.
- Live: the camera frame 960×540 at (60, 96), chat 880 wide in the lower half of the safe zone, alerts in its upper third (y 260–700).
- Just Chatting: the header at (60, 270), 880×130; the camera 960×700 at (60, 420); the topic under it at (60, 1135), 880×95 (inset from the zone's edges, since a big title's letters reach past its line).
- Reaction: the reaction box 960×540 at (60, 96), the header at (60, 660), the camera 880×495 at (60, 780); no chat by default, since TikTok and Shorts show their own.
(The camera boxes start from the owner's Tuskilicious kit.)

**Alerts, chat and webcam frame on their own.** Alerts centred in the safe zone's width, in its upper third (y 260–700). Chat 880 wide and 400–900 tall. Webcam frame presets for portrait: 880×495 (16:9), 880×880 (square), 1080×608 (full width, its label inside the safe zone).

**Editor.** A Horizontal / Vertical switch over the preview picks which canvas the preview, Customize and the links use. The vertical preview is 9:16 and can show the safe zone. The links section gives the chosen canvas's links (the vertical ones carry `?canvas=vertical`) and sizes. Every scene of every look offers Vertical, drawn from the shared portrait default until the look gets its own portrait art in the Phase 10 batches (owner, 2026-10-15). The safe zone shows as a faint dashed Signal Cyan box over the vertical preview and canvas. The OBS scene collection stays horizontal.

## Just Chatting and Reaction (Phase 10)
Two more scenes, approved by the owner 2026-10-14 from their kit. Unlike Live they are full-screen scenes in the look (its background, art and type), with the camera showing through a hole: the `camera` element, edged by the look's webcam-frame border, with an entrance and a reduced-motion version like the frame's.
- **Just Chatting:** a header ("Just chatting", editable), a "Talking about" line with the streamer's topic (editable in the editor and, later, from the dock), the camera large.
- **Reaction:** a header, a reaction box outlined in the look's accent where the streamer places the video they react to (in OBS, under the overlay), the camera smaller, and chat.
Both are canvas layouts from the start, so every part moves, resizes and can be removed; Put back returns a removed part ("Reaction box" for the video's hole). Landscape defaults: Just Chatting's camera 1280×720 at (64, 180) with the header and topic to its right; Reaction's box 1344×756 at (64, 64), the camera 416×312 and chat down the right, the header under the box. The frame's name label isn't shown on these cameras: it sits on the edge, where the hole would cut it. In the editor, "Scene to edit" lists six scenes, three to a row, and Just Chatting's subtitle field reads "Talking about (your topic)". Their links are extras, after Live.

## Overlay layout rules
- Canvas is always 1920×1080. Keep a 64px safe margin on scenes.
- Chat default size is 400×600, transparent background, bottom-up.
- Alerts render centered-top by default, with no background outside the alert box.
- Error states use the theme's surface and text colors, stay readable, and never flash.

### The overlay playbook (owner, 2026-10-15)
The owner's lessons from building an OBS pack, adopted for every overlay change. Overlune already met most of them:
- motion tiers that drop whole layers (Full, Lite, Still);
- a countdown that redraws once a second and only while shown;
- paused animations when OBS hides a source;
- a first-in, first-out alert queue holding 5 seconds by default;
- every colour a theme token, and bad link settings falling back.

The rules every change keeps:
- **Animate transform and opacity only.** No animated `filter`, shadows, masks or blend modes. Each repaints every frame in OBS. The entrances lost their blur for this, Vaporwave's sun stripes stopped sliding, and Session's grain lost its multiply blend.
- **No full-frame blend modes on looping layers.**
- **Decorations are built once** (CSS backgrounds and pseudo-elements), never re-rendered.
- **Motion stays off the gameplay area:** on frames, edges and full-screen scenes.
- **Clear of the platform's controls:** the player bar and corners in landscape, and the safe zone in portrait.
- **Vertical is its own layout,** never a crop.
- **Long names wrap or shrink;** columns never squash.
- **Every timer and listener is cleaned up.**
- **OBS's page events are used:** a hidden source pauses, and a full-screen scene's entrance replays when its source goes on air (`obsSourceActiveChanged`; chat, alerts and Live don't remount).

Not adopted, because they don't fit a hosted overlay whose settings live in the link:
- single-file zip builds and backup folders;
- a dock talking to the overlays over BroadcastChannel;
- API keys in builds (Overlune has none, and tokens never go in links).

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
- **Offline (T6.147):** each look's full layout, like Stream Ending, with its own title and subtitle.

**Layout v2, the default (T6.107):**
**Scenes (layout v2, T6.107, after the maintainer's broadcast kits):** 88px top / 112px side / 72px bottom margins (inside the 64px safe margin). Logo top left (160px max). On the left, anchored to the bottom: a 96×8px accent rule, then a two-tone display headline (184px, -0.04em tracking, 0.94 leading, balanced, so "Starting soon" sets on two lines) whose last word takes the accent color, then the subtitle (40px, 30ch max). It shrinks to fit per T6.26 and fits again when the countdown widens as it ticks (T6.52). On the right, also bottom-anchored, one column (480px min): the countdown card (96px digits on one line, in the text color, so the accent stays with the headline) over the socials as a list, each an accent-tinted 72px icon tile with the platform name (small tracked caps) over the handle (36px bold). The open sky above both columns is where each theme's motif lives.

- **Alerts:** still centered at the top. A wider card (760-1100px) with a 6px accent band, an uppercase event label ("Raid", "New subscriber", "Resub", "Gift subs", "Cheer"), then the streamer's message at 56px; resub and cheer text below in the muted color.
- **Chat:** one panel instead of a card per message: no borders between cards, hairline separators, only the top and bottom of the stack rounded. Badges are small square-cornered tags tinted with the accent.

## Canvas editor (Phase 9)
The canvas follows the editor's chrome (tokens, focus rings, one filled button) and the kits' docks: everything visible, nothing hidden behind a mode.
- **Where:** "Customize" on the scene preview opens the canvas in its place; "Done" returns. The section list, the form and the links stay; the form still edits words (title, countdown, socials), the canvas edits places and styles.
- **Canvas:** the scene at its real size, scaled to fit, on a checkerboard so see-through areas read. Zoom to fit, 50%, 100% and 200%, and space-drag to pan.
- **Selection:** a 1px Lune Violet outline with eight square handles and a rotation handle above; the element's name in a small tag, as the preview's click-to-select (T6.135). Shift adds to the selection; Escape clears it.
- **Guides:** snapping to the canvas's edges and centre, other elements' edges and centres, and the safe zone (Phase 10), shown as 1px Signal Cyan lines while dragging, with the distance between neighbours. Alt drags without snapping. Moves stop at the canvas's edges (dragging and the arrow keys; a part already hanging off from an older layout can come back but not go further out). "Show safe areas and thirds" draws action safe (5% in), title safe (10% in) and the thirds in landscape, and the thirds over the safe zone in portrait (the owner's overlay playbook, 2026-10-15).
- **Keyboard:** Tab and Shift+Tab move through elements in layer order; arrows nudge 1px (Shift: 10px); Alt+arrows resize; Delete removes; Ctrl/Cmd+D duplicates; Ctrl/Cmd+Z and Shift+Z undo and redo (the editor's existing history); [ and ] move down and up a layer.
- **Layers panel (T9.5):** the element list, top layer first; each row has its name (the streamer's, renamable in the inspector, or the type's) as a select button (Shift adds), Hide and Lock toggles (`aria-pressed`, named "Hide Title"), and Up and Down where there's somewhere to go (no disabled buttons). A list of plain buttons rather than a listbox, so every control is a Tab stop with its own name; [ and ] on the canvas move the selection down and up a layer.
- **Inspector (T9.5):** the name in Layers, then X, Y, Width, Height and Turn as number fields, opacity as the editor's slider, then the type's own style: words and font (added text), size (empty keeps the look's), colour (the look's colours by name first, then your own from the native picker), alignment, the picture link and fit (images), and shape, fill, outline and corner radius (shapes). Edits merge into one undo step per burst, as typing does.
- **Add:** a menu of element types with their line icons; a new element lands in the centre of the view, selected.
- **Accessibility:** every canvas action is also possible from the layers panel and the inspector, so the canvas itself is a pointer convenience (like click-to-select), and the editor still passes axe and a keyboard-only run-through. Reduced motion turns off the canvas's own transitions.

**Live (T9.7):** "Live source" in the preview bar switches the preview to the Live overlay (`/o/live`): chat, alerts and the webcam frame on one see-through 1920×1080 canvas, each today's overlay sized to its box, plus any added text, pictures and shapes. Before it's customized: the frame bottom left, chat down the right, alerts across the top. In the editor its chat shows the sample messages and Test alert plays in its alerts box; Customize edits Live's own layout, and "Put back the Chat" (or Alerts, Webcam frame) returns a removed one to its default place. Labels (latest follower and the like) come with Phase 13's data.

**Canvas size (T9.8):** a select in the preview bar, where the fixed "1920 × 1080" chip was, named "Canvas size" for screen readers (the bar has no room for a visible label): 1920 × 1080, 1280 × 720, 2560 × 1440, 3840 × 2160 (4K), or "Another size…", which opens Canvas width and Canvas height with "Use this size". The hint points to OBS's Settings → Video → Base (Canvas) Resolution, and a size outside 320–3840 or past 3:1 says why instead. It applies to the four scenes and Live, their link rows and the scene collection; the layouts move onto the new size in one undo step. Portrait gets its own layout in Phase 10, so no portrait preset here.

**Keyboard and screen readers (T9.9):** Customize moves focus into the canvas; Done and Reset to the look move it back to Customize, so focus never drops to the top of the page. The canvas's status line (what's picked, where, how big) is read by screen readers, not shown. "Keyboard keys", folded under the panels, lists every key for people who don't use a screen reader; the setup guide's "Make it yours" part repeats them from the same list (`canvasKeys`). Turning by keyboard is the Inspector's Turn box.

## On a phone (2.1)
Overlune is made on a computer, where OBS runs. On a phone (a narrow touch screen; a narrow window on a computer doesn't count), every site page shows a card at the foot of the screen: "Overlune is made for your computer", why in one line, "Send me the link" (the phone's share sheet, or a copied link, of the editor without any save), and that the Overlune app for Android is coming. "Got it" closes it for good in that browser. It follows light and dark mode, never shows on an overlay, and is axe clean. When the app is out (Phase 14), its line becomes a link to the Play Store.

## Light mode (2.1)
The site (home page, editor, guide, legal pages and not-found page) has a light mode as well as its night one. A sun or moon button in the nav switches it; until it's pressed the site follows the system's setting, and a pick is kept in the browser's local storage (`src/lib/site-theme.ts`, never in a link). Overlays and their previews never change: they're in their look's own colors.
- **The palette is the brand, flipped.** Page `#F6F4FD`, cards `#FFFFFF`, ink `#16123A`, muted `#574F86`, violet `#7B3FE4` (deeper than Lune Violet, for AA contrast on light), cyan `#0B6C85`, borders `#D9D4F0`. The home page swaps its Tailwind color variables under `:root[data-site-theme="light"]`, so every utility follows; the editor's pages use `brandChromeLight` (`brand.ts`).
- **Windows onto the night stay night.** The hero card, the violet looks section and the closing panel keep the dark tokens (`.site-dark`), with their buttons. The looks section fades into the page's own color below it.
- **Details:** the white wordmark is inverted to ink, with a hue turn that keeps its violet crescent; the nav is daylight glass; the editor pages' stars give way to a faint violet glow; hairlines follow the text color instead of fixed white; the promise's words start at 55% in light (3:1 for large text) instead of 40%.
- Every page is axe clean in both modes, at 390 and 1440px (`tests/e2e/footer.spec.ts`).

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
- **Guide:** a row of index chips that jump to each part, and a "Before your first stream" run-through with check boxes drawn in the accent. Since T8.2 the guide is centred under the site nav and as wide as it: from 1024px the index is a sticky column on the left that marks the part you're reading (Moonlight text and a Lune Violet dot, `aria-current="location"`, the last of its headings above 40% of the window); narrower, it stays the row of chips; on phones the steps run full width with their number above them. The privacy and terms pages (T8.3) share that layout, with an index built from their own headings in `docs/legal/*.md` (ids from the heading text); it shows only from 1024px, since fourteen chips would push the text off a phone's first screen.
- Copy: success messages end with a full stop, not an exclamation mark.
- **First-visit gallery (T8.4):** a hero-style opening, the "Pick a look to start" heading large and centred over a soft violet glow (behind the heading, not the text under it), the intro centred under it. Its look cards are cards: Deep Space with a faint edge, and under the pointer or keyboard focus a Lune Violet edge with the home page's soft violet glow, the only glow in the editor. The save box takes the site nav's faint edge and 16px corners.

### Site shell (T8.1, every page)
Every page but the overlays shares one shell: the nav at the top, the night-sky ground under it, and the footer at the end. One component each, never a copy per page; the home page uses the same nav and footer.
- **Nav:** `components/SiteNav.tsx`, the floating pill: logo, Overlays, Looks, How it works, Setup guide, and "Open the editor" (the editor puts the account there instead). Fixed on the home page, sticky on the guide, legal pages and 404, and full-width and in the flow in the editor (its preview column is sticky itself). From other pages the section links go to `/#kit`, `/#looks` and `/#how`; the page you're on is underlined (`aria-current`). The section links show from 960px; narrower, only the logo and button (T8.6), so they never break onto two lines (the nav e2e checks 960px on every page). On the home page it also marks the section in view (below).
- **Night sky (`.site-sky`):** every page but the home page, whose hero has its own sky: a few static stars and a soft violet glow at the top, never behind body text.
- **Footer (T6.148):** link groups (Make, Project, Legal, Contact) over a large outlined "Overlune" wordmark, after 21st.dev's "Footer with Minimal Outline" (layout only). The wordmark is `aria-hidden`, filled with the page background over a 2px stroke so only its outer edge shows. Layout in `src/components/site-footer.css`; each page sets `--footer-mark-stroke` and `--footer-mark-fill`.
- **Checked together (T8.6):** every page at 1440, 1024, 768 and 390px, and one axe pass over all of them at 390 and 1440px (`tests/e2e/footer.spec.ts`).

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
| Save bar | "Your link is your save file." with Copy my save link, Load my overlay from a link, Undo, Redo and Start over; once something is made, a "Saved in your link" status (Haze text, accent check) leads the buttons | Undo shows only with something to undo, Redo only with something to redo (no disabled buttons); "Undone." and "Redone." in the status line | Undo (T6.115) and Redo (T6.135) keep 50 steps; a burst of typing is one step and a new edit clears Redo. Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or Ctrl+Y redoes, outside text fields only. |
| Preview bar | Over the scene preview: "Preview: <scene>", a static "1920 × 1080" chip (Haze outline and text) and Test alert at the end (outline button with a Lune Violet edge) | Test alert: hover, focus-visible ring | Each press plays the next sample alert over the scene (raid, sub, resub, gift sub, bits), with its sound and on-stream duration, through `useTestAlerts`, the same samples and queue as the ?test=1 link and the alert preview (T6.135). |
| Click-to-select | Over the scene preview: the part under the pointer (logo, title, subtitle, countdown, socials, ticker, a playing alert) gets a 2px Haze outline and a Lune Violet name tag with Night text above it (inside the part near the top edge) | hover (outline and tag, pointer cursor), gliding from one part to the next (GSAP, 0.18s, T6.137); none otherwise | A click jumps to that part's settings, like the section list. A mouse shortcut only: the preview stays inert and hidden from screen readers, and the section list and form reach every setting by keyboard (T6.135). |
| Section list | Wide windows only: a line icon and the name for each section; the current one a Deep Space pill with Lune Violet text (4.9:1, `aria-current="location"`); a check after a part that's filled in; "Collapse menu" at its foot | hover (Moonlight text), current, folded: icons only, names kept for screen readers and as tooltips, the check on the icon's corner; focus-visible ring | Folds from 172px to 56px with a 220ms slide (none under reduced motion); the preview grows into the room. The names fade and slide out before it folds and back in, one after another, once it opens (GSAP, T6.137); the icons sit 19px in either way, so they never move. The folded choice is remembered in this browser only (T6.135). |
| Looks filmstrip | The look picker from 1200px, under the scene preview: every look as a still Starting Soon thumbnail with its name, in one radio group, with the Look filters; Previous and Next at the end of its bar; no scrollbar, a faded edge where more looks are | hover, checked: a 2px Lune Violet ring; focus-visible ring; arrow keys move the look; the strip itself takes focus and scrolls with the arrow keys; Previous/Next `aria-disabled` at an end | Picking one restyles every scene. A filter makes the looks glide to their new places and the returning ones fade in (GSAP Flip, T6.137). Previous and Next scroll by one card (smooth only without reduced motion); scrolls sideways and snaps. The menu's Look and the form's Change look focus its checked look (T6.135). |
| Current look line | From 1200px, the first line of the settings column: "Look: <name>" (Haze, the name in Moonlight) and a Change look button at its end | Change look: hover, focus-visible ring | Stands in for step 1 there, so the column isn't headless; no second grid. From 1200px the step headings drop their numbers ("Add your details", "Links to paste into OBS"); the steps bar below 1200px keeps them (T6.135). |
| Disclosure | Native `<details>`/`<summary>`, bold summary, closed by default. The content sits in one `.editor-disclosure` wrapper whose grid row opens from 0fr to 1fr in 220ms (`::details-content` keeps closed content laid out, Chrome 131+; other browsers open at once) | open, closed (native); while closed the content is `visibility: hidden`, so it never takes focus or reaches screen readers; reduced motion opens at once | For rarely changed settings ("More chat options", "Advanced: colors and fonts") and the OBS steps by the links (T6.135). Never hide a setting a beginner needs to finish. |
| Look filters | Pills on the look picker: All, Calm, Retro, Bold (`aria-pressed`); each look is in one group | pressed (Lune Violet fill) | Filtered-out looks are hidden, not removed (T6.60). One filter state, shared by the filmstrip and the grid (T6.135). |
| Look card | The theme's real Starting Soon scene with sample content (a subtitle, a countdown a day away and two `yourname` socials, `src/editor/scene-samples.ts`), held still, plus its name. Gallery: `<button>`, 4 across (2 at 800px and below). Editor, below 1200px: radio, 3 across, as step 1 "Pick a look" in the form (from 1200px the filmstrip is the picker instead, and this grid is `display: none`, so only one picker is ever on screen or in the tab order, T6.135) | hover (Haze border), selected (Lune Violet border via `:has(:checked)`), focus-visible | Card scenes never animate (`editor-shot`), so a gallery of every look stays light. |
| Link row | The name with Width and Height as chips (the dots stay in the text for screen readers and the guide's size table), a faint raw link (48ch max, still selectable), the filled Copy button | copied ("✓ Copied"), stale ("Changed since you copied it"), copy failed ("Press Ctrl+C") | The copy status is a `role="status"` that stays in the DOM. |
| Steps bar | Sticky `<nav aria-label="Steps">` with three links | current step: accent, 3px underline, `aria-current="step"` | Jumps scroll and move focus; they never change the address, which holds the settings. |
| Preview | Scaled overlay in a 16:9 (or chat-sized) box | — | `aria-hidden` and `inert`, because it repeats the form. Sticky column above 800px, and never taller than fits under the header, so the scene's title (at the bottom of the frame) is in view on a 768px-tall laptop (T6.49); docked "Show preview" bar at 800px and below. |
| Callout | Deep Space box with a faint violet outline all the way round (`--callout-edge`: Lune Violet mixed 45% into Deep Space, 1px) and the usual 12px corners. No thick bar down one side (T6.53) | — | Save reminder, "You're set" line, legal disclaimer. One per region. |

- **Responsive:** from 1200px, a three-column shell (T6.60): the section list on the left (Look, Text, Socials, Chat, Alerts, Webcam frame, Channel page, Logo, Motion, Colors, Links; 172px wide, or 56px folded to icons, T6.135; the section in view marked with `aria-current="location"`), the live preview in the middle (sticky; it shows the chat or alert preview while those sections are in view) with the looks filmstrip under it as the only look picker, and the settings on the right (340–400px), starting with the current look line, with the links at their end. Below 1200px the form's card grid is the look picker instead (T6.135). 801–1199px: a 300–400px form column beside the previews, with the steps bar; the links end the form column, so the sticky preview never covers them (T6.66). 800px and below: one column, docked preview, gallery 2 across. The editor is for desktop windows, often squeezed next to OBS; there is no mobile editor (PRD).
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
- **Icons, buttons and the toggle from 21st.dev (2.1, picked by the owner 2026-10-14; no Lucide), each ported as behavior in our own CSS, no new dependency:**
  - **Icons:** Overlune's own 12px line icons (`Icon`), drawn in parts so each moves the way what it shows would, like Skiper UI's "Animated Icon Buttons", when what it's in is pointed at: the tick and the picture's hills draw themselves, the copy sheets fan apart, arrows go out and come back from the other side, the expand corners spread, the disc turns over, the text lines write in, the person nods, the chat bubble types, the bell rings with its clapper swinging back, the lens zooms, the panels pop up in turn, the waves flow, the swatches swap, the chain pulls apart, the chevrons step; pressed, they press in (`icon.css`).
  - **Buttons:** after Magic UI's "Interactive Hover Button" (MIT): on hover a dot near the left edge swells to fill the button and the label turns to the page color, drawn as a growing circular gradient so the button keeps its own position and size (`site-buttons.css`). Every plain button in the editor and guide, and the home page's pills; not the look cards, frame placer, swatches, layer rows, the toggle, or the shimmer and glow buttons.
  - **Light/dark toggle:** after luv-jeri's "Theme Toggle": a pill with a sun whose rays draw in while a bite slides over the disc to make the moon (and back), with "Light" or "Dark" beside it (the icon alone on phones); the new mode spreads over the page in a circle from the button through the View Transitions API, or just switches without it or with reduced motion.
  - **Switches** spring and stretch (after micka_design's "Switch"), and **choice pills** get a gliding hover highlight (after micka_design's "Segmented Tabs").
  - All of it keeps still with reduced motion.
- **Site buttons (2.0 polish, `src/components/site-buttons.css`):** the home page, nav and not-found page use two, ported from 21st.dev as CSS in the brand colors (behavior only, no dependency). `.btn-shimmer` for the main action, after Magic UI's "Shimmer Button" (MIT): a violet pill with a white spark circling its edge and an inner glow that deepens on hover and press; `.btn-light` makes it moonlight with a violet spark on the violet looks section. `.btn-glow` for the second action, after "Hover Border Gradient": a night pill with a moonlight spark round a thin edge, the edge and fill lighting violet on hover. Both keep still with reduced motion (the edge stays lit). The editor's form buttons stay plain controls.
- Errors say what happened and what to do: "No picture loaded from this link. Check that it opens an image in your browser, not a web page."
- Say "free" and "no account" plainly. No unmeasured claims and no promised setup times (the owner dropped "under 10 minutes" as unrealistic, 2026-10-02).

### Anti-patterns
- Don't add a second filled button style or a new accent color; use outline buttons.
- Don't use `innerHTML` or `dangerouslySetInnerHTML` anywhere, including the legal pages (they go through `src/lib/markdown.ts`).
- Don't animate look cards or put video in the chrome.
- Don't hide a live region with `display: none`, and don't show state with color alone.
- Don't add fonts, sounds or images to the chrome without recording them in `docs/ASSETS.md`.
- Don't mark a box with a thick colored bar down one side; use the callout outline (T6.53).

### Outside components (T6.136)
- Component galleries such as 21st.dev are a reference for the editor chrome and the landing page only, never for overlays (an e2e guard in `tests/e2e/smoke.spec.ts` fails if an overlay loads an animation or UI-kit package other than GSAP through `src/lib/motion.ts`).
- Port the behavior into our own markup and CSS, with native form semantics and the brand tokens, as T6.135 did. Copy code only when the component states a license that allows it, and record its source and license in `docs/ASSETS.md`. Add no dependency without the owner's approval (STACK.md).
- Hosted AI generation stays off (CLAUDE.md: no AI in v1).

### Landing page (`/`)
- The one page built with Tailwind (STACK.md); its motion is GSAP through `animate()` in `src/lib/motion.ts` (T6.137). It uses the same brand tokens, exposed as Tailwind colors (`night`, `deep`, `moon`, `haze`, `violet`, …) and fonts (`font-heading`, `font-body`) in `src/landing/landing.css`.
- Images are real Overlune scenes rendered live (the editor's `Preview`) with the same sample content as the look cards, never stock photos. Only the hero moves; the rest are held still (`landing-still`).
- **Hero (T6.59):** the whole kit. A live scene in a 16:9 stream frame with a small Signal Cyan LIVE badge, two real alert cards in the same look (over the frame's empty top-left on wide screens, under it on phones), and the four scene names with the current one filled (Offline since T6.148). It tours a look and a scene every 4.5 seconds. A "Pause the looks" button stops the tour and holds the scene still (WCAG 2.2.2); with reduced motion it starts paused on Vaporwave Sunset. Under the buttons, a fact row: the number of looks (counted from `themeIds`, never typed in), Scenes, chat and alerts, One link per overlay, Free, no account. Since T6.124 the hero is one big rounded card that, on wide windows with motion, zooms out into a drifting collage of every look as you scroll.
- **Night sky (T6.59):** CSS only, static: a few small stars, a soft violet arc and a crescent moon behind the hero. No image files.
- **Glow (T6.59, T6.124):** the hero frame's edge (Lune Violet to Signal Cyan) with a soft glow, the hero's primary button with a matching glow, and the closing call to action, a panel lit by violet radial light. Soft radial light also sits behind the page, never behind body text (BRAND.md). No other card or button glows.
- **Looks (T6.124):** the looks rise on a violet curve as a list (name and one line each) beside one big live preview that follows hover, focus and the row in the middle of the window, with scene buttons, full screen and "Use this look". Narrow windows get a picture per look.
- **Overlay cards (T6.59, T6.102, T6.124, T6.148):** "Seven overlays in every look": Starting Soon, Be Right Back, Stream Ending, Offline, Chat, Webcam frame and Alerts, tall cards that fill with violet from the pointer. On wide windows they sit in two tiers on one 12-column grid, after 21st.dev's bento galleries: the four scenes in a row (two a row below 1280px), then the three overlays that sit over the game in wider cards. Between 640 and 1023px it's two columns, and Alerts takes the last row as a letterbox. Under the mouse each thumbnail shows a round magnifier with a 2x copy of the overlay (after 21st.dev's "Magnified Bento", ported without its Framer Motion): the copy is built only while the pointer is over that card, and touch screens skip it. Each is a live thumbnail that opens its part of the editor (`/editor?part=starting|brb|ending|offline|chat|frame|alerts`; a first visit picks a look first).
- **How it works (T6.148):** three numbered stops on one line, after 21st.dev's "How It Works Steps" (behavior only). On wide windows a 2px line runs from the first stop's center to the last's and draws Lune Violet to Signal Cyan as the steps scroll in, each stop filling violet as the line reaches it (a CSS scroll timeline on the list; the line is transform only). Without scroll timelines, or with reduced motion, it shows the finished state. Phones stack the steps with no line.
- **Home page fixes (T8.5):** the hero's two alerts sit side by side just above the frame's top-left (in the card's empty sky), never over the scene's title; the fact row is four facts in two columns at every width ("One link per overlay" was dropped: the paragraph above says it); the Chat, Webcam frame and Alerts cards show their overlay over the stage's "your game" dusk backdrop; the stage section ends tighter, so no empty band sits above the looks' curve. The ruler is quieter: 2.75rem wide, its numbers and section name dim until the pointer is on it.
- **Ruler (T6.148):** on wide windows with a mouse the page's scrollbar is a ruler, after getartcraft.com's (no code from it): a frosted strip on the right edge whose ticks are fixed to the page (one per 56px, a number every fifth) so it scrolls past like a measuring tape, and a Signal Cyan marker that rides down it with the share read and the current section's name. Click or drag on it to move; the keyboard and wheel scroll as always. It's `role="scrollbar"` with `aria-valuenow`, and the browser's scrollbar is hidden only while it's there (`html[data-ruler]`). Touch screens and narrow windows keep the browser's own. It follows the scroll directly and never animates on its own.
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
- [ ] Checked at 1366×768 and at 600px wide; long text wraps or truncates as described. Site-wide changes (the shell, a new page): at 1440, 1024, 768 and 390px, with the browser painting live (a background preview pane freezes GSAP mid-reveal).
- [ ] axe stays clean in e2e, and `tests/unit/editor/contrast.test.ts` covers any new color pair.
