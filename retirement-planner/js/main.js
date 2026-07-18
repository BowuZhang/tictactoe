const form = document.getElementById("planner-form");
const stateSelect = document.getElementById("state");
const compareStateSelect = document.getElementById("compare-state");
const fireTypeBadge = document.getElementById("fire-type-badge");
const fireTypeDescription = document.getElementById("fire-type-description");

let selectedFireTypeKey = null; // null = follow the computed recommendation
let hasCalculated = false;

function populateStateDropdowns() {
  const options = Object.entries(STATE_DATA)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([code, info]) => `<option value="${code}">${info.name}</option>`)
    .join("");
  stateSelect.innerHTML = options;
  compareStateSelect.innerHTML = `<option value="">No comparison</option>` + options;
  stateSelect.value = "CA";
}

function currency(value) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function percent(value) {
  return (value * 100).toFixed(1) + "%";
}

/** Parses a possibly "$1,234"-formatted text input back into a number. */
function parseCurrency(value) {
  return Number(String(value).replace(/[^0-9.]/g, "")) || 0;
}

function readInputs() {
  return {
    currentAge: Number(document.getElementById("current-age").value),
    retirementAge: Number(document.getElementById("retirement-age").value),
    currentPortfolio: parseCurrency(document.getElementById("current-portfolio").value),
    annualContribution: parseCurrency(document.getElementById("annual-contribution").value),
    preRetirementReturnPct: Number(document.getElementById("pre-return").value),
    postRetirementReturnPct: Number(document.getElementById("post-return").value),
    inflationPct: Number(document.getElementById("inflation").value),
    annualExpensesToday: parseCurrency(document.getElementById("annual-expenses").value),
    swrPct: Number(document.getElementById("swr").value),
    filingStatus: document.getElementById("filing-status").value,
    stateCode: stateSelect.value,
  };
}

function readFamilyInputs(currentAge) {
  return {
    currentAge,
    childrenAges: parseChildrenAges(document.getElementById("children-ages").value),
    includeCollegeCosts: document.getElementById("include-college-costs").checked,
    collegeCostPerYear: parseCurrency(document.getElementById("college-cost-per-year").value),
  };
}

/** Wires a text input to live-format as "$1,234,567" while preserving cursor position. */
function formatCurrencyField(input) {
  const reformat = () => {
    const start = input.selectionStart ?? input.value.length;
    const digitsAfterCursor = input.value.slice(start).replace(/[^0-9]/g, "").length;
    const raw = input.value.replace(/[^0-9]/g, "");
    const formatted = raw === "" ? "" : "$" + Number(raw).toLocaleString("en-US");
    input.value = formatted;
    let pos = formatted.length;
    let seen = 0;
    while (pos > 0 && seen < digitsAfterCursor) {
      pos--;
      if (/[0-9]/.test(formatted[pos])) seen++;
    }
    input.setSelectionRange(pos, pos);
  };
  input.addEventListener("input", reformat);
  reformat();
}

function readAccountSplit() {
  return {
    traditionalPct: Number(document.getElementById("split-traditional").value) / 100,
    rothPct: Number(document.getElementById("split-roth").value) / 100,
    taxablePct: Number(document.getElementById("split-taxable").value) / 100,
  };
}

function readTaxableGainsFraction() {
  return Number(document.getElementById("taxable-gains-fraction").value) / 100;
}

function buildStateCard(stateCode, input, result) {
  const info = STATE_DATA[stateCode];
  const rate = combinedEffectiveRate(result.grossAnnualWithdrawal, input.filingStatus, info);
  return `
    <div class="state-card">
      <h4>${info.name}</h4>
      <ul>
        <li><span>State tax on retirement withdrawals</span><strong>${percent(info.effectiveRetirementTaxRate)}</strong></li>
        <li><span>Taxes Social Security</span><strong>${info.taxesSocialSecurity ? "Yes" : "No"}</strong></li>
        <li><span>Avg. combined sales tax</span><strong>${info.salesTaxRate.toFixed(2)}%</strong></li>
        <li><span>Avg. effective property tax</span><strong>${info.propertyTaxRate.toFixed(2)}%</strong></li>
        <li><span>Cost of living index</span><strong>${info.costOfLivingIndex} <small>(100 = US avg)</small></strong></li>
        <li><span>Est. combined tax rate on withdrawals</span><strong>${percent(rate)}</strong></li>
        <li><span>Gross withdrawal needed for ${currency(input.annualExpensesToday)}/yr spending</span><strong>${currency(grossUpForTaxes(input.annualExpensesToday, input.filingStatus, info))}</strong></li>
      </ul>
    </div>
  `;
}

