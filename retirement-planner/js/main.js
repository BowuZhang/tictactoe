const form = document.getElementById("planner-form");
const stateSelect = document.getElementById("state");
const compareStateSelect = document.getElementById("compare-state");
const resultsSection = document.getElementById("results");
const fireTypeBadge = document.getElementById("fire-type-badge");
const fireTypeDescription = document.getElementById("fire-type-description");

function populateStateDropdowns() {
  const options = Object.entries(STATE_DATA)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([code, info]) => `<option value="${code}">${info.name}</option>`)
    .join("");
  stateSelect.innerHTML = options;
  compareStateSelect.innerHTML = `<option value="">— None —</option>` + options;
  stateSelect.value = "CA";
}

function currency(value) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function percent(value) {
  return (value * 100).toFixed(1) + "%";
}

function readInputs() {
  return {
    currentAge: Number(document.getElementById("current-age").value),
    retirementAge: Number(document.getElementById("retirement-age").value),
    currentPortfolio: Number(document.getElementById("current-portfolio").value),
    annualContribution: Number(document.getElementById("annual-contribution").value),
    preRetirementReturnPct: Number(document.getElementById("pre-return").value),
    postRetirementReturnPct: Number(document.getElementById("post-return").value),
    inflationPct: Number(document.getElementById("inflation").value),
    annualExpensesToday: Number(document.getElementById("annual-expenses").value),
    swrPct: Number(document.getElementById("swr").value),
    filingStatus: document.getElementById("filing-status").value,
    stateCode: stateSelect.value,
  };
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

function render(input) {
  const result = runProjection(input);
  const fireType = classifyFireType(input, result);

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

  const stateCards = document.getElementById("state-comparison");
  let html = buildStateCard(input.stateCode, input, result);
  if (compareStateSelect.value) {
    html += buildStateCard(compareStateSelect.value, input, result);
  }
  stateCards.innerHTML = html;

  resultsSection.hidden = false;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  render(readInputs());
});

compareStateSelect.addEventListener("change", () => {
  if (!resultsSection.hidden) render(readInputs());
});

// FIRE guide accordion
document.querySelectorAll(".accordion-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    const expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!expanded));
    panel.hidden = expanded;
  });
});

populateStateDropdowns();
render(readInputs());
