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
| 2026-09-30 | Starting Soon reduced motion (T1.5) | 32 | not tested | Pass | Default link slides/fades in; `?rm=1` link appears with no animation, countdown still ticks. |
| 2026-09-30 | **Starting Soon sign-off (T1.6)** | 32 | deferred | Pass (OBS) | Tested on production (overlune.pages.dev, real headers). OBS Stats CPU 1.6–2%, under the 5% limit. Transparency, fonts, countdown across scene switches, error state and reduced motion covered by the T1.3–T1.5 rows. Streamlabs deferred to pre-launch (checklist item 9). |
| 2026-09-30 | BRB + Stream Ending (T2.1) | 32 | not tested | Pass | Default titles, custom link with socials and emoji, error card on a broken link, entrance animation and `?rm=1`. Streamlabs deferred to pre-launch (checklist item 9). |
| 2026-09-30 | Starting Soon + BRB after route/view split (T2.3) | 32 | not tested | Pass | Regression check: custom title, countdown with GMT+5:30, socials, transparency, Inter font, countdown kept across scene switch (refresh on/off), `?rm=1`, no dropped frames. Streamlabs deferred to pre-launch (checklist item 9). |
| 2026-09-30 | Advanced color + font overrides (T2.7) | 32 | not tested | Pass | Override link: pink Orbitron title, Rajdhani body, cyan accent, custom surface, no error card. Default BRB link unchanged. Transparency, fonts across scene switches (refresh on/off), no dropped frames. Streamlabs deferred to pre-launch (checklist item 9). |
| 2026-09-30 | Chat (T3.3) | 32 | not tested | Pass | Live channel: messages within ~2s, transparent box, Inter font, emotes as images, badges, readable names, long-message wrapping, slide-in and `?rm=1`. Wrong channel shows "Can’t connect to chat"; empty channel shows "Chat needs your channel name". Reconnects after scene switch (both source options on/off); no dropped frames. Streamlabs deferred to pre-launch (checklist item 9). |
| 2026-09-30 | Chat filters (T3.4) | 32 | not tested | Pass | Own channel: normal message shown, `!test` hidden, deleted message removed, `/clear` empties chat. Unticking "Hide chat commands" shows `!test`. New editor controls work by keyboard. No dropped frames. Timeouts/bans covered by unit tests (same CLEARCHAT path). Streamlabs deferred to pre-launch (checklist item 9). |
