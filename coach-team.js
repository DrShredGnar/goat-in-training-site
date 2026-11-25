/*
 * The coach's team page. Sign in with an emailed code (the same sign-in as the app), make a team, hand out its code,
 * see the players who joined, and pick the week's skill drills. Everything a player's family shares comes from the
 * database function team_roster, which only ever gives a coach what the parent agreed to (see the coach_teams
 * migration). Nothing typed by a family is put on the page as HTML: every name goes in as text.
 */
const app = document.getElementById('team-app');
const BACKEND = app?.dataset.url;
const KEY = app?.dataset.key;
const { sets: SETS, rotationStart: ROTATION } = JSON.parse(document.getElementById('team-sets')?.textContent || '{"sets":{}}');
const SPORTS = { football: 'Football', basketball: 'Basketball', baseball: 'Baseball and softball', hockey: 'Hockey', soccer: 'Soccer' };
const EVENTS = { dash20: '20-yard dash', shuttle: 'Shuttle', broad: 'Broad jump', pushups: 'Push-ups', hang: 'Bar hang', rope: 'Jump rope' };
const KEEP = 'goat-coach-session';

/* ---------- dates in the coach's own time ---------- */
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mondayOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
const THIS_MONDAY = mondayOf(new Date());
const NEXT_MONDAY = new Date(THIS_MONDAY.getFullYear(), THIS_MONDAY.getMonth(), THIS_MONDAY.getDate() + 7);
const shortDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
/* The set the app's rotation is on in a week, so "the usual turn" can say what it is. */
function usualSet(sport, monday) {
  const list = SETS[sport] || [];
  const [y, m, d] = ROTATION.split('-').map(Number);
  const weeks = Math.round((monday - new Date(y, m - 1, d)) / (7 * 864e5));
  return list.length ? list[((weeks % list.length) + list.length) % list.length] : '';
}

/* ---------- small DOM helpers: text only ---------- */
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid instanceof Node ? kid : String(kid));
  return e;
}
const say = (text, kind = 'note') => el('p', { class: kind === 'error' ? 'error' : 'small', role: kind === 'error' ? 'alert' : null }, text);

/* ---------- the session, kept in this browser ---------- */
let session = null;
try {
  session = JSON.parse(localStorage.getItem(KEEP) || 'null');
} catch {
  session = null;
}
function keep(s) {
  session = s ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: Date.now() + (s.expires_in || 3600) * 1000, email: s.user?.email ?? session?.email } : null;
  try {
    if (session) localStorage.setItem(KEEP, JSON.stringify(session));
    else localStorage.removeItem(KEEP);
  } catch {
    // Private browsing: signed in for this visit only.
  }
}

async function call(path, { method = 'GET', body, auth = true, prefer } = {}) {
  if (auth && session && Date.now() > session.expires_at - 60_000) {
    const r = await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token }, auth: false }).catch(() => null);
    keep(r);
    if (!r) throw Object.assign(new Error('Signed out'), { signedOut: true });
  }
  const headers = { apikey: KEY, 'Content-Type': 'application/json' };
  if (auth && session) headers.Authorization = `Bearer ${session.access_token}`;
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(BACKEND + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (res.status === 401 && auth) {
    keep(null);
    throw Object.assign(new Error('Signed out'), { signedOut: true });
  }
  if (!res.ok) throw Object.assign(new Error(data?.message || data?.msg || data?.error_description || 'Request failed'), { status: res.status, code: data?.code });
  return data;
}
const rpc = (name, args) => call(`/rest/v1/rpc/${name}`, { method: 'POST', body: args });
const problem = (e) => (e?.signedOut ? 'You were signed out. Sign in again.' : e instanceof TypeError ? 'Could not reach the server. Check your connection and try again.' : e?.message || 'Something went wrong. Try again.');

/* ---------- screens ---------- */
function show(...kids) {
  app.replaceChildren(...kids);
}

