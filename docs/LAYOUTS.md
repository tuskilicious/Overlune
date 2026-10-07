# Look layouts (T6.134)

Every look gets its own scene composition (owner, 2026-10-07; DESIGN.md "Scene layout"). The plan follows the design handoff's method: a concept, one memorable move, a sketch, three principles, then a check against DESIGN.md's anti-patterns. Its three mockup boards are the source of layout ideas, reinterpreted in each look's own world rather than copied: **Bold** (Swiss frame: flat blocks, a full-width bottom bar, one large accent block, left aligned), **Calm** (one continuous shelf of cells split by hairlines) and **Retro** (a teletext page: one column of colored row bands).

Applies to everything `SceneFrame` draws: Starting Soon, Be Right Back, Stream Ending and the offline banner. Chat, alerts, the webcam frame and the panels keep their current shapes.

## Rules for every layout
- CSS only, keyed on `data-theme`, on the same markup: logo, headline, subtitle, then `.scene-side` with the countdown (Starting Soon only) and the socials, then the ticker. `.scene-side` can become `display: contents` so the countdown and the socials sit apart.
- No countdown (BRB, Stream Ending, the offline banner): the layout still reads as finished. Style it with `.scene-main:has(.countdown)` (OBS 31+, Chromium 127).
- Palettes, fonts, effects and motion stay as they are, except where a layout needs the motif somewhere else.
- The longest allowed text, three socials, a logo and the ticker all fit in 1920×1080 (scene-fit e2e), and the scene reads at 640×360.
- Every loop stops in Lite and Still; entrances keep the motion grammar (T6.117).
- "Contrast as rendered" holds for every new placement.

Sketches are 1920×1080: `T` headline, `s` subtitle, `C` countdown, `@` socials, `L` logo, `*` the motif.

## 1. Clean Slate: the shelf (Calm board)
The quiet baseline, now with one object. Everything the viewer needs sits on a single shelf along the bottom; the headline stands above it.
```
L
T T T T T T
T T T T
+-----------------------------------------------+
| s s s s s    |  C C C C   |  @ handle @ handle |
+-----------------------------------------------+
```
- Memorable move: one continuous surface shelf, cells split by hairlines.
- Principles: one object, hairlines not boxes, left aligned.
- Without a countdown the shelf has two cells: subtitle and socials.
- Anti-patterns: none hit; one panel, no shadow stack.

## 2. Neon Grid: the sign over the vanishing point
The grid converges to the center, so the composition does too: a neon sign hung over the horizon.
```
L                     *
            T T T T T T T T
               s s s s s
               [  C C C  ]
        @ handle        @ handle
==================horizon==================
```
- Memorable move: symmetry with the grid's vanishing point; the countdown as a lit sign.
- Principles: centered on the vanishing point, everything above the horizon, glow only on the sign.
- Anti-patterns: neon with a grid is this look's concept (written in its header); centered by concept (perspective).

## 3. Cozy Café: the menu card
A café window: the shop sign on the left, a menu card on the right with the socials listed like the day's specials, dot leaders and all.
```
L                         +-----------------+
                          |    C C C C      |
T T T T T                 |  -------------  |
T T T                     | Twitch .. handle|
s s s s                   | YouTube . handle|
                          +-----------------+
```
- Memorable move: the menu card with dot leaders from platform to handle.
- Principles: warm paper card, the sign on the left, steam rises in the gap.
- Without a countdown the card holds the socials only.
- Anti-patterns: rounded card is one card, not a grid of them.

