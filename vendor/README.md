# Libraries and fonts served with the public pages

These files are copied into the site as they are, so the pages load nothing from another company's servers.
To update a library, replace the file with the same file from the new npm package (`dist/`).

| File | Package | Version | License |
| --- | --- | --- | --- |
| `gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js` | `gsap` | 3.15.1 | GSAP standard "no charge" license, https://gsap.com/standard-license (free for commercial use; not for building a visual animation builder that competes with Webflow) |
| `lenis.min.js` | `lenis` | 1.3.27 | MIT, see `lenis.LICENSE.txt` |
| `toqr.mjs` | `toqr` (the QR code encoder Expo's own tools use; `dist/toqr.mjs`) | 0.1.1 | MIT, see `toqr.LICENSE.md` |
| `fonts/dm-sans.woff2` | DM Sans, from Google Fonts | v17, Latin letters, every weight | SIL Open Font License 1.1, see `fonts/dm-sans.OFL.txt` |
| `fonts/nunito.woff2` | Nunito, from Google Fonts | v32, Latin letters, every weight | SIL Open Font License 1.1, see `fonts/nunito.OFL.txt` |

`site/motion.js` is ours. Its headline, reveal and counting effects follow React Bits' Split Text, Animated Content
and Count Up, rewritten in plain GSAP because the pages are not React. No React Bits code is included.

The fonts are declared at the top of `site/site.css`. To update one, open
`https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;700&family=Nunito:wght@800;900` in a browser, find the
block marked `latin` for the family, and save the file its `src` names over the one here.