function renderFireTypeTabs(computedKey) {
  const activeKey = selectedFireTypeKey || computedKey;
  const tabsEl = document.getElementById("fire-type-tabs");
  tabsEl.innerHTML = FIRE_TYPES.map(
    (t) => `
      <button type="button" class="fire-tab ${t.key === activeKey ? "active" : ""}" data-fire-key="${t.key}">
        ${t.label}${computedKey && t.key === computedKey ? '<span class="fire-tab-recommended">Recommended</span>' : ""}
      </button>
    `
  ).join("");
  const active = FIRE_TYPES.find((t) => t.key === activeKey) || FIRE_TYPES[FIRE_TYPES.length - 1];
  document.getElementById("fire-type-panel-description").textContent = active.description;

  tabsEl.querySelectorAll(".fire-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedFireTypeKey = btn.getAttribute("data-fire-key");
      renderFireTypeTabs(computedKey);
    });
  });
}

function renderYearByYearTable(result) {
  const rows = result.rows
    .map(
      (r) => `
      <tr>
        <td>${r.age}</td>
        <td>${currency(r.withdrawals.traditional)}</td>
        <td>${currency(r.withdrawals.roth)}</td>
        <td>${currency(r.withdrawals.taxable)}</td>
        <td>${currency(r.federalTax)}</td>
        <td>${currency(r.stateTax)}</td>
        <td>${currency(r.netAchieved)}</td>
        <td>${currency(r.totalBalance)}</td>
      </tr>
    `
    )
    .join("");
  document.getElementById("year-by-year-body").innerHTML = rows;
}

function renderStrategyComparisonTable(allResults) {
  document.getElementById("strategy-comparison-body").innerHTML = allResults
    .map(
      (s) => `
      <tr>
        <td>${s.label}</td>
        <td>${currency(s.lifetimeTotalTax)}</td>
        <td>${s.sustainable ? "Lasts to 100" : "Runs out at age " + s.depletedAge}</td>
        <td>${currency(s.finalBalance)}</td>
      </tr>
    `
    )
    .join("");
}

function render(input) {
  const familyInput = readFamilyInputs(input.currentAge);
  const familyPlan = buildFamilyPlan(familyInput);

  const result = runProjection(input, familyPlan.extraExpensesByAge);
  const fireType = classifyFireType(input, result);
  const computedFireKey = FIRE_TYPE_KEY_BY_LABEL[fireType.label] || "traditional";

  // --- Your Plan ---
  document.getElementById("fire-number").textContent = currency(result.fireNumber);
  const fireAgeEl = document.getElementById("fire-age");
  const fireAgeReached = result.fireAge !== null;
  fireAgeEl.textContent = fireAgeReached ? `Age ${result.fireAge}` : "Not reached by target age";
  fireAgeEl.classList.toggle("card-value-small", !fireAgeReached);

  document.getElementById("balance-at-retirement").textContent = currency(result.balanceAtRetirement);
  document.getElementById("gross-withdrawal").textContent = currency(result.grossAnnualWithdrawal) + " / yr";
  document.getElementById("coast-fire-number").textContent = currency(result.coastFireNumber);

  const sustainabilityEl = document.getElementById("sustainability");
  if (result.sustainable) {
    sustainabilityEl.textContent = `Your portfolio is projected to last through age ${MAX_PLANNING_AGE}.`;
    sustainabilityEl.className = "status-ok";
  } else {
    sustainabilityEl.textContent = `Your portfolio is projected to run out around age ${result.depletedAge}. Consider a lower withdrawal rate, working longer, or reducing expenses.`;
    sustainabilityEl.className = "status-warn";
  }

  fireTypeBadge.textContent = fireType.label;
  fireTypeDescription.textContent = fireType.description;

  renderProjectionChart(document.getElementById("chart-container"), result.points, result.fireNumber, input.retirementAge);
  renderContributionGrowthChart(
    document.getElementById("contribution-chart-container"),
    result.points,
    input.currentAge,
    input.currentPortfolio,
    input.annualContribution
  );

  // --- Timeline ---
  const milestones = buildTimelineMilestones(input, result, familyPlan.milestones);
  renderTimeline(document.getElementById("timeline-container"), milestones, input.currentAge);

  // --- State comparison ---
  let stateHtml = buildStateCard(input.stateCode, input, result);
  if (compareStateSelect.value) stateHtml += buildStateCard(compareStateSelect.value, input, result);
  document.getElementById("state-comparison").innerHTML = stateHtml;

  // --- Tax deep-dive ---
  const stateInfo = STATE_DATA[input.stateCode];
  const breakdown = taxBreakdown(result.grossAnnualWithdrawal, input.filingStatus, stateInfo);
  renderTaxBreakdownBar(document.getElementById("tax-breakdown-container"), breakdown);

  const split = readAccountSplit();
  const gainsFraction = readTaxableGainsFraction();
  const strategyInput = { ...input, taxableGainsFraction: gainsFraction };
  const strategyKey = document.getElementById("withdrawal-strategy").value;
  const selectedResult = simulateWithdrawalStrategy(strategyInput, split, strategyKey, familyPlan.extraExpensesByAge);
  renderYearByYearTable(selectedResult);

  const allStrategyResults = compareWithdrawalStrategies(strategyInput, split, familyPlan.extraExpensesByAge);
  renderStrategyComparisonTable(allStrategyResults);
  renderStrategyComparisonChart(document.getElementById("strategy-chart-container"), allStrategyResults, input.retirementAge);

  // --- FIRE Plan ---
  renderFireTypeTabs(computedFireKey);

  // --- Family ---
  document.getElementById("family-suggestion").textContent = buildFamilySuggestion(familyInput);
  const familyMilestonesEl = document.getElementById("family-milestones");
  familyMilestonesEl.innerHTML =
    familyPlan.milestones.length === 0
      ? ""
      : familyPlan.milestones.map((m) => `<li>${m.label} — you'll be about age ${m.age}</li>`).join("");

  // --- Life after retirement ---
  document.getElementById("life-after-intro").textContent = buildLifeAfterIntro(input, familyInput.childrenAges);
}

