/*
 * The coaches' page: puts a team's name on the flyer and into its QR code, in the visitor's own browser.
 * Without this script the page still shows a flyer with no team on it, which prints just as well.
 */
import { qrSvg } from './flyer-qr.js';

const flyer = document.getElementById('flyer');
const form = document.getElementById('flyer-form');
if (flyer && form) {
  const input = form.elements.team;
  const line = document.getElementById('flyer-team');
  const name = document.getElementById('flyer-team-name');
  const code = document.getElementById('flyer-qr');
  const site = flyer.dataset.site;

  // A team name as people write it: letters, numbers, spaces and a few marks, 40 characters at most.
  const tidy = (s) => s.replace(/[^\p{L}\p{N} &'.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
  // The same name as it goes in the address: "Eagles 10U" becomes "eagles-10u".
  const slug = (s) => s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  function show(typed, remember) {
    const team = tidy(typed);
    const tag = slug(team);
    name.textContent = team;
    line.hidden = !team;
    code.innerHTML = qrSvg(tag ? `${site}?team=${tag}` : site);
    if (remember) {
      const here = new URL(location.href);
      if (team) here.searchParams.set('team', team);
      else here.searchParams.delete('team');
      history.replaceState(null, '', here);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    show(input.value, true);
    flyer.scrollIntoView({ block: 'nearest' });
  });
  document.getElementById('flyer-print').addEventListener('click', () => {
    show(input.value, true);
    window.print();
  });

  // A link with a team already in it (a bookmark, or one coach sending it to another) opens with that team's flyer.
  const given = new URL(location.href).searchParams.get('team');
  if (given) {
    input.value = tidy(given);
    show(given, false);
  }
}
