# Overlune Privacy Policy

> **Draft: needs lawyer review before launch.** Not yet legal advice or a final policy.

_Last updated: 2026-10-01_

Overlune is a free, open-source stream overlay maker at overlune.pages.dev. This page explains what data Overlune handles, in plain language.

## The short version
- **No accounts.** You never sign up or log in.
- **No analytics, no ads, no cookies.**
- **Your settings live in your link and your browser**, not on our servers. We don't have servers that store data.
- **Error reports** go to Sentry, with personal details and your settings removed.

## Your settings
Everything you set in the editor (theme, titles, socials, logo link, chat channel name, alert messages) is saved in two places, both on your side:

1. **Your overlay links.** Settings are stored in the part of the link after the `#`. Browsers never send that part to the website, so our host does not receive your settings when an overlay loads.
2. **Your browser's local storage**, so the editor remembers your work. It stays on your device. "Start over" in the editor, or clearing your browser's site data, deletes it.

Anyone you give a link to can see the settings inside it. Your links never contain passwords or login tokens.

## Twitch chat and alerts
The Chat and Alerts overlays read your channel's public chat **anonymously**, without logging in to Twitch. To do this, the overlay connects directly from your computer to Twitch's chat servers, and loads emote images from Twitch's image servers. Twitch receives the usual connection data from your computer, such as your IP address. Twitch's own privacy policy applies to that: https://www.twitch.tv/p/legal/privacy-notice/

Overlune does not store or send chat messages anywhere.

## Your logo
If you add a logo link, your overlay loads that image straight from the website you linked. That website receives the usual request data (such as your IP address) under its own policy.

## Error reports (Sentry)
When something breaks, the app sends an error report to Sentry (Functional Software, Inc.), stored in Sentry's EU region (Germany). We use it only to find and fix bugs. A report contains:

- the error message and where in the code it happened
- browser and operating system type
- the page address **without** the part after `#` (your settings are removed before sending)
- a small sample of performance timings (about 5% of page loads)

Reports do **not** include your settings, chat messages or console output. Overlune turns off Sentry's collection of personal data, and IP addresses are not stored. Sentry's privacy policy: https://sentry.io/privacy/

## Hosting (Cloudflare)
The site is hosted on Cloudflare Pages. Like any web host, Cloudflare processes basic request data (such as IP address and browser type) to deliver the site and protect it from attacks. Cloudflare's privacy policy: https://www.cloudflare.com/privacypolicy/

## Cookies
Overlune sets no cookies and uses no trackers, so there is no cookie banner.

## Children
Overlune is not directed at children under 13 and collects no personal information from anyone.

## Your rights
Because Overlune keeps no accounts or profiles, we hold no personal data about you to look up, correct or delete. Your settings are in your links and browser, which you control. For questions about error reports, contact us below.

## Changes
If this policy changes, we will update the date at the top. The full history of this file is public in the project's GitHub repository.

## Contact
support@overlune.in