function signIn(note) {
  let email = '';
  const error = el('p', { class: 'error', role: 'alert' });
  const form = el(
    'form',
    { class: 'waitlist flyer-form', novalidate: true },
    el('h2', {}, 'Sign in'),
    el('label', { for: 'coach-email' }, 'Your email'),
    el('div', { class: 'row' }, el('input', { id: 'coach-email', type: 'email', autocomplete: 'email', required: true, placeholder: 'coach@example.com' }), el('button', { type: 'submit' }, 'Email me a code')),
    error,
    el('p', { class: 'small' }, 'We email a six-digit code. If you also use the app as a parent, the same email is the same account.'),
  );
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    email = form.querySelector('input').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return (error.textContent = 'Enter an email address, like name@example.com.');
    form.querySelector('button').disabled = true;
    try {
      await call('/auth/v1/otp', { method: 'POST', body: { email, create_user: true }, auth: false });
      code(email);
    } catch (e) {
      error.textContent = e.status === 429 ? 'Too many codes asked for. Wait a minute and try again.' : problem(e);
      form.querySelector('button').disabled = false;
    }
  });
  show(...(note ? [say(note)] : []), form);
}

function code(email) {
  const error = el('p', { class: 'error', role: 'alert' });
  const form = el(
    'form',
    { class: 'waitlist flyer-form', novalidate: true },
    el('h2', {}, 'Check your email'),
    el('p', {}, `We sent a six-digit code to ${email}.`),
    el('label', { for: 'coach-code' }, 'The code'),
    el('div', { class: 'row' }, el('input', { id: 'coach-code', type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', required: true }), el('button', { type: 'submit' }, 'Sign in')),
    error,
    el('button', { type: 'button', class: 'plain', onclick: () => signIn() }, 'Use another email'),
  );
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const token = form.querySelector('input').value.replace(/\D/g, '');
    if (token.length !== 6) return (error.textContent = 'The code is six digits.');
    form.querySelector('button').disabled = true;
    try {
      keep(await call('/auth/v1/verify', { method: 'POST', body: { type: 'email', email, token }, auth: false }));
      teams();
    } catch (e) {
      error.textContent = e.status === 400 || e.status === 403 ? 'That code did not work. Check it, or send a new one.' : problem(e);
      form.querySelector('button').disabled = false;
    }
  });
  show(form);
  form.querySelector('input').focus();
}

async function teams(note) {
  show(say('Loading your teams…'));
  let list;
  try {
    list = await call('/rest/v1/teams?select=id,name,coach_name,sport,join_code&order=created_at');
  } catch (e) {
    return e.signedOut ? signIn('Sign in again to see your teams.') : show(say(problem(e), 'error'), el('button', { type: 'button', class: 'plain', onclick: () => teams() }, 'Try again'));
  }
  const head = el(
    'div',
    { class: 'team-head' },
    el('p', { class: 'small' }, `Signed in as ${session?.email ?? 'a coach'}.`),
    el('button', { type: 'button', class: 'plain', onclick: signOut }, 'Sign out'),
  );
  show(head, ...(note ? [say(note)] : []), ...list.map((t) => teamCard(t)), makeTeam(list.length), danger());
}

function makeTeam(count) {
  if (count >= 10) return say('You have 10 teams, the most one coach can have. Delete one to make another.');
  const error = el('p', { class: 'error', role: 'alert' });
  const sport = el('select', { id: 'new-sport' }, ...Object.entries(SPORTS).map(([k, v]) => el('option', { value: k }, v)));
  const form = el(
    'form',
    { class: 'waitlist flyer-form team-new' },
    el('h2', {}, count ? 'Make another team' : 'Make your team'),
    el(
      'div',
      { class: 'pair' },
      el('p', {}, el('label', { for: 'new-name' }, 'Team name'), el('input', { id: 'new-name', type: 'text', maxlength: '40', required: true, placeholder: 'Eagles 10U' })),
      el('p', {}, el('label', { for: 'new-coach' }, 'Your name, as families see it'), el('input', { id: 'new-coach', type: 'text', maxlength: '40', required: true, placeholder: 'Coach Smith' })),
      el('p', {}, el('label', { for: 'new-sport' }, 'Sport'), sport),
    ),
    el('div', { class: 'row' }, el('button', { type: 'submit' }, 'Make the team')),
    error,
  );
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = form.querySelector('#new-name').value.trim();
    let coach = form.querySelector('#new-coach').value.trim();
    if (!name || !coach) return (error.textContent = 'Type the team’s name and yours.');
    if (!/^coach\b/i.test(coach)) coach = `Coach ${coach}`.slice(0, 40);
    form.querySelector('button[type=submit]').disabled = true;
    try {
      await rpc('create_team', { p_name: name, p_coach_name: coach, p_sport: sport.value });
      teams(`${name} is ready. Give families its code.`);
    } catch (e) {
      error.textContent = problem(e);
      form.querySelector('button[type=submit]').disabled = false;
    }
  });
  return form;
}

