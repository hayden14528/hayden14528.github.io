/* =========================================================
   Hayden Levinson, portfolio
   Page behavior. scrollcraft.js is the scroll engine and is
   not edited; this file is the page's own.
   ========================================================= */
(function () {
  'use strict';

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // If the engine is missing or fails to start, the page falls back to static
  // mode (see the script in the head of index.html), so carry on without it.
  var api = null;
  try { api = window.ScrollCraft ? window.ScrollCraft.mount(document.body) : null; } catch (e) { api = null; }
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Reduced motion: scroll regions ----------
     With reduced motion nothing is pinned; the Locus strip and the storefront
     are ordinary scroll regions instead (site.css). A scroll region with
     nothing focusable inside cannot be reached from the keyboard in every
     browser, so give these two a tab stop and a name.                    */
  function region(selector, label) {
    var el = document.querySelector(selector);
    if (!el) return;
    el.tabIndex = 0;
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', label);
  }
  if (reduce) {
    region('.locus__rail', 'Locus Robotics pieces. Scrolls sideways.');
    region('.bb__frame', 'Bandage Buddies storefront. Scrolls.');
  }

  /* ---------- The rate wheel ----------
     The digit strip 3 4 5 6 7 is rolled by the Locus act's progress. Rather
     than a steady crawl, it rests on each whole number and rolls between them,
     the way a counter does, so wherever the visitor stops they are almost
     always looking at a clean digit.                                    */
  var locus = document.querySelector('.locus');
  var wheel = locus && locus.querySelector('.rate__wheel');
  var act = null;
  if (api && wheel && !reduce) {
    for (var i = 0; i < api.acts.length; i++) if (api.acts[i].el === locus) act = api.acts[i];
  }
  if (act) {
    var lastK = -1;
    var roll = function () {
      var t = Math.max(0, Math.min(1, (act.p - 0.05) / 0.82));   // same window as --t in site.css
      var x = t * 4, whole = Math.floor(x), part = x - whole;
      var r = Math.max(0, Math.min(1, (part - 0.32) / 0.36));   // rest, roll, rest
      r = r * r * (3 - 2 * r);
      var k = Math.min(4, whole + r);
      if (Math.abs(k - lastK) > 0.0005) { wheel.style.setProperty('--k', k.toFixed(4)); lastK = k; }
    };
    /* The engine recomputes the act's progress in its own animation frame.
       Roll on the frame of each scroll event and once more on the frame after,
       so the wheel always ends on the engine's final value, whichever callback
       ran first and however the last scroll event was timed.             */
    var framesLeft = 0, rolling = false;
    var step = function () {
      rolling = false;
      roll();
      if (--framesLeft > 0) { rolling = true; requestAnimationFrame(step); }
    };
    var requestRoll = function () {
      framesLeft = 2;
      if (!rolling) { rolling = true; requestAnimationFrame(step); }
    };
    window.addEventListener('scroll', requestRoll, { passive: true });
    window.addEventListener('resize', requestRoll, { passive: true });
    // the engine lays out again once the fonts arrive, which moves the act
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestRoll);
    requestRoll();
  }

  /* ---------- Title wall: three planes of real work ----------
     Scroll moves each plane at its own rate, so the far pieces lag and the
     phones overtake them. On a mouse, the planes also lean a little toward
     the pointer. Scroll is written directly (a lagging plane reads as a
     stutter under a thumb); only the pointer lean is eased. Frames are only
     requested while something is changing, so an idle page does no work.   */
  var hero = document.querySelector('[data-hero]');
  if (!hero || reduce) return;

  var planes = Array.prototype.map.call(hero.querySelectorAll('.plane'), function (el) {
    return {
      el: el,
      depth: parseFloat(el.getAttribute('data-depth')) || 0,
      lean: parseFloat(el.getAttribute('data-lean')) || 0,
      x: 0, y: 0
    };
  });
  if (!planes.length) return;

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var mx = 0, my = 0, live = true, frame = 0;
  var heroH = hero.offsetHeight;

  function tick() {
    frame = 0;
    var y = Math.max(0, Math.min(window.scrollY, heroH));
    var easing = false;
    for (var i = 0; i < planes.length; i++) {
      var P = planes[i];
      var tx = -mx * P.lean, ty = -my * P.lean * 0.6;
      P.x += (tx - P.x) * 0.09;
      P.y += (ty - P.y) * 0.09;
      if (Math.abs(tx - P.x) < 0.05 && Math.abs(ty - P.y) < 0.05) { P.x = tx; P.y = ty; }
      else easing = true;
      P.el.style.transform =
        'translate3d(' + P.x.toFixed(2) + 'px,' + (y * P.depth + P.y).toFixed(2) + 'px,0)';
    }
    if (easing) request();   // keep easing toward the pointer, then stop
  }
  function request() { if (live && !frame) frame = requestAnimationFrame(tick); }
  function measure() { heroH = hero.offsetHeight; request(); }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  if (fine) {
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = hero.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
      request();
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { mx = 0; my = 0; request(); }, { passive: true });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      // a batch can hold several records; the last one is the current state
      live = entries[entries.length - 1].isIntersecting;
      request();
    }).observe(hero);
  }
  request();
})();
