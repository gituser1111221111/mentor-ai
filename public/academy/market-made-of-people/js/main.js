/* ============================================================
   The Market Is Made of People - motion
   GSAP + ScrollTrigger. Progressive enhancement:
   content is visible without JS; this only enhances.
   ============================================================ */
(function () {
  "use strict";

  document.documentElement.classList.add("has-js");

  // Palette tokens for the canvas figures (rgb triplets, used in rgba() strings).
  var GOLD = "201,162,75";       // #c9a24b
  var GOLD_SOFT = "217,189,124";
  var BLUE = "91,143,199";

  // Build the flowing gold paths into the system-section background up front so
  // they exist even in static/no-motion modes (they just don't animate there).
  var flowPaths = buildFlowPaths(".flow-paths");

  // Build the canvas figures (01 chart-to-people, 04 people-network) up front so a
  // representative still frame is painted even in static/no-motion/showall modes.
  var figures = buildFigures();

  // Hero background: rising gold embers (painted once now so it shows statically too).
  var heroEmbers = buildEmbers("#heroEmbers");

  // Static capture / no-motion mode: ?showall reveals every section at once
  // (used for screenshots/previews and as an accessible reduced-motion fallback).
  if (/[?&]showall\b/.test(window.location.search)) {
    document.documentElement.classList.remove("has-js");
    var only = (window.location.search.match(/[?&]only=([\w-]+)/) || [])[1];
    if (only) {
      document.querySelectorAll(".panel, .hero").forEach(function (sec) {
        if (sec.id !== only) sec.style.display = "none";
      });
    }
    return;
  }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The sticky nav is plain DOM work; wire it up regardless of GSAP.
  initNav();

  if (typeof gsap === "undefined") {
    // GSAP failed to load - reveal everything so nothing stays hidden.
    document.documentElement.classList.remove("has-js");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Lenis smooth scroll ----------
     Momentum-based scrolling for a smoother, more premium feel. Driven off
     GSAP's ticker and synced to ScrollTrigger so pins/scrubs stay accurate.
     Skipped for reduced-motion (native scroll) and if the lib fails to load. */
  var lenis = null;
  if (!reduced && typeof Lenis !== "undefined") {
    lenis = new Lenis({
      duration: 1.05,
      easing: function (t) { return 1 - Math.pow(1 - t, 3); }, // ease-out cubic
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // In-page anchor links route through Lenis (or native smooth) so the nav and
  // CTAs glide instead of jumping.
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute("href");
    if (!href || href.length < 2) return;
    a.addEventListener("click", function (e) {
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -8, duration: 1.1 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- Flowing gold paths (system background) ---------- */
  if (!reduced) animateFlowPaths(flowPaths);

  /* ---------- Canvas figures (chart-to-people, people-network) ---------- */
  animateFigures(figures, reduced);

  /* ---------- Hero embers ---------- */
  if (!reduced) animateEmbers(heroEmbers);

  /* ---------- Scroll progress bar ---------- */
  var bar = document.getElementById("progressBar");
  if (bar) {
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: function (self) {
        bar.style.width = (self.progress * 100).toFixed(2) + "%";
      },
    });
  }

  /* ---------- Hero intro ---------- */
  var heroLines = gsap.utils.toArray(".hero .reveal-line");
  var heroBits = gsap.utils.toArray(".hero .reveal");
  var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.to(heroLines, { y: 0, opacity: 1, duration: 1.05, stagger: 0.12 }, 0.15)
    .to(heroBits, { y: 0, opacity: 1, duration: 0.9, stagger: 0.12 }, 0.5);

  /* ---------- Section reveals (bold directional slide-ins) ----------
     Each panel's content travels in from a direction and cascades with a
     stagger, so a section reads as one deliberate move instead of a fade-up.
     Split sections send text and media in from opposite sides; full-width
     sections alternate down the page. data-reveal="left|right|up" overrides. */
  var revealEls = gsap.utils.toArray(".panel .reveal");
  if (reduced) {
    // Accessibility: no travel, just make sure everything is shown.
    gsap.set(revealEls, { opacity: 1, x: 0, y: 0 });
  } else {
    var fullDirs = ["up", "left", "right", "up", "right", "left"];
    var DIST = 90; // bolder horizontal travel so direction reads clearly
    gsap.utils.toArray(".panel").forEach(function (panel, i) {
      var isSplit = panel.classList.contains("panel--split");
      var revRow = panel.classList.contains("panel--split-rev");
      var els = gsap.utils.toArray(panel.querySelectorAll(".reveal"));
      if (!els.length) return;

      els.forEach(function (el) {
        var dir = el.getAttribute("data-reveal");
        if (!dir) {
          if (isSplit) {
            var inMedia = !!el.closest(".split__media");
            // text in from one side, media from the other (flipped on reversed rows)
            dir = inMedia ? (revRow ? "left" : "right") : (revRow ? "right" : "left");
          } else {
            dir = fullDirs[i % fullDirs.length];
          }
        }
        var from = { opacity: 0, x: 0, y: 0 };
        if (dir === "left") from.x = -DIST;
        else if (dir === "right") from.x = DIST;
        else from.y = 56;
        gsap.set(el, from);
      });

      // One trigger per panel drives a staggered cascade of its children.
      ScrollTrigger.create({
        trigger: panel,
        start: "top 74%",
        once: true,
        onEnter: function () {
          gsap.to(els, {
            x: 0, y: 0, opacity: 1,
            duration: 1.1, ease: "power3.out",
            stagger: 0.12,
          });
        },
      });
    });
  }

  /* ---------- Stat counters ---------- */
  gsap.utils.toArray(".stat__num[data-count]").forEach(function (el) {
    var end = parseFloat(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    // decode HTML entities used in data-prefix (e.g. &lt;$)
    var tmp = document.createElement("textarea");
    tmp.innerHTML = prefix;
    prefix = tmp.value;
    var obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: function () {
        gsap.to(obj, {
          v: end,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: function () {
            el.textContent = prefix + Math.round(obj.v) + suffix;
          },
        });
      },
    });
  });

  /* ---------- Build console: agents reporting in ---------- */
  var consoleBody = document.getElementById("consoleBody");
  if (consoleBody) {
    var lines = gsap.utils.toArray("#consoleBody .cl");
    if (reduced) {
      gsap.set(lines, { opacity: 1, y: 0 });
    } else {
      ScrollTrigger.create({
        trigger: "#build",
        start: "top 60%",
        once: true,
        onEnter: function () {
          gsap.to(lines, { opacity: 1, y: 0, duration: 0.4, stagger: 0.3, ease: "power2.out" });
        },
      });
    }
  }

  /* ---------- Agent spider-web diagram (scroll-scrubbed build) ----------
     The signature non-linear moment: on desktop the diagram pins in place and
     ASSEMBLES as you scroll (hub appears, spokes draw, specialists pop in),
     so scrolling visibly constructs the system instead of just passing it. */
  var mesh = document.getElementById("mesh");
  if (mesh) {
    var edges = mesh.querySelectorAll(".mesh__edges path");
    edges.forEach(function (p) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
    var meshNodes = mesh.querySelectorAll(".node");
    var hubNode = mesh.querySelector(".node--top");
    var ringNodes = mesh.querySelectorAll(".node:not(.node--top)");

    // Reset the diagram to its "unbuilt" state, then return a timeline that
    // builds it. `scrubbed` tightens the easing/overlap for scroll-driven play.
    function buildMeshTl(scrubbed) {
      gsap.set(meshNodes, { opacity: 0, scale: 0.78, transformOrigin: "center" });
      edges.forEach(function (p) { p.style.strokeDashoffset = p.style.strokeDasharray; });
      var tl = gsap.timeline();
      tl.to(hubNode, {
        opacity: 1, scale: 1,
        duration: scrubbed ? 0.3 : 0.5,
        ease: scrubbed ? "power2.out" : "back.out(1.7)",
      })
        .to(edges, {
          strokeDashoffset: 0,
          duration: scrubbed ? 0.55 : 0.9,
          stagger: 0.05,
          ease: "power1.inOut",
        }, scrubbed ? "-=0.05" : "-=0.2")
        .to(ringNodes, {
          opacity: 1, scale: 1,
          duration: scrubbed ? 0.35 : 0.5,
          stagger: 0.08,
          ease: scrubbed ? "power2.out" : "back.out(1.7)",
        }, scrubbed ? "-=0.25" : "-=0.7");
      return tl;
    }

    if (reduced) {
      gsap.set(meshNodes, { opacity: 1, scale: 1 });
      edges.forEach(function (p) { p.style.strokeDashoffset = 0; });
    } else {
      ScrollTrigger.matchMedia({
        // Desktop: pin the diagram and scrub the build across the scroll.
        "(min-width: 900px)": function () {
          ScrollTrigger.create({
            trigger: mesh,
            start: "center 60%",
            end: "+=640",
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: 0.8,
            animation: buildMeshTl(true),
          });
        },
        // Mobile / small screens: no pin (janky); just build on enter.
        "(max-width: 899px)": function () {
          var tl = buildMeshTl(false);
          ScrollTrigger.create({ trigger: mesh, start: "top 80%", animation: tl });
        },
      });

      // Gentle idle float once built (y only, so it never fights the build).
      gsap.to(meshNodes, {
        y: -6,
        duration: 2.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.25, from: "random" },
      });
    }
  }

  /* ---------- Subtle hero parallax ---------- */
  if (!reduced) {
    gsap.to(".hero__media", {
      yPercent: 18,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
  }

  /* ---------- Image parallax (split frames + outlook band) ---------- */
  if (!reduced) {
    gsap.utils.toArray("[data-parallax] img, .outlook__bg img").forEach(function (img) {
      var panel = img.closest(".panel") || img;
      gsap.fromTo(
        img,
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: "none",
          scrollTrigger: { trigger: panel, start: "top bottom", end: "bottom top", scrub: true },
        }
      );
    });
  }

  /* ---------- Section entrance (page-to-page feel under snap) ---------- */
  if (!reduced) {
    gsap.utils.toArray(".panel").forEach(function (panel) {
      // Skip the pinned system section; an autoAlpha scrub fights the pin.
      if (panel.id === "system") return;
      gsap.fromTo(
        panel,
        { autoAlpha: 0.55 },
        {
          autoAlpha: 1,
          ease: "none",
          scrollTrigger: { trigger: panel, start: "top 88%", end: "top 52%", scrub: true },
        }
      );
    });
  }

  // Recalculate trigger positions once everything that affects layout has settled
  // (web fonts swapping in, the hero video loading) so reveals fire at the right spots.
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  // Failsafe: if anything goes wrong mid-scroll, never leave content invisible.
  window.addEventListener("error", function () {
    document.querySelectorAll(".reveal, .reveal-line, .node, .cl").forEach(function (el) {
      el.style.opacity = 1;
      el.style.transform = "none";
    });
  });

  ScrollTrigger.refresh();

  /* ============================================================
     Helpers
     ============================================================ */

  /* ---------- Sticky nav: hide on scroll-down, solid after threshold ---------- */
  function initNav() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    var lastY = window.pageYOffset;
    var ticking = false;

    function update() {
      var y = window.pageYOffset;
      nav.classList.toggle("is-solid", y > 40);
      if (y > lastY && y > 260) nav.classList.add("is-hidden");
      else nav.classList.remove("is-hidden");
      lastY = y;
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();

    // Active-link highlighting via the section currently in view.
    var links = Array.prototype.slice.call(nav.querySelectorAll(".nav__links a"));
    var map = {};
    links.forEach(function (a) {
      var id = (a.getAttribute("href") || "").replace("#", "");
      if (id && document.getElementById(id)) map[id] = a;
    });
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting && map[e.target.id]) {
              links.forEach(function (l) { l.classList.remove("is-active"); });
              map[e.target.id].classList.add("is-active");
            }
          });
        },
        { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
      );
      Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
    }
  }

  /* ---------- Flowing path family (adapted from 21st.dev "Background Paths") ---------- */
  // Sweeping bezier curves across the section, recolored muted gold over deep navy.
  function buildFlowPaths(sel) {
    var svg = document.querySelector(sel);
    if (!svg) return [];
    var ns = "http://www.w3.org/2000/svg";
    var vb = (svg.getAttribute("viewBox") || "0 0 1200 600").split(/\s+/).map(Number);
    var W = vb[2] || 1200;
    var H = vb[3] || 600;
    var paths = [];
    var N = 26;
    for (var i = 0; i < N; i++) {
      var d =
        "M" + (-W * 0.16 + i * 4) + "," + (H * 0.2 + i * 8) +
        " C" + (W * 0.22) + "," + (H * 0.02 + i * 6) +
        " " + (W * 0.52) + "," + (H * 0.92 - i * 6) +
        " " + (W * 1.16) + "," + (H * 0.5 - i * 8);
      var p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", "#c9a24b");
      p.setAttribute("stroke-width", (0.7 + i * 0.05).toFixed(2));
      p.setAttribute("stroke-opacity", Math.min(0.08 + i * 0.018, 0.55).toFixed(3));
      svg.appendChild(p);
      paths.push(p);
    }
    return paths;
  }

  // Flow the gold along each curve on an infinite loop (varied speed + stagger).
  function animateFlowPaths(paths) {
    if (!paths || !paths.length || typeof gsap === "undefined") return;
    paths.forEach(function (p, i) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      gsap.fromTo(
        p,
        { strokeDashoffset: len },
        {
          strokeDashoffset: -len,
          duration: gsap.utils.random(18, 32),
          ease: "none",
          repeat: -1,
          delay: i * 0.1,
        }
      );
    });
  }

  /* ---------- Canvas figures: a price line that resolves into a crowd, and
       a living people-network. Built navy/gold to match the palette. ---------- */
  // Create + size a DPR-aware canvas; returns ctx/W/H and a resize hook.
  function makeCanvas(canvas) {
    var ctx = canvas.getContext("2d");
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var fig = { canvas: canvas, ctx: ctx, DPR: DPR, W: 0, H: 0 };
    fig.resize = function () {
      var r = canvas.getBoundingClientRect();
      fig.W = canvas.width = Math.max(2, Math.round(r.width * DPR));
      fig.H = canvas.height = Math.max(2, Math.round(r.height * DPR));
    };
    fig.resize();
    return fig;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Build all [data-fig] canvases and paint a representative still frame.
  function buildFigures() {
    var figs = [];
    document.querySelectorAll("canvas[data-fig]").forEach(function (canvas) {
      var kind = canvas.getAttribute("data-fig");
      var f = (kind === "chart") ? buildChart(canvas) : buildNet(canvas);
      if (f) { f.kind = kind; figs.push(f); }
    });
    return figs;
  }

  // ----- 01: chart dissolves into people -----
  function buildChart(canvas) {
    var fig = makeCanvas(canvas);
    var N = 46;
    function seed() {
      fig.pts = [];
      var W = fig.W, H = fig.H, prev = H * 0.62;
      for (var i = 0; i < N; i++) {
        var x = lerp(W * 0.08, W * 0.92, i / (N - 1));
        // jagged but generally rising price line
        prev += rand(-H * 0.06, H * 0.05) - H * 0.004;
        prev = Math.max(H * 0.2, Math.min(H * 0.8, prev));
        // crowd target: clustered dots filling the frame
        var cx = rand(W * 0.12, W * 0.88);
        var cy = rand(H * 0.18, H * 0.86);
        fig.pts.push({ lx: x, ly: prev, cx: cx, cy: cy });
      }
    }
    seed();
    fig.draw = function (t) {
      var ctx = fig.ctx, W = fig.W, H = fig.H, D = fig.DPR;
      ctx.clearRect(0, 0, W, H);
      var pts = fig.pts;
      // connecting line (the "chart"), fades as it dissolves
      ctx.lineWidth = 1.6 * D;
      ctx.strokeStyle = "rgba(" + GOLD + "," + (0.55 * (1 - t)).toFixed(3) + ")";
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var x = lerp(p.lx, p.cx, t), y = lerp(p.ly, p.cy, t);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // points become people-dots with halos
      for (var j = 0; j < pts.length; j++) {
        var q = pts[j];
        var px = lerp(q.lx, q.cx, t), py = lerp(q.ly, q.cy, t);
        var r = lerp(1.7, 3.0, t) * D;
        var halo = lerp(0, 7, t) * D;
        if (halo > 0.5) {
          var g = ctx.createRadialGradient(px, py, 0, px, py, r + halo);
          g.addColorStop(0, "rgba(" + GOLD_SOFT + "," + (0.5 * t).toFixed(3) + ")");
          g.addColorStop(1, "rgba(" + GOLD_SOFT + ",0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(px, py, r + halo, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = "rgba(" + GOLD_SOFT + ",0.92)";
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    };
    fig.reseed = function () { fig.resize(); seed(); };
    fig.draw(0.5); // representative still frame
    return fig;
  }

  // ----- 04: living people-network -----
  function buildNet(canvas) {
    var fig = makeCanvas(canvas);
    function seed() {
      var W = fig.W, H = fig.H, D = fig.DPR;
      var n = Math.round((W * H) / (D * D) / 10500);
      n = Math.max(30, Math.min(n, 58));
      fig.nodes = [];
      for (var i = 0; i < n; i++) {
        fig.nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: rand(-0.18, 0.18) * D, vy: rand(-0.18, 0.18) * D,
          ph: Math.random() * Math.PI * 2
        });
      }
      fig.max = 0.32 * Math.min(W, H);
    }
    seed();
    fig.draw = function (time) {
      var ctx = fig.ctx, W = fig.W, H = fig.H, D = fig.DPR, ns = fig.nodes, max = fig.max;
      ctx.clearRect(0, 0, W, H);
      // links = the conversation, opacity pulses gently over time
      for (var i = 0; i < ns.length; i++) {
        for (var j = i + 1; j < ns.length; j++) {
          var a = ns[i], b = ns[j], dx = a.x - b.x, dy = a.y - b.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < max) {
            var pulse = 0.6 + 0.4 * Math.sin(time * 0.0012 + (i + j) * 0.6);
            var o = (1 - d / max) * 0.4 * pulse;
            ctx.strokeStyle = "rgba(" + GOLD + "," + o.toFixed(3) + ")";
            ctx.lineWidth = 0.7 * D;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // nodes = people, with soft halos
      for (var k = 0; k < ns.length; k++) {
        var p = ns[k];
        var rr = (1.8 + 0.5 * Math.sin(time * 0.002 + p.ph)) * D;
        var hg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6 * D);
        hg.addColorStop(0, "rgba(" + GOLD_SOFT + ",0.35)");
        hg.addColorStop(1, "rgba(" + GOLD_SOFT + ",0)");
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(p.x, p.y, 6 * D, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(" + GOLD_SOFT + ",0.95)";
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.fill();
      }
    };
    fig.stepPositions = function () {
      var ns = fig.nodes, W = fig.W, H = fig.H;
      for (var i = 0; i < ns.length; i++) {
        var p = ns[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
    };
    fig.reseed = function () { fig.resize(); seed(); };
    fig.draw(0); // still frame
    return fig;
  }

  // Wire scroll/RAF animation for the figures (static frames already painted).
  function animateFigures(figs, reduced) {
    if (!figs || !figs.length) return;
    var onResize = function () {
      figs.forEach(function (f) {
        if (f.reseed) f.reseed();
        if (f.kind === "chart") f.draw(f._t || 0); else f.draw(performance.now());
      });
    };
    window.addEventListener("resize", onResize);

    figs.forEach(function (f) {
      if (f.kind === "chart") {
        if (reduced || typeof ScrollTrigger === "undefined") { f.draw(0.6); return; }
        ScrollTrigger.create({
          trigger: f.canvas.closest(".panel") || f.canvas,
          start: "top 85%", end: "bottom 35%", scrub: 0.6,
          onUpdate: function (self) {
            // ease the dissolve toward fully-people as the section passes
            var t = Math.min(1, self.progress * 1.35);
            f._t = t; f.draw(t);
          }
        });
        f.draw(0.15);
      } else { // net
        if (reduced) { f.draw(0); return; }
        var raf;
        var loop = function (now) { f.stepPositions(); f.draw(now); raf = requestAnimationFrame(loop); };
        raf = requestAnimationFrame(loop);
      }
    });
  }

  // ----- Hero: rising gold embers -----
  function buildEmbers(sel) {
    var canvas = document.querySelector(sel);
    if (!canvas) return null;
    var fig = makeCanvas(canvas);
    function spawn(any) {
      return {
        x: Math.random() * fig.W,
        y: any ? Math.random() * fig.H : fig.H + 10 * fig.DPR,
        r: (0.6 + Math.random() * 1.9) * fig.DPR,
        vy: -(0.15 + Math.random() * 0.6) * fig.DPR,
        vx: (Math.random() - 0.5) * 0.12 * fig.DPR,
        a: 0.18 + Math.random() * 0.55,
        tw: Math.random() * Math.PI * 2
      };
    }
    function seed() {
      var n = Math.round((fig.W * fig.H) / (fig.DPR * fig.DPR) / 6500);
      n = Math.max(46, Math.min(n, 140));
      fig.ps = [];
      for (var i = 0; i < n; i++) fig.ps.push(spawn(true));
    }
    seed();
    fig.draw = function (time) {
      var ctx = fig.ctx, W = fig.W, H = fig.H;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < fig.ps.length; i++) {
        var p = fig.ps[i];
        var fl = p.a * (0.6 + 0.4 * Math.sin(time * 0.004 + p.tw));
        var rr = p.r * 4;
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        g.addColorStop(0, "rgba(" + GOLD_SOFT + "," + fl.toFixed(3) + ")");
        g.addColorStop(1, "rgba(" + GOLD + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2); ctx.fill();
      }
    };
    fig.step = function () {
      for (var i = 0; i < fig.ps.length; i++) {
        var p = fig.ps[i]; p.y += p.vy; p.x += p.vx;
        if (p.y < -12 * fig.DPR) fig.ps[i] = spawn(false);
      }
    };
    fig.reseed = function () { fig.resize(); seed(); };
    fig.draw(0); // representative still frame
    return fig;
  }

  function animateEmbers(fig) {
    if (!fig) return;
    window.addEventListener("resize", function () { fig.reseed(); fig.draw(performance.now()); });
    var raf;
    var loop = function (now) { fig.step(); fig.draw(now); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
  }
})();
