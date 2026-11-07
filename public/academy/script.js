const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");

const toolData = {
  compound: {
    kicker: "Calculator",
    title: "Compound Interest Calculator",
    copy: "Adjust the inputs to see an educational estimate of future value, total contributions, and growth.",
    html: `
      <label>Monthly contribution <input id="compound-monthly" type="number" min="0" value="250" /></label>
      <label>Years <input id="compound-years" type="number" min="1" value="10" /></label>
      <label>Annual return assumption (%) <input id="compound-rate" type="number" min="0" value="7" step="0.5" /></label>
      <div class="spark-bars" id="compound-bars" aria-hidden="true"></div>
      <div class="result-box"><span>Estimated future value</span><strong id="compound-result">$43,520</strong><small id="compound-note">$30,000 contributed</small></div>
    `,
    init: () => {
      const monthly = document.querySelector("#compound-monthly");
      const years = document.querySelector("#compound-years");
      const rate = document.querySelector("#compound-rate");
      const result = document.querySelector("#compound-result");
      const note = document.querySelector("#compound-note");
      const bars = document.querySelector("#compound-bars");
      const update = () => {
        const m = Number(monthly.value) || 0;
        const y = Math.max(1, Number(years.value) || 1);
        const r = (Number(rate.value) || 0) / 100 / 12;
        const months = y * 12;
        const contributed = m * months;
        const total = r === 0 ? contributed : m * (((1 + r) ** months - 1) / r);
        result.textContent = formatCurrency(total);
        note.textContent = `${formatCurrency(contributed)} contributed`;
        renderBars(bars, [0.2, 0.34, 0.48, 0.67, 0.82, 1].map((scale) => total * scale));
      };
      [monthly, years, rate].forEach((input) => input.addEventListener("input", update));
      update();
    },
  },
  credit: {
    kicker: "Calculator",
    title: "Credit Utilization Calculator",
    copy: "Estimate your utilization ratio. Lower utilization can be healthier, but this is educational only.",
    html: `
      <label>Current card balance <input id="credit-balance" type="number" min="0" value="450" /></label>
      <label>Total credit limit <input id="credit-limit" type="number" min="1" value="2500" /></label>
      <div class="spark-bars" id="credit-bars" aria-hidden="true"></div>
      <div class="result-box"><span>Utilization</span><strong id="credit-result">18%</strong><small id="credit-note">Generally, many learners aim to understand the 30% threshold.</small></div>
    `,
    init: () => {
      const balance = document.querySelector("#credit-balance");
      const limit = document.querySelector("#credit-limit");
      const result = document.querySelector("#credit-result");
      const note = document.querySelector("#credit-note");
      const bars = document.querySelector("#credit-bars");
      const update = () => {
        const b = Number(balance.value) || 0;
        const l = Math.max(1, Number(limit.value) || 1);
        const pct = Math.round((b / l) * 100);
        result.textContent = `${pct}%`;
        note.textContent = pct <= 30 ? "This is below 30% in this example." : "This is above 30% in this example.";
        renderBars(bars, [pct, 30, 10, Math.max(0, pct - 10)], ["Now", "30", "10", "Gap"]);
      };
      [balance, limit].forEach((input) => input.addEventListener("input", update));
      update();
    },
  },
  budget: {
    kicker: "Planner",
    title: "Budget Builder",
    copy: "Create a simple monthly split across needs, wants, saving, and debt payoff.",
    html: `
      <label>Monthly income <input id="budget-income" type="number" min="0" value="2200" /></label>
      <div class="spark-bars" id="budget-bars" aria-hidden="true"></div>
      <div class="result-box"><span>Example split</span><strong id="budget-result">$1,100 needs</strong><small id="budget-note">$660 wants, $440 saving/debt</small></div>
    `,
    init: () => {
      const income = document.querySelector("#budget-income");
      const result = document.querySelector("#budget-result");
      const note = document.querySelector("#budget-note");
      const bars = document.querySelector("#budget-bars");
      const update = () => {
        const value = Number(income.value) || 0;
        result.textContent = `${formatCurrency(value * 0.5)} needs`;
        note.textContent = `${formatCurrency(value * 0.3)} wants, ${formatCurrency(value * 0.2)} saving/debt`;
        renderBars(bars, [value * 0.5, value * 0.3, value * 0.2], ["Needs", "Wants", "Save"]);
      };
      income.addEventListener("input", update);
      update();
    },
  },
  salary: {
    kicker: "Career",
    title: "Salary Breakdown Calculator",
    copy: "Translate a salary into planning numbers. Actual taxes and deductions vary.",
    html: `
      <label>Annual salary <input id="salary-income" type="number" min="0" value="60000" /></label>
      <label>Estimated deduction rate (%) <input id="salary-tax" type="number" min="0" max="60" value="25" /></label>
      <div class="spark-bars" id="salary-bars" aria-hidden="true"></div>
      <div class="result-box"><span>Estimated monthly take-home</span><strong id="salary-result">$3,750</strong><small id="salary-note">$865 per week</small></div>
    `,
    init: () => {
      const income = document.querySelector("#salary-income");
      const tax = document.querySelector("#salary-tax");
      const result = document.querySelector("#salary-result");
      const note = document.querySelector("#salary-note");
      const bars = document.querySelector("#salary-bars");
      const update = () => {
        const annual = Number(income.value) || 0;
        const deduction = Math.min(60, Math.max(0, Number(tax.value) || 0)) / 100;
        const takeHome = annual * (1 - deduction);
        result.textContent = formatCurrency(takeHome / 12);
        note.textContent = `${formatCurrency(takeHome / 52)} per week`;
        renderBars(bars, [annual / 12, takeHome / 12, takeHome / 52], ["Gross", "Net", "Week"]);
      };
      [income, tax].forEach((input) => input.addEventListener("input", update));
      update();
    },
  },
  afford: {
    kicker: "Decision",
    title: "Can I Afford This? Analyzer",
    copy: "Compare a purchase with monthly income and savings goals before buying.",
    html: `
      <label>Purchase cost <input id="afford-cost" type="number" min="0" value="300" /></label>
      <label>Monthly income <input id="afford-income" type="number" min="1" value="2200" /></label>
      <div class="spark-bars" id="afford-bars" aria-hidden="true"></div>
      <div class="result-box"><span>Purchase as income share</span><strong id="afford-result">14%</strong><small id="afford-note">Pause and compare this with your goals.</small></div>
    `,
    init: () => {
      const cost = document.querySelector("#afford-cost");
      const income = document.querySelector("#afford-income");
      const result = document.querySelector("#afford-result");
      const note = document.querySelector("#afford-note");
      const bars = document.querySelector("#afford-bars");
      const update = () => {
        const c = Number(cost.value) || 0;
        const i = Math.max(1, Number(income.value) || 1);
        const pct = Math.round((c / i) * 100);
        result.textContent = `${pct}%`;
        note.textContent = pct <= 10 ? "Low relative to monthly income in this example." : "Worth reviewing against savings priorities.";
        renderBars(bars, [c, i * 0.1, i * 0.2], ["Cost", "10%", "20%"]);
      };
      [cost, income].forEach((input) => input.addEventListener("input", update));
      update();
    },
  },
  finder: {
    kicker: "AI",
    title: "AI Finance Tool Finder",
    copy: "Pick your current question and get a responsible AI workflow to try.",
    html: `
      <label>What are you working on?
        <select id="finder-topic">
          <option value="budget">Budgeting</option>
          <option value="career">Internship search</option>
          <option value="resume">Resume</option>
          <option value="research">Investing research</option>
          <option value="coding">Coding automation</option>
        </select>
      </label>
      <div class="spark-bars" id="finder-bars" aria-hidden="true"></div>
      <div class="result-box"><span>Recommended workflow</span><strong id="finder-result">AI Budgeting Workflow</strong><small id="finder-note">Ask AI to categorize expenses, then verify every output.</small></div>
    `,
    init: () => {
      const topic = document.querySelector("#finder-topic");
      const result = document.querySelector("#finder-result");
      const note = document.querySelector("#finder-note");
      const bars = document.querySelector("#finder-bars");
      const workflows = {
        budget: ["AI Budgeting Workflow", "Ask AI to categorize expenses, then verify every output."],
        career: ["AI Internship Networking Workflow", "Use AI to research firms and draft outreach you personalize."],
        resume: ["AI Resume Improvement Workflow", "Use AI to tighten bullets, then fact-check every claim."],
        research: ["AI Investing Research Workflow", "Use AI to summarize sources and generate questions, not final decisions."],
        coding: ["AI Coding + Automation Workflow", "Use AI to create small scripts, formulas, and trackers with fake test data first."],
      };
      const update = () => {
        const [title, text] = workflows[topic.value];
        result.textContent = title;
        note.textContent = text;
        renderBars(bars, topic.value === "coding" ? [9, 6, 8] : [6, 8, 5], ["Impact", "Ease", "Reuse"]);
      };
      topic.addEventListener("input", update);
      update();
    },
  },
  emergency: {
    kicker: "Safety Net",
    title: "Emergency Fund Calculator",
    copy: "Enter your average monthly expenses to see your 1-, 3-, and 6-month emergency fund targets.",
    html: `
      <label>Monthly expenses <input id="emerg-expenses" type="number" min="0" value="1800" /></label>
      <div class="spark-bars" id="emerg-bars" aria-hidden="true"></div>
      <div class="result-box"><span>3-month target (recommended start)</span><strong id="emerg-result">$5,400</strong><small id="emerg-note">$1,800 × 3 months</small></div>
    `,
    init: () => {
      const expenses = document.querySelector("#emerg-expenses");
      const result = document.querySelector("#emerg-result");
      const note = document.querySelector("#emerg-note");
      const bars = document.querySelector("#emerg-bars");
      const update = () => {
        const e = Number(expenses.value) || 0;
        result.textContent = formatCurrency(e * 3);
        note.textContent = `${formatCurrency(e)} × 3 months`;
        renderBars(bars, [e, e * 3, e * 6], ["1 mo", "3 mo", "6 mo"]);
      };
      expenses.addEventListener("input", update);
      update();
    },
  },
  debt_planner: {
    kicker: "Debt",
    title: "Debt Payoff Planner",
    copy: "See how much faster you pay off debt with an extra monthly contribution. Educational estimate only.",
    html: `
      <label>Balance <input id="debt-balance" type="number" min="0" value="4500" /></label>
      <label>Interest rate (% APR) <input id="debt-rate" type="number" min="0" max="40" value="19" step="0.5" /></label>
      <label>Monthly payment <input id="debt-payment" type="number" min="0" value="150" /></label>
      <div class="spark-bars" id="debt-bars" aria-hidden="true"></div>
      <div class="result-box"><span>Estimated payoff</span><strong id="debt-result">36 months</strong><small id="debt-note">Add $50/mo to cut ~8 months</small></div>
    `,
    init: () => {
      const balance = document.querySelector("#debt-balance");
      const rate = document.querySelector("#debt-rate");
      const payment = document.querySelector("#debt-payment");
      const result = document.querySelector("#debt-result");
      const note = document.querySelector("#debt-note");
      const bars = document.querySelector("#debt-bars");
      const monthsToPayoff = (b, apr, pay) => {
        if (pay <= 0 || b <= 0) return 0;
        const r = apr / 100 / 12;
        if (r === 0) return Math.ceil(b / pay);
        if (pay <= b * r) return Infinity;
        return Math.ceil(-Math.log(1 - (b * r) / pay) / Math.log(1 + r));
      };
      const update = () => {
        const b = Number(balance.value) || 0;
        const apr = Number(rate.value) || 0;
        const pay = Number(payment.value) || 0;
        const base = monthsToPayoff(b, apr, pay);
        const extra = monthsToPayoff(b, apr, pay + 50);
        result.textContent = base === Infinity ? "Won't pay off" : `${base} months`;
        note.textContent = base === Infinity
          ? "Increase your payment above the monthly interest."
          : extra < base ? `Add $50/mo to cut ~${base - extra} months` : "Already on a solid path";
        renderBars(bars, [Math.min(base, 120), Math.min(extra, 120), Math.min(base * 0.5, 120)], ["Base", "+$50", "50%"]);
      };
      [balance, rate, payment].forEach((input) => input.addEventListener("input", update));
      update();
    },
  },
  email_gen: {
    kicker: "Career",
    title: "Networking Email Generator",
    copy: "Fill in your context and get a professional email template to personalize before sending.",
    html: `
      <label>Your role/year
        <select id="email-role">
          <option value="student">College student</option>
          <option value="recent">Recent graduate</option>
          <option value="career">Early-career professional</option>
        </select>
      </label>
      <label>Target contact type
        <select id="email-target">
          <option value="analyst">Analyst / Associate</option>
          <option value="recruiter">Recruiter</option>
          <option value="alumni">Alumni in finance</option>
        </select>
      </label>
      <div class="result-box" style="font-size:0.86rem;line-height:1.6">
        <span>Email template (personalize before sending)</span>
        <strong id="email-subject" style="font-size:1rem;margin-bottom:6px"></strong>
        <small id="email-body" style="white-space:pre-wrap;color:#b8b8b8"></small>
      </div>
    `,
    init: () => {
      const role = document.querySelector("#email-role");
      const target = document.querySelector("#email-target");
      const subject = document.querySelector("#email-subject");
      const body = document.querySelector("#email-body");
      const templates = {
        analyst: {
          student: ["Exploring finance — student at [School]", "Hi [Name],\n\nI'm a [Year] studying [Major] at [School] and am genuinely interested in [Company]'s work in [Area]. I'd love to learn about your path into the role.\n\nWould you be open to a 15-minute call in the next few weeks?\n\nThanks, [Your Name]"],
          recent: ["Connecting — recent finance grad", "Hi [Name],\n\nI recently graduated in [Field] and am focused on [Company]'s approach to [Area]. I'd value any insight into how you approached your first year.\n\nWould a brief call work for you?\n\nBest, [Your Name]"],
          career: ["Mutual interest in [Area] — career question", "Hi [Name],\n\nI'm currently in [Role] and following [Company]'s work closely. I'd appreciate 15 minutes to hear your perspective on [Topic].\n\nHappy to work around your schedule.\n\nBest, [Your Name]"],
        },
        recruiter: {
          student: ["Finance internship inquiry — [School] student", "Hi [Name],\n\nI'm a [Year] at [School] targeting finance internships for [Season]. Is [Company] recruiting for [Role]? I'd love to learn about the process.\n\nThank you, [Your Name]"],
          recent: ["Open roles at [Company] — recent grad", "Hi [Name],\n\nI'm a recent grad with [Skill] experience and strong interest in [Company]. Are there any open [Role] positions I could apply for?\n\nThank you, [Your Name]"],
          career: ["Career transition — interest in [Company]", "Hi [Name],\n\nI'm transitioning into [Field] with background in [Current Area]. I'd love to explore fit for any open roles at [Company].\n\nBest, [Your Name]"],
        },
        alumni: {
          student: ["Reaching out — [School] student", "Hi [Name],\n\nI found your profile through [School] alumni network. I'm studying [Major] and would value 15 minutes to hear how you broke into finance.\n\nNo pressure at all — thanks either way.\n\n[Your Name]"],
          recent: ["Alumni connection — career question", "Hi [Name],\n\nWe share [School] as alumni. I'm navigating my first year in finance and would love a quick conversation about your experience.\n\nHappy to keep it to 15 minutes.\n\n[Your Name]"],
          career: ["[School] alumni — quick question", "Hi [Name],\n\nFellow [School] grad here. I'm currently in [Field] and considering a move toward [Area] — I'd value your perspective given your path.\n\nWould a brief call work?\n\n[Your Name]"],
        },
      };
      const update = () => {
        const t = templates[target.value]?.[role.value];
        if (t) {
          subject.textContent = "Subject: " + t[0];
          body.textContent = t[1];
        }
      };
      [role, target].forEach((el) => el.addEventListener("change", update));
      update();
    },
  },
  invest_guide: {
    kicker: "Learning",
    title: "Investing Learning Path",
    copy: "Choose your starting point to see a structured beginner roadmap for index investing.",
    html: `
      <label>Your experience level
        <select id="guide-level">
          <option value="zero">Complete beginner (never invested)</option>
          <option value="aware">Aware but haven't started</option>
          <option value="some">Have a brokerage, unsure what to do</option>
        </select>
      </label>
      <div class="result-box">
        <span>Your next 4 steps</span>
        <strong id="guide-title" style="font-size:1rem"></strong>
        <small id="guide-steps" style="white-space:pre-wrap;color:#b8b8b8;line-height:1.7"></small>
      </div>
    `,
    init: () => {
      const level = document.querySelector("#guide-level");
      const title = document.querySelector("#guide-title");
      const steps = document.querySelector("#guide-steps");
      const paths = {
        zero: ["Start here: build your base first", "1. Open a free brokerage account (Fidelity or Schwab)\n2. Complete Chapter 5 — Investing Basics on this site\n3. Learn what an index fund is (S&P 500 ETF)\n4. Set up a $25/month auto-invest to start the habit"],
        aware: ["You're ready to open your first position", "1. Compare Fidelity vs. Vanguard vs. Schwab fees\n2. Open a Roth IRA if you have earned income\n3. Buy one broad index ETF (VTI or FXAIX)\n4. Set a reminder to review in 90 days, not 90 minutes"],
        some: ["Refine and automate your strategy", "1. Check your current holdings against a 3-fund portfolio\n2. Set up automatic monthly contributions\n3. Review expense ratios — target under 0.20%\n4. Use the Compound Interest Calculator to model your 10-year path"],
      };
      const update = () => {
        const [t, s] = paths[level.value];
        title.textContent = t;
        steps.textContent = s;
      };
      level.addEventListener("change", update);
      update();
    },
  },
};

