# Carl Cahill — Portfolio landing page

Fractional Creative Director and fellow agency founder. Static landing
page built from a Figma design with plain HTML and CSS — no build step,
no framework.

## Stack

- HTML5 + CSS3
- [Fustat](https://fonts.google.com/specimen/Fustat) via Google Fonts
- All images and SVGs are served from `assets/`

## Project structure

```
.
├── index.html
├── styles.css
├── script.js     # Scroll-tied hero fade + reveal-on-view animations
├── assets/
│   ├── images/   # PNG photography, device frames and screens
│   └── svg/      # Logos, brackets, dashed lines, shadows
└── README.md
```

## Running locally

The page has no build step. From the project root, run any static file
server, for example:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Social previews and SEO

`index.html` includes canonical, Open Graph, Twitter Card, and JSON-LD
metadata. **Update every `https://carlcahill.com` URL** in the `<head>` (and
in the JSON-LD script) to match your real domain so link previews load
the hero image (`assets/images/hero-portrait.png`) correctly on LinkedIn,
iMessage, Slack, etc. Relative `og:image` paths are not reliable across platforms.

After deploying, validate with your host’s link inspector or
[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
(if you use Meta tools).

## Analytics & cookies

The site loads Google Analytics 4 only after Consent Mode is satisfied.
The banner stores `cc_cookie_consent` (`granted` / `denied`) in `localStorage`
and syncs with `gtag('consent', ...)`. Expand the **Privacy & cookies**
section on the page and add your formal privacy notice and contact details
for GDPR requests before going live.

## Editing

- Copy and section content lives in `index.html`.
- All design tokens (colors, fonts, spacing) live at the top of
  `styles.css` as CSS custom properties on `:root`.
- New brand logos can be dropped into `assets/svg/` and referenced in
  the `<ul class="logos">` list in `index.html`.

## Notes on the design

- The layout follows the Figma reference at 1440px and scales down with
  breakpoints at 1280px, 900px and 600px.
- The "Great Design / Experiences / Commerce" sections use a 30°
  rotated phone mockup positioned over the headline.
- Logos and devices use `display: contents`-style flex layout, allowing
  rows to wrap responsively while preserving fixed proportions on
  desktop.

## Motion

- The hero portrait sits in a fixed background layer that fades out
  across the first viewport of scroll, driven by a `--hero-opacity`
  custom property updated inside a `requestAnimationFrame` loop.
- Anything tagged `.reveal` (eyebrows, awards list, achievements,
  experience rows, etc.) fades up when it enters the viewport — and
  fades back out when it leaves — so the transitions replay both ways
  as the user scrolls up and down.
- Anything tagged `.title-reveal` is split into per-character spans by
  `script.js` and eased in with a blur and a staggered delay
  (`--char-i * 22ms`). The cascade also reverses on exit.
- Everything respects `prefers-reduced-motion: reduce` — the hero stays
  fully visible and reveals snap straight to their final state.
