// Homepage: live hero calculator + filterable tool directory.
(function () {
  var C = window.BIG_CONTENT, calc = window.BIG_CALC;
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ── Live hero calculator ────────────────────────────────────────────────
  var lab = document.getElementById("hero-lab");
  if (lab && calc) {
    var sal = document.getElementById("hl-salary"), st = document.getElementById("hl-state"), k = document.getElementById("hl-401k");
    var states = window.STATE_TAX || {};
    st.innerHTML = '<option value="">No state tax / not sure</option>' + Object.keys(states)
      .sort(function (a, b) { return states[a][0].localeCompare(states[b][0]); })
      .map(function (c) { return '<option value="' + c + '">' + states[c][0] + "</option>"; }).join("");
    var seg = { net: "#22c55e", fed: "#fb7185", fica: "#f59e0b", state: "#a78bfa", k: "#60a5fa" };
    function run() {
      var gross = Number(sal.value), kk = Number(k.value), rate = states[st.value] ? states[st.value][1] : 0;
      document.getElementById("hl-salary-v").textContent = money(gross);
      document.getElementById("hl-401k-v").textContent = kk + "%";
      var r = calc.paycheck({ gross: gross, status: "single", k401: kk, stateRate: rate });
      document.getElementById("hl-net").textContent = money(r.net / 26);
      document.getElementById("hl-month").textContent = money(r.net / 12) + " a month · " + (r.effective * 100).toFixed(0) + "% goes to taxes";
      var parts = [["net", r.net, "Take-home"], ["fed", r.fed, "Federal tax"], ["fica", r.fica, "Social Security + Medicare"], ["state", r.state, "State tax"], ["k", r.pretax, "401(k), still yours"]];
      document.getElementById("hl-bar").innerHTML = parts.map(function (p) {
        var w = Math.max(0, p[1] / gross * 100);
        return w < 0.4 ? "" : '<span style="width:' + w + "%;background:" + seg[p[0]] + '" title="' + p[2] + ": " + money(p[1]) + '"></span>';
      }).join("");
      document.getElementById("hl-legend").innerHTML = parts.map(function (p) {
        return '<li><i style="background:' + seg[p[0]] + '"></i>' + p[2] + " <b>" + money(p[1]) + "</b></li>";
      }).join("");
      var link = document.getElementById("hl-open");
      link.href = "tool.html?tool=paycheck" + (st.value ? "&state=" + st.value : "");
    }
    [sal, k].forEach(function (el) { el.addEventListener("input", run); });
    st.addEventListener("change", run);
    run();
  }

  // ── Tool directory ──────────────────────────────────────────────────────
  var hub = document.getElementById("tool-hub");
  if (hub && C && window.BIG_TOOL_META) {
    var cats = window.BIG_TOOL_CATS, meta = window.BIG_TOOL_META;
    var keys = Object.keys(meta).filter(function (k2) { return C.tools[k2]; });
    var active = "all", q = "";
    var chips = document.getElementById("hub-chips"), grid = document.getElementById("hub-grid"), count = document.getElementById("hub-count"), search = document.getElementById("hub-search");
    chips.innerHTML = '<button type="button" class="hub-chip is-active" data-cat="all">All <span>' + keys.length + "</span></button>" + cats.map(function (c) {
      var n = keys.filter(function (k2) { return meta[k2].cat === c[0]; }).length;
      return '<button type="button" class="hub-chip" data-cat="' + c[0] + '">' + c[1] + " <span>" + n + "</span></button>";
    }).join("");
    var catName = {}; cats.forEach(function (c) { catName[c[0]] = c[1]; });
    function draw() {
      var list = keys.filter(function (k2) {
        if (active !== "all" && meta[k2].cat !== active) return false;
        if (!q) return true;
        return (C.tools[k2].title + " " + meta[k2].short + " " + C.tools[k2].summary).toLowerCase().indexOf(q) !== -1;
      });
      grid.innerHTML = list.map(function (k2) {
        return '<a class="hub-card" href="tool.html?tool=' + k2 + '" data-cat="' + meta[k2].cat + '"><span class="hub-cat">' + esc(catName[meta[k2].cat]) + "</span><strong>" + esc(C.tools[k2].title) + "</strong><p>" + esc(meta[k2].short) + '</p><span class="hub-go">Open &rarr;</span></a>';
      }).join("");
      count.textContent = list.length + (list.length === 1 ? " tool" : " tools");
      document.getElementById("hub-empty").hidden = list.length > 0;
    }
    chips.addEventListener("click", function (e) {
      var b = e.target.closest(".hub-chip"); if (!b) return;
      active = b.dataset.cat;
      chips.querySelectorAll(".hub-chip").forEach(function (x) { x.classList.toggle("is-active", x === b); });
      draw();
    });
    search.addEventListener("input", function () { q = search.value.trim().toLowerCase(); draw(); });
    draw();
  }
})();