const testimonials = [
  {
    copy: "The AI workflow angle makes finance feel less intimidating. It gives me a starting point instead of another lecture.",
    name: "Student builder",
  },
  {
    copy: "The tools make money decisions feel more concrete. I can see the tradeoff before I make the choice.",
    name: "Early career learner",
  },
  {
    copy: "It feels practical and professional without pretending there is a shortcut to wealth.",
    name: "Finance student",
  },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function renderBars(container, values, labels = []) {
  const max = Math.max(...values, 1);
  container.innerHTML = values
    .map((value, index) => {
      const height = Math.max(18, Math.round((value / max) * 104));
      const label = labels[index] || `${index + 1}`;
      return `<span style="height:${height}px"><i>${label}</i></span>`;
    })
    .join("");
}

function toolControl(label, id, min, max, value, step = 1, prefix = "", suffix = "") {
  return `<label class="tool-control-row">
    <span>${label} <strong id="${id}-value">${prefix}${value}${suffix}</strong></span>
    <input id="${id}" type="range" min="${min}" max="${max}" value="${value}" step="${step}" />
  </label>`;
}

function setControlValue(id, value, prefix = "", suffix = "") {
  const target = document.querySelector(`#${id}-value`);
  if (target) target.textContent = `${prefix}${value}${suffix}`;
}

function renderInsightChart(container, series) {
  const max = Math.max(...series.map((item) => item.value), 1);
  container.innerHTML = series
    .map((item) => {
      const pct = Math.max(6, Math.round((item.value / max) * 100));
      return `<div class="insight-row">
        <div class="insight-row-top"><span>${item.label}</span><strong>${item.display}</strong></div>
        <div class="insight-track"><i style="width:${pct}%; background:${item.color}"></i></div>
      </div>`;
    })
    .join("");
}

function payoffMonths(balance, apr, payment) {
  const b = Math.max(0, balance);
  const pay = Math.max(0, payment);
  const r = Math.max(0, apr) / 100 / 12;
  if (!b) return 0;
  if (!pay) return Infinity;
  if (!r) return Math.ceil(b / pay);
  if (pay <= b * r) return Infinity;
  return Math.ceil(-Math.log(1 - (b * r) / pay) / Math.log(1 + r));
}

function totalPaidForDebt(balance, apr, payment) {
  const months = payoffMonths(balance, apr, payment);
  if (months === Infinity) return Infinity;
  return months * payment;
}

Object.assign(toolData, {
  compound: {
    kicker: "Growth",
    title: "Compound Growth Simulator",
    copy: "Adjust contribution, starting amount, timeline, and return rate. The chart separates your money from investment growth.",
    html: `
      ${toolControl("Monthly contribution", "growth-monthly", 25, 2000, 250, 25, "$")}
      ${toolControl("Starting amount", "growth-start", 0, 25000, 1000, 250, "$")}
      ${toolControl("Years", "growth-years", 1, 40, 20, 1, "", " yrs")}
      ${toolControl("Annual return", "growth-rate", 0, 12, 7, 0.5, "", "%")}
      <div class="insight-chart" id="growth-chart" aria-hidden="true"></div>
      <div class="tool-metric-grid">
        <div><span>Total value</span><strong id="growth-total">$0</strong></div>
        <div><span>You contributed</span><strong id="growth-contributed">$0</strong></div>
        <div><span>Investment growth</span><strong id="growth-earned">$0</strong></div>
      </div>
    `,
    init: () => {
      const update = () => {
        const monthly = Number(document.querySelector("#growth-monthly").value);
        const start = Number(document.querySelector("#growth-start").value);
        const years = Number(document.querySelector("#growth-years").value);
        const rate = Number(document.querySelector("#growth-rate").value);
        setControlValue("growth-monthly", monthly, "$");
        setControlValue("growth-start", start, "$");
        setControlValue("growth-years", years, "", " yrs");
        setControlValue("growth-rate", rate, "", "%");
        const r = rate / 100 / 12;
        const months = years * 12;
        const futureStart = start * (1 + r) ** months;
        const futureContrib = r === 0 ? monthly * months : monthly * (((1 + r) ** months - 1) / r);
        const total = futureStart + futureContrib;
        const contributed = start + monthly * months;
        const earned = Math.max(0, total - contributed);
        document.querySelector("#growth-total").textContent = formatCurrency(total);
        document.querySelector("#growth-contributed").textContent = formatCurrency(contributed);
        document.querySelector("#growth-earned").textContent = formatCurrency(earned);
        renderInsightChart(document.querySelector("#growth-chart"), [
          { label: "Starting money", value: start, display: formatCurrency(start), color: "linear-gradient(90deg,#94a3b8,#cbd5e1)" },
          { label: "Monthly contributions", value: monthly * months, display: formatCurrency(monthly * months), color: "linear-gradient(90deg,#38bdf8,#2563eb)" },
          { label: "Investment growth", value: earned, display: formatCurrency(earned), color: "linear-gradient(90deg,#f2d990,#d7b56d)" },
        ]);
      };
      ["growth-monthly", "growth-start", "growth-years", "growth-rate"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", update));
      update();
    },
  },
  budget: {
    kicker: "Budget",
    title: "Budget Reality Check",
    copy: "Enter real monthly income and expenses to see whether your budget has breathing room or needs attention.",
    html: `
      ${toolControl("Take-home income", "budget-income", 800, 9000, 3200, 100, "$")}
      ${toolControl("Housing", "budget-housing", 0, 4000, 1100, 50, "$")}
      ${toolControl("Food + transport", "budget-basics", 0, 2500, 650, 25, "$")}
      ${toolControl("Debt minimums", "budget-debt", 0, 2000, 250, 25, "$")}
      ${toolControl("Subscriptions + fun", "budget-flex", 0, 2000, 500, 25, "$")}
      <div class="insight-chart" id="budget-chart" aria-hidden="true"></div>
      <div class="tool-metric-grid">
        <div><span>Status</span><strong id="budget-status">Healthy</strong></div>
        <div><span>Leftover</span><strong id="budget-leftover">$0</strong></div>
        <div><span>Weekly flexible</span><strong id="budget-weekly">$0</strong></div>
      </div>
    `,
    init: () => {
      const ids = ["budget-income", "budget-housing", "budget-basics", "budget-debt", "budget-flex"];
      const update = () => {
        const values = Object.fromEntries(ids.map((id) => [id, Number(document.querySelector(`#${id}`).value)]));
        ids.forEach((id) => setControlValue(id, values[id], "$"));
        const spent = values["budget-housing"] + values["budget-basics"] + values["budget-debt"] + values["budget-flex"];
        const leftover = values["budget-income"] - spent;
        const ratio = leftover / Math.max(values["budget-income"], 1);
        const status = ratio >= 0.15 ? "Healthy" : ratio >= 0.03 ? "Tight" : "Risky";
        const statusColor = status === "Healthy" ? "#22c55e" : status === "Tight" ? "#f59e0b" : "#ef4444";
        document.querySelector("#budget-status").textContent = status;
        document.querySelector("#budget-status").style.color = statusColor;
        document.querySelector("#budget-leftover").textContent = formatCurrency(leftover);
        document.querySelector("#budget-weekly").textContent = formatCurrency(Math.max(0, leftover / 4.33));
        renderInsightChart(document.querySelector("#budget-chart"), [
          { label: "Housing", value: values["budget-housing"], display: formatCurrency(values["budget-housing"]), color: "linear-gradient(90deg,#60a5fa,#2563eb)" },
          { label: "Food + transport", value: values["budget-basics"], display: formatCurrency(values["budget-basics"]), color: "linear-gradient(90deg,#2dd4bf,#0f766e)" },
          { label: "Debt minimums", value: values["budget-debt"], display: formatCurrency(values["budget-debt"]), color: "linear-gradient(90deg,#fb7185,#be123c)" },
          { label: "Subscriptions + fun", value: values["budget-flex"], display: formatCurrency(values["budget-flex"]), color: "linear-gradient(90deg,#c084fc,#7c3aed)" },
          { label: "Leftover", value: Math.max(0, leftover), display: formatCurrency(leftover), color: "linear-gradient(90deg,#f2d990,#d7b56d)" },
        ]);
      };
      ids.forEach((id) => document.querySelector(`#${id}`).addEventListener("input", update));
      update();
    },
  },
  debt_planner: {
    kicker: "Debt",
    title: "Debt Payoff Optimizer",
    copy: "See payoff time, total interest, and how extra monthly payments change the finish line.",
    html: `
      ${toolControl("Balance", "debt-balance", 500, 30000, 6000, 250, "$")}
      ${toolControl("APR", "debt-rate", 0, 36, 22, 0.5, "", "%")}
      ${toolControl("Minimum payment", "debt-min", 25, 1000, 180, 25, "$")}
      ${toolControl("Extra payment", "debt-extra", 0, 1000, 100, 25, "$")}
      <div class="insight-chart" id="debt-chart" aria-hidden="true"></div>
      <div class="tool-metric-grid">
        <div><span>Payoff time</span><strong id="debt-time">0 mo</strong></div>
        <div><span>Total interest</span><strong id="debt-interest">$0</strong></div>
        <div><span>Time saved</span><strong id="debt-saved">0 mo</strong></div>
      </div>
    `,
    init: () => {
      const ids = ["debt-balance", "debt-rate", "debt-min", "debt-extra"];
      const update = () => {
        const b = Number(document.querySelector("#debt-balance").value);
        const apr = Number(document.querySelector("#debt-rate").value);
        const min = Number(document.querySelector("#debt-min").value);
        const extra = Number(document.querySelector("#debt-extra").value);
        setControlValue("debt-balance", b, "$");
        setControlValue("debt-rate", apr, "", "%");
        setControlValue("debt-min", min, "$");
        setControlValue("debt-extra", extra, "$");
        const baseMonths = payoffMonths(b, apr, min);
        const optMonths = payoffMonths(b, apr, min + extra);
        const optPaid = totalPaidForDebt(b, apr, min + extra);
        const interest = optPaid === Infinity ? Infinity : Math.max(0, optPaid - b);
        document.querySelector("#debt-time").textContent = optMonths === Infinity ? "Won't pay off" : `${optMonths} mo`;
        document.querySelector("#debt-interest").textContent = interest === Infinity ? "Payment too low" : formatCurrency(interest);
        document.querySelector("#debt-saved").textContent = baseMonths === Infinity || optMonths === Infinity ? "—" : `${Math.max(0, baseMonths - optMonths)} mo`;
        renderInsightChart(document.querySelector("#debt-chart"), [
          { label: "Minimum only", value: baseMonths === Infinity ? 120 : baseMonths, display: baseMonths === Infinity ? "No payoff" : `${baseMonths} mo`, color: "linear-gradient(90deg,#fb7185,#be123c)" },
          { label: "With extra payment", value: optMonths === Infinity ? 120 : optMonths, display: optMonths === Infinity ? "No payoff" : `${optMonths} mo`, color: "linear-gradient(90deg,#22c55e,#15803d)" },
          { label: "Interest cost", value: interest === Infinity ? b : interest, display: interest === Infinity ? "Too low" : formatCurrency(interest), color: "linear-gradient(90deg,#f2d990,#d7b56d)" },
        ]);
      };
      ids.forEach((id) => document.querySelector(`#${id}`).addEventListener("input", update));
      update();
    },
  },
  credit: {
    kicker: "Credit",
    title: "Credit Utilization Planner",
    copy: "See your utilization zone and exactly how much to pay to reach 30% or 10% utilization.",
    html: `
      ${toolControl("Current balance", "credit-balance", 0, 10000, 1250, 50, "$")}
      ${toolControl("Credit limit", "credit-limit", 500, 20000, 5000, 100, "$")}
      <div class="insight-chart" id="credit-chart" aria-hidden="true"></div>
      <div class="tool-metric-grid">
        <div><span>Utilization</span><strong id="credit-util">0%</strong></div>
        <div><span>To get under 30%</span><strong id="credit-pay30">$0</strong></div>
        <div><span>To get under 10%</span><strong id="credit-pay10">$0</strong></div>
      </div>
    `,
    init: () => {
      const update = () => {
        const balance = Number(document.querySelector("#credit-balance").value);
        const limit = Math.max(1, Number(document.querySelector("#credit-limit").value));
        setControlValue("credit-balance", balance, "$");
        setControlValue("credit-limit", limit, "$");
        const pct = Math.round((balance / limit) * 100);
        const target30 = limit * 0.3;
        const target10 = limit * 0.1;
        const pay30 = Math.max(0, balance - target30);
        const pay10 = Math.max(0, balance - target10);
        const color = pct <= 10 ? "#22c55e" : pct <= 30 ? "#f59e0b" : "#ef4444";
        document.querySelector("#credit-util").textContent = `${pct}%`;
        document.querySelector("#credit-util").style.color = color;
        document.querySelector("#credit-pay30").textContent = formatCurrency(pay30);
        document.querySelector("#credit-pay10").textContent = formatCurrency(pay10);
        renderInsightChart(document.querySelector("#credit-chart"), [
          { label: "Current balance", value: balance, display: `${pct}%`, color: `linear-gradient(90deg,${color},${color})` },
          { label: "30% target", value: target30, display: formatCurrency(target30), color: "linear-gradient(90deg,#f59e0b,#d97706)" },
          { label: "10% target", value: target10, display: formatCurrency(target10), color: "linear-gradient(90deg,#22c55e,#15803d)" },
        ]);
      };
      ["credit-balance", "credit-limit"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", update));
      update();
    },
  },
});

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 20);
}

function openTool(toolKey) {
  const tool = toolData[toolKey];
  if (!tool) return;

  document.querySelectorAll("[data-tool-card]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.toolCard === toolKey);
  });

  document.querySelector("#tool-panel-kicker").textContent = tool.kicker;
  document.querySelector("#tool-panel-title").textContent = tool.title;
  document.querySelector("#tool-panel-copy").textContent = tool.copy;
  document.querySelector("#tool-preview").innerHTML = tool.html;
  const fullLink = document.querySelector("#tool-panel-link");
  if (fullLink) fullLink.href = `tool.html?tool=${toolKey}`;
  tool.init();

  // Wire result-flash animation to all result strong elements
  document.querySelectorAll("#tool-preview .result-box strong, #tool-preview .tool-metric-grid strong").forEach((el) => {
    const mo = new MutationObserver(() => {
      el.classList.remove("result-flash");
      void el.offsetWidth;
      el.classList.add("result-flash");
    });
    mo.observe(el, { childList: true, characterData: true, subtree: true });
  });
}

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  header.classList.toggle("is-open", isOpen);
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    header.classList.remove("is-open");
  }
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    }
  },
  { threshold: 0.16 }
);

