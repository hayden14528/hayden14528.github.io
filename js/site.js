/* =========================================================
   Hayden Levinson, portfolio
   Page behavior. scrollcraft.js is the scroll engine and is
   not edited; this file is the page's own.
   ========================================================= */
(function () {
  'use strict';

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var api = window.ScrollCraft ? window.ScrollCraft.mount(document.body) : null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- The rate wheel ----------
     The digit strip 3 4 5 6 7 is rolled by the Locus act's progress. Rather
     than a steady crawl, it rests on each whole number and rolls between them,
     the way a counter does, so wherever the visitor stops they are almost
     always looking at a clean digit.                                    */
  var locus = document.querySelector('.locus');
  var wheel = locus && locus.querySelector('.rate__wheel');
  if (api && wheel && !reduce) {
    var act = null;
    for (var i = 0; i < api.acts.length; i++) if (api.acts[i].el === locus) act = api.acts[i];
    var lastK = -1;
    var roll = function () {
      if (!act) return;
      var t = Math.max(0, Math.min(1, (act.p - 0.05) / 0.82));
      var x = t * 4, whole = Math.floor(x), part = x - whole;
      var r = Math.max(0, Math.min(1, (part - 0.32) / 0.36));   // rest, roll, rest
      r = r * r * (3 - 2 * r);
      var k = Math.min(4, whole + r);
      if (Math.abs(k - lastK) > 0.0005) { wheel.style.setProperty('--k', k.toFixed(4)); lastK = k; }
    };
    var queued = false;
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      // two frames: the engine updates the act's progress on the first
      requestAnimationFrame(function () { requestAnimationFrame(function () { queued = false; roll(); }); });
    }, { passive: true });
    window.addEventListener('resize', roll, { passive: true });
    roll();
  }

  /* ---------- Title wall: three planes of real work ----------
     Scroll moves each plane at its own rate, so the far pieces lag and the
     phones overtake them. On a mouse, the planes also lean a little toward
     the pointer. Scroll is written directly (a lagging plane reads as a
     stutter under a thumb); only the pointer lean is eased.            */
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

  if (fine) {
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = hero.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { mx = 0; my = 0; }, { passive: true });
  }

  function tick() {
    var y = Math.max(0, Math.min(window.scrollY, hero.offsetHeight));
    for (var i = 0; i < planes.length; i++) {
      var P = planes[i];
      P.x += (-mx * P.lean - P.x) * 0.09;
      P.y += (-my * P.lean * 0.6 - P.y) * 0.09;
      P.el.style.transform =
        'translate3d(' + P.x.toFixed(2) + 'px,' + (y * P.depth + P.y).toFixed(2) + 'px,0)';
    }
    frame = live ? requestAnimationFrame(tick) : 0;
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      live = entries[0].isIntersecting;
      if (live && !frame) frame = requestAnimationFrame(tick);
    }).observe(hero);
  }
  frame = requestAnimationFrame(tick);
})();
