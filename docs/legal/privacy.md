# Overlune Privacy Policy

> **Self-written, not legal advice.** Overlune is a free, non-commercial hobby project. This document was written by the maintainer, has not been reviewed by a lawyer, and does not guarantee compliance with any law.

_Last updated: 2026-10-01_

Overlune is a free, open-source stream overlay maker at overlune.pages.dev. This page describes, in plain language, what the app actually does with data.

## The short version
- **No accounts.** You never sign up or log in.
- **No analytics, no ads, no cookies.**
- **Your settings live in your link and your browser**, not on our servers. We don't have servers that store data.
- **Error reporting is on.** Error reports and a small sample of performance data go to Sentry, with your settings and console output removed (details below).

## Your settings
Everything you set in the editor (theme, titles, socials, logo link, chat channel name, alert messages) is saved in two places, both on your side:

1. **Your overlay links.** Settings are stored in the part of the link after the `#`. Browsers never send that part to the website, so our host does not receive your settings when an overlay loads.
2. **Your browser's local storage**, so the editor remembers your work. It stays on your device. "Start over" in the editor resets it to the defaults, and clearing your browser's site data for Overlune deletes it.

Anyone you give a link to can see the settings inside it. Your links never contain passwords or login tokens.

## Twitch chat and alerts
The Chat and Alerts overlays read your channel's public chat **anonymously**, without logging in to Twitch. To do this, the overlay connects directly from your computer to Twitch's chat servers, and loads emote images from Twitch's image servers. Twitch receives the usual connection data from your computer, such as your IP address. Twitch's own privacy policy applies to that: https://www.twitch.tv/p/legal/privacy-notice/

Overlune does not store chat messages, and it is built not to include them in error reports.

## Your logo
If you add a logo link, your overlay loads that image straight from the website you linked. That website receives the usual request data (such as your IP address) under its own policy.

## Error reports (Sentry)
Error reporting is **on** in the live site. It uses Sentry (Functional Software, Inc.), with data stored in Sentry's EU region (Germany). We use it only to find and fix bugs. The app sends Sentry:

- **Error reports** when something breaks: the error message, where in the code it happened, your browser and operating system type, the page address **without** the part after `#` (so your settings are not included), and a short trail of recent app events before the error (page changes, clicks on buttons, and network requests the page made).
- **A session ping** each time a page loads, so we can count how often pages crash. It contains the page's status (ok or crashed), the time, and your browser type.
- **Performance samples** for about 5% of page loads: how long the page and its parts took to load, and the addresses of the files it loaded, such as fonts, sounds, Twitch emote images and, if you set one, your logo image link.

The app removes the part of every address after `#` and never sends console output. It is built not to send chat messages, and it does not turn on Sentry's collection of personal data (such as IP addresses or cookies). Sentry still sees your IP address when the report arrives, as any web server does, but our Sentry project is set to not store it. Sentry's privacy policy: https://sentry.io/privacy/

## Hosting (Cloudflare)
The site is hosted on Cloudflare Pages. Like any web host, Cloudflare processes basic request data (such as IP address and browser type) to deliver the site and protect it from attacks. Cloudflare's privacy policy: https://www.cloudflare.com/privacypolicy/

## Cookies
Overlune sets no cookies and uses no trackers, so there is no cookie banner.

## Children
Overlune is not directed at children under 13. It never asks for personal information from anyone.

## Your rights
Because Overlune keeps no accounts or profiles, we hold no personal data about you to look up, correct or delete. Your settings are in your links and browser, which you control. Error reports in Sentry are not linked to any name or account. For questions, contact us below.

## Changes
If this policy changes, we will update the date at the top. The full history of this file is public in the project's GitHub repository.

## Contact
support@overlune.in
