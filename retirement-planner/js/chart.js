/**
 * Minimal dependency-free SVG line chart for the portfolio projection.
 * Renders a balance-vs-age line, a FIRE-number reference line, and a
 * marker at the retirement age.
 *
 * The SVG's viewBox is sized to the container's actual on-screen width
 * (not a fixed 720px design width) so that text renders at true CSS
 * pixel size on narrow phone screens instead of shrinking along with
 * the rest of the scaled artwork.
 */

function formatCurrencyShort(value) {
  if (Math.abs(value) >= 1e6) return "$" + (value / 1e6).toFixed(1) + "M";
  if (Math.abs(value) >= 1e3) return "$" + (value / 1e3).toFixed(0) + "k";
  return "$" + Math.round(value);
}

function renderProjectionChart(containerEl, points, fireNumber, retirementAge) {
  const width = Math.max(280, Math.min(720, containerEl.clientWidth || 720));
  const isNarrow = width < 420;
  const height = isNarrow ? 260 : 340;
  const margin = {
    top: isNarrow ? 26 : 20,
    right: isNarrow ? 8 : 20,
    bottom: isNarrow ? 32 : 36,
    left: isNarrow ? 46 : 64,
  };
  const tickFontSize = isNarrow ? 11 : 12;
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

  // Y-axis gridlines/labels
  const tickCount = isNarrow ? 4 : 5;
  let yTicks = "";
  for (let i = 0; i <= tickCount; i++) {
    const val = (maxBalance / tickCount) * i;
    const y = yScale(val).toFixed(1);
    yTicks += `
      <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="chart-grid" />
      <text x="${margin.left - 8}" y="${Number(y) + 4}" class="chart-axis-label" font-size="${tickFontSize}" text-anchor="end">${formatCurrencyShort(val)}</text>
    `;
  }

  // X-axis labels — fewer ticks on narrow screens so they don't overlap
  const targetTicks = isNarrow ? 4 : 8;
  const ageStep = Math.max(1, Math.round((maxAge - minAge) / targetTicks));
  let xTicks = "";
  for (let age = minAge; age <= maxAge; age += ageStep) {
    const x = xScale(age).toFixed(1);
    xTicks += `<text x="${x}" y="${height - margin.bottom + 18}" class="chart-axis-label" font-size="${tickFontSize}" text-anchor="middle">${age}</text>`;
  }

  containerEl.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="projection-svg" role="img" aria-label="Projected portfolio balance by age">
      ${yTicks}
      <line x1="${margin.left}" y1="${fireY}" x2="${width - margin.right}" y2="${fireY}" class="chart-fire-line" />
      <text x="${width - margin.right}" y="${Number(fireY) - 6}" class="chart-fire-label" font-size="${tickFontSize}" text-anchor="end">FIRE number</text>
      <line x1="${retireX}" y1="${margin.top}" x2="${retireX}" y2="${height - margin.bottom}" class="chart-retire-line" />
      <text x="${retireX}" y="${margin.top - 8}" class="chart-retire-label" font-size="${tickFontSize}" text-anchor="middle">Retirement</text>
      <path d="${linePath}" class="chart-line" fill="none" />
      ${xTicks}
      <text x="${(width) / 2}" y="${height - 4}" class="chart-axis-title" font-size="${tickFontSize}" text-anchor="middle">Age</text>
    </svg>
  `;
}
