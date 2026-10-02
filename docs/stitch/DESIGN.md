# Design System: Overlune

For prompting Google Stitch to make new Overlune site screens (the landing page, editor, setup guide and legal pages). The full rules live in `docs/DESIGN.md` and `docs/BRAND.md`; this file restates them in Stitch's descriptive style. If the two disagree, `docs/DESIGN.md` wins.

**Brand overrides.** Overlune's brand is violet on deep navy, set by the owner. Where generic taste rules ban purple or ask for Inter alternatives like Geist, the brand wins: Lune Violet is the one accent, and Quicksand and Nunito are the fonts. What stays banned is how purple usually goes wrong: glows, neon gradients, gradient buttons and gradient text.

## 1. Visual Theme & Atmosphere
A night sky with the lights low. Overlune's own chrome is quiet, deep navy and calm so the overlay themes it shows (bright, loud, each with its own look) are always the loudest thing on screen. The mood is friendly and confident, like a streamer friend who knows OBS: rounded type, soft corners, plain words, no hype.

There are two surfaces, each with its own dials:
- **Landing page:** Art Gallery Airy (density 3), Offset Asymmetric (variance 7), Cinematic Choreography held back for the live demo (motion 7). Big rounded headlines on the left, a real overlay scene tilted slightly and floating in from the bottom right, generous dark space between sections.
- **Editor, setup guide, legal pages:** Daily App Balanced (density 6), Predictable Symmetric (variance 2), Static Restrained (motion 2). A narrow form column beside large previews. It is a tool for a desktop window squeezed next to OBS; nothing moves except what the streamer changes.

