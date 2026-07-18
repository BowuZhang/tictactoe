/**
 * Static reference content: FIRE-variant descriptions and post-retirement
 * guidance. Kept as plain data so main.js just renders it.
 */

const FIRE_TYPES = [
  {
    key: "lean",
    label: "Lean FIRE",
    description:
      "Retiring on a minimal, frugal budget (often under ~$40,000/yr). Requires the smallest FIRE number and the fastest path there, but leaves little room for lifestyle inflation, healthcare surprises, or economic downturns. Works best paired with a genuinely low-cost lifestyle and a low-tax, low-cost-of-living state.",
  },
  {
    key: "fat",
    label: "Fat FIRE",
    description:
      "Retiring with a much larger portfolio to support an above-average, comfortable lifestyle (often $100,000+/yr in spending). Takes longer to reach and usually requires a high income, but provides far more cushion and flexibility, including for travel, dependents, or a higher cost-of-living area.",
  },
  {
    key: "coast",
    label: "Coast FIRE",
    description:
      "You've saved enough that, left alone to compound with zero further contributions, your portfolio will grow to your full FIRE number by traditional retirement age. Once you hit this point you can stop saving for retirement entirely and just cover current living costs — often by working a lower-stress or lower-paying job.",
  },
  {
    key: "barista",
    label: "Barista FIRE",
    description:
      "A middle ground: your portfolio covers most of your expenses, and you work part-time (often for supplemental income and employer health insurance) to cover the rest. Reduces the FIRE number needed versus full retirement while still dramatically increasing freedom and flexibility.",
  },
  {
    key: "traditional",
    label: "Traditional FIRE",
    description:
      "A balanced approach between Lean and Fat FIRE — typical middle-class spending levels in retirement, requiring a moderately sized portfolio without extreme frugality or excess.",
  },
];

const FIRE_TYPE_KEY_BY_LABEL = {
  "Lean FIRE": "lean",
  "Fat FIRE": "fat",
  "Coast FIRE": "coast",
  "Barista FIRE": "barista",
  "Traditional FIRE": "traditional",
};

const LIFE_AFTER_CATEGORIES = [
  {
    title: "Purpose & work",
    items: [
      "Consider part-time, consulting, or an \"encore career\" in a field you find meaningful — stopping work entirely and abruptly can be jarring after decades of structure.",
      "Volunteering or board work can replace workplace structure and social connection without income pressure.",
      "Mentoring or teaching, formally or informally, is a common way to keep using decades of expertise.",
    ],
  },
  {
    title: "Health & benefits",
    items: [
      "Enroll in Medicare during your Initial Enrollment Period around age 65 — missing it can mean lasting penalties.",
      "Decide when to claim Social Security: as early as 62 (reduced), full retirement age (~67), or as late as 70 (increased) — delaying generally raises your monthly benefit.",
      "If retiring before 65, plan the health-insurance bridge: ACA marketplace plans, COBRA, or a part-time job with benefits.",
      "Consider long-term care insurance or a dedicated care fund while you're still insurable.",
    ],
  },
  {
    title: "Family & legacy",
    items: [
      "Review or create a will, powers of attorney, and beneficiary designations — these quietly go stale for years.",
      "If you're still supporting children financially, plan those cash flows explicitly rather than drawing them ad hoc from savings.",
      "Decide on a gifting or estate strategy if leaving an inheritance is a goal.",
    ],
  },
  {
    title: "Lifestyle & adventure",
    items: [
      "Big travel or relocation plans are often easiest in the first few active years of retirement.",
      "Downsizing or relocating to a lower-tax, lower-cost state (see the comparison above) can meaningfully stretch your portfolio.",
      "Revisit hobbies or interests that were sidelined during your career — many retirees underestimate how much unstructured time they'll suddenly have.",
    ],
  },
];

function buildLifeAfterIntro(input, childrenAges) {
  if (!childrenAges || childrenAges.length === 0) {
    return "The transition into retirement is as much about time and purpose as it is about money. A few areas worth planning deliberately:";
  }
  const yearsToRetirement = input.retirementAge - input.currentAge;
  const stillDependent = childrenAges.some((age) => age + yearsToRetirement < 18);
  if (stillDependent) {
    return "With children still at home when you retire, this next chapter will likely blend continued family support with your own plans. A few areas worth planning deliberately:";
  }
  return "With your kids grown and independent by the time you retire, this next chapter is squarely your own. A few areas worth planning deliberately:";
}
