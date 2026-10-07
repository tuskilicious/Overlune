# Kit reference: what the owner's kits do well

The owner's own overlay kits, **Tuskilicious** (a broadcast/esports kit) and **ICARUS** ("Icarus but how high", a Greek-myth kit), set the bar for how Overlune looks and works. This file lists their strengths so future looks, the editor and the guide can be measured against them. It describes them in Overlune's terms; it is not a spec to copy (the kits are the owner's own channel branding).

Each item says where Overlune stands: **in** (done), **planned** (a task), or **later** (needs a backend, a schema change or approval first).

## 1. Overlays (looks)

### A look is a world, not a palette
- **One signature motif per look** that carries the mood on its own: ICARUS's molten sun, meander banding and loose feathers; Tuski's blue/violet bloom over a faint grid. *In:* every look has one (T6.107-T6.112).
- **A display headline at poster scale, two-tone:** Tuski's huge condensed "STARTING / SOON" with the second word in the accent; ICARUS's serif display across most of the width. *In:* shared layout v2 (T6.107).
- **Copy with personality, per scene:** "Re-fitting the wings. Feathers are being counted." (BRB), "Thanks for flying" (ending), "We leave the ground shortly." *Later:* default subtitles per look would change saved links' defaults; needs a schema decision.
- **Scenes read as one family:** the same type, motif and band on every scene, changing only the message. *In.*
- **A band or ticker:** Tuski's bottom ticker (brand tab plus scrolling socials and schedule); ICARUS's meander band top and bottom. *Later:* a ticker needs a new socials-and-schedule field in the link.
- **Socials as a list with icon tiles**, platform verb or name over the handle. *In* (T6.107).
- **Cam frames with corner brackets** in the accent. *In* (T6.108).
- **Alerts as a card with a visual tile** on the left (ICARUS's sun disc), the event as a small label, the name in the display face. *In:* name in the display face and the accent, a burst and pop on arrival (T6.117). *Later:* a per-look picture tile needs art per look.
- **Safe framing for the platform:** ICARUS keeps text clear of YouTube's player controls. *In:* the 64px safe margin; worth re-checking against Twitch's and YouTube's player chrome when looks are added.

### Motion
- **Scene transitions are part of the look** (ICARUS: cut, fade through ink, dip to black, slide, bars, sun sweep, sea take, eclipse; Tuski: wipe, bloom, blinds, iris, pixel, bars, cut), with a single **duration** control described in plain words ("snappy" to "languid"). *Later:* OBS owns transitions between Browser Sources; a look-matched OBS stinger would be a separate asset.
- **Graphics load: Full / Lite / Still** (ICARUS) with a sentence on what each turns off and why ("heaviest" to "cheapest"). *Planned:* Overlune's "Less motion" is the Still step; a middle "Lite" step (entrances kept, ambient loops off) would help low-end PCs. Needs a link field and an OBS CPU check.

## 2. The control docks (the kits' editors)

Both kits ship a dock that runs inside OBS. Overlune's editor is a web page whose output is links, so not everything carries over, but most of the craft does.

- **Live vs. set-up split.** Tuski: "On air" vs. "Setup: set once". ICARUS: a LIVE / SETUP switch at the top. Things touched every stream are never buried under things set once. *Planned:* the editor's sections group the same way (every stream: scene text, countdown; set once: look, socials, chat, alerts, frame, channel page, logo, motion, colors).
- **Status at a glance:** Tuski's three status chips (Overlay, OBS, Chat), ICARUS's "No overlay" pill. *Later* for Overlune (the editor can't see OBS), but the idea carries: the editor can say "Chat: set" / "Countdown: none" next to each part.
- **Section headers as small tracked caps with a hairline rule** that runs to the edge, a collapse chevron and a **Reset** per section. *Planned:* Reset per section.
- **Choices shown, not described:** ICARUS's colour themes as palette swatches with a name; transitions as cards with a one-line description ("crossfade through ink"); Tuski's segmented pills instead of drop-downs for 2-7 options. *In:* the look picker shows real scenes. *Planned:* segmented controls where a drop-down hides two or three options (countdown kind, alert time).
- **Numbers you can nudge:** ICARUS's sliders with the value shown, a number field, and -10 / -1 / +1 / +10 steppers; sizes shown as "420 × 236". *Planned:* webcam frame size presets and nudges.
- **Countdown as an instrument:** a big readout, quick presets (5m, 10m, 15m, 20m), -1 min / +1 min, Start and Clear, and "At zero, go to". *In:* quick picks (T6.113). *Planned:* -1 min / +1 min nudges.
- **Visual placement:** ICARUS's cam pad, a miniature 16:9 frame where the cam box is dragged, plus a 3×3 anchor grid. *Later:* Overlune's frame is placed in OBS; a placement pad would need the frame to own its position (a schema change).
- **Keyboard first:** 1-6 for scenes, B for back, Space for the countdown, with the keys printed next to the buttons. *In:* Ctrl+Z (T6.115). Shortcut hints belong wherever a shortcut exists.
- **Backup as a file:** ICARUS's Export settings / Import, with a note on what's inside and what's left out (the OBS password). *In:* the link is the save file; "Copy my save link" and "Load my overlay from a link".
- **Plain-language footnotes under every control** that say what it does and when you'd change it ("Shows on Starting soon, BRB and Ending while it runs; Clear hides it"). *In:* editor hints; keep them this specific.

## 3. The setup guides

- **A numbered index of sections at the top**, as chips that jump to each part (ICARUS: 1 Start here, 2 Scenes, 3 Dock, 4 OBS scenes...). *Planned* for the setup guide.
- **Copy buttons on every link and code block** with the label of what it is. *In* for links in the editor; *planned* for the guide.
- **Tables for "what each control does"** and parameter tables with defaults. *In* (the size table); keep using them for reference material.
- **A rehearsal checklist before the first real stream** ("Countdown set, every scene switched once, a test alert fired..."). *Planned:* the guide gets a short "Before your first stream" checklist.
- **Callouts for the one thing that goes wrong** (Tuski: "the dock's status light tells you whether it found the overlay"; ICARUS: "Lock the key to YouTube"). *In:* the guide's fixes section; keep each fix next to the step it belongs to.

## 4. What not to take
- Their per-machine setup (a local web server, a WebSocket password): Overlune stays one link per overlay, no install.
- YouTube API keys and quota juggling: out of scope until v2 (PRD).
- Anything that puts a secret or a token in a link.
