/**
 * Portfolio projection engine. All dollar amounts are in TODAY's (real,
 * inflation-adjusted) dollars — growth rates passed in should already be
 * real rates (nominal return minus inflation), which keeps the whole
 * projection in constant purchasing power and avoids compounding two
 * separate inflation adjustments.
 */

const MAX_PLANNING_AGE = 100;

function realReturn(nominalRatePct, inflationRatePct) {
  const nominal = nominalRatePct / 100;
  const inflation = inflationRatePct / 100;
  return (1 + nominal) / (1 + inflation) - 1;
}

/**
 * Runs a full accumulation + drawdown projection.
 *
 * @param {object} input
 *   currentAge, retirementAge, currentPortfolio, annualContribution,
 *   preRetirementReturnPct, postRetirementReturnPct, inflationPct,
 *   annualExpensesToday, swrPct, filingStatus, stateCode
 * @returns {object} projection results
 */
function runProjection(input) {
  const {
    currentAge,
    retirementAge,
    currentPortfolio,
    annualContribution,
    preRetirementReturnPct,
    postRetirementReturnPct,
    inflationPct,
    annualExpensesToday,
    swrPct,
    filingStatus,
    stateCode,
  } = input;

  const stateInfo = STATE_DATA[stateCode];
  const preReturn = realReturn(preRetirementReturnPct, inflationPct);
  const postReturn = realReturn(postRetirementReturnPct, inflationPct);
  const swr = swrPct / 100;

  // Gross annual withdrawal needed (today's dollars) to net the desired
  // after-tax spending, accounting for federal + state tax on withdrawals.
  const grossAnnualWithdrawal = grossUpForTaxes(annualExpensesToday, filingStatus, stateInfo);
  const fireNumber = grossAnnualWithdrawal / swr;

  const points = [];
  let balance = currentPortfolio;
  let fireAge = null;

  // Accumulation phase
  for (let age = currentAge; age <= retirementAge; age++) {
    points.push({ age, balance, phase: "accumulation" });
    if (fireAge === null && balance >= fireNumber) {
      fireAge = age;
    }
    if (age < retirementAge) {
      balance = balance * (1 + preReturn) + annualContribution;
    }
  }

  // Coast FIRE: portfolio value today that would grow to the FIRE number
  // by retirement age with zero further contributions.
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const coastFireNumber = fireNumber / Math.pow(1 + preReturn, yearsToRetirement);
  const alreadyCoastFire = currentPortfolio >= coastFireNumber;

  // Drawdown phase
  let depletedAge = null;
  let drawdownBalance = balance;
  for (let age = retirementAge + 1; age <= MAX_PLANNING_AGE; age++) {
    drawdownBalance = drawdownBalance * (1 + postReturn) - grossAnnualWithdrawal;
    points.push({ age, balance: Math.max(0, drawdownBalance), phase: "drawdown" });
    if (drawdownBalance <= 0 && depletedAge === null) {
      depletedAge = age;
      break;
    }
  }

  const sustainable = depletedAge === null;

  return {
    points,
    fireNumber,
    grossAnnualWithdrawal,
    fireAge,
    coastFireNumber,
    alreadyCoastFire,
    depletedAge,
    sustainable,
    balanceAtRetirement: points.find((p) => p.age === retirementAge)?.balance ?? balance,
    preReturn,
    postReturn,
  };
}

/** Suggests which FIRE variant best matches the user's numbers. */
function classifyFireType(input, result) {
  const { annualExpensesToday } = input;
  if (result.alreadyCoastFire && input.currentAge < input.retirementAge) {
    return {
      label: "Coast FIRE",
      description:
        "Your current portfolio is already large enough to grow to your FIRE number by your target retirement age without any further contributions — you could stop saving and just cover living expenses until then.",
    };
  }
  if (annualExpensesToday <= 40000) {
    return {
      label: "Lean FIRE",
      description:
        "Your target spending is modest, consistent with a minimalist, low-cost lifestyle. Lean FIRE requires the smallest portfolio but leaves little cushion for surprises.",
    };
  }
  if (annualExpensesToday >= 100000) {
    return {
      label: "Fat FIRE",
      description:
        "Your target spending supports a comfortable, higher-cost lifestyle in retirement. Fat FIRE requires a larger portfolio but provides more margin and flexibility.",
    };
  }
  return {
    label: "Traditional FIRE",
    description:
      "Your target spending is in the typical middle-class range — a balanced approach between Lean and Fat FIRE.",
  };
}