function teamCard(t) {
  const body = el('div', { class: 'team-body' }, say('Loading the players…'));
  const flyer = new URL('coaches.html', location.href);
  flyer.searchParams.set('team', t.name);
  flyer.searchParams.set('coach', t.coach_name);
  flyer.searchParams.set('code', t.join_code);
  flyer.hash = 'flyer-title';
  const card = el(
    'article',
    { class: 'team-card' },
    el('h2', {}, t.name),
    el('p', { class: 'small' }, `${SPORTS[t.sport] ?? t.sport} · ${t.coach_name}`),
    el('div', { class: 'team-code' }, el('span', { class: 'small' }, 'Team code'), el('strong', {}, t.join_code)),
    el('p', {}, 'Families type it in the app: Parent tab, Coach’s team. ', el('a', { href: flyer.href }, 'Print a flyer with this code'), '.'),
    focus(t),
    body,
    deleteTeam(t),
  );
  roster(t, body);
  return card;
}

/* The week's skill drills: the coach's pick, or the app's usual turn. */
function focus(t) {
  const list = SETS[t.sport] || [];
  const wrap = el('div', { class: 'team-focus' }, el('h3', {}, 'Skill drills'));
  const status = el('p', { class: 'small', 'aria-live': 'polite' });
  const weeks = [
    [THIS_MONDAY, 'This week'],
    [NEXT_MONDAY, 'Next week'],
  ];
  const selects = weeks.map(([monday, label]) => {
    const id = `focus-${t.id}-${ymd(monday)}`;
    const select = el(
      'select',
      { id },
      el('option', { value: '' }, `The usual turn (${usualSet(t.sport, monday)})`),
      ...list.map((name, i) => el('option', { value: String(i) }, name)),
    );
    select.addEventListener('change', async () => {
      select.disabled = true;
      const week = ymd(monday);
      try {
        if (select.value === '') await call(`/rest/v1/team_focus?team_id=eq.${t.id}&week=eq.${week}`, { method: 'DELETE' });
        else await call('/rest/v1/team_focus', { method: 'POST', body: { team_id: t.id, week, skill_set: Number(select.value) }, prefer: 'resolution=merge-duplicates' });
        status.textContent = `${label}: ${select.value === '' ? 'the usual turn' : list[Number(select.value)]}. Phones pick it up on their next sync.`;
      } catch (e) {
        status.textContent = problem(e);
      }
      select.disabled = false;
    });
    wrap.append(el('p', { class: 'focus-row' }, el('label', { for: id }, `${label}, from ${shortDay(monday)}`), select));
    return [ymd(monday), select];
  });
  wrap.append(status);
  call(`/rest/v1/team_focus?select=week,skill_set&team_id=eq.${t.id}&week=in.(${ymd(THIS_MONDAY)},${ymd(NEXT_MONDAY)})`)
    .then((rows) => {
      for (const r of rows ?? []) for (const [week, select] of selects) if (week === r.week) select.value = String(r.skill_set);
    })
    .catch(() => {});
  return wrap;
}

