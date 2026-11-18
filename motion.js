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

  /* ---------- the climb: a year of the 1% curve, to scale ---------- */
  var COAT = '#FFFDF7';
  var LINE = '#0F172A';
  /* Same shapes as the app's goat (src/components/goat.tsx). */
  var GOAT =
    '<svg class="goat" width="39" height="34" viewBox="0 -5 46 45" aria-hidden="true">' +
    [11, 16.5, 24, 29.5]
      .map(function (x) {
        return '<rect x="' + x + '" y="24" width="4.5" height="14" rx="2.2" fill="' + COAT + '" stroke="' + LINE + '" stroke-width="2"/>';
      })
      .join('') +
    '<path d="M9 16 L4 11" stroke="' + LINE + '" stroke-width="5.5" stroke-linecap="round"/>' +
    '<path d="M9 16 L4 11" stroke="' + COAT + '" stroke-width="2" stroke-linecap="round"/>' +
    '<rect x="8" y="13" width="27" height="15" rx="7.5" fill="' + COAT + '" stroke="' + LINE + '" stroke-width="2.5"/>' +
    '<path d="M34 8 C32 0 25 -2 20 3" stroke="' + LINE + '" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M34 8 C32 0 25 -2 20 3" stroke="' + COAT + '" stroke-width="2" stroke-linecap="round" fill="none"/>' +
    '<path d="M30 13 C30 8 34 6 37.5 7 C41 8 44.5 12 44.5 15.5 C44.5 18 42.5 19 40 18.5 C36 20 30 18.5 30 13 Z" fill="' + COAT + '" stroke="' + LINE + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<ellipse cx="30" cy="11.5" rx="3.2" ry="1.8" fill="' + COAT + '" stroke="' + LINE + '" stroke-width="2" transform="rotate(-25 30 11.5)"/>' +
    '<path d="M38.5 19 L39.5 25.5 L42 19 Z" fill="' + COAT + '" stroke="' + LINE + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="37" cy="11.5" r="1.5" fill="' + LINE + '"/><circle cx="42.5" cy="14.5" r="0.8" fill="' + LINE + '"/></svg>';

  /* Same rounding as fmtMult in src/core/progress.ts. */
  function fmtMult(x) {
    return (x < 10 ? x.toFixed(2) : x < 100 ? x.toFixed(1) : String(Math.round(x))) + '×';
  }

  function makeClimb(fig) {
    var chart = fig.querySelector('[data-climb-chart]');
    var rate = parseFloat(fig.getAttribute('data-rate'));
    var total = parseInt(fig.getAttribute('data-sessions'), 10);
    if (!chart || !(rate > 1) || !(total > 0)) return null;
    var mult = function (n) { return Math.pow(rate, n); };
    /* "First Step:1.1|Foothill:1.25|…", written into the page by the build from the app's own list. */
    var ledges = (fig.getAttribute('data-ledges') || '').split('|').filter(Boolean).map(function (s) {
      var i = s.lastIndexOf(':');
      var m = parseFloat(s.slice(i + 1));
      return { name: s.slice(0, i), n: Math.ceil(Math.log(m) / Math.log(rate) - 1e-9), label: m + '×' };
    });
    ledges.push({ name: fig.getAttribute('data-peak') || 'Year Peak', n: total, label: fmtMult(mult(total)) });

    var out = {
      mult: fig.querySelector('[data-climb-mult]'),
      session: fig.querySelector('[data-climb-session]'),
      ledge: fig.querySelector('[data-climb-ledge]'),
    };
    var PAD = { top: 56, right: 30, bottom: 10, left: 26 };
    var POLE = 46; /* tall enough that the flag still shows above the goat at the top */
    var big = 1;   /* the goat is drawn larger on a wide chart */
    var w = 0, h = 0, n = total, shownText = '', reached = -1;
    var climbed, dots = [], goat;
    var hi = mult(total);
    var px = function (k) { return PAD.left + (k / total) * (w - PAD.left - PAD.right); };
    var py = function (k) { return h - PAD.bottom - 14 - ((mult(k) - 1) / (hi - 1)) * (h - PAD.top - PAD.bottom - 14); };
    var pt = function (k) { return px(k).toFixed(1) + ',' + py(k).toFixed(1); };

    function build() {
      w = chart.clientWidth;
      h = chart.clientHeight;
      if (!w || !h) return;
      big = w >= 560 ? 1.35 : 1;
      POLE = Math.round(44 * big) + 2;
      PAD.top = POLE + 10;
      PAD.right = Math.round(30 * big);
      var base = h - PAD.bottom;
      var line = '';
      for (var k = 0; k <= total; k++) line += (k ? ' L' : 'L') + pt(k);
      var fx = px(total), fy = py(total);
      chart.innerHTML =
        '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
        '<path class="climb-slope" d="M0,' + py(0).toFixed(1) + ' ' + line + ' L' + w + ',' + fy.toFixed(1) + ' L' + w + ',' + base + ' L0,' + base + ' Z"/>' +
        '<path class="climb-line" d="" fill="none"/>' +
        '<line class="climb-pole" x1="' + fx + '" y1="' + fy + '" x2="' + fx + '" y2="' + (fy - POLE) + '"/>' +
        '<polygon class="climb-flag" points="' + fx + ',' + (fy - POLE) + ' ' + (fx - 15) + ',' + (fy - POLE + 6) + ' ' + fx + ',' + (fy - POLE + 12) + '"/>' +
        ledges.slice(0, -1).map(function (l) {
          return '<circle class="climb-dot" cx="' + px(l.n).toFixed(1) + '" cy="' + py(l.n).toFixed(1) + '" r="4.5"/>';
        }).join('') +
        '</svg>' + GOAT;
      climbed = chart.querySelector('.climb-line');
      dots = Array.prototype.slice.call(chart.querySelectorAll('.climb-dot'));
      goat = chart.querySelector('.goat');
      goat.setAttribute('width', (39 * big).toFixed(1));
      goat.setAttribute('height', (34 * big).toFixed(1));
      goat.style.transformOrigin = (22 * big).toFixed(1) + 'px ' + (33 * big).toFixed(1) + 'px';
      reached = -1;
      draw(n, true);
    }

    function draw(value, quiet) {
      n = Math.max(0, Math.min(total, value));
      if (!climbed) return;
      var whole = Math.floor(n);
      var d = 'M' + pt(0);
      for (var k = 1; k <= whole; k++) d += ' L' + pt(k);
      if (n > whole) d += ' L' + pt(n);
      climbed.setAttribute('d', n > 0 ? d : '');
      /* The goat leans into the slope, but only part of the way: a goat stays upright on a steep face. */
      var rise = Math.atan2(py(Math.max(0, n - 2)) - py(Math.min(total, n + 2)), px(Math.min(total, n + 2)) - px(Math.max(0, n - 2)));
      var lean = Math.min(26, (rise * 180) / Math.PI * 0.5);
      lean *= Math.min(1, (total - n) / 6); /* and stands level on the flat top */
      goat.style.transform = 'translate(' + (px(n) - 22 * big).toFixed(1) + 'px,' + (py(n) - 33 * big).toFixed(1) + 'px) rotate(' + (-lean).toFixed(1) + 'deg)';

      var count = 0;
      while (count < ledges.length - 1 && whole >= ledges[count].n) count++;
      if (count !== reached) {
        dots.forEach(function (dot, i) {
          var on = i < count;
          dot.classList.toggle('on', on);
          /* A ledge pops as the goat steps onto it. */
          if (on && i === count - 1 && count > reached && !quiet && gsap) {
            gsap.fromTo(dot, { attr: { r: 10 } }, { attr: { r: 4.5 }, duration: 0.45, ease: 'back.out(2.5)', overwrite: true });
          }
        });
        reached = count;
      }
      var next = whole >= total ? null : ledges[count];
      var text = fmtMult(mult(whole)) + '|' + whole + '|' + (next ? next.name : '');
      if (text !== shownText) {
        shownText = text;
        if (out.mult) out.mult.textContent = fmtMult(mult(whole));
        if (out.session) out.session.textContent = whole + ' finished ' + (whole === 1 ? 'session' : 'sessions');
        if (out.ledge) out.ledge.textContent = next ? 'Next ledge: ' + next.name + ' · ' + next.label : ledges[ledges.length - 1].name + ' reached';
      }
    }

    /* The chart box only takes up room once there is something to draw in it. */
    fig.classList.add('drawn');
    build();
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (chart.clientWidth !== w || chart.clientHeight !== h) build();
      }).observe(chart);
    }
    return { draw: draw, total: total };
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
      c.api.draw(0, true);
      gsap.to(state, {
        n: c.api.total,
        ease: 'none',
        onUpdate: function () { c.api.draw(state.n); },
        scrollTrigger: { trigger: c.fig, start: 'clamp(top 78%)', end: 'clamp(bottom 62%)', scrub: 0.6 },
      });
    });
  } catch (e) {
    /* Anything unexpected: drop the effects and show the page as written. */
    show();
    gsap.set('[data-reveal], [data-reveal-group] > *, [data-split]', { clearProps: 'all' });
    Array.prototype.forEach.call(document.querySelectorAll('.hl-wait'), function (m) { m.classList.remove('hl-wait'); });
    climbs.forEach(function (c) { c.api.draw(c.api.total, true); });
  }
})();