function renderStaticContent() {
  document.getElementById("life-after-categories").innerHTML = LIFE_AFTER_CATEGORIES.map(
    (cat) => `
      <div class="info-card">
        <h4>${cat.title}</h4>
        <ul>${cat.items.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
    `
  ).join("");

  document.getElementById("tax-strategies-grid").innerHTML = TAX_STRATEGIES.map(
    (s) => `<div class="info-card"><h4>${s.title}</h4><p>${s.body}</p></div>`
  ).join("");

  renderGroupedBarChart(
    document.getElementById("stats-chart-container"),
    RETIREMENT_STATS_BY_AGE,
    { key: "netWorth", label: "Median net worth (all households)", color: "#1f7a5c" },
    { key: "retirementBalance", label: "Median retirement balance (households with one)", color: "#8a5cb0" }
  );
  document.getElementById("stats-table-body").innerHTML = RETIREMENT_STATS_BY_AGE.map(
    (row) => `<tr><td>${row.label}</td><td>${currency(row.netWorth)}</td><td>${currency(row.retirementBalance)}</td></tr>`
  ).join("");

  document.getElementById("percentile-table-body").innerHTML = NET_WORTH_PERCENTILES.map(
    (row) => `<tr><td>${row.label}</td><td>${currency(row.netWorth)}</td></tr>`
  ).join("");

  document.getElementById("portfolio-tier-body").innerHTML = PORTFOLIO_TIERS.map(
    (row) => `<tr><td>${currency(row.portfolio)}</td><td>${currency(row.annualIncome)}/yr</td><td>${row.context}</td></tr>`
  ).join("");

  // Initial FIRE tab render with no computed recommendation yet.
  renderFireTypeTabs(null);
}

// --- Deferred calculation: no results until the core inputs are complete ---

function setGatedMessage(text) {
  document.querySelectorAll(".gated-message").forEach((el) => (el.textContent = text));
}

function revealResults() {
  document.querySelectorAll(".gated-empty").forEach((el) => (el.hidden = true));
  document.querySelectorAll(".gated-content").forEach((el) => (el.hidden = false));
}

function attemptRender(forceSpinner) {
  if (!form.checkValidity()) return; // stay in the empty state, or keep the last good render
  const shouldSpin = forceSpinner || !hasCalculated;
  if (shouldSpin) {
    document.querySelectorAll(".gated-spinner").forEach((el) => (el.hidden = false));
    setGatedMessage("Calculating your plan…");
    setTimeout(() => {
      render(readInputs());
      hasCalculated = true;
      revealResults();
    }, 350);
  } else {
    render(readInputs());
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  selectedFireTypeKey = null;
  attemptRender(true);
});

