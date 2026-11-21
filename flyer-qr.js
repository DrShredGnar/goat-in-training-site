/*
 * Draws a QR code as an SVG picture. Used twice: by the build, for the code already on the coaches' flyer when the
 * page loads, and by coach.js in the browser, for the code with a team's name in it.
 * The encoder is toqr (MIT, site/vendor/README.md). Error correction is its level M: a code still reads with a
 * crease or a smudge across it, without the squares getting too small to print.
 */
import { toQR } from './vendor/toqr.js';

const QUIET = 4; // The white border a QR code needs, in squares.

export function qrSvg(text) {
  const cells = toQR(text, 0);
  const size = Math.sqrt(cells.length);
  let path = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!cells[y * size + x]) continue;
      // Join a run of dark squares in a row into one bar.
      let run = 1;
      while (x + run < size && cells[y * size + x + run]) run++;
      path += `M${x + QUIET} ${y + QUIET}h${run}v1h-${run}z`;
      x += run - 1;
    }
  }
  const box = size + QUIET * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="${box}" height="${box}" fill="#fff"/><path d="${path}" fill="#0A1633"/></svg>`;
}