## 4. Arcade 8-Bit: the attract screen and high-score table
An arcade cabinet waiting for a coin: centered title, the countdown blinking under it, the socials as a high-score table in colored row bands (the Retro board's rows).
```
              T T T T T T T
                s s s s
              >  C C C C  <
          1ST  TWITCH   handle
          2ND  YOUTUBE  handle
```
- Memorable move: the socials as a high-score table, one colored band per row.
- Principles: centered like an attract screen, pixel grid sizes, stepped motion.
- Anti-patterns: centered by concept (attract screens are); caps are native to the pixel font.

## 5. Pastel Cloud: the floating card
A soft centered stack resting on a cloud (the handoff's centered stack).
```
                *   *
             T T T T T T
                s s s
            ( C C C C C )
          (@ handle)(@ handle)
```
- Memorable move: the socials as soft pills side by side under a pill countdown.
- Principles: centered and airy, rounded pills, clouds drift around the stack.
- Anti-patterns: centered by concept (floating); pills are the look's one shape.

## 6. Forest Night: under the moon
The moon becomes the anchor. The headline hangs right-aligned under it; the countdown and socials sit low on the left along the treeline like a trail sign.
```
                                         (moon)
                                    T T T T T
                                        T T T
                                    s s s s s
C C C C   @ handle  @ handle
^^^^^^^^^^^^^^^^treeline^^^^^^^^^^^^^^^^^^^^^^
```
- Memorable move: the moon and the right-aligned headline read as one group.
- Principles: right-aligned under the moon, info low on the left, fireflies in the open middle.
- Anti-patterns: none hit.

## 7. Bold Esports: the broadcast bar (Bold board)
A broadcast graphic: the poster headline across the top, and a full-width bar along the bottom with the countdown in a large accent slab and the socials beside it.
```
L
T T T T T T T T T T T
T T T T T T T
s s s s s
[//// C C C C ////]  @ handle   @ handle
```
- Memorable move: the angled red countdown slab at the left of the bar.
- Principles: flat blocks, the bar spans the stream, one accent block.
- Without a countdown the bar holds the socials only.
- Anti-patterns: hard-edged blocks are its concept (angles, not stickers); no tilt or offset shadow.

## 8. Vaporwave Sunset: the horizon (and now animated)
The classic synthwave frame, built around the sun: the sun centered behind the scene, palms framing both sides, the chrome title under the sun on the purple sky, and the info on the horizon.
```
                 (  sun  )
    palm         T T T T T          palm
                   s s s
         [ C C C C ]  @ handle  @ handle
================= horizon grid =================
```
- Memorable move: the chrome title centered under a striped sun.
- Animation: the sun's stripes slide down, a grid floor scrolls toward the viewer, palms sway, and the sun glows; all CSS, all stopped in Lite and Still.
- Principles: symmetric around the sun, text only on the purple sky, motion only in the scenery.
- Anti-patterns: neon, a grid and a gradient are this look's concept (written in its header).

## 9. Daylight: the poster colophon
A Swiss poster: the headline flush left and very large, the vermilion disc overlapping its corner, and the information set as a three-column colophon under hairline rules.
```
T T T T T T T T                  (disc)
T T T T T T
_______________ _______________ _______________
s s s s s       C C C C         @ handle
                                @ handle
```
- Memorable move: three ruled columns, set like a poster's small print, under giant type.
- Principles: flush left, hairline rules not boxes, the disc is the only color.
- Without a countdown the colophon has two columns.
- Anti-patterns: vermilion on light paper, not near-black; one accent.

## 10. Abyss: the depth gauge
A dive. A depth scale runs down the right edge; the headline floats in the middle of the water where the light reaches; the countdown reads like an instrument under it.
```
                                            -| 
          T T T T T T T T                   -|
               s s s s                      -|
          ---- C C C C ----                 -|
          @ handle   @ handle               -|
```
- Memorable move: the depth scale along the right edge.
- Principles: centered in the water column, hairline seams, light only on living things.
- Anti-patterns: centered by concept (suspended in water).

## 11. Session: the title card
A jazz-anime title card: huge ink type stacked at the top left, the brick and teal bars cutting under it, and the information in a cream box at the bottom right like an episode card.
```
T T T T T T
T T T T            /teal bar/
s s s s s    /brick/
                         +----------------+
@ handle  @ handle       |  C C C C       |
                         +----------------+
```
- Memorable move: the headline at the top, bars underneath, like the opening frame.
- Principles: text only on mustard or cream, hard edges, cut-on-the-beat wipes.
- Anti-patterns: thick outlines are the look's print concept (ink lines), not a shortcut.

## 12. Shonen: the manga page
A full manga page split into panels by inked gutters: a big slanted panel for the headline, and two stacked panels on the right for the countdown and the socials.
```
+---------------------------+  +-----------+
| T T T T T T              /   |  C C C C  |
| T T T T                 /    +-----------+
| s s s s s              /     | @ handle  |
+-----------------------+      +-----------+
```
- Memorable move: the slanted gutter splitting the page.
- Principles: ink borders, white gutters, speed lines inside the big panel.
- Without a countdown the right column is one socials panel.
- Anti-patterns: thick borders are manga ink (concept).

## 13. Sakura: the hanging scroll
A tall paper scroll hangs on the right like a kakejiku; the headline, countdown and socials are written down it. The left is open night with the lantern and petals.
```
   (lantern)                     +------+
                                 | T T  |
       petals                    | T T  |
                                 |  s   |
                                 |  C   |
                                 |  @   |
                                 +------+
```
- Memorable move: the hanging scroll, one tall panel with a brush rule at the top.
- Principles: vertical, quiet, the open sky carries the petals.
- Anti-patterns: none hit; one panel.

## 14. Skate Deck: the sticker wall
The deck wall: the headline as sticker lettering across the bottom, the countdown and socials as die-cut stickers slapped on at angles above it, near the deck.
```
                                      [deck]
                 [C C C]  (tilted)
                     [@ handle] (tilted)
T T T T T T T T T T T T T T
s s s s
```
- Memorable move: tilted die-cut stickers.
- Principles: stickers overlap a little, one tilt each, the headline stays straight.
- Anti-patterns: tilt is this look's concept (stickers on a deck wall), written in its header.

## 15. Phosphor: the terminal window
The whole scene is one terminal session: a window frame with a title bar, the boot log at the top, the headline as the prompt line, the countdown as `T-minus`, the socials as a listing.
```
+-[ overlune ~ tty1 ]----------------------------+
| > boot log ...                                  |
| $ T T T T T T T T _                             |
|   s s s s s                                     |
|   T-minus C C C C                               |
|   @ handle    @ handle                          |
+-------------------------------------------------+
```
- Memorable move: one full-screen terminal window, the headline typed at the prompt.
- Principles: monospace grid, left aligned, one ink in three strengths.
- Anti-patterns: monospace is the concept (a terminal), window chrome too.

## 16. Quest: the quest log
A fantasy RPG's quest log: one tall parchment panel on the left holding the quest title, its description, the time until it begins and the socials; the dark hall and its embers fill the right.
```
+==============+
| T T T T T    |
| s s s s      |                 embers
|--------------|
| C C C C      |
| @ handle     |
+==============+
```
- Memorable move: one gilt-framed quest log holding everything.
- Principles: parchment carries the text, the hall stays open, gilt lines not boxes.
- Anti-patterns: a framed panel is the RPG concept, one panel only.

## Order
One commit per look, in this order, each checked at 1920×1080, 1280×720 and 640×360 against the screenshots from before: Clean Slate, Bold Esports, Arcade 8-Bit (the three handoff boards first), then Neon Grid, Vaporwave Sunset (with its animation), Daylight, Phosphor, Shonen, Session, Skate Deck, Cozy Café, Pastel Cloud, Forest Night, Abyss, Sakura, Quest.
