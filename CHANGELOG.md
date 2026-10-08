# Changelog

What changed in each Overlune release. Overlay links from every release keep working: the link format only ever gains optional settings.

## 1.4.0 (2026-10-08)

A new Offline scene, a square webcam frame, and a refreshed home page. Every earlier link keeps working: Offline is a new link you can add when you want it.

### New
- **Offline scene:** a full scene in your look for when you're not live, with its own title ("Offline right now" to start) and a line for your schedule. Its link sits with the others in the editor, and the OBS scene file now includes an Offline scene.
- **Square webcam frame:** 480 × 480 is now one of the quick sizes, and draws cleanly in every look.

### Site
- **Refreshed home page:** "Seven overlays in every look", with a magnifier that shows each overlay up close under your mouse; the steps to go live joined by a line that draws as you scroll; and Offline in the looks preview.
- **A ruler for a scrollbar:** on wide screens with a mouse, the home page scrolls with a ruler on the right edge that shows how far you've read and which section you're in. Click or drag it to move. Touch screens keep their usual scrollbar.
- **New footer** on every page, with its links in groups.

## 1.3.1 (2026-10-08)

Every look now sounds like itself, and the moving backgrounds are much lighter on your PC. Every earlier link keeps working and picks up the changes on its own.

### Looks and overlays
- **A sound for every look:** the eight looks that borrowed another look's alert sound now have their own. Daylight rings a bell, Abyss sends a sonar ping, Session plays a brush and horn stab, Shonen a taiko hit, Sakura a koto pluck, Skate Deck a board pop, Phosphor a pair of terminal beeps and Quest a lute and horn call. All play at about the same loudness as the others.
- **Lighter on your PC:** the countdown's edge light, Abyss's breathing countdown and Phosphor's scanline sweep now run on the graphics card. In tests on a simulated slow PC they kept up to a quarter of the processor busy; every look now needs about 1 to 2%. They look the same.
- **Hidden sources rest:** when you hide an Overlune source in OBS (another scene, or the eye icon), its animations pause until it's shown again.

### Site
- Cookie-free visit counts (Cloudflare Web Analytics) now load properly, and the privacy policy explains what they collect. They never see the part of a link after `#`, where your settings are.

## 1.3.0 (2026-10-08)

Every look gets its own layout, and the editor gets a studio layout that's quicker to use. Every earlier link keeps working and picks up the new designs on its own: there is nothing to re-paste.

### New
- **A layout for every look:** each of the 16 looks now arranges its scenes in its own way, from Clean Slate's shelf and Arcade's high-score screen to Shonen's manga page and Quest's quest log. Vaporwave Sunset now moves: the grid floor scrolls, the sun's stripes slide and the palms sway.
- **Looks filmstrip:** on wide windows, every look sits in a strip under the preview. Pick one and every scene restyles. Previous and Next buttons, or the arrow keys, scroll it.
- **Click a part of the preview** (the title, the countdown, your socials) to jump to its settings. Hovering shows what each part is.
- **Test alert** beside the preview plays the next sample alert over your scene, with its sound.
- **Redo**, next to Undo (Ctrl+Shift+Z or Ctrl+Y), and a "Saved in your link" status.
- **Fold the section menu** to icons to give the preview more room. Overlune remembers it in this browser.

### Editor
- New controls: switches, sliding choices, a volume slider, quick-pick chips, and color swatches from your look's own palette, with your own color as the last swatch.
- One look picker at a time: the filmstrip on wide windows, the card grid on narrower ones.
- Smoother motion in the editor: the filmstrip's looks glide when you filter them, the menu's names fade as it folds, and the preview's highlight glides from part to part. All of it stops with Still motion or reduced motion.
- Thin scrollbars in the brand colors.

### Looks and overlays
- Clean Slate's alert: its lines now follow the card in, one after another.
- Session's last title word is a slightly deeper brick, so it reads clearly on the mustard.

### Fixed
- Shared links to overlune.in said "9 matching looks". They now show the real number.
- The link-preview picture and the banners showed the old address. They now say overlune.in.
- The editor's webcam frame preview only showed a corner of the frame once you had placed it.
- Visitors who ask their device for reduced motion no longer download the animation code at all.

## 1.2.0 (2026-10-07)

Seven new looks, bolder overlays and an editor that's quicker to use. Every 1.0 and 1.1 link keeps working and picks up the new designs on its own: there is nothing to re-paste.

### New
- **Seven new looks, 16 in all:** Abyss (deep water and marine snow), Session (a jazz anime title card), Shonen (a manga page), Sakura (a spring night with drifting petals), Skate Deck (maple and grip tape), Phosphor (a green terminal) and Quest (an RPG quest log). Each one styles every scene, chat, alerts and the webcam frame.
- **Socials ticker:** an optional band along the bottom of every scene, with your socials and a line of your own scrolling past. Set it up under Socials.
- **Place the webcam frame in Overlune:** drag it on a small 16:9 pad, use the arrow keys or pick one of nine spots. The frame link then fills the whole screen with the frame where you put it, so there's nothing to move in OBS. Moving it in OBS still works too.
- **Lite motion:** Motion is now Full, Lite or Still. Lite keeps entrances, countdown flips and alerts, and stops the looping backgrounds.
- **Undo:** an Undo button, and Ctrl+Z (Cmd+Z on a Mac) outside text fields, take back your last change.
- **Reset per section:** each editor section has its own Reset, shown only when you've changed something there.
- **Quick countdown picks:** "In 15 min", "In 30 min", "In 1 hour" and "No countdown".
- **Preview each link:** every link has a Preview that opens the overlay full size in a new tab. The Alerts preview plays one of each alert.
- **Open a look full screen** from the home page to see it as big as your screen.