async function roster(t, body) {
  let rows;
  try {
    rows = await rpc('team_roster', { p_team: t.id, p_monday: ymd(THIS_MONDAY) });
  } catch (e) {
    return body.replaceChildren(say(problem(e), 'error'));
  }
  if (!rows.length) return body.replaceChildren(el('h3', {}, 'Players'), say('No families have joined yet. Hand out the code, or print the flyer.'));
  const trained = rows.filter((r) => r.sessions_week > 0).length;
  const better = (r) => {
    const parts = Object.entries(r.improved || {})
      .filter(([k]) => EVENTS[k])
      .map(([k, v]) => `${EVENTS[k]} ${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`);
    return parts.length ? parts.join(', ') : r.combines ? 'One Combine Day so far' : 'No Combine Day yet';
  };
  const table = el(
    'table',
    {},
    el('thead', {}, el('tr', {}, el('th', {}, 'Player'), el('th', {}, 'This week'), el('th', {}, 'Last 4 weeks'), el('th', {}, 'Combine Day, since the first'), el('th', {}, ''))),
    el(
      'tbody',
      {},
      ...rows.map((r) =>
        el(
          'tr',
          {},
          el('td', {}, r.name),
          el('td', {}, String(r.sessions_week)),
          el('td', {}, String(r.sessions_4w)),
          el('td', {}, better(r)),
          el('td', {}, el('button', { type: 'button', class: 'linkish', onclick: () => remove(t, r, body) }, 'Remove')),
        ),
      ),
    ),
  );
  body.replaceChildren(
    el('h3', {}, 'Players'),
    el('p', {}, `${trained} of ${rows.length} trained this week so far.`),
    el('div', { class: 'scroll' }, table),
    el('p', { class: 'small' }, 'Sessions are the app’s own: a team practice or game a family counts shows up too. Combine Day percents are each event’s latest result against the first one; a faster time is a plus.'),
  );
}

async function remove(t, r, body) {
  if (!confirm(`Take ${r.name} off ${t.name}? Their family can join again with the code.`)) return;
  try {
    await rpc('remove_from_team', { p_team: t.id, p_athlete: r.athlete_id });
    roster(t, body);
  } catch (e) {
    body.prepend(say(problem(e), 'error'));
  }
}

function deleteTeam(t) {
  return el(
    'details',
    { class: 'team-delete' },
    el('summary', {}, 'Delete this team'),
    el('p', { class: 'small' }, `Deleting ${t.name} takes every player off it and ends what their families share with you. The code stops working.`),
    el(
      'button',
      {
        type: 'button',
        class: 'plain danger',
        onclick: async () => {
          if (!confirm(`Delete ${t.name}?`)) return;
          try {
            await call(`/rest/v1/teams?id=eq.${t.id}`, { method: 'DELETE' });
            teams(`${t.name} is deleted.`);
          } catch (e) {
            alert(problem(e));
          }
        },
      },
      `Delete ${t.name}`,
    ),
  );
}

function danger() {
  return el(
    'details',
    { class: 'team-delete' },
    el('summary', {}, 'Delete my account'),
    el(
      'p',
      { class: 'small' },
      'This deletes the whole account for this email: your teams, and also any family training in the app if you use the same email as a parent. It cannot be undone.',
    ),
    el(
      'button',
      {
        type: 'button',
        class: 'plain danger',
        onclick: async () => {
          if (!confirm('Delete the whole account for this email, teams and app training included?')) return;
          try {
            await rpc('delete_my_account', {});
            keep(null);
            signIn('The account is deleted.');
          } catch (e) {
            alert(problem(e));
          }
        },
      },
      'Delete my account',
    ),
  );
}

async function signOut() {
  await call('/auth/v1/logout', { method: 'POST', body: {} }).catch(() => {});
  keep(null);
  signIn('Signed out.');
}

if (app && BACKEND && KEY) {
  if (session) teams();
  else signIn();
}
