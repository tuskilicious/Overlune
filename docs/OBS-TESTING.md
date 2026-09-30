# Overlune: OBS Test Checklist

Chrome is not enough. OBS and Streamlabs use their own embedded Chromium. Run this for every overlay before its task is done, and record the result at the bottom.

## Setup
1. Run `npm run dev` or use the preview deploy URL.
2. In OBS, go to Sources → **+** → **Browser**.
3. Paste the overlay link and set width and height to the values the editor shows.
4. Test with both of these settings on and off: **"Shutdown source when not visible"** and **"Refresh browser when scene becomes active"**.

## Check
- [ ] Transparent areas are transparent (no black or white box).
- [ ] Fonts render (no fallback system font).
- [ ] Animations play smoothly, and reduced-motion mode disables them.
- [ ] **Countdown:** switch scenes away and back, and confirm it did not reset.
- [ ] **Chat:** messages appear within about 2 seconds. A wrong channel name shows the error state.
- [ ] **Alerts:** a test alert plays. With **"Control audio via OBS"** on, the sound shows on the OBS audio mixer.
- [ ] **CPU:** OBS stats (View → Stats) show no dropped frames. The overlay adds less than 5% CPU on a mid-range PC.
- [ ] Also check in **Streamlabs Desktop**.

## Results log
| Date | Overlay | OBS version | Streamlabs version | Pass/Fail | Notes |
|---|---|---|---|---|---|
| 2026-09-30 | Starting Soon (T1.3) | 32 | not tested | Pass | Transparency, Inter font, countdown kept running across scene switch, cache refresh and both source options; "Starting now!" at zero; no dropped frames. Reduced motion pending T1.5; Streamlabs pending T1.6. |
| 2026-09-30 | Starting Soon error state (T1.4) | 32 | not tested | Pass | Bad-field link: card at top, content kept, no logo. Broken link: card over defaults. Valid link: no card. No flashing across scene switches; no dropped frames. |