document.querySelectorAll(".reveal").forEach((item) => observer.observe(item));

const counterObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.target.dataset.counted) continue;
      entry.target.dataset.counted = "true";
      const target = Number(entry.target.dataset.target);
      let current = 0;
      const steps = Math.max(1, target);
      const timer = setInterval(() => {
        current += 1;
        entry.target.textContent = String(Math.min(current, target));
        if (current >= steps) clearInterval(timer);
      }, 70);
      if (target === 0) entry.target.textContent = "0";
    }
  },
  { threshold: 0.6 }
);

document.querySelectorAll("[data-counter]").forEach((counter) => counterObserver.observe(counter));

function isPhonePreview() {
  return window.matchMedia("(max-width: 700px)").matches;
}

document.querySelectorAll("[data-tool-open]").forEach((button) => {
  button.addEventListener("click", () => {
    const toolKey = button.dataset.toolOpen;
    if (isPhonePreview()) {
      window.location.href = `tool.html?tool=${toolKey}`;
      return;
    }
    openTool(toolKey);
  });
});
openTool("compound");

let testimonialIndex = 0;
const testimonialCopy = document.querySelector("#testimonial-copy");
const testimonialName = document.querySelector("#testimonial-name");

function showTestimonial(index) {
  if (!testimonialCopy || !testimonialName || !Array.isArray(testimonials) || !testimonials.length) return;
  testimonialIndex = (index + testimonials.length) % testimonials.length;
  testimonialCopy.textContent = `"${testimonials[testimonialIndex].copy}"`;
  testimonialName.textContent = testimonials[testimonialIndex].name;
}

