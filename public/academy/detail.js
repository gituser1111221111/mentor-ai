const params = new URLSearchParams(window.location.search);
const key = params.get("topic") || params.get("workflow") || params.get("tool") || "investing";
const type = document.querySelector("[data-detail-type]")?.dataset.detailType;
const content = window.BIG_CONTENT;
const GUIDE_ORDER = ['reset','budgeting','credit','debt_payoff','taxes_paychecks','insurance_risk','investing','stocks','etfs','diversification','careers','entrepreneurship','ai'];
const lessonToolMap = {
  investing: ["compound", "roth_vs_trad", "inflation"],
  credit: ["credit"],
  budgeting: ["budget", "subscriptions"],
  ai: ["finder", "budget", "compound"],
  careers: ["paycheck", "salary", "email_gen"],
  entrepreneurship: ["budget", "compound"],
  diversification: ["compound"],
  stocks: ["compound"],
  etfs: ["compound"],
  reset: ["net_worth", "budget", "credit"],
  debt_payoff: ["debt_planner", "student_loan"],
  taxes_paychecks: ["paycheck", "roth_vs_trad"],
  insurance_risk: ["emergency", "savings_goal"],
};

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function list(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}

function slugTitle(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function logoDomain(app) {
  if (app.logoDomain || app.domain) return app.logoDomain || app.domain;
  try {
    return new URL(app.url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function logoMarkup(item, className = "app-logo-wrap") {
  const initial = String(item.name || 'M').charAt(0).replace(/[&<>"']/g, '');
  const domain=logoDomain(item).replace(/[^a-zA-Z0-9.-]/g,'');
  return `<span class="${className}"><img src="/academy/brand-icons/${domain}.png" width="40" height="40" alt="${String(item.name||'').replace(/[&<>"']/g,'')} logo" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden aria-hidden="true">${initial}</span></span>`;
}

function renderApps(apps = []) {
  const section = document.querySelector("#recommended-apps");
  const container = document.querySelector("#detail-apps");
  if (!section || !container) return;
  if (!apps.length) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }
  section.hidden = false;
  container.innerHTML = apps
    .map((app) => {
      return `<a class="app-card" href="${app.url}" target="_blank" rel="noopener noreferrer">
        ${logoMarkup(app)}
        <span class="app-copy">
          <strong>${app.name}</strong>
          <span>${app.note}</span>
          <small>${app.cost || "Check website for pricing"}</small>
        </span>
      </a>`;
    })
    .join("");
}

function renderLessonTools(currentKey, toolKeys = []) {
  const section = document.querySelector("#chapter-tools");
  const container = document.querySelector("#detail-tools");
  if (!section || !container) return;
  const keys = toolKeys.length ? toolKeys : lessonToolMap[currentKey] || [];
  const tools = keys
    .map((toolKey) => [toolKey, content.tools?.[toolKey]])
    .filter(([, tool]) => Boolean(tool));
  if (!tools.length) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }
  section.hidden = false;
  container.innerHTML = tools
    .map(
      ([toolKey, tool]) => `<a class="lesson-tool-card" href="tool.html?tool=${toolKey}">
        <span>Interactive tool</span>
        <strong>${tool.title}</strong>
        <p>${tool.summary}</p>
        <small>Open tool</small>
      </a>`
    )
    .join("");
}

function renderRelated(collection, currentKey, hrefPrefix, limit = 3) {
  const container = document.querySelector("#related-links");
  if (!container) return;
  const items = Object.entries(collection)
    .filter(([itemKey]) => itemKey !== currentKey)
    .slice(0, limit)
    .map(([itemKey, item]) => {
      const title = item.title || slugTitle(itemKey);
      const summary = item.summary || "Continue exploring this topic.";
      return `<a class="related-card" href="${hrefPrefix}${itemKey}"><span>${title}</span><p>${summary}</p></a>`;
    });
  container.innerHTML = items.join("");
}

function setupCopyButtons() {
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.querySelector(`#${button.dataset.copyTarget}`);
      const text = target?.textContent.trim();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Select and copy";
      }
      setTimeout(() => {
        button.textContent = "Copy prompt";
      }, 1600);
    });
  });
}

function missing() {
  document.querySelector("#detail-title").textContent = "Page not found";
  document.querySelector("#detail-summary").textContent = "This topic is not available yet.";
}

function setPageMeta(title, description) {
  const text = String(description || "").replace(/\s+/g, " ").trim().slice(0, 158);
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) { tag = document.createElement("meta"); tag.name = "description"; document.head.appendChild(tag); }
  if (text) tag.content = text;
  [["og:title", title], ["og:description", text]].forEach(([prop, val]) => {
    if (!val) return;
    let m = document.querySelector(`meta[property="${prop}"]`);
    if (!m) { m = document.createElement("meta"); m.setAttribute("property", prop); document.head.appendChild(m); }
    m.content = val;
  });
}

