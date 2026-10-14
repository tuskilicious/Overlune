# Overlune Privacy Policy

> **Self-written, not legal advice.** Overlune is a free, non-commercial hobby project. This document was written by the maintainer, has not been reviewed by a lawyer, and does not guarantee compliance with any law.

_Last updated: 2026-10-14_

Overlune is a free, open-source stream overlay maker at overlune.in. This page describes, in plain language, what the app actually does with data.

## The short version
- **Accounts are optional.** Everything works without one. If you choose to sign in with Twitch, we keep a small record of who you are on Twitch and when you signed in, and you can delete it any time (details below).
- **Cookie-free visit counts, no ads, no tracking cookies.** Cloudflare Web Analytics counts page visits and load times without cookies. The only cookies are the ones that keep you signed in, if you sign in.
- **Your settings live in your link and your browser**, not on our servers.
- **Error reporting is on.** Error reports and a small sample of performance data go to Sentry, with your settings and console output removed (details below).

## Your settings
Everything you set in the editor (theme, titles, socials, logo link, chat channel name, alert messages, and where you placed things on the canvas, including any text and picture links you added) is saved in two places, both on your side:

1. **Your overlay links.** Settings are stored in the part of the link after the `#`. Browsers never send that part to the website, so our host does not receive your settings when an overlay loads.
2. **Your browser's local storage**, so the editor remembers your work (and the site remembers small display choices, like light or dark mode, or that you closed the note shown on phones). It stays on your device. "Start over" in the editor resets it to the defaults, and clearing your browser's site data for Overlune deletes it.

Anyone you give a link to can see the settings inside it. Your links never contain passwords or login tokens.

## If you sign in with Twitch
Signing in is optional. You sign in on Twitch's own page, so Overlune never sees your Twitch password (and Twitch's two-factor sign-in protects your account). Overlune asks Twitch for **no permissions**: only who you are. It can't read your messages, see your email, or do anything on your channel.

**What we store** (in a database on Cloudflare D1):
- your Twitch user ID, login name, display name and the link to your profile picture, updated each time you sign in, and when you first signed in;
- for each place you're signed in: a scrambled (hashed) copy of its sign-in key, and when it was created and expires. The hash can't be turned back into a key, so a copy of the database can't sign anyone in.

**What we don't store:** your password, your email address, your chat, or Twitch's access tokens. Twitch gives Overlune a token once at sign-in; we use it once to read your public profile and then throw it away.

**Why:** to keep you signed in and to show your name and picture in the editor. We never sell it, share it with advertisers or use it for ads.

**How long:**
- Each sign-in lasts 30 days. Expired sign-ins are removed from the database.
- Your account stays until you delete it.
- **Backups:** Cloudflare keeps 7 days of the database's history (to undo mistakes), and a nightly encrypted copy is kept for 90 days in a private GitHub repository that only the maintainer can decrypt. So after you delete your account, it is gone from the live database at once, from the history within 7 days, and from every backup within 90 days. Backups are only used to recover from a failure.

**See and delete it:**
- The account menu in the editor shows your name and picture. To get everything we hold about you (including your Twitch ID and sign-in dates), email us.
- **"Delete account"** in that menu removes your account and every sign-in at once. Your overlay links keep working, since they never depended on an account.
- **"Sign out everywhere"** ends every sign-in, on every device.

## Twitch chat and alerts
The Chat and Alerts overlays read your channel's public chat **anonymously**, without logging in to Twitch. To do this, the overlay connects directly from your computer to Twitch's chat servers, and loads emote images from Twitch's image servers. Twitch receives the usual connection data from your computer, such as your IP address. Twitch's own privacy policy applies to that: https://www.twitch.tv/p/legal/privacy-notice/

Overlune does not store chat messages, and it is built not to include them in error reports.

## Your logo and pictures
If you add a logo link, or a picture on the canvas, your overlay loads that image straight from the website you linked. That website receives the usual request data (such as your IP address) under its own policy.

## Error reports (Sentry)
Error reporting is **on** in the live site. It uses Sentry (Functional Software, Inc.), with data stored in Sentry's EU region (Germany). We use it only to find and fix bugs. The app sends Sentry:

- **Error reports** when something breaks: the error message, where in the code it happened, your browser and operating system type, the page address **without** the part after `#` (so your settings are not included), and a short trail of recent app events before the error (page changes, clicks on buttons, and network requests the page made).
- **A session ping** each time a page loads, so we can count how often pages crash. It contains the page's status (ok or crashed), the time, and your browser type.
- **Performance samples** for about 5% of page loads: how long the page and its parts took to load, and the addresses of the files it loaded, such as fonts, sounds, Twitch emote images and, if you set them, your logo and picture links.

Errors in Overlune's server code (the sign-in and account pages) go to Sentry too, under the same rules: never your sign-in key, Twitch's tokens or cookies.

The app removes the part of every address after `#` and never sends console output. It is built not to send chat messages, and it does not turn on Sentry's collection of personal data (such as IP addresses or cookies). Sentry still sees your IP address when the report arrives, as any web server does, but our Sentry project is set to not store it. Sentry's privacy policy: https://sentry.io/privacy/

## Visit counts (Cloudflare Web Analytics)
We use Cloudflare Web Analytics, run by our host, to see how many people visit and how fast pages load. It loads a small script from Cloudflare on every page, including the overlays in your streaming software. It does not use cookies or your browser's storage, and Cloudflare says it does not follow visitors across websites. For each page load it sends Cloudflare:

- the page address, **without** the part after `#` (so your settings are not included);
- the page you came from, if your browser shares it;
- how long the page took to load and how it performed;
- your browser and device type, and the country Cloudflare works out from the connection.

We see these only as totals, never per person. Cloudflare's privacy policy: https://www.cloudflare.com/privacypolicy/

## Hosting (Cloudflare)
The site is hosted on Cloudflare Pages, and accounts are stored in Cloudflare D1. Like any web host, Cloudflare processes basic request data (such as IP address and browser type) to deliver the site and protect it from attacks. To stop abuse, Overlune's server limits how often one IP address can call it: it counts requests in memory for about a minute and never stores or logs your IP address. Cloudflare's privacy policy: https://www.cloudflare.com/privacypolicy/

## Supporting Overlune (GitHub Sponsors)
The "Support Overlune" link goes to GitHub Sponsors. Supporting is optional and unlocks nothing: every part of Overlune is free for everyone. Overlune never sees or handles payments. If you sponsor, GitHub processes it under its own privacy statement: https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement

## Cookies
Overlune uses no tracking cookies and no trackers, and its visit counts (above) are cookie-free, so there is no cookie banner. Only if you sign in does it set two cookies, both needed for signing in and readable only by Overlune's server:
- `__Host-ol_signin`, for up to 10 minutes while you sign in on Twitch, so Overlune can check the answer comes back to the browser that asked;
- `__Host-ol_session`, for 30 days, to keep you signed in. Signing out deletes it.

## Children
Overlune is not directed at children under 13. You must be 13 or older to sign in (Twitch requires that too). If you're under the age where your country lets you agree to this yourself, ask a parent or guardian first. If you believe a child under 13 has signed in, email us and we'll delete the account.

## Your rights
If you don't sign in, we hold no personal data about you to look up, correct or delete: your settings are in your links and browser, which you control. If you sign in, you can see and delete your account as described above, and your name and picture update from Twitch each time you sign in. Error reports in Sentry are not linked to any name or account. For a copy of your data, or anything else, contact us below.

## Changes
If this policy changes, we will update the date at the top. The full history of this file is public in the project's GitHub repository.

## Contact
support@overlune.in