const carouselNext = document.querySelector("[data-carousel-next]");
const carouselPrev = document.querySelector("[data-carousel-prev]");
if (carouselNext && carouselPrev && testimonialCopy && testimonialName) {
  carouselNext.addEventListener("click", () => showTestimonial(testimonialIndex + 1));
  carouselPrev.addEventListener("click", () => showTestimonial(testimonialIndex - 1));
  setInterval(() => showTestimonial(testimonialIndex + 1), 7000);
}

document.querySelectorAll(".faq-item button").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const isOpen = item.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
});

const newsletter = document.querySelector("[data-newsletter]");
const formMessage = document.querySelector("[data-form-message]");

if (newsletter && formMessage) {
  newsletter.addEventListener("submit", (event) => {
    event.preventDefault();
    const emailInput = newsletter.querySelector('input[name="email"]');
    const email = emailInput.value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    newsletter.classList.remove("is-success", "is-shaking");

    if (!isValid) {
      formMessage.textContent = "Enter a valid email address to join the list.";
      newsletter.classList.add("is-shaking");
      return;
    }

    formMessage.textContent = "You're on the list! Expect weekly AI + finance tips built for Gen Z.";
    newsletter.classList.add("is-success");
    newsletter.reset();
  });
}

const canvas = document.querySelector("#market-canvas");
const ctx = canvas?.getContext("2d");
let tick = 0;

