// Site-wide quick search. Open with Ctrl/Cmd+K or "/" or the header button.
(function () {
  var C = window.BIG_CONTENT;
  if (!C) return;
  var items = [];
  var meta = window.BIG_TOOL_META || {};
  Object.keys(C.tools || {}).forEach(function (k) {
    var t = C.tools[k];
    items.push({ t: t.title, kind: "Tool", href: "tool.html?tool=" + k, hay: (t.title + " " + (meta[k] ? meta[k].short : "") + " " + (t.summary || "")).toLowerCase() });
  });
  Object.keys(C.lessons || {}).forEach(function (k) {
    var l = C.lessons[k];
    items.push({ t: l.title, kind: "Chapter", href: "lesson.html?topic=" + k, hay: (l.title + " " + (l.summary || "")).toLowerCase() });
  });
  Object.keys(C.workflows || {}).forEach(function (k) {
    var w = C.workflows[k];
    items.push({ t: w.title, kind: "AI workflow", href: "workflow.html?workflow=" + k, hay: (w.title + " " + (w.summary || "")).toLowerCase() });
  });
  [["Start Here: 7-step roadmap", "start.html", "roadmap path steps guide begin"], ["Glossary", "glossary.html", "terms definitions dictionary words"], ["Method and sources", "method.html", "formulas data sources accuracy how calculated"], ["Money type quiz", "index.html#quiz", "quiz personality archetype"]].forEach(function (p) {
    items.push({ t: p[0], kind: "Page", href: p[1], hay: (p[0] + " " + p[2]).toLowerCase() });
  });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var overlay = document.createElement("div");
  overlay.className = "quick-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Search tools and chapters");
  overlay.innerHTML = '<div class="quick-box"><input type="search" id="quick-input" placeholder="Search tools, chapters, pages…" autocomplete="off" aria-label="Search" /><ul class="quick-list" id="quick-list" role="listbox"></ul></div>';
  document.body.appendChild(overlay);
  var input = overlay.querySelector("#quick-input"), list = overlay.querySelector("#quick-list");
  var results = [], sel = 0, lastFocus = null;

  function render() {
    var q = input.value.trim().toLowerCase();
    var words = q.split(/\s+/).filter(Boolean);
    results = items.filter(function (it) { return words.every(function (w) { return it.hay.indexOf(w) !== -1; }); });
    if (!q) results = items.filter(function (it) { return it.kind === "Tool" || it.kind === "Page"; }).slice(0, 8);
    results = results.slice(0, 12);
    sel = 0;
    list.innerHTML = results.length ? results.map(function (r, i) {
      return '<li><a href="' + r.href + '" role="option" class="' + (i === 0 ? "is-sel" : "") + '"><span>' + esc(r.t) + "</span><small>" + r.kind + "</small></a></li>";
    }).join("") : '<li class="quick-empty">Nothing found. Try "loan", "paycheck" or "credit".</li>';
  }
  function mark() {
    var links = list.querySelectorAll("a");
    links.forEach(function (a, i) { a.classList.toggle("is-sel", i === sel); });
    if (links[sel]) links[sel].scrollIntoView({ block: "nearest" });
  }
  function open() { lastFocus = document.activeElement; overlay.classList.add("is-open"); input.value = ""; render(); input.focus(); }
  function close() { overlay.classList.remove("is-open"); if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  input.addEventListener("input", render);
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); mark(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); mark(); }
    else if (e.key === "Enter" && results[sel]) { window.location.href = results[sel].href; }
  });
  overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (document.activeElement && document.activeElement.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); overlay.classList.contains("is-open") ? close() : open(); }
    else if (e.key === "/" && !typing) { e.preventDefault(); open(); }
    else if (e.key === "Escape" && overlay.classList.contains("is-open")) { close(); }
  });

  var header = document.querySelector(".site-header");
  if (header) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-btn";
    btn.setAttribute("aria-label", "Search tools and chapters");
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Search</span><kbd>Ctrl K</kbd>';
    btn.addEventListener("click", open);
    header.appendChild(btn);
  }
})();
