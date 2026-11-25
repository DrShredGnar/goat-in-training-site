/*
 * The coaches' page: puts a team's name, its town or league and the coach's name on the flyer, and the team into its
 * QR code, in the visitor's own browser. Without this script the page still shows a flyer with no team on it, which
 * prints just as well.
 *
 * The QR code opens the home page with three things in the address:
 *   team   the team code, "eagles-10u-portland": the team's name and its town or league, so two leagues' "Eagles 10U"
 *          count apart. The waitlist saves it (join_waitlist's p_team), and later it is the App Store campaign tag.
 *   t, c   the team's name and the coach's name as typed, which the home page shows ("Coach Smith recommends…").
 */
import { qrSvg } from './flyer-qr.js';

const flyer = document.getElementById('flyer');
const form = document.getElementById('flyer-form');
if (flyer && form) {
  const input = form.elements.team;
  const placeInput = form.elements.place;
  const coachInput = form.elements.coach;
  const codeInput = form.elements.code;
  const codeLine = document.getElementById('flyer-code');
  // A team code from the coach's team page: six letters and numbers, never I, L, O, 0 or 1.
  const teamCode = (s) => (/^[A-HJKMNP-Z2-9]{6}$/.test((s || '').trim().toUpperCase()) ? s.trim().toUpperCase() : '');
  const line = document.getElementById('flyer-team');
  const code = document.getElementById('flyer-qr');
  const site = flyer.dataset.site;

  // A team name as people write it: letters, numbers, spaces and a few marks, 40 characters at most.
  const tidy = (s) => s.replace(/[^\p{L}\p{N} &'.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
  // The same name as it goes in the address: "Eagles 10U" becomes "eagles-10u".
  const slug = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-+$/, '');

  // "Coach Smith recommends this for the families of Eagles 10U, Portland", built from text nodes only.
  function sentence(team, place, coach) {
    const bold = (text) => Object.assign(document.createElement('strong'), { textContent: text });
    const parts = [coach ? `${/^coach\b/i.test(coach) ? '' : 'Coach '}${coach} recommends this for the families of ` : 'For the families of ', bold(team)];
    if (place) parts.push(`, ${place}`);
    line.replaceChildren(...parts);
    // Past about one line, the headline gets smaller so the list still clears the QR code.
    flyer.classList.toggle('long', line.textContent.length > 48);
  }

  function show(typed, remember) {
    const team = tidy(typed.team);
    const place = team ? tidy(typed.place) : '';
    const coach = team ? tidy(typed.coach) : '';
    const tag = slug(place ? `${team} ${place}` : team);
    sentence(team, place, coach);
    line.hidden = !team;
    const scan = new URL(site);
    if (tag) {
      scan.searchParams.set('team', tag);
      scan.searchParams.set('t', team);
      if (coach) scan.searchParams.set('c', coach);
    }
    code.innerHTML = qrSvg(scan.href);
    const joinCode = team ? teamCode(typed.code) : '';
    codeLine.querySelector('strong').textContent = joinCode;
    codeLine.hidden = !joinCode;
    if (remember) {
      const here = new URL(location.href);
      for (const [key, value] of [['team', team], ['place', place], ['coach', coach], ['code', team ? teamCode(typed.code) : '']]) {
        if (value) here.searchParams.set(key, value);
        else here.searchParams.delete(key);
      }
      history.replaceState(null, '', here);
    }
  }
  const typed = () => ({ team: input.value, place: placeInput.value, coach: coachInput.value, code: codeInput.value });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    show(typed(), true);
    flyer.scrollIntoView({ block: 'nearest' });
  });
  document.getElementById('flyer-print').addEventListener('click', () => {
    show(typed(), true);
    window.print();
  });

  // A link with a team already in it (a bookmark, or one coach sending it to another) opens with that team's flyer.
  const given = new URL(location.href).searchParams;
  if (given.get('team')) {
    input.value = tidy(given.get('team'));
    placeInput.value = tidy(given.get('place') || '');
    coachInput.value = tidy(given.get('coach') || '');
    codeInput.value = teamCode(given.get('code'));
    show(typed(), false);
  }
}