function drawMarketCanvas() {
  if (!canvas || !ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(215,181,109,0.18)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.05)");
  gradient.addColorStop(1, "rgba(215,181,109,0.12)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.lineWidth = 5;
  const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
  lineGradient.addColorStop(0, "rgba(255,255,255,0.7)");
  lineGradient.addColorStop(0.45, "rgba(242,217,144,0.95)");
  lineGradient.addColorStop(1, "rgba(215,181,109,0.55)");
  ctx.strokeStyle = lineGradient;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 16) {
    const base = height * 0.68 - x * 0.22;
    const wave = Math.sin((x + tick * 2) / 52) * 34 + Math.cos((x + tick) / 29) * 14;
    const y = base + wave;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  for (let i = 0; i < 42; i += 1) {
    const x = ((i * 83 + tick * 0.7) % (width + 80)) - 40;
    const y = height * 0.16 + Math.sin(i * 1.7 + tick / 34) * 185 + i * 9;
    ctx.fillStyle = i % 4 === 0 ? "rgba(242,217,144,0.66)" : "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(x, y, i % 4 === 0 ? 3.5 : 2, 0, Math.PI * 2);
    ctx.fill();
  }

  tick += 1;
  requestAnimationFrame(drawMarketCanvas);
}

drawMarketCanvas();

// ── Full-page background particle network ────────────────────────────────────
(function () {
  const bg = document.querySelector("#page-bg-canvas");
  if (!bg) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const bgCtx = bg.getContext("2d");
  let pts = [];
  let bgAnimId;

  function resize() {
    bg.width = window.innerWidth;
    bg.height = window.innerHeight;
    initPts();
  }

  function initPts() {
    const count = window.innerWidth < 700 ? 24 : 52;
    pts = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * bg.width,
      y: Math.random() * bg.height,
      vx: (Math.random() - 0.5) * 0.14,
      vy: (Math.random() - 0.5) * 0.14,
      r: Math.random() * 1.4 + 0.5,
      gold: i % 7 === 0, // occasional gold-tinted node
    }));
  }

  function drawBg() {
    const w = bg.width;
    const h = bg.height;
    const maxDist = 180;
    bgCtx.clearRect(0, 0, w, h);

    for (const p of pts) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < maxDist) {
          const alpha = (1 - d / maxDist) * 0.065;
          bgCtx.strokeStyle = `rgba(255,255,255,${alpha})`;
          bgCtx.lineWidth = 0.6;
          bgCtx.beginPath();
          bgCtx.moveTo(pts[i].x, pts[i].y);
          bgCtx.lineTo(pts[j].x, pts[j].y);
          bgCtx.stroke();
        }
      }
    }

    for (const p of pts) {
      bgCtx.fillStyle = p.gold ? "rgba(215,181,109,0.3)" : "rgba(255,255,255,0.18)";
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bgCtx.fill();
    }

    bgAnimId = requestAnimationFrame(drawBg);
  }

  resize();
  drawBg();

  let rsTimer;
  window.addEventListener("resize", () => {
    clearTimeout(rsTimer);
    rsTimer = setTimeout(() => {
      cancelAnimationFrame(bgAnimId);
      resize();
      drawBg();
    }, 250);
  }, { passive: true });
})();

