# Libraries served with the public pages

These files are copied into the site as they are, so the pages load nothing from another company's servers
besides the fonts. To update one, replace the file with the same file from the new npm package (`dist/`).

| File | Package | Version | License |
| --- | --- | --- | --- |
| `gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js` | `gsap` | 3.15.1 | GSAP standard "no charge" license, https://gsap.com/standard-license (free for commercial use; not for building a visual animation builder that competes with Webflow) |
| `lenis.min.js` | `lenis` | 1.3.27 | MIT, see `lenis.LICENSE.txt` |

`site/motion.js` is ours. Its headline, reveal and counting effects follow React Bits' Split Text, Animated Content
and Count Up, rewritten in plain GSAP because the pages are not React. No React Bits code is included.
