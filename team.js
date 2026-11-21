/*
 * The home page, opened from a coach's flyer (site/coach.js): the QR code's address carries the team code and the
 * names as the coach typed them. Show who recommended the app. The waitlist form (site/waitlist.html) reads the team
 * code itself and keeps it for the visit; nothing is sent until a parent joins.
 */
(function () {
  var given = new URLSearchParams(location.search);
  var team = (given.get('team') || '').toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(team) || team.length > 40) return;

  // The same tidying as the flyer, so an address typed or edited by hand cannot put anything odd on the page.
  var tidy = function (s) {
    return (s || '').replace(/[^\p{L}\p{N} &'.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
  };
  var name = tidy(given.get('t'));
  var coach = tidy(given.get('c'));
  var note = document.getElementById('team-note');
  if (!note || !name) return;
  var bold = document.createElement('strong');
  bold.textContent = name;
  var lead = coach ? (/^coach\b/i.test(coach) ? '' : 'Coach ') + coach + ' recommends this for ' : 'Recommended by your coach for ';
  note.replaceChildren(lead, bold);
  note.hidden = false;
})();