function renderLessonLab(toolKeys) {
  const keys = (toolKeys && toolKeys.length ? toolKeys : []).filter((k) => toolRenderers[k] && content.tools[k]);
  const host = document.querySelector("#detail-sections");
  if (!keys.length || !host) return;
  const section = document.createElement("section");
  section.className = "lesson-lab";
  section.id = "lesson-lab";
  section.innerHTML = `
    <p class="panel-label">Try it now</p>
    <h2>Run your own numbers</h2>
    <div class="lab-tabs" role="tablist" aria-label="Choose a tool">${keys.map((k, i) => `<button type="button" role="tab" class="lab-tab" data-tool="${k}" aria-selected="${i === 0}">${content.tools[k].title}</button>`).join("")}</div>
    <p id="lab-summary" class="kc-sub"></p>
    <div class="lab-grid">
      <div id="tool-page-controls"></div>
      <div>
        <canvas id="tool-page-chart" width="760" height="360"></canvas>
        <div class="result-box"><span>Current result</span><strong id="tool-page-result">$0</strong><small id="tool-page-note">Adjust inputs to update the chart.</small></div>
      </div>
    </div>
    <a class="lab-open" id="lab-open" href="#">Open the full page &rarr;</a>`;
  const cards = host.querySelectorAll(".module-lesson-card");
  const anchor = cards[1] || cards[cards.length - 1];
  if (anchor && anchor.nextSibling) host.insertBefore(section, anchor.nextSibling);
  else host.appendChild(section);
  const show = (k) => {
    const controls = section.querySelector("#tool-page-controls");
    controls.innerHTML = "";
    section.querySelector("#tool-page-chart").style.display = "block";
    section.querySelectorAll(".lab-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tool === k)));
    section.querySelector("#lab-summary").textContent = content.tools[k].summary;
    section.querySelector("#lab-open").href = `tool.html?tool=${k}`;
    toolRenderers[k]();
  };
  section.querySelector(".lab-tabs").addEventListener("click", (e) => {
    const b = e.target.closest(".lab-tab");
    if (b) show(b.dataset.tool);
  });
  show(keys[0]);
}

function renderKnowledgeCheck(chapterKey) {
  const qs = window.BIG_CHECKS?.[chapterKey];
  const host = document.querySelector(".module-main");
  if (!qs || !host) return;
  let best = null;
  try { best = (JSON.parse(localStorage.getItem("chapterScores") || "{}"))[chapterKey] ?? null; } catch (e) {}
  const section = document.createElement("section");
  section.className = "knowledge-check";
  section.id = "knowledge-check";
  section.innerHTML = `
    <p class="panel-label">Knowledge Check</p>
    <h2>Test what you just learned</h2>
    <p class="kc-sub">${qs.length} questions. Instant feedback. ${best !== null ? `Your best score: <strong>${best}/${qs.length}</strong>.` : "Your best score is saved in this browser."}</p>
    <div class="kc-list">${qs.map((item, qi) => `
      <fieldset class="kc-q" data-qi="${qi}">
        <legend>${qi + 1}. ${item.q}</legend>
        ${item.o.map((opt, oi) => `<button type="button" class="kc-opt" data-oi="${oi}">${opt}</button>`).join("")}
        <p class="kc-why" role="status" tabindex="-1" hidden></p>
      </fieldset>`).join("")}
    </div>
    <div class="kc-footer"><strong id="kc-score" aria-live="polite"></strong><button type="button" class="button secondary" id="kc-reset" hidden>Retake</button></div>`;
  host.appendChild(section);
  const answered = new Set();
  let correct = 0;
  section.addEventListener("click", (e) => {
    const btn = e.target.closest(".kc-opt");
    if (btn) {
      const fs = btn.closest(".kc-q");
      const qi = Number(fs.dataset.qi);
      if (answered.has(qi)) return;
      answered.add(qi);
      const item = qs[qi];
      const picked = Number(btn.dataset.oi);
      fs.querySelectorAll(".kc-opt").forEach((b) => {
        b.disabled = true;
        if (Number(b.dataset.oi) === item.a) b.classList.add("is-correct");
      });
      if (picked === item.a) correct += 1; else btn.classList.add("is-wrong");
      const why = fs.querySelector(".kc-why");
      why.textContent = (picked === item.a ? "Correct. " : "Not quite. ") + item.why;
      why.hidden = false;
      why.focus({preventScroll:true});
      if (answered.size === qs.length) {
        document.querySelector("#kc-score").textContent = `You got ${correct} of ${qs.length}. ${correct === qs.length ? "Perfect." : correct >= qs.length - 1 ? "Strong work." : "Review the lesson steps above and retake it."}`;
        document.querySelector("#kc-reset").hidden = false;
        try {
          const scores = JSON.parse(localStorage.getItem("chapterScores") || "{}");
          if (scores[chapterKey] == null || correct > scores[chapterKey]) scores[chapterKey] = correct;
          localStorage.setItem("chapterScores", JSON.stringify(scores));
        } catch (e2) {}
      }
      return;
    }
    if (e.target.id === "kc-reset") {
      answered.clear(); correct = 0;
      section.querySelectorAll(".kc-opt").forEach((b) => { b.disabled = false; b.classList.remove("is-correct", "is-wrong"); });
      section.querySelectorAll(".kc-why").forEach((p) => { p.hidden = true; });
      document.querySelector("#kc-score").textContent = "";
      e.target.hidden = true;
      section.querySelector('.kc-opt').focus({preventScroll:true});
    }
  });
}

function renderLesson() {
  const item = content.lessons[key];
  if (!item) return missing();

  // Mark this chapter as completed in localStorage
  try {
    const done = JSON.parse(localStorage.getItem('completedChapters') || '[]');
    if (!done.includes(key)) { done.push(key); localStorage.setItem('completedChapters', JSON.stringify(done)); }
  } catch(e) {}
  document.title = `${item.title} | Mentor Labs`;
  setPageMeta(document.title, item.summary);
  document.querySelector("#detail-eyebrow").textContent = `STEP ${GUIDE_ORDER.indexOf(key) + 1} OF ${GUIDE_ORDER.length}`;
  document.querySelector("#detail-title").textContent = item.title;
  document.querySelector("#detail-summary").textContent = item.summary;
  document.querySelector("#detail-audience").textContent = item.audience;
  document.querySelector("#detail-outcomes").innerHTML = list(item.outcomes);
  const quickWin = document.querySelector("#module-quick-win");
  const moduleNav = document.querySelector("#module-nav");
  if (quickWin) quickWin.textContent = item.checklist?.[0] || "Start with one small action from the checklist below.";
  if (moduleNav) {
    moduleNav.innerHTML = item.sections
      .map(
        (section, index) =>
          `<a href="#lesson-step-${index + 1}">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <strong>${section.title}</strong>
          </a>`
      )
      .join("");
  }
  document.querySelector("#detail-sections").innerHTML = item.sections
    .map(
      (section, index) => `<article class="module-lesson-card" id="lesson-step-${index + 1}">
        <div class="lesson-step-num">${String(index + 1).padStart(2, "0")}</div>
        <div>
          <p class="panel-label">${index === 0 ? "Start Here" : "Lesson Step"}</p>
          <h2>${section.title}</h2>
          <p>${section.body}</p>
        </div>
      </article>`
    )
    .join("");
  document.querySelector("#detail-checklist").innerHTML = list(item.checklist);
  document.querySelector("#detail-prompt").textContent = item.prompt;
  renderApps(item.apps);
  renderLessonLab(item.tools && item.tools.length ? item.tools : lessonToolMap[key] || []);
  { const old = document.querySelector("#chapter-tools"); if (old) old.hidden = true; }
  renderKnowledgeCheck(key);

  // Next chapter guide path
  const CHAPTER_ORDER = GUIDE_ORDER;
  const CHAPTER_LABELS = {
    reset: 'Money Reset', budgeting: 'Budgeting', credit: 'Credit', debt_payoff: 'Debt Payoff',
    investing: 'Investing', ai: 'AI & Finance', careers: 'Careers', taxes_paychecks: 'Taxes & Paychecks', insurance_risk: 'Insurance'
  };
  const currentIdx = CHAPTER_ORDER.indexOf(key);
  const nextKey   = (currentIdx >= 0 && currentIdx < CHAPTER_ORDER.length - 1) ? CHAPTER_ORDER[currentIdx + 1] : null;
  const nextItem  = nextKey ? content.lessons[nextKey] : null;
  const chapterNum = currentIdx >= 0 ? currentIdx + 1 : null;
  const main = document.querySelector('main');

  if (nextItem) {
    const el = document.createElement('section');
    el.className = 'next-chapter-banner';
    el.innerHTML = `
      <div class="next-chapter-inner">
        <div class="next-chapter-copy">
          <p class="eyebrow">Step ${chapterNum + 1} of ${CHAPTER_ORDER.length} &mdash; Up next</p>
          <h2>${nextItem.title}</h2>
          <p>${nextItem.summary}</p>
        </div>
        <a class="button primary" href="lesson.html?topic=${nextKey}">Continue &rarr;</a>
      </div>
    `;
    main.appendChild(el);
  } else if (currentIdx === CHAPTER_ORDER.length - 1) {
    const el = document.createElement('section');
    el.className = 'next-chapter-banner next-chapter-final';
    el.innerHTML = `
      <div class="next-chapter-inner">
        <div class="next-chapter-copy">
          <p class="eyebrow">Step ${CHAPTER_ORDER.length} of ${CHAPTER_ORDER.length} &mdash; Keep practicing</p>
          <h2>Now put it into practice.</h2>
          <p>Use the interactive tools to run real numbers on your own situation and build the habit of thinking before you spend.</p>
        </div>
        <a class="button primary" href="index.html#tools">Open the tools &rarr;</a>
      </div>
    `;
    main.appendChild(el);
  }

  // ── Lesson hero rising-dots canvas ──────────────────────────────────────
  (function() {
    const cv = document.getElementById('lesson-hero-canvas');
    if (!cv) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = cv.getContext('2d');
    let pts = [], raf;
    function resize() {
      cv.width  = cv.offsetWidth  || cv.parentElement.offsetWidth;
      cv.height = cv.offsetHeight || cv.parentElement.offsetHeight || 280;
    }
    function init() {
      resize();
      const n = Math.floor((cv.width * cv.height) / 22000);
      pts = Array.from({ length: Math.max(18, Math.min(n, 40)) }, () => ({
        x: Math.random() * cv.width,
        y: cv.height + Math.random() * cv.height,
        vy: -(0.18 + Math.random() * 0.28),
        r:  0.8 + Math.random() * 1.4,
        a:  0.08 + Math.random() * 0.18
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of pts) {
        p.y += p.vy;
        if (p.y < -6) { p.y = cv.height + 6; p.x = Math.random() * cv.width; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(127,191,156,${p.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    init(); draw();
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); init(); draw(); }, { passive: true });
  })();

  // ── Typewriter on AI prompt panel ───────────────────────────────────────
  (function() {
    const promptEl = document.querySelector('#detail-prompt');
    if (!promptEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fullText = promptEl.textContent;
    promptEl.textContent = '';
    let started = false;
    const io = new IntersectionObserver((entries) => {
      if (!started && entries[0].isIntersecting) {
        started = true;
        io.disconnect();
        let i = 0;
        const speed = Math.max(18, Math.min(38, Math.round(3800 / fullText.length)));
        const timer = setInterval(() => {
          promptEl.textContent = fullText.slice(0, ++i);
          if (i >= fullText.length) clearInterval(timer);
        }, speed);
      }
    }, { threshold: 0.5 });
    const panel = promptEl.closest('.prompt-panel') || promptEl;
    io.observe(panel);
  })();

  // Scroll progress bar
  const progressBar = document.getElementById('lesson-progress');
  if (progressBar) {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0) + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // Money type badge
  (function() {
    try {
      const stored = localStorage.getItem('bigProfile');
      if (!stored) return;
      const p = JSON.parse(stored);
      if (!p || !p.name) return;
      const shortName = p.name.replace(/^The\s+/, '');
      const badge = document.createElement('a');
      badge.href = 'index.html#quiz';
      badge.className = 'money-type-badge';
      badge.setAttribute('aria-label', 'Your money type: ' + p.name + '. Click to retake quiz.');
      badge.innerHTML = `<span class="badge-emoji">${p.emoji}</span><span class="badge-name">${shortName}</span><span class="badge-retake">retake</span>`;
      document.body.appendChild(badge);
    } catch(e) {}
  })();
}

function renderWorkflow() {
  const item = content.workflows[key];
  if (!item) return missing();
  document.title = `${item.title} | Mentor Labs`;
  setPageMeta(document.title, item.summary);
  document.querySelector("#detail-title").textContent = item.title;
  document.querySelector("#detail-summary").textContent = item.summary;
  document.querySelector("#workflow-steps").innerHTML = list(item.steps);
  document.querySelector("#workflow-automation").textContent = item.automation;
  document.querySelector("#workflow-prompt").textContent = item.prompt;

  const toolsContainer = document.querySelector("#workflow-tools");
  if (toolsContainer && item.resources && item.resources.length) {
    toolsContainer.innerHTML = item.resources
      .map(
        (r) =>
          `<a class="workflow-tool-chip" href="${r.url}" target="_blank" rel="noopener noreferrer">
            ${logoMarkup(r, "workflow-logo-wrap")}
            <span class="workflow-tool-copy">
              <strong>${r.name}</strong>
              <span>${r.note}</span>
            </span>
          </a>`
      )
      .join("");
  }

  renderRelated(content.workflows, key, "workflow.html?workflow=");
}

function drawChart(values, labels, colors = ["#60a5fa", "#b7dbc2", "#22c55e", "#fb7185", "#a78bfa"]) {
  const canvas = document.querySelector("#tool-page-chart");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, width, height);
  const max = Math.max(...values, 1);
  const gap = 16;
  const barWidth = (width - gap * (values.length + 1)) / values.length;
  values.forEach((value, index) => {
    const barHeight = (value / max) * (height - 72);
    const x = gap + index * (barWidth + gap);
    const y = height - barHeight - 36;
    const gradient = ctx.createLinearGradient(0, y, 0, height);
    gradient.addColorStop(0, colors[index % colors.length]);
    gradient.addColorStop(1, "rgba(255,255,255,0.16)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "18px sans-serif";
    ctx.fillText(labels[index], x, height - 10);
  });
}

function pageControl(label, id, min, max, value, step = 1, prefix = "", suffix = "") {
  return `<label class="tool-control-row"><span>${label} <strong id="${id}-value">${prefix}${value}${suffix}</strong></span><input id="${id}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" /></label>`;
}

function setPageControlValue(id, value, prefix = "", suffix = "") {
  const target = document.querySelector(`#${id}-value`);
  if (target) target.textContent = `${prefix}${value}${suffix}`;
}

function monthsToPayoff(balance, apr, payment) {
  const b = Math.max(0, balance);
  const pay = Math.max(0, payment);
  const r = Math.max(0, apr) / 100 / 12;
  if (!b) return 0;
  if (!pay) return 999;
  if (r === 0) return Math.ceil(b / pay);
  if (pay <= b * r) return 999;
  return Math.ceil(-Math.log(1 - (b * r) / pay) / Math.log(1 + r));
}

const toolRenderers = {
  compound() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      ${pageControl("Starting amount", "p-start", 0, 25000, 1000, 250, "$")}
      ${pageControl("Monthly contribution", "p-monthly", 25, 2000, 250, 25, "$")}
      ${pageControl("Years", "p-years", 1, 40, 20, 1, "", " yrs")}
      ${pageControl("Return assumption", "p-rate", 0, 12, 7, 0.5, "", "%")}
    `;
    const update = () => {
      const s = Number(document.querySelector("#p-start").value);
      const m = Number(document.querySelector("#p-monthly").value);
      const y = Number(document.querySelector("#p-years").value);
      const rate = Number(document.querySelector("#p-rate").value);
      setPageControlValue("p-start", s, "$");
      setPageControlValue("p-monthly", m, "$");
      setPageControlValue("p-years", y, "", " yrs");
      setPageControlValue("p-rate", rate, "", "%");
      const r = rate / 100 / 12;
      const values = [5, 10, 15, 20, 30].map((year) => {
        const months = Math.min(year, y) * 12;
        return s * (1 + r) ** months + (r === 0 ? m * months : m * (((1 + r) ** months - 1) / r));
      });
      drawChart(values, ["5y", "10y", "15y", "20y", "30y"], ["#38bdf8", "#60a5fa", "#b7dbc2", "#22c55e", "#a78bfa"]);
      const months = y * 12;
      const total = s * (1 + r) ** months + (r === 0 ? m * months : m * (((1 + r) ** months - 1) / r));
      const contributed = s + m * months;
      document.querySelector("#tool-page-result").textContent = money(total);
      document.querySelector("#tool-page-note").textContent = `${money(contributed)} contributed, ${money(Math.max(0, total - contributed))} estimated growth`;
    };
    controls.querySelectorAll("input").forEach((input) => input.addEventListener("input", update));
    update();
  },
  credit() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      ${pageControl("Balance", "p-balance", 0, 10000, 1250, 50, "$")}
      ${pageControl("Limit", "p-limit", 500, 20000, 5000, 100, "$")}
    `;
    const update = () => {
      const balance = Number(document.querySelector("#p-balance").value);
      const limit = Number(document.querySelector("#p-limit").value);
      setPageControlValue("p-balance", balance, "$");
      setPageControlValue("p-limit", limit, "$");
      const pct = Math.round((balance / limit) * 100);
      drawChart([pct, 30, 10], ["current", "30%", "10%"], [pct > 30 ? "#ef4444" : pct > 10 ? "#f59e0b" : "#22c55e", "#f59e0b", "#22c55e"]);
      document.querySelector("#tool-page-result").textContent = `${pct}%`;
      document.querySelector("#tool-page-note").textContent = `${money(Math.max(0, balance - limit * 0.3))} to reach 30%, ${money(Math.max(0, balance - limit * 0.1))} to reach 10%`;
    };
    controls.querySelectorAll("input").forEach((input) => input.addEventListener("input", update));
    update();
  },
  budget() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      ${pageControl("Take-home income", "p-income", 800, 9000, 3200, 100, "$")}
      ${pageControl("Housing", "p-housing", 0, 4000, 1100, 50, "$")}
      ${pageControl("Food + transport", "p-basics", 0, 2500, 650, 25, "$")}
      ${pageControl("Debt minimums", "p-budget-debt", 0, 2000, 250, 25, "$")}
      ${pageControl("Subscriptions + fun", "p-flex", 0, 2000, 500, 25, "$")}
    `;
    const update = () => {
      const income = Number(document.querySelector("#p-income").value);
      const housing = Number(document.querySelector("#p-housing").value);
      const basics = Number(document.querySelector("#p-basics").value);
      const debt = Number(document.querySelector("#p-budget-debt").value);
      const flex = Number(document.querySelector("#p-flex").value);
      ["p-income", "p-housing", "p-basics", "p-budget-debt", "p-flex"].forEach((id) => setPageControlValue(id, Number(document.querySelector(`#${id}`).value), "$"));
      const leftover = income - housing - basics - debt - flex;
      drawChart([housing, basics, debt, flex, Math.max(0, leftover)], ["home", "basics", "debt", "fun", "left"], ["#60a5fa", "#2dd4bf", "#fb7185", "#a78bfa", "#b7dbc2"]);
      const status = leftover / Math.max(income, 1) >= 0.15 ? "Healthy" : leftover / Math.max(income, 1) >= 0.03 ? "Tight" : "Risky";
      document.querySelector("#tool-page-result").textContent = status;
      document.querySelector("#tool-page-note").textContent = `${money(leftover)} leftover, about ${money(Math.max(0, leftover / 4.33))}/week flexible`;
    };
    controls.querySelectorAll("input").forEach((input) => input.addEventListener("input", update));
    update();
  },
  salary() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      <label>Salary <input id="p-salary" type="range" min="20000" max="160000" value="65000" step="1000" /></label>
      <label>Deduction % <input id="p-tax" type="range" min="0" max="45" value="25" /></label>
    `;
    const update = () => {
      const salary = Number(document.querySelector("#p-salary").value);
      const tax = Number(document.querySelector("#p-tax").value) / 100;
      const net = salary * (1 - tax);
      drawChart([salary / 12, net / 12, net / 52], ["gross/mo", "net/mo", "net/wk"]);
      document.querySelector("#tool-page-result").textContent = money(net / 12);
      document.querySelector("#tool-page-note").textContent = `${money(net / 52)} estimated weekly take-home`;
    };
    controls.querySelectorAll("input").forEach((input) => input.addEventListener("input", update));
    update();
  },
  afford() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      <label>Purchase <input id="p-cost" type="range" min="25" max="5000" value="400" step="25" /></label>
      <label>Monthly income <input id="p-afford-income" type="range" min="500" max="8000" value="2500" step="100" /></label>
    `;
    const update = () => {
      const cost = Number(document.querySelector("#p-cost").value);
      const income = Number(document.querySelector("#p-afford-income").value);
      const pct = Math.round((cost / income) * 100);
      drawChart([cost, income * 0.1, income * 0.2], ["cost", "10%", "20%"]);
      document.querySelector("#tool-page-result").textContent = `${pct}%`;
      document.querySelector("#tool-page-note").textContent = `${money(cost)} compared with ${money(income)} monthly income`;
    };
    controls.querySelectorAll("input").forEach((input) => input.addEventListener("input", update));
    update();
  },
  finder() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      <label>Need score <input id="p-need" type="range" min="1" max="10" value="7" /></label>
      <label>Confidence <input id="p-confidence" type="range" min="1" max="10" value="4" /></label>
    `;
    const update = () => {
      const need = Number(document.querySelector("#p-need").value);
      const confidence = Number(document.querySelector("#p-confidence").value);
      drawChart([need, confidence, 10 - confidence], ["need", "skill", "gap"]);
      document.querySelector("#tool-page-result").textContent = need > confidence ? "Use a guided workflow" : "Use a checklist";
      document.querySelector("#tool-page-note").textContent = "AI should help structure the task, not make the final decision.";
    };
    controls.querySelectorAll("input").forEach((input) => input.addEventListener("input", update));
    update();
  },
  emergency() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      <label>Monthly expenses <input id="p-expenses" type="range" min="500" max="6000" value="1800" step="100" /></label>
    `;
    const update = () => {
      const e = Number(document.querySelector("#p-expenses").value);
      drawChart([e, e * 3, e * 6], ["1 mo", "3 mo", "6 mo"]);
      document.querySelector("#tool-page-result").textContent = money(e * 3);
      document.querySelector("#tool-page-note").textContent = `3-month target based on ${money(e)}/mo expenses`;
    };
    controls.querySelector("input").addEventListener("input", update);
    update();
  },
  debt_planner() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      ${pageControl("Balance", "p-debt-balance", 500, 30000, 6000, 250, "$")}
      ${pageControl("APR", "p-debt-rate", 0, 36, 22, 0.5, "", "%")}
      ${pageControl("Minimum payment", "p-debt-pay", 25, 1000, 180, 25, "$")}
      ${pageControl("Extra payment", "p-debt-extra", 0, 1000, 100, 25, "$")}
    `;
    const update = () => {
      const b = Number(document.querySelector("#p-debt-balance").value);
      const apr = Number(document.querySelector("#p-debt-rate").value);
      const pay = Number(document.querySelector("#p-debt-pay").value);
      const extraPay = Number(document.querySelector("#p-debt-extra").value);
      setPageControlValue("p-debt-balance", b, "$");
      setPageControlValue("p-debt-rate", apr, "", "%");
      setPageControlValue("p-debt-pay", pay, "$");
      setPageControlValue("p-debt-extra", extraPay, "$");
      const base = monthsToPayoff(b, apr, pay);
      const optimized = monthsToPayoff(b, apr, pay + extraPay);
      drawChart([Math.min(base, 120), Math.min(optimized, 120), Math.max(0, Math.min(base - optimized, 120))], ["min", "extra", "saved"], ["#fb7185", "#22c55e", "#b7dbc2"]);
      document.querySelector("#tool-page-result").textContent = optimized >= 999 ? "Won't pay off" : `${optimized} months`;
      document.querySelector("#tool-page-note").textContent = optimized < 999 && base < 999 ? `${Math.max(0, base - optimized)} months faster than minimum-only` : "Increase monthly payment above interest charge";
    };
    controls.querySelectorAll("input").forEach((input) => input.addEventListener("input", update));
    update();
  },
  email_gen() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      <label>Your role
        <select id="p-email-role">
          <option value="student">College student</option>
          <option value="recent">Recent graduate</option>
          <option value="career">Early-career professional</option>
        </select>
      </label>
      <label>Contact type
        <select id="p-email-target">
          <option value="analyst">Analyst / Associate</option>
          <option value="recruiter">Recruiter</option>
          <option value="alumni">Alumni in finance</option>
        </select>
      </label>
    `;
    const templates = {
      analyst: {
        student: "Hi [Name], I'm a [Year] studying [Major] at [School] and am genuinely interested in [Company]'s work in [Area]. I'd love to learn about your path into the role. Would you be open to a 15-minute call? Thanks, [Your Name]",
        recent: "Hi [Name], I recently graduated in [Field] and am focused on [Company]'s approach to [Area]. I'd value any insight into how you approached your first year. Would a brief call work? Best, [Your Name]",
        career: "Hi [Name], I'm currently in [Role] and following [Company]'s work closely. I'd appreciate 15 minutes to hear your perspective on [Topic]. Happy to work around your schedule. Best, [Your Name]",
      },
      recruiter: {
        student: "Hi [Name], I'm a [Year] at [School] targeting finance internships for [Season]. Is [Company] recruiting for [Role]? I'd love to learn about the process. Thank you, [Your Name]",
        recent: "Hi [Name], I'm a recent grad with [Skill] experience and strong interest in [Company]. Are there any open [Role] positions I could apply for? Thank you, [Your Name]",
        career: "Hi [Name], I'm transitioning into [Field] with background in [Current Area]. I'd love to explore fit for any open roles at [Company]. Best, [Your Name]",
      },
      alumni: {
        student: "Hi [Name], I found your profile through [School]'s alumni network. I'm studying [Major] and would value 15 minutes to hear how you broke into finance. No pressure at all. [Your Name]",
        recent: "Hi [Name], we share [School] as alumni. I'm navigating my first year in finance and would love a quick conversation about your experience. [Your Name]",
        career: "Hi [Name], fellow [School] grad here. I'm considering a move toward [Area] and would value your perspective given your path. [Your Name]",
      },
    };
    const canvas = document.querySelector("#tool-page-chart");
    canvas.style.display = "none";
    const resultEl = document.querySelector("#tool-page-result");
    const noteEl = document.querySelector("#tool-page-note");
    const update = () => {
      const role = document.querySelector("#p-email-role").value;
      const target = document.querySelector("#p-email-target").value;
      const tmpl = templates[target]?.[role] || "";
      resultEl.textContent = "Template ready";
      noteEl.textContent = tmpl;
    };
    controls.querySelectorAll("select").forEach((sel) => sel.addEventListener("change", update));
    update();
  },
  invest_guide() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      <label>Your experience level
        <select id="p-guide-level">
          <option value="zero">Complete beginner (never invested)</option>
          <option value="aware">Aware but haven't started yet</option>
          <option value="some">Have a brokerage, unsure what to do</option>
        </select>
      </label>
    `;
    const paths = {
      zero: { steps: [3, 5, 8, 10], labels: ["Step 1", "Step 2", "Step 3", "Step 4"], note: "Open account → Learn index funds → Invest $25 → Build the habit" },
      aware: { steps: [5, 8, 10, 9], labels: ["Compare", "Open IRA", "First ETF", "Review"], note: "Compare brokerages → Open Roth IRA → Buy VTI → Set 90-day review" },
      some: { steps: [7, 8, 10, 9], labels: ["Audit", "Automate", "Fees", "Model"], note: "Audit holdings → Automate contributions → Cut fees → Model growth" },
    };
    const canvas = document.querySelector("#tool-page-chart");
    if (canvas) canvas.style.display = "block";
    const update = () => {
      const level = document.querySelector("#p-guide-level").value;
      const { steps, labels, note } = paths[level];
      drawChart(steps, labels);
      document.querySelector("#tool-page-result").textContent = "Your roadmap";
      document.querySelector("#tool-page-note").textContent = note;
    };
    controls.querySelector("select").addEventListener("change", update);
    update();
  },
  inflation() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      ${pageControl("Amount today", "p-in-amt", 100, 50000, 1000, 100, "$")}
      ${pageControl("Years", "p-in-years", 1, 50, 20, 1, "", " yrs")}
      ${pageControl("Inflation rate", "p-in-inf", 0, 10, 3, 0.5, "", "%")}
      ${pageControl("Investment return", "p-in-ret", 0, 12, 7, 0.5, "", "%")}
    `;
    const update = () => {
      const amt = Number(document.querySelector("#p-in-amt").value);
      const y = Number(document.querySelector("#p-in-years").value);
      const inf = Number(document.querySelector("#p-in-inf").value);
      const ret = Number(document.querySelector("#p-in-ret").value);
      setPageControlValue("p-in-amt", amt, "$");
      setPageControlValue("p-in-years", y, "", " yrs");
      setPageControlValue("p-in-inf", inf, "", "%");
      setPageControlValue("p-in-ret", ret, "", "%");
      const cashPower = amt / (1 + inf / 100) ** y;
      const investedReal = amt * ((1 + ret / 100) / (1 + inf / 100)) ** y;
      const double = ret > 0 ? 72 / ret : null;
      const canvas = document.querySelector("#tool-page-chart");
      canvas.style.display = "block";
      drawChart([amt, cashPower, investedReal], ["today", "cash", "invested"], ["#60a5fa", "#fb7185", "#22c55e"]);
      document.querySelector("#tool-page-result").textContent = `${money(cashPower)} buying power`;
      document.querySelector("#tool-page-note").textContent = `${money(amt)} kept as cash buys only what ${money(cashPower)} buys today after ${y} years of ${inf}% inflation. Invested at ${ret}%, it is worth about ${money(investedReal)} in today's dollars. Rule of 72: money doubles about every ${double ? double.toFixed(1) : "never"} years at ${ret}%.`;
    };
    controls.querySelectorAll("input").forEach((i) => i.addEventListener("input", update));
    update();
  },
  subscriptions() {
    let rows;
    try { rows = JSON.parse(localStorage.getItem("subAudit") || "null"); } catch (e) { rows = null; }
    if (!Array.isArray(rows) || !rows.length) rows = [["Streaming", 15.49, true], ["Music", 10.99, true], ["Cloud storage", 2.99, true], ["Gym", 25, true], ["", 0, true], ["", 0, true]];
    const controls = document.querySelector("#tool-page-controls");
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    controls.innerHTML = rows.map((r, i) => `<div class="sub-row">
      <input class="sub-name" data-i="${i}" type="text" placeholder="Subscription" value="${esc(r[0])}" aria-label="Subscription name ${i + 1}" />
      <input class="sub-cost" data-i="${i}" type="number" min="0" step="0.01" inputmode="decimal" value="${r[1]}" aria-label="Monthly cost ${i + 1}" />
      <label class="sub-keep"><input type="checkbox" data-i="${i}" ${r[2] ? "checked" : ""} /> keep</label>
    </div>`).join("") + `<p class="tool-hint">Uncheck "keep" for anything you would cancel. Saved in this browser only.</p>`;
    const update = () => {
      const next = rows.map((_, i) => [
        controls.querySelector(`.sub-name[data-i="${i}"]`).value,
        Math.max(0, Number(controls.querySelector(`.sub-cost[data-i="${i}"]`).value) || 0),
        controls.querySelector(`input[type=checkbox][data-i="${i}"]`).checked,
      ]);
      try { localStorage.setItem("subAudit", JSON.stringify(next)); } catch (e) {}
      const total = next.reduce((s, r) => s + r[1], 0);
      const cut = next.filter((r) => !r[2]).reduce((s, r) => s + r[1], 0);
      const r = 0.07 / 12, n = 120;
      const grown = cut * (((1 + r) ** n - 1) / r);
      const canvas = document.querySelector("#tool-page-chart");
      canvas.style.display = "block";
      drawChart([total * 12, (total - cut) * 12, cut * 12], ["per year", "keeping", "saved"], ["#fb7185", "#60a5fa", "#22c55e"]);
      document.querySelector("#tool-page-result").textContent = `${money(cut * 12)}/yr saved`;
      document.querySelector("#tool-page-note").textContent = `All subscriptions cost ${money(total)}/month (${money(total * 12)}/year). Cutting the unchecked ones saves ${money(cut)}/month. Invested at 7% for 10 years, that could grow to about ${money(grown)}. Illustrative only.`;
    };
    controls.querySelectorAll("input").forEach((i) => i.addEventListener("input", update));
    controls.querySelectorAll("input[type=checkbox]").forEach((i) => i.addEventListener("change", update));
    update();
  },
  car_afford() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      ${pageControl("Monthly take-home pay", "p-car-inc", 1500, 12000, 3500, 100, "$")}
      ${pageControl("Car price", "p-car-price", 3000, 80000, 22000, 500, "$")}
      ${pageControl("Down payment", "p-car-down", 0, 30000, 3000, 500, "$")}
      ${pageControl("Loan rate (APR)", "p-car-apr", 0, 15, 7, 0.25, "", "%")}
      ${pageControl("Loan term", "p-car-term", 24, 84, 60, 12, "", " mo")}
      ${pageControl("Insurance + gas + upkeep", "p-car-run", 100, 1200, 400, 25, "$")}
    `;
    const update = () => {
      const g = (id) => Number(document.querySelector(`#${id}`).value);
      const inc = g("p-car-inc"), price = g("p-car-price"), down = Math.min(g("p-car-down"), g("p-car-price")), apr = g("p-car-apr"), term = g("p-car-term"), run = g("p-car-run");
      setPageControlValue("p-car-inc", inc, "$"); setPageControlValue("p-car-price", price, "$"); setPageControlValue("p-car-down", g("p-car-down"), "$");
      setPageControlValue("p-car-apr", apr, "", "%"); setPageControlValue("p-car-term", term, "", " mo"); setPageControlValue("p-car-run", run, "$");
      const loan = price - down, r = apr / 100 / 12;
      const pay = loan <= 0 ? 0 : r === 0 ? loan / term : (loan * r) / (1 - (1 + r) ** -term);
      const monthly = pay + run;
      const pct = (monthly / inc) * 100;
      const totalCost = pay * term + down + run * term;
      const canvas = document.querySelector("#tool-page-chart");
      canvas.style.display = "block";
      drawChart([pay, run, Math.max(0, inc * 0.15 - monthly)], ["loan", "running", "room"], ["#60a5fa", "#f59e0b", "#22c55e"]);
      const verdict = pct <= 15 ? "Comfortable" : pct <= 20 ? "Stretching" : "Too much";
      document.querySelector("#tool-page-result").textContent = `${verdict}: ${pct.toFixed(0)}% of take-home`;
      document.querySelector("#tool-page-note").textContent = `${money(pay)} loan payment + ${money(run)} running costs = ${money(monthly)}/month. Total cost over the loan: about ${money(totalCost)}. A common guideline is to keep all car costs near 15% of take-home pay (20% at most).`;
    };
    controls.querySelectorAll("input").forEach((i) => i.addEventListener("input", update));
    update();
  },
  retirement_number() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      ${pageControl("Current age", "p-rn-age", 16, 60, 22, 1)}
      ${pageControl("Retirement age", "p-rn-ret", 50, 75, 65, 1)}
      ${pageControl("Monthly spending in retirement (today's $)", "p-rn-spend", 1000, 10000, 4000, 250, "$")}
      ${pageControl("Saved so far", "p-rn-have", 0, 200000, 0, 1000, "$")}
      ${pageControl("Return before retirement", "p-rn-r", 0, 12, 7, 0.5, "", "%")}
      ${pageControl("Inflation", "p-rn-inf", 0, 8, 3, 0.5, "", "%")}
    `;
    const update = () => {
      const g = (id) => Number(document.querySelector(`#${id}`).value);
      const age = g("p-rn-age"), ret = Math.max(g("p-rn-ret"), age + 1), spend = g("p-rn-spend"), have = g("p-rn-have"), rr = g("p-rn-r") / 100, inf = g("p-rn-inf") / 100;
      setPageControlValue("p-rn-age", age); setPageControlValue("p-rn-ret", g("p-rn-ret")); setPageControlValue("p-rn-spend", spend, "$");
      setPageControlValue("p-rn-have", have, "$"); setPageControlValue("p-rn-r", g("p-rn-r"), "", "%"); setPageControlValue("p-rn-inf", g("p-rn-inf"), "", "%");
      const years = ret - age;
      const futureSpend = spend * 12 * (1 + inf) ** years;
      const target = futureSpend / 0.04; // 4% rule of thumb
      const mr = rr / 12, n = years * 12;
      const haveGrown = have * (1 + mr) ** n;
      const gap = Math.max(0, target - haveGrown);
      const monthly = gap === 0 ? 0 : mr === 0 ? gap / n : (gap * mr) / ((1 + mr) ** n - 1);
      const canvas = document.querySelector("#tool-page-chart");
      canvas.style.display = "block";
      drawChart([target, haveGrown, gap], ["target", "savings", "gap"], ["#b7dbc2", "#22c55e", "#fb7185"]);
      document.querySelector("#tool-page-result").textContent = `${money(monthly)}/mo to save`;
      document.querySelector("#tool-page-note").textContent = `Target nest egg about ${money(target)} at age ${ret} (spending ${money(futureSpend / 12)}/month after ${years} years of inflation, using the common 4% withdrawal guideline). Your current savings could grow to ${money(haveGrown)}. Estimates only; Social Security and taxes are not included.`;
    };
    controls.querySelectorAll("input").forEach((i) => i.addEventListener("input", update));
    update();
  },
  student_loan() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      ${pageControl("Loan balance", "p-sl-bal", 1000, 200000, 30000, 1000, "$")}
      ${pageControl("Interest rate (APR)", "p-sl-apr", 0, 15, 6.5, 0.25, "", "%")}
      ${pageControl("Repayment term", "p-sl-term", 5, 30, 10, 1, "", " yrs")}
      ${pageControl("Extra per month", "p-sl-extra", 0, 1000, 100, 10, "$")}
    `;
    const simulate = (bal, r, pay) => {
      let months = 0, interest = 0;
      while (bal > 0.005 && months < 1200) {
        const i = bal * r;
        if (pay <= i && r > 0) return null;
        interest += i;
        bal = bal + i - Math.min(pay, bal + i);
        months += 1;
      }
      return { months, interest };
    };
    const update = () => {
      const bal = Number(document.querySelector("#p-sl-bal").value);
      const apr = Number(document.querySelector("#p-sl-apr").value);
      const term = Number(document.querySelector("#p-sl-term").value);
      const extra = Number(document.querySelector("#p-sl-extra").value);
      setPageControlValue("p-sl-bal", bal, "$");
      setPageControlValue("p-sl-apr", apr, "", "%");
      setPageControlValue("p-sl-term", term, "", " yrs");
      setPageControlValue("p-sl-extra", extra, "$");
      const r = apr / 100 / 12, n = term * 12;
      const std = r === 0 ? bal / n : (bal * r) / (1 - (1 + r) ** -n);
      const base = simulate(bal, r, std);
      const fast = simulate(bal, r, std + extra);
      const canvas = document.querySelector("#tool-page-chart");
      canvas.style.display = "block";
      drawChart([bal, base.interest, fast.interest], ["principal", "interest", "w/ extra"], ["#60a5fa", "#fb7185", "#22c55e"]);
      document.querySelector("#tool-page-result").textContent = `${money(std)}/mo standard`;
      const saved = base.interest - fast.interest;
      const mSaved = base.months - fast.months;
      document.querySelector("#tool-page-note").textContent = extra > 0
        ? `Standard plan: ${money(base.interest)} total interest over ${base.months} months. Adding ${money(extra)}/mo finishes ${Math.floor(mSaved / 12)} yr ${mSaved % 12} mo sooner and saves ${money(saved)} in interest. Federal and private loan terms vary; check your servicer for exact figures.`
        : `Standard plan: ${money(base.interest)} total interest over ${base.months} months. Move the "Extra per month" slider to see what a little more each month saves.`;
    };
    controls.querySelectorAll("input").forEach((i) => i.addEventListener("input", update));
    update();
  },
  paycheck() {
    const controls = document.querySelector("#tool-page-controls");
    const stateList = window.STATE_TAX || {};
    controls.innerHTML = `
      <label>State
        <select id="p-pay-state-pick">
          <option value="">Custom rate (use slider)</option>
          ${Object.keys(stateList).sort((a, b) => stateList[a][0].localeCompare(stateList[b][0])).map((code) => `<option value="${code}">${stateList[code][0]}${stateList[code][1] === 0 ? " (no wage income tax)" : ""}</option>`).join("")}
        </select>
      </label>
      <label>Filing status
        <select id="p-pay-status">
          <option value="single">Single</option>
          <option value="married">Married filing jointly (one income)</option>
        </select>
      </label>
      <label>Pay frequency
        <select id="p-pay-freq">
          <option value="12">Monthly</option>
          <option value="24">Twice a month</option>
          <option value="26" selected>Every two weeks</option>
          <option value="52">Weekly</option>
        </select>
      </label>
      ${pageControl("Annual salary", "p-pay-salary", 20000, 250000, 65000, 1000, "$")}
      ${pageControl("Pre-tax 401(k)", "p-pay-401k", 0, 25, 5, 1, "", "%")}
      ${pageControl("State income tax (approx.)", "p-pay-state", 0, 10, 4, 0.25, "", "%")}
    `;
    const pickState = (code, announce) => {
      const entry = stateList[code];
      if (!entry) return;
      const slider = document.querySelector("#p-pay-state");
      slider.value = entry[1];
      document.querySelector("#p-pay-state-pick").value = code;
      if (announce) {
        document.title = `${entry[0]} Paycheck Calculator | Mentor Labs`;
        document.querySelector("#detail-title").textContent = `${entry[0]} Paycheck Calculator`;
        setPageMeta(document.title, `Estimate your ${entry[0]} take-home pay after federal tax, Social Security, Medicare, state income tax and 401(k). Free, no login.`);
      }
    };
    const urlState = (params.get("state") || "").toUpperCase();
    if (stateList[urlState]) pickState(urlState, true);
    document.querySelector("#p-pay-state-pick").addEventListener("change", (e) => { if (e.target.value) pickState(e.target.value, false); });
    document.querySelector("#p-pay-state").addEventListener("input", () => { document.querySelector("#p-pay-state-pick").value = ""; });
    const update = () => {
      const status = document.querySelector("#p-pay-status").value;
      const periods = Number(document.querySelector("#p-pay-freq").value);
      const gross = Number(document.querySelector("#p-pay-salary").value);
      const k = Number(document.querySelector("#p-pay-401k").value);
      const st = Number(document.querySelector("#p-pay-state").value);
      setPageControlValue("p-pay-salary", gross, "$");
      setPageControlValue("p-pay-401k", k, "", "%");
      setPageControlValue("p-pay-state", st, "", "%");
      const { pretax, fed, fica, state, net } = window.BIG_CALC.paycheck({ gross, status, k401: k, stateRate: st });
      const canvas = document.querySelector("#tool-page-chart");
      canvas.style.display = "block";
      drawChart([net, fed, fica, state, pretax], ["take-home", "federal", "FICA", "state", "401k"], ["#22c55e", "#fb7185", "#f59e0b", "#a78bfa", "#60a5fa"]);
      document.querySelector("#tool-page-result").textContent = `${money(net / periods)} per paycheck`;
      document.querySelector("#tool-page-note").textContent = `${money(net / 12)}/month take-home. Federal ${money(fed)}, FICA ${money(fica)}, state ${money(state)}, 401(k) ${money(pretax)} (still yours). Effective tax rate ${(((fed + fica + state) / gross) * 100).toFixed(1)}%. 2026 federal estimate only; excludes health premiums, local tax, and credits.`;
    };
    controls.querySelectorAll("input").forEach((i) => i.addEventListener("input", update));
    controls.querySelectorAll("select").forEach((s) => s.addEventListener("change", update));
    update();
  },
  roth_vs_trad() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      ${pageControl("Pre-tax amount you'd contribute per year", "p-rt-amt", 1000, 23500, 6000, 500, "$")}
      ${pageControl("Years until retirement", "p-rt-years", 5, 45, 35, 1, "", " yrs")}
      ${pageControl("Return assumption", "p-rt-rate", 0, 12, 7, 0.5, "", "%")}
      ${pageControl("Tax rate now", "p-rt-now", 0, 40, 12, 1, "", "%")}
      ${pageControl("Tax rate in retirement", "p-rt-ret", 0, 40, 22, 1, "", "%")}
    `;
    const update = () => {
      const c = Number(document.querySelector("#p-rt-amt").value);
      const n = Number(document.querySelector("#p-rt-years").value);
      const rate = Number(document.querySelector("#p-rt-rate").value);
      const now = Number(document.querySelector("#p-rt-now").value);
      const ret = Number(document.querySelector("#p-rt-ret").value);
      setPageControlValue("p-rt-amt", c, "$");
      setPageControlValue("p-rt-years", n, "", " yrs");
      setPageControlValue("p-rt-rate", rate, "", "%");
      setPageControlValue("p-rt-now", now, "", "%");
      setPageControlValue("p-rt-ret", ret, "", "%");
      const r = rate / 100;
      const growth = r === 0 ? n : ((1 + r) ** n - 1) / r;
      // Same take-home cost: Traditional invests the full pre-tax amount, Roth invests what is left after tax.
      const tradAfterTax = c * growth * (1 - ret / 100);
      const rothAfterTax = c * (1 - now / 100) * growth;
      const diff = Math.abs(rothAfterTax - tradAfterTax);
      const canvas = document.querySelector("#tool-page-chart");
      canvas.style.display = "block";
      drawChart([tradAfterTax, rothAfterTax], ["Traditional", "Roth"], ["#60a5fa", "#b7dbc2"]);
      const winner = diff < 1 ? "It's a tie" : rothAfterTax > tradAfterTax ? "Roth wins" : "Traditional wins";
      document.querySelector("#tool-page-result").textContent = winner;
      document.querySelector("#tool-page-note").textContent = `Traditional ${money(tradAfterTax)} vs Roth ${money(rothAfterTax)} after tax (${money(diff)} difference). Rule of thumb: lower tax rate now than in retirement favors Roth; higher now favors Traditional. Assumes the same take-home cost either way and no early withdrawals.`;
    };
    controls.querySelectorAll("input").forEach((i) => i.addEventListener("input", update));
    update();
  },
  savings_goal() {
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = `
      ${pageControl("Goal amount", "p-sg-goal", 500, 100000, 10000, 500, "$")}
      ${pageControl("Already saved", "p-sg-have", 0, 50000, 1000, 250, "$")}
      ${pageControl("Monthly savings", "p-sg-month", 25, 3000, 300, 25, "$")}
      ${pageControl("Savings APY", "p-sg-apy", 0, 6, 4, 0.25, "", "%")}
    `;
    const update = () => {
      const goal = Number(document.querySelector("#p-sg-goal").value);
      const have = Number(document.querySelector("#p-sg-have").value);
      const monthly = Number(document.querySelector("#p-sg-month").value);
      const apy = Number(document.querySelector("#p-sg-apy").value);
      setPageControlValue("p-sg-goal", goal, "$");
      setPageControlValue("p-sg-have", have, "$");
      setPageControlValue("p-sg-month", monthly, "$");
      setPageControlValue("p-sg-apy", apy, "", "%");
      const mr = (1 + apy / 100) ** (1 / 12) - 1;
      let bal = have, months = 0, contributed = have;
      const path = [have];
      while (bal < goal && months < 600) {
        bal = bal * (1 + mr) + monthly;
        contributed += monthly;
        months += 1;
        path.push(bal);
      }
      const canvas = document.querySelector("#tool-page-chart");
      canvas.style.display = "block";
      const pts = [0, 0.25, 0.5, 0.75, 1].map((f) => path[Math.round((path.length - 1) * f)]);
      drawChart(pts, ["start", "25%", "50%", "75%", "goal"], ["#38bdf8", "#60a5fa", "#b7dbc2", "#22c55e", "#a78bfa"]);
      const resultEl = document.querySelector("#tool-page-result");
      const noteEl = document.querySelector("#tool-page-note");
      if (have >= goal) {
        resultEl.textContent = "Already there";
        noteEl.textContent = "You have already saved at least your goal amount.";
      } else if (months >= 600) {
        resultEl.textContent = "50+ years";
        noteEl.textContent = "Raise the monthly amount to make this goal realistic.";
      } else {
        const y = Math.floor(months / 12), m = months % 12;
        resultEl.textContent = `${y ? y + " yr " : ""}${m} mo`;
        noteEl.textContent = `${months} months of saving ${money(monthly)}. About ${money(Math.max(0, bal - contributed))} of the total comes from interest.`;
      }
    };
    controls.querySelectorAll("input").forEach((i) => i.addEventListener("input", update));
    update();
  },
  net_worth() {
    const fields = [
      ["nw-cash", "Cash and savings", "asset"], ["nw-invest", "Investments (401k, IRA, brokerage)", "asset"], ["nw-other", "Other assets (car, valuables)", "asset"],
      ["nw-student", "Student loans", "debt"], ["nw-cards", "Credit cards", "debt"], ["nw-debt", "Other debt (auto, personal)", "debt"],
    ];
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("netWorthInputs") || "{}"); } catch (e) {}
    const controls = document.querySelector("#tool-page-controls");
    controls.innerHTML = fields.map(([id, label]) => `<label>${label} ($)<input id="${id}" type="number" inputmode="decimal" min="0" step="100" value="${saved[id] ?? 0}" /></label>`).join("") +
      `<p class="tool-hint">Saved in this browser only. Nothing is sent anywhere. Never enter account numbers.</p>`;
    const update = () => {
      const vals = {};
      fields.forEach(([id]) => { vals[id] = Math.max(0, Number(document.querySelector(`#${id}`).value) || 0); });
      try { localStorage.setItem("netWorthInputs", JSON.stringify(vals)); } catch (e) {}
      const assets = fields.filter((f) => f[2] === "asset").reduce((s, [id]) => s + vals[id], 0);
      const debts = fields.filter((f) => f[2] === "debt").reduce((s, [id]) => s + vals[id], 0);
      const nw = assets - debts;
      const canvas = document.querySelector("#tool-page-chart");
      canvas.style.display = "block";
      drawChart([assets, debts, Math.max(0, nw)], ["assets", "debts", "net worth"], ["#22c55e", "#fb7185", "#b7dbc2"]);
      document.querySelector("#tool-page-result").textContent = money(nw);
      document.querySelector("#tool-page-note").textContent = `${money(assets)} owned minus ${money(debts)} owed. ${nw < 0 ? "Negative is normal early on, especially with student loans. The goal is to move it up each quarter." : "Update this every quarter and watch the trend, not the single number."}`;
    };
    controls.querySelectorAll("input").forEach((i) => i.addEventListener("input", update));
    update();
  },
};

function renderTool() {
  const item = content.tools[key];
  if (!item) return missing();
  document.title = `${item.title} | Mentor Labs`;
  setPageMeta(document.title, item.summary);
  document.querySelector("#detail-title").textContent = item.title;
  document.querySelector("#detail-summary").textContent = item.summary;
  document.querySelector("#tool-inputs").innerHTML = list(item.inputs);
  document.querySelector("#tool-use-cases").innerHTML = list(item.useCases);
  (toolRenderers[key] || toolRenderers.compound)();
  const noteEl = document.querySelector("#tool-page-note");
  if (noteEl && noteEl.parentElement) {
    const how = document.createElement("p");
    how.className = "tool-hint";
    how.innerHTML = 'Educational estimate. <a href="method.html">How this is calculated and where the data comes from</a>.';
    noteEl.parentElement.appendChild(how);
  }
  renderRelated(content.tools, key, "tool.html?tool=");
}

if (type === "lesson") renderLesson();
if (type === "workflow") renderWorkflow();
if (type === "tool") renderTool();
setupCopyButtons();
