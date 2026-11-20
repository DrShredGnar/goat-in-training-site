/*
 * Motion for the public pages. Everything here is an extra: with scripts off, with a library missing, or with
 * "reduce motion" switched on, every page shows its finished state and reads the same.
 *
 *   Lenis          smooth wheel scrolling (every page)
 *   GSAP           the headline, the reveals and the climb (pages that use them; the build adds the files)
 *
 * The three effects follow React Bits' Split Text, Animated Content and Count Up, written directly in GSAP
 * because these pages are plain HTML with no React.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  var SplitText = window.SplitText;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- the climb: the app's mountain, walked one finished session at a time ---------- */
  /* Same rounding as fmtMult in src/core/progress.ts. */
  function fmtMult(x) {
    return (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : String(Math.round(x))) + '×';
  }

  /*
   * The build draws the mountain into the page as the end of the year (scripts/site-climb.ts): every flag up, the
   * whole trail climbed, the goat on the summit in all its gear. This moves those pieces to any session count.
   */
  function makeClimb(fig) {
    var chart = fig.querySelector('[data-climb-chart]');
    var rate = parseFloat(fig.getAttribute('data-rate'));
    /* "First Step:10:1.1×|…", written into the page by the build from the app's own list. */
    var ledges = (fig.getAttribute('data-ledges') || '').split('|').filter(Boolean).map(function (s) {
      var p = s.split(':');
      return { name: p[0], n: parseInt(p[1], 10), label: p[2] };
    });
    /* Where the trail turns: the start, then one point for each ledge. */
    var trail = (fig.getAttribute('data-trail') || '').split(' ').filter(Boolean).map(function (s) {
      var p = s.split(',');
      return [parseFloat(p[0]), parseFloat(p[1])];
    });
    if (!chart || !(rate > 1) || !ledges.length || trail.length !== ledges.length + 1) return null;
    var all = function (sel) { return Array.prototype.slice.call(chart.querySelectorAll(sel)); };
    var line = chart.querySelector('.climb-line');
    var goat = chart.querySelector('.climb-goat');
    var rings = all('.climb-ring'), flags = all('.climb-reached'), labels = all('.climb-label'), gears = all('.climb-gear');
    if (!line || !goat || flags.length !== ledges.length || gears.length !== ledges.length + 1) return null;

    var total = ledges[ledges.length - 1].n;
    var mult = function (n) { return Math.pow(rate, n); };
    var gw = parseFloat(goat.getAttribute('data-w')), gh = parseFloat(goat.getAttribute('data-h'));
    var marks = [0].concat(ledges.map(function (l) { return l.n; }));
    var out = {
      mult: fig.querySelector('[data-climb-mult]'),
      session: fig.querySelector('[data-climb-session]'),
      ledge: fig.querySelector('[data-climb-ledge]'),
    };
    var shownText = '', reached = -1;

    function draw(value) {
      var n = Math.max(0, Math.min(total, value));
      var whole = Math.floor(n);

      /* The climbed trail and the goat follow the exact value, so the walk is smooth between sessions. */
      var i = 0;
      while (i < marks.length - 1 && n >= marks[i + 1]) i++;
      var pts = trail.slice(0, i + 1);
      var at = trail[i];
      if (i < marks.length - 1) {
        var f = (n - marks[i]) / (marks[i + 1] - marks[i]);
        at = [trail[i][0] + (trail[i + 1][0] - trail[i][0]) * f, trail[i][1] + (trail[i + 1][1] - trail[i][1]) * f];
        if (f > 0) pts = pts.concat([at]);
      }
      line.setAttribute('points', pts.length > 1 ? pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') : '');
      goat.setAttribute('transform', 'translate(' + (at[0] - gw / 2).toFixed(1) + ' ' + (at[1] - gh * 0.93).toFixed(1) + ')');

      /* Flags, names and gear change only when a whole session lands on a ledge. */
      var count = 0;
      while (count < ledges.length && whole >= ledges[count].n) count++;
      if (count !== reached) {
        ledges.forEach(function (l, k) {
          flags[k].classList.toggle('off', k >= count);
          if (rings[k]) rings[k].classList.toggle('off', k < count);
          if (labels[k]) {
            labels[k].classList.toggle('got', k < count);
            labels[k].classList.toggle('next', k === count);
          }
        });
        gears.forEach(function (g, k) { g.classList.toggle('off', k !== count); });
        reached = count;
      }
      var next = count < ledges.length ? ledges[count] : null;
      var text = whole + '|' + count;
      if (text !== shownText) {
        shownText = text;
        labels.forEach(function (el, k) {
          var v = el.querySelector('[data-climb-value]');
          if (v) v.textContent = next && k === count ? next.n - whole + ' to go' : ledges[k].label;
        });
        if (out.mult) out.mult.textContent = fmtMult(mult(whole));
        if (out.session) out.session.textContent = whole + ' finished ' + (whole === 1 ? 'session' : 'sessions');
        if (out.ledge) out.ledge.textContent = next ? 'Next ledge: ' + next.name + ' · ' + next.label : ledges[ledges.length - 1].name + ' reached';
      }
    }

    draw(total);
    return { draw: draw, total: total, chart: chart };
  }

  var climbs = [];
  Array.prototype.forEach.call(document.querySelectorAll('[data-climb]'), function (fig) {
    var c = makeClimb(fig);
    if (c) climbs.push({ fig: fig, api: c });
  });

  /* ---------- smooth scrolling ---------- */
  var lenis = null;
  if (window.Lenis) {
    try {
      /* Lenis leaves touch scrolling to the phone and turns its smoothing off under "reduce motion". */
      lenis = new window.Lenis({ autoRaf: !gsap });
      if (gsap) {
        if (ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      }
    } catch (e) {
      lenis = null;
    }
  }

  /* ---------- headline, reveals and the scrubbed climb ---------- */
  function show() {
    root.classList.remove('motion-pending');
  }
  if (!gsap || !ScrollTrigger || still.matches || !root.classList.contains('motion-pending')) {
    show();
    return;
  }

  try {
    gsap.registerPlugin(ScrollTrigger);
    if (SplitText) gsap.registerPlugin(SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });

    var singles = gsap.utils.toArray('[data-reveal]');
    var groups = gsap.utils.toArray('[data-reveal-group]');
    var heads = gsap.utils.toArray('[data-split]');
    var marks = gsap.utils.toArray('.hl');

    /* Take over the hidden starting state from the stylesheet, so a later failure can never leave text hidden. */
    gsap.set(singles, { autoAlpha: 0, y: 18 });
    groups.forEach(function (g) { gsap.set(g.children, { autoAlpha: 0, y: 14 }); });
    gsap.set(heads, { autoAlpha: 0 });
    marks.forEach(function (m) { m.classList.add('hl-wait'); });
    show();

    var land = function (targets, each) {
      return gsap.to(targets, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: each, overwrite: true, clearProps: 'transform' });
    };
    ScrollTrigger.batch(singles, { start: 'top 90%', once: true, onEnter: function (batch) { land(batch, 0.09); } });
    groups.forEach(function (g) {
      ScrollTrigger.create({ trigger: g, start: 'top 88%', once: true, onEnter: function () { land(g.children, 0.07); } });
    });

    /* The headline rises a word at a time, then the marker runs under "1% better". */
    var markOn = function () { marks.forEach(function (m) { m.classList.remove('hl-wait'); }); };
    var headline = function () {
      heads.forEach(function (el) {
        gsap.set(el, { autoAlpha: 1 });
        if (!SplitText) { gsap.from(el, { autoAlpha: 0, y: 18, duration: 0.6, ease: 'power3.out', onComplete: markOn }); return; }
        var played = false;
        SplitText.create(el, {
          type: 'words',
          mask: 'words',
          autoSplit: true,
          onSplit: function (self) {
            if (played) return; /* a re-split after a resize or a late font keeps the words where they are */
            played = true;
            return gsap.from(self.words, { yPercent: 110, duration: 0.75, ease: 'expo.out', stagger: 0.07, onComplete: markOn });
          },
        });
      });
      if (!heads.length) markOn();
    };
    var started = false;
    var start = function () { if (!started) { started = true; headline(); } };
    /* Wait for the display font so the words are measured once, but never for long. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
    setTimeout(start, 700);

    /* Scrolling past the mountain walks the goat through the year. */
    climbs.forEach(function (c) {
      var state = { n: 0 };
      c.api.draw(0);
      /* The walk runs while the whole mountain is on the screen: from its foot coming into view to its summit nearing the top. */
      gsap.to(state, {
        n: c.api.total,
        ease: 'none',
        onUpdate: function () { c.api.draw(state.n); },
        scrollTrigger: { trigger: c.api.chart, start: 'clamp(bottom 100%)', end: 'clamp(top 5%)', scrub: 1 },
      });
    });
  } catch (e) {
    /* Anything unexpected: drop the effects and show the page as written. */
    show();
    gsap.set('[data-reveal], [data-reveal-group] > *, [data-split]', { clearProps: 'all' });
    Array.prototype.forEach.call(document.querySelectorAll('.hl-wait'), function (m) { m.classList.remove('hl-wait'); });
    climbs.forEach(function (c) { c.api.draw(c.api.total); });
  }
})();