document.addEventListener("input", (e) => {
  if (e.target.classList && e.target.classList.contains("plan-input")) {
    attemptRender(false);
  }
});

// --- Slider live-value readouts ---

document.querySelectorAll('input[type="range"]').forEach((slider) => {
  const output = document.querySelector(`output[for="${slider.id}"]`);
  if (!output) return;
  const format = slider.dataset.format || "plain";
  const updateOutput = () => {
    const v = slider.value;
    if (format === "percent") output.textContent = `${v}%`;
    else if (format === "age") output.textContent = `Age ${v}`;
    else output.textContent = v;
  };
  updateOutput();
  slider.addEventListener("input", updateOutput);
});

// --- Location detection (opt-in) ---

const detectBtn = document.getElementById("detect-state-btn");
const detectStatus = document.getElementById("detect-state-status");

detectBtn.addEventListener("click", () => {
  detectBtn.disabled = true;
  const originalLabel = detectBtn.textContent;
  detectBtn.textContent = "Detecting…";
  detectStatus.textContent = "";

  detectMyState((error, stateCode) => {
    detectBtn.disabled = false;
    detectBtn.textContent = originalLabel;
    if (error) {
      detectStatus.textContent = error.message;
      detectStatus.className = "detect-status detect-status-error";
      return;
    }
    stateSelect.value = stateCode;
    detectStatus.textContent = `Detected: ${STATE_DATA[stateCode].name}`;
    detectStatus.className = "detect-status detect-status-ok";
    attemptRender(false);
  });
});

document.getElementById("see-fire-plan-link").addEventListener("click", () => {
  showView("calculator");
  openPanel("panel-fire-plan");
  document.getElementById("panel-fire-plan").scrollIntoView({ behavior: "smooth", block: "start" });
});

function openPanel(panelId) {
  const toggle = document.querySelector(`.panel-toggle[aria-controls="${panelId}-body"]`);
  const body = document.getElementById(`${panelId}-body`);
  if (toggle && body && toggle.getAttribute("aria-expanded") !== "true") {
    toggle.setAttribute("aria-expanded", "true");
    body.hidden = false;
  }
}

document.querySelectorAll(".panel-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const body = document.getElementById(btn.getAttribute("aria-controls"));
    const expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!expanded));
    body.hidden = expanded;
  });
});

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (hasCalculated) render(readInputs());
    renderStaticContent();
  }, 150);
});

// --- Page navigation ---

const VIEWS = ["home", "calculator", "statistics", "tax-strategies"];

function showView(name) {
  if (!VIEWS.includes(name)) name = "home";
  VIEWS.forEach((v) => {
    document.getElementById("view-" + v).hidden = v !== name;
  });
  document.querySelectorAll(".topnav-link").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-view") === name);
  });
  window.scrollTo(0, 0);
  if (location.hash.slice(1) !== name) location.hash = name;
}

document.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", () => {
    showView(el.getAttribute("data-view"));
    closeHamburgerMenu();
  });
});

window.addEventListener("hashchange", () => showView(location.hash.slice(1) || "home"));

// --- Hamburger menu (mobile nav) ---

const hamburgerBtn = document.getElementById("hamburger-btn");
const topnavLinks = document.getElementById("topnav-links");

function closeHamburgerMenu() {
  topnavLinks.classList.remove("open");
  hamburgerBtn.setAttribute("aria-expanded", "false");
}

hamburgerBtn.addEventListener("click", () => {
  const isOpen = topnavLinks.classList.toggle("open");
  hamburgerBtn.setAttribute("aria-expanded", String(isOpen));
});

// --- Info tips ---

document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("info-icon")) return;
  const tip = e.target.closest("label").querySelector(".input-tip");
  if (tip) tip.hidden = !tip.hidden;
});

// --- Currency-formatted inputs ---

document.querySelectorAll(".currency-input").forEach(formatCurrencyField);

// --- Save as PDF (browser print dialog) ---

document.getElementById("save-pdf-btn").addEventListener("click", () => {
  window.print();
});

populateStateDropdowns();
renderStaticContent();
attemptRender(false);
showView(location.hash.slice(1) || "home");
