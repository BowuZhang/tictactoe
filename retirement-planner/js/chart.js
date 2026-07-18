/**
 * Minimal dependency-free SVG line chart for the portfolio projection.
 * Renders a balance-vs-age line, a FIRE-number reference line, and a
 * marker at the retirement age.
 */

function formatCurrencyShort(value) {
  if (Math.abs(value) >= 1e6) return "$" + (value / 1e6).toFixed(1) + "M";
  if (Math.abs(value) >= 1e3) return "$" + (value / 1e3).toFixed(0) + "k";
  return "$" + Math.round(value);
}

function renderProjectionChart(containerEl, points, fireNumber, retirementAge) {
  const width = 720;
  const height = 340;
  const margin = { top: 20, right: 20, bottom: 36, left: 64 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const ages = points.map((p) => p.age);
  const balances = points.map((p) => p.balance);
  const minAge = Math.min(...ages);
  const maxAge = Math.max(...ages);
  const maxBalance = Math.max(...balances, fireNumber) * 1.08;

  const xScale = (age) => margin.left + ((age - minAge) / (maxAge - minAge)) * innerW;
  const yScale = (bal) => margin.top + innerH - (bal / maxBalance) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.age).toFixed(1)} ${yScale(p.balance).toFixed(1)}`)
    .join(" ");

  const fireY = yScale(fireNumber).toFixed(1);
  const retireX = xScale(retirementAge).toFixed(1);

  // Y-axis gridlines/labels (5 ticks)
  const tickCount = 5;
  let yTicks = "";
  for (let i = 0; i <= tickCount; i++) {
    const val = (maxBalance / tickCount) * i;
    const y = yScale(val).toFixed(1);
    yTicks += `
      <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="chart-grid" />
      <text x="${margin.left - 8}" y="${Number(y) + 4}" class="chart-axis-label" text-anchor="end">${formatCurrencyShort(val)}</text>
    `;
  }

  // X-axis labels (every ~5 years, or fewer for short ranges)
  const ageStep = Math.max(1, Math.round((maxAge - minAge) / 8));
  let xTicks = "";
  for (let age = minAge; age <= maxAge; age += ageStep) {
    const x = xScale(age).toFixed(1);
    xTicks += `<text x="${x}" y="${height - margin.bottom + 18}" class="chart-axis-label" text-anchor="middle">${age}</text>`;
  }

  containerEl.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="projection-svg" role="img" aria-label="Projected portfolio balance by age">
      ${yTicks}
      <line x1="${margin.left}" y1="${fireY}" x2="${width - margin.right}" y2="${fireY}" class="chart-fire-line" />
      <text x="${width - margin.right}" y="${Number(fireY) - 6}" class="chart-fire-label" text-anchor="end">FIRE number</text>
      <line x1="${retireX}" y1="${margin.top}" x2="${retireX}" y2="${height - margin.bottom}" class="chart-retire-line" />
      <text x="${retireX}" y="${margin.top - 6}" class="chart-retire-label" text-anchor="middle">Retirement</text>
      <path d="${linePath}" class="chart-line" fill="none" />
      ${xTicks}
      <text x="${(width) / 2}" y="${height - 4}" class="chart-axis-title" text-anchor="middle">Age</text>
    </svg>
  `;
}