### Looks and overlays
- Bolder scenes: a much bigger headline, and the countdown and socials together in one column, socials with their names.
- More life: scene pieces land one after another, only the countdown digits that change flip, alerts land with a burst of light, every look has a moving background, and the newest chat message flashes in the accent. Everything stops with Still motion or reduced motion.
- Each of the first nine looks gained a signature move from its own world.
- The oldest chat message fades out at the top instead of being cut in half, and the webcam frame gets corner brackets in most looks.

### Editor, guide and site
- The editor is redesigned: clearer section headers, choices as buttons, and status at a glance.
- The setup guide has an index and a run-through of your first stream.
- A new home page, and a 404 page that points the way back.

### Fixed
- The editor's look gallery crashed on computers that report an unknown time zone. It now falls back to UTC.
- After an update, a page could fail to load instead of reloading itself.
- A webcam frame almost as big as the stream, placed in Overlune, made a link that showed an error on stream. It now stays on screen.

## 1.1.0 (2026-10-07)

More to make, a faster start in OBS, and a privacy fix. Every 1.0 link keeps working as it was.

### New
- **Channel page pictures:** Twitch panel headers (your own names) and an offline banner in your look, downloaded as PNG from the editor.
- **Import into OBS in one go:** download one file and import it in OBS Studio (Scene Collection → Import) to get every Overlune scene with your links and sizes already in. Streamlabs keeps the manual steps.
- **Daylight:** a ninth look, and the first light one: cool paper, ink type and a vermilion accent.
- **Webcam frame:** a border in your look to put around your camera, with an optional name tab. Set its size in the editor; its link is optional.
- **Link previews:** sharing a link to the guide, the editor or the legal pages now shows that page's own title and description.

### Faster
- Overlays start about a fifth faster on slow PCs: error reporting now loads after the overlay has drawn.

### Privacy
- **Fixed:** your overlay settings could reach our error reports. When an overlay loaded, the error tracker's performance sample (taken for about 1 in 20 loads) stored the full link, settings included. Now every field of every report is cleaned before it's sent, and a report is dropped rather than sent if cleaning ever fails. A second rule in the error tracker removes settings on its side too.
- The site's source maps are no longer public. They go only to the error tracker, so its reports point at the right file and line.

### Fixed
- The alert pictures on the home page crop to their cards again.

### Under the hood
- Updated React Router (8), Vite (8), Vitest (5), TypeScript (6.0) and Sentry (11), keeping exactly the same data settings and scrubbing as before.
- The second copy at overlune.antideploy.app has been retired. overlune.in is the only address.

## 1.0.0 (2026-10-03)

The first release. Free, open source, no account and no payment.

### What you can make
- **Scenes:** Starting Soon (with a countdown, one-off or repeating on set days), Be Right Back and Stream Ending.
- **Chat:** live Twitch chat with emotes, role badges (can be hidden), bot and command filters, your own size, text size and fade-out time.
- **Alerts:** raids, subs, resubs, gift subs (grouped when someone gifts many) and bits, with sound, your own messages, volume and how long each alert stays up.
- **8 looks:** Clean Slate, Neon Grid, Cozy Café, Arcade 8-Bit, Pastel Cloud, Forest Night, Bold Esports and Vaporwave Sunset. Every scene, chat and alert in a look matches. Advanced colors and fonts on top.
- **Your logo and socials** on the scenes (the logo comes from an image link; uploads aren't supported yet).

### How it works
- One link per overlay to paste into OBS or Streamlabs as a Browser source. The link holds your settings, so there's nothing to sign up for, and it never changes when a look gets an update.
- The editor shows a live preview, saves your work in your browser, and gives you a link that reopens it anywhere. "Copy all links" copies every link with its size.
- A step-by-step setup guide for OBS and Streamlabs, with fixes for a black box, empty chat, silent alerts and a wrong size.
- A "Less motion" option, and every animation has a calm version for viewers and streamers who prefer reduced motion.
- Test alerts in the editor, and a test link that plays one of each alert in OBS.

### Known limits
- Chat and alerts work with **Twitch only**. The scenes work anywhere, including YouTube.
- No follow alerts yet: Twitch only shares follows with a signed-in app.
- Logos come from an image link; there's no upload.

### Privacy and safety
- No accounts, no cookies, no trackers. Settings live in your links and your browser.
- Twitch chat is read anonymously. Chat text is always shown as plain text.
- Error reports (Sentry) leave out your settings, chat messages and IP address.