// ── Hero Compound Calculator ────────────────────────────────────────────────
(function () {
  var slider  = document.querySelector('#hero-save-slider');
  var display = document.querySelector('#hero-save-display');
  var canvas  = document.querySelector('#hero-compound-canvas');
  var v10     = document.querySelector('#hcv-10');
  var v20     = document.querySelector('#hcv-20');
  var v30     = document.querySelector('#hcv-30');
  if (!slider || !canvas) return;

  var ctx    = canvas.getContext('2d');
  var YEARS  = 30;
  var animId = null;
  var currentMonthly = 200;

  /* future value of monthly contributions */
  function fv(monthly, annualRate, years) {
    var r = annualRate / 12;
    var n = years * 12;
    if (r === 0) return monthly * n;
    return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  }

  function fmt(n) {
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }

  /* size canvas to its CSS box */
  function sizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
    return { w: canvas.width, h: canvas.height, dpr: dpr };
  }

  /* draw the full chart for a given progress ratio (0→1 for animation) */
  function drawChart(monthly, progress) {
    var dim = sizeCanvas();
    var W = dim.w, H = dim.h, dpr = dim.dpr;
    if (W === 0 || H === 0) return;

    var pad = { t: 14*dpr, r: 14*dpr, b: 26*dpr, l: 52*dpr };
    var cw  = W - pad.l - pad.r;
    var ch  = H - pad.t - pad.b;

    ctx.clearRect(0, 0, W, H);

    /* data: three scenarios */
    var lines = [
      { rate: 0.04, color: 'rgba(255,255,255,0.22)', width: 1.5*dpr, label: '4%' },
      { rate: 0.07, color: '#d7b56d',               width: 3*dpr,   label: '7%' },
      { rate: 0.10, color: 'rgba(242,217,144,0.55)', width: 1.5*dpr, label: '10%' },
    ];

    var maxVal = fv(monthly, 0.10, YEARS) * 1.1;

    function xOf(yr)  { return pad.l + (yr / YEARS) * cw; }
    function yOf(val) { return pad.t + ch - (val / maxVal) * ch; }

    /* subtle horizontal grid */
    var gridY = [0.25, 0.5, 0.75, 1.0];
    ctx.setLineDash([3*dpr, 5*dpr]);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    gridY.forEach(function(f) {
      var y = yOf(maxVal * f);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
      /* y-axis label */
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.font = (9*dpr) + 'px Inter,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(fmt(maxVal * f), pad.l - 6*dpr, y + 3*dpr);
    });
    ctx.setLineDash([]);

    /* x-axis labels */
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = (9*dpr) + 'px Inter,sans-serif';
    ctx.textAlign = 'center';
    [0, 5, 10, 15, 20, 25, 30].forEach(function(yr) {
      ctx.fillText(yr === 0 ? 'Now' : yr + 'yr', xOf(yr), H - 6*dpr);
    });

    /* draw each rate line — animated via progress */
    var maxYr = YEARS * progress;
    lines.forEach(function(line) {
      ctx.strokeStyle = line.color;
      ctx.lineWidth   = line.width;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      var steps = 120;
      var started = false;
      for (var i = 0; i <= steps; i++) {
        var yr  = (i / steps) * maxYr;
        var val = fv(monthly, line.rate, yr);
        var x   = xOf(yr);
        var y   = yOf(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else           { ctx.lineTo(x, y); }
      }
      ctx.stroke();
    });

    /* gold glow dots at 10 / 20 / 30 on the 7% line */
    if (progress >= 1) {
      [10, 20, 30].forEach(function(yr) {
        var val = fv(monthly, 0.07, yr);
        var x   = xOf(yr);
        var y   = yOf(val);
        /* outer glow */
        ctx.beginPath();
        ctx.arc(x, y, 7*dpr, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(215,181,109,0.18)';
        ctx.fill();
        /* inner dot */
        ctx.beginPath();
        ctx.arc(x, y, 4*dpr, 0, Math.PI*2);
        ctx.fillStyle = '#f2d990';
        ctx.fill();
      });
    }

    /* legend — top right */
    var lx = W - pad.r - 2*dpr;
    var ly = pad.t + 8*dpr;
    [{ color:'rgba(255,255,255,0.35)', label:'4% conservative' },
     { color:'#d7b56d',               label:'7% moderate' },
     { color:'rgba(242,217,144,0.55)', label:'10% optimistic' }].forEach(function(item, i) {
      var y = ly + i * 16*dpr;
      ctx.strokeStyle = item.color;
      ctx.lineWidth   = 2*dpr;
      ctx.beginPath(); ctx.moveTo(lx - 32*dpr, y); ctx.lineTo(lx - 12*dpr, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = (8.5*dpr) + 'px Inter,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.label, lx - 34*dpr, y + 3*dpr);
    });
  }

  /* animate chart drawing in ~600 ms */
  function animateDraw(monthly) {
    if (animId) cancelAnimationFrame(animId);
    var start = null;
    var duration = 600;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      /* ease-out */
      var eased = 1 - Math.pow(1 - progress, 3);
      drawChart(monthly, eased);
      if (progress < 1) animId = requestAnimationFrame(step);
      else animId = null;
    }
    animId = requestAnimationFrame(step);
  }

  function updateValues(m) {
    var pct = ((m - 50) / (2000 - 50) * 100).toFixed(1);
    slider.style.setProperty('--pct', pct + '%');
    display.textContent = '$' + Number(m).toLocaleString();
    v10.textContent = fmt(fv(m, 0.07, 10));
    v20.textContent = fmt(fv(m, 0.07, 20));
    v30.textContent = fmt(fv(m, 0.07, 30));
  }

  function onInput() {
    currentMonthly = Number(slider.value);
    updateValues(currentMonthly);
    /* redraw instantly (no animation) while dragging */
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    drawChart(currentMonthly, 1);
  }

  slider.addEventListener('input', onInput);

  /* re-draw on resize */
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() { drawChart(currentMonthly, 1); }, 120);
  });

  /* initial draw — defer until layout is painted */
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      updateValues(currentMonthly);
      animateDraw(currentMonthly);
    });
  });
})();

// ── Money type badge ─────────────────────────────────────────────────────────
(function() {
  try {
    var stored = localStorage.getItem('bigProfile');
    if (!stored) return;
    var p = JSON.parse(stored);
    if (!p || !p.name) return;
    var shortName = p.name.replace(/^The\s+/, '');
    var badge = document.createElement('a');
    badge.href = '#quiz';
    badge.className = 'money-type-badge';
    badge.setAttribute('aria-label', 'Your money type: ' + p.name + '. Click to retake quiz.');
    badge.innerHTML = '<span class="badge-emoji">' + (p.badge || p.name.replace(/^The\s+/, '')) + '</span><span class="badge-name">' + shortName + '</span><span class="badge-retake">retake</span>';
    document.body.appendChild(badge);
  } catch(e) {}
})();