## 2. Color Palette & Roles
- **Night** (#05061A): page ground and control fills. Never pure black.
- **Deep Space** (#0B0F3C): panels, cards, callouts and anything raised one step above Night.
- **Moonlight** (#F4F1FF): body text, labels and headings (18:1 on Night).
- **Haze** (#A7A0D6): hints, secondary text, outline-button edges and the theme-name marquee (8.3:1 on Night).
- **Night Hairline** (#24285C in the editor; white at 10% opacity on the landing page): 1px panel and card edges, section dividers. Decorative only.
- **Lune Violet** (#A45EFC): the single accent. Links, focus rings, the selected state, step numbers, and the one filled button style (with Night text). 5.3:1 on Night.
- **Alert Coral** (#FF8A8A): error text and invalid-field outlines only.
- **Crescent gradient** (#A45EFC to #7D43FA to #4A2AE3 to #18D2F5): belongs to the logo mark. Never on buttons, text, backgrounds behind body text, or as a decorative flourish.
- **Ambient light:** soft radial pools of Indigo Glow (#4A2AE3 at 35%) and Signal Cyan (#18D2F5 at 12%) fading to transparent, used only behind the landing hero and the closing call to action. Never behind body copy, never as a hard-edged gradient.

All screens are dark. Every text pair meets WCAG AA (4.5:1 for text, 3:1 for control outlines and focus rings).

## 3. Typography Rules
- **Display and headings:** Quicksand, bold (700) and semibold (600). Rounded geometric forms that echo the wordmark. Hierarchy comes from size and weight, with color held to Moonlight. Normal tracking; never letterspaced wide.
  - Landing hero: fluid, clamp(2.75rem, 5.5vw, 5.25rem), line height 1.05, max 5xl width (64rem).
  - Landing section headings: clamp(2.25rem, 4.5vw, 4rem); card headings 1.5rem.
  - Editor: 32px page title, 22px step and section headings, 18px look names.
- **Body:** Nunito, regular (400) and bold (700). Relaxed leading, lines held under 65 characters (36rem max on the landing page). Landing lead paragraph 1.25rem in Haze; editor body 16px, controls 15px, labels and hints 14px, small notes 13px. Nothing smaller than 12px.
- **Mono:** the system monospace stack (ui-monospace, SFMono-Regular, Consolas) for OBS links and hex color values only.
- **Never:** a third font in the chrome, Inter, serif fonts of any kind, or typing "Overlune" in a font to stand in for the wordmark (it is artwork).

## 4. Component Stylings
- **Buttons:** Flat, no shadow, no glow. Primary is a Lune Violet fill with bold Night text; on the landing page it is a pill (fully rounded, Quicksand bold 18px, 0.875rem by 1.75rem padding) that turns Moonlight on hover. Secondary is an outline: Moonlight text with a 40%-opacity Moonlight edge on the landing page, Haze 1px outline on Night in the editor (12px corners). Only one filled button per region; in the editor that is "Copy link". Labels are verbs, 1 to 3 words, sentence case. Disabled uses a dashed outline and muted text, but prefer explaining why in plain text over disabling.
- **Cards:** Deep Space fill with a Night Hairline edge, no shadow: elevation is shown by the step from Night to Deep Space. Landing cards have generously rounded corners (1.5rem); editor panels and controls use 12px. Theme pictures inside cards sit in their own rounded crop and zoom gently (5%) on hover.
- **Look cards (theme picker):** the theme's real Starting Soon scene, held still, with its name below in Quicksand. Hover brightens the edge to Haze; selected gets a Lune Violet edge plus a checked radio, so state never relies on color alone.
- **Inputs:** label above (wrapping the control), hint below in Haze, error below in Alert Coral announced as an alert. Fields near their limit show "N characters left" at 10 or fewer. Focus is a 2px Lune Violet ring with 2px offset on every interactive element. No floating labels.
- **Callouts:** a Deep Space box with a 4px Lune Violet bar on the left edge (square on that side). For the save reminder, the "You're set" line and the legal disclaimer. One per region.
- **Link rows:** overlay name, its size (width by height), the raw link in faint monospace (truncated with an ellipsis, still selectable), and the filled Copy button. Status text after copying: "Copied", "Changed since you copied it", or "Press Ctrl+C".
- **Loaders:** Deep Space skeleton blocks the exact size of the content they stand in for, 16:9 for scene previews. No circular spinners.
- **Empty states:** a short line that says what goes here and how to fill it, next to the control that fills it. No illustrations of empty boxes.
- **Errors:** inline, next to the field, saying what happened and what to do next.

## 5. Layout Principles
- CSS grid first. Landing content sits in a 1280px (7xl) centered container with 1.5rem side padding (3rem from 768px up).
- **Landing hero:** left-aligned text block (headline, one lead paragraph, a filled CTA and at most one outline button that jumps to content on the same page). A live overlay scene floats in from the bottom right, tilted -3 degrees, in its own space: it never covers the headline or buttons. Never a centered hero.
- **Inline image typography:** the signature move. A pill-shaped slice of a real Overlune scene sits inside a heading at type height, like a word. Only real scenes, never stock photos.
- **Feature grids:** asymmetric bento (4 columns by 2 rows: one 2x2, one 2x1, two 1x1, no empty cells), or a row of panels that widen on hover and focus. Never three equal cards in a row.
- **Theme gallery:** two columns on wide screens, a sticky title on the left (2 parts) and a tall scroll of scene pictures on the right (3 parts).
- **Editor:** a 300 to 400px form column beside sticky previews. A sticky steps bar on top with three steps; the current step is Lune Violet with a 3px underline.
- Sections are separated by space (8rem, 12rem on wide screens) or a single hairline, never by boxes stacked on boxes. No overlapping text.

## 6. Responsive Rules
- **Landing:** collapses to one column below 768px; the hero scene drops below the text, upright and full width. No sideways scroll at 390px. Headings scale with clamp(); body never below 16px; tap targets at least 44px. The top navigation keeps the logo and the CTA and drops the section links.
- **Editor:** one breakpoint at 800px. Below it, one column with the preview docked in a "Show preview" bar at the bottom and the look gallery 2 across (4 across when wider). The editor is for desktop windows; there is no mobile editor.
- Long content wraps (labels, look names over two lines) or truncates with an ellipsis (raw links). Overlay titles shrink to fit their 1920x1080 frame.

## 7. Motion & Interaction
- **Landing:** sections rise in (48px upward move plus fade, 0.9s, strong ease-out, power3.out) as they enter. A large promise paragraph lights up word by word as you scroll, starting at 40% opacity so it stays readable. The theme gallery title pins while scene pictures grow in (80% to 100% scale) and dim as they leave (wide screens only). Hover zooms take 700ms with ease-out. The theme-name marquee loops slowly (40s, linear) and the hero scene runs live; nothing else loops.
- **Editor:** no entrance motion and no perpetual loops. Look-card scenes are held still so eight previews stay light. Feedback is instant state change (copied, selected, invalid).
- **Reduced motion:** every animation has a static version. With reduced motion the landing page is fully visible and still, and the marquee stops.
- Animate transform and opacity only. No video anywhere in the chrome.

## 8. Anti-Patterns (Banned)
- No emojis.
- No Inter, no serif fonts, no third font.
- No pure black (#000000); the darkest color is Night (#05061A).
- No glows, neon outer shadows, or purple button glows. No drop shadows on cards.
- No gradient text, gradient buttons, or the crescent gradient outside the logo.
- No second accent color and no second filled-button style.
- No centered hero, no three equal cards in a row, no overlapping text.
- No stock photos or placeholder images: every picture is a real Overlune scene.
- No meta-labels ("SECTION 01"), no "Scroll to explore", scroll arrows or bouncing chevrons.
- No invented reviews, user counts, ratings or round-number stats. "Set up in under 10 minutes" waits until it is measured.
- No hype words ("Elevate", "Seamless", "Unleash", "Next-Gen", "premium", "unlock"); nothing that hints at a paywall. Overlune is free with no account, and says so plainly.
- No jargon a first-time streamer wouldn't know: "Link to paste into OBS", not "Browser Source URL".
- No custom cursors. No state shown by color alone.

## 9. Out of Scope for Stitch
The 8 overlay themes (Clean Slate, Neon Grid, Cozy Café, Arcade 8-Bit, Pastel Cloud, Forest Night, Bold Esports, Vaporwave Sunset) have their own palettes, fonts and effects in `docs/DESIGN.md`. In Stitch mockups, show them as 16:9 screenshots of the real scenes inside rounded frames. Never redraw or restyle them with this palette.
