# Overlune: Brand Kit

The Overlune identity: a crescent moon cradling three stacked overlay panels. The moon is the "lune", the panels are the "over"lays your stream wears. Asset files live in `docs/brand/`. The editor and setup guide use these colors and fonts (`src/editor/brand.ts`).

## Logo
| File | Use |
|---|---|
| `docs/brand/logo/overlune-logo-for-dark-bg.png` | Default lockup. Dark or busy backgrounds, stream scenes, banners |
| `docs/brand/logo/overlune-logo-for-light-bg.png` | Same lockup with an ink wordmark, for white or light backgrounds |
| `docs/brand/logo/overlune-mark.png` | Mark only (1024 square, transparent). When the name is already nearby |
| `docs/brand/logo/overlune-wordmark-white.png` / `-ink.png` | Wordmark only, when the mark is shown separately |
| `docs/brand/logo/overlune-logo-source.png` | Owner's original file. Edit from this, never from an export |
| `public/images/brand/logo.png` | Editor header (318×96, shown at 159×48) |

Rules:
- Clear space: keep at least the height of the wordmark's "O" empty around the lockup.
- Minimum size: lockup 120px wide on screen; mark 24px. Below 24px use the app icon (it has a solid tile).
- Don't recolor the mark, stretch it, add outlines or drop shadows, or put the dark-bg lockup on a light background.
- On photos or gameplay, place the logo on a Night panel or a dark area of the image.

## App icon and favicon
- `docs/brand/icon/overlune-app-icon-1024.png`: the mark on a rounded Night tile with a soft indigo glow.
- Sizes: 512, 192 (PWA), 180 (Apple touch), 64, 32, plus `favicon.ico` (16/32/48).
- `public/favicon.png` is the 64px tile and `public/favicon.ico` the 16/32/48 set. `public/images/brand/apple-touch-icon.png` is the 180px tile.
- `public/images/brand/og-image.png` is the link preview set in `index.html`.

## Color
| Name | Hex | Role |
|---|---|---|
| Night | `#05061A` | Main background |
| Deep Space | `#0B0F3C` | Panels, cards, surfaces on Night |
| Moonlight | `#F4F1FF` | Text and wordmark on dark (18:1 on Night) |
| Haze | `#A7A0D6` | Secondary text on dark (8.2:1 on Night) |
| Lune Violet | `#A45EFC` | Primary brand color. Crescent highlight, links on dark (5.3:1 on Night) |
| Ultraviolet | `#7D43FA` | Buttons and links on white (5.2:1). Decoration only on Night (3.9:1, large text only) |
| Indigo Glow | `#4A2AE3` | Glows, gradients, fills. Not for text on dark |
| Signal Cyan | `#18D2F5` | Accent: the panel edge light, "live" states, focus rings (11:1 on Night) |
| Ink | `#0B0D2A` | Text and wordmark on light |

Signature gradient (the crescent): `#A45EFC → #7D43FA → #4A2AE3 → #18D2F5`. Use it on the mark and at most one hero element per layout, never behind body text.

## Typography
All three are SIL OFL and already installed via `@fontsource`.
- **Quicksand 700 / 600**: headings and taglines. Its rounded geometry echoes the wordmark.
- **Nunito 400 / 700**: body copy and UI.
- Code, hex values and OBS links: the system monospace stack (`ui-monospace, SFMono-Regular, Consolas, monospace`).

The wordmark is artwork. Don't retype "Overlune" in a font to stand in for it.

## Voice
Friendly, plain and confident, like a streamer friend who knows OBS.
- Lead with what people get: "Free stream overlays that look pro."
- Say "free" and "no account" plainly. Never "premium", "unlock" or anything that hints at a paywall.
- Short sentences, real numbers ("set up in under 10 minutes"), no hype words.

Taglines:
- Primary: **Free stream overlays that look pro.**
- Support: Set up in OBS in under 10 minutes. No account, no payment.

## Social assets (`docs/brand/social/`)
| File | Size | Notes |
|---|---|---|
| `overlune-avatar-800.png` | 800×800 | Profile picture everywhere; circle-crop safe |
| `overlune-twitch-banner-1200x480.png` | 1200×480 | Twitch profile banner |
| `overlune-youtube-banner-2560x1440.png` | 2560×1440 | Content kept inside YouTube's 1546×423 safe area |
| `overlune-x-header-1500x500.png` | 1500×500 | X / Twitter header |
| `overlune-github-social-1280x640.png` | 1280×640 | GitHub repo → Settings → Social preview |
| `overlune-og-image-1200x630.png` | 1200×630 | Link previews (Open Graph) |
| `overlune-discord-banner-960x540.png` | 960×540 | Discord server banner |

## Relationship to the themes
The brand is Overlune's own look: the editor, the setup guide, social pages and launch material. The 8 overlay themes (`docs/DESIGN.md`) stay independent. The editor chrome uses Night as its ground so it stays quiet next to any theme preview.
