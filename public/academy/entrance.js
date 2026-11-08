/* ═══════════════════════════════════════════════════════
   Barone Investment Group — Cinematic Entrance Animation
   5-stage sequence, plays once per browser session
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Guard: only play once per session ──────────────────
  const SEEN_KEY = 'big_entrance_seen_v3';
  if (sessionStorage.getItem(SEEN_KEY)) {
    var ov = document.getElementById('entrance-overlay');
    if (ov) ov.classList.add('hidden');
    return;
  }

  // ── Elements ───────────────────────────────────────────
  var overlay   = document.getElementById('entrance-overlay');
  var canvas    = document.getElementById('entrance-canvas');
  var curtainL  = document.querySelector('.entrance-curtain-left');
  var curtainR  = document.querySelector('.entrance-curtain-right');
  var mark      = document.querySelector('.entrance-mark');
  var wordmark  = document.querySelector('.entrance-wordmark');
  var tagline   = document.querySelector('.entrance-tagline');
  var rule      = document.querySelector('.entrance-rule');
  var skipBtn   = document.querySelector('.entrance-skip');

  if (!overlay) return;

  // Lock scroll
  document.body.classList.add('entrance-active');

  // ── Particle network on canvas ─────────────────────────
  var ctx = canvas.getContext('2d');
  var particles = [];
  var raf;
  var W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawnParticles(count) {
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r:  Math.random() * 1.6 + 0.6,
        a:  Math.random() * 0.7 + 0.2
      });
    }
  }
  spawnParticles(70);

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);

    // Draw connection lines
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          var alpha = (1 - dist / 130) * 0.18;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = 'rgba(201,168,76,' + alpha + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw dots
    for (var k = 0; k < particles.length; k++) {
      var p = particles[k];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201,168,76,' + p.a + ')';
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    }

    raf = requestAnimationFrame(drawParticles);
  }
  drawParticles();

  // ── Typewriter helper ──────────────────────────────────
  function typeText(el, text, speed, onDone) {
    el.textContent = '';
    el.classList.add('typing');
    var i = 0;
    // We animate width from 0 → measured width of full text
    // Set full text invisibly to measure, then clear
    el.style.visibility = 'hidden';
    el.textContent = text;
    var fullW = el.scrollWidth;
    el.textContent = '';
    el.style.visibility = '';
    el.style.transition = 'none';

    function tick() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        // Animate width manually via inline style
        var pct = i / text.length;
        el.style.width = (pct * fullW) + 'px';
        i++;
        setTimeout(tick, speed);
      } else {
        el.classList.remove('typing');
        el.classList.add('done');
        el.style.width = fullW + 'px';
        if (onDone) onDone();
      }
    }
    tick();
  }

  // ── Skip / dismiss ─────────────────────────────────────
  var stage = document.querySelector('.entrance-stage');

  function dismiss() {
    sessionStorage.setItem(SEEN_KEY, '1');
    cancelAnimationFrame(raf);
    document.body.classList.remove('entrance-active');
    // Stage elements (logo/wordmark/tagline) fade out first
    if (stage) stage.classList.add('fade-out');
    // Then full overlay dissolves 200ms later, revealing the site
    setTimeout(function () {
      overlay.classList.add('fade-out');
    }, 200);
    setTimeout(function () {
      overlay.classList.add('hidden');
    }, 950);
  }

  skipBtn.addEventListener('click', dismiss);

  // ── SEQUENCE ───────────────────────────────────────────
  // Stage 1: particles form (0–850ms) — already running
  // Stage 2: curtains split open (850ms)
  // Stage 3: logo mark stamps in (1250ms) + shimmer
  // Stage 4: wordmark fades in (1600ms) + rule expands
  // Stage 5: tagline types (1950ms) → hold 500ms → exit (~3.1s total)

  // Show skip button after 1.2s
  setTimeout(function () {
    skipBtn.classList.add('visible');
  }, 1200);

  // Stage 2 — curtains open
  setTimeout(function () {
    curtainL.classList.add('open');
    curtainR.classList.add('open');
  }, 850);

  // Stage 3 — logo stamp in
  setTimeout(function () {
    mark.classList.add('stamped');
  }, 1250);

  // Stage 4 — wordmark + rule
  setTimeout(function () {
    wordmark.classList.add('visible');
    setTimeout(function () {
      rule.classList.add('expanded');
    }, 100);
  }, 1600);

  // Stage 5 — tagline typewriter
  setTimeout(function () {
    typeText(tagline, 'Finance Education for Gen Z', 38, function () {
      // Hold briefly then exit
      setTimeout(dismiss, 500);
    });
  }, 1950);

})();
