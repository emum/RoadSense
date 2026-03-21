// seed-data.js
// Hardcoded seed data for RoadSense.
// Sources are cited inline. This data serves as the demo/example and as
// the schema template for what a "complete" village data object looks like.

// ---------------------------------------------------------------------------
// National & state benchmarks (hardcoded constants from published studies)
// ---------------------------------------------------------------------------
export const BENCHMARKS = {
  US_AVG_SPEND_PER_CAPITA: 622, // Urban Institute, 2021
  IL_AVG_SPEND_PER_LANE_MILE: 98_386, // Reason Foundation, 2022
  IL_ROAD_ACCEPTABILITY_RATE: 79.3, // USDOT, 2022 (percent)
  // Industry target: at least 60% of road spend should be preventive
  PREVENTIVE_RATIO_TARGET: 0.6,
};

// ---------------------------------------------------------------------------
// Hawthorn Woods IL — 2023 seed data
// Source: Village of Hawthorn Woods 2023 Treasurer's Report
//         + Priority Based Budget FY2025
//         + Independent engineering pavement study
//         + vhw.org public documents
// ---------------------------------------------------------------------------
export const SEED_VILLAGES = [
  {
    id: "hawthorn-woods",
    name: "Hawthorn Woods",
    county: "Lake",
    state: "IL",
    fips: "1733643",
    population: 9062,
    fiscalYear: 2023,

    roadSpending: {
      totalRoadSpend: 1_162_000,
      spendPerCapita: 128,
      centerlineMiles: 60,
      laneMiles: 120, // 60 centerline * 2 lanes avg
      spendPerLaneMile: 9683, // 1,162,000 / 120
      roadBudgetPercent: null, // total municipal spend not yet sourced
      totalMunicipalSpend: null,
      preventiveSpend: null,
      reactiveSpend: null,
      preventiveRatio: null,
    },

    roadConditionScore: 48, // PCI 0-100, independent engineering study
    acceptabilityRate: null,

    // Revenue note: $900k/yr road referendum revenue started 2023
    referendumRevenue: 900_000,

    vendors: [
      { name: "Peter Baker & Son", amount: 494_020, category: "paving" },
      { name: "Burke Engineering", amount: 191_901, category: "engineering" },
      { name: "McCann Industries", amount: 93_672, category: "equipment" },
      { name: "Compass Minerals", amount: 70_114, category: "salt" },
    ],

    metadata: {
      source: "vhw.org 2023 Treasurer's Report + Priority Based Budget 2025",
      fetchedAt: "2026-03-20T00:00:00Z",
      fiscalYearEnd: "2023-04-30",
      notes:
        "Road condition score from independent engineering pavement study. " +
        "Referendum revenue ($900k/yr) began in 2023. " +
        "Spend per capita of $128 is well below the national average of $622.",
    },
  },

  // Additional Lake County villages for peer comparison (estimated from
  // Comptroller AFR data — these are representative figures for demo purposes
  // and will be replaced by live Comptroller data once fetch.js runs).
  {
    id: "deer-park",
    name: "Deer Park",
    county: "Lake",
    state: "IL",
    fips: "1718823",
    population: 3450,
    fiscalYear: 2023,
    roadSpending: {
      totalRoadSpend: 685_000,
      spendPerCapita: 199,
      centerlineMiles: 22,
      laneMiles: 44,
      spendPerLaneMile: 15_568,
      roadBudgetPercent: 18.2,
      totalMunicipalSpend: 3_764_000,
      preventiveSpend: null,
      reactiveSpend: null,
      preventiveRatio: null,
    },
    roadConditionScore: null,
    acceptabilityRate: null,
    referendumRevenue: null,
    vendors: [],
    metadata: {
      source: "IL Comptroller AFR (estimated for demo)",
      fetchedAt: "2026-03-20T00:00:00Z",
      fiscalYearEnd: "2023-04-30",
      notes: "Estimated from Comptroller bulk data. Replace with live data.",
    },
  },
  {
    id: "kildeer",
    name: "Kildeer",
    county: "Lake",
    state: "IL",
    fips: "1739948",
    population: 3930,
    fiscalYear: 2023,
    roadSpending: {
      totalRoadSpend: 812_000,
      spendPerCapita: 207,
      centerlineMiles: 28,
      laneMiles: 56,
      spendPerLaneMile: 14_500,
      roadBudgetPercent: 21.5,
      totalMunicipalSpend: 3_776_000,
      preventiveSpend: null,
      reactiveSpend: null,
      preventiveRatio: null,
    },
    roadConditionScore: null,
    acceptabilityRate: null,
    referendumRevenue: null,
    vendors: [],
    metadata: {
      source: "IL Comptroller AFR (estimated for demo)",
      fetchedAt: "2026-03-20T00:00:00Z",
      fiscalYearEnd: "2023-04-30",
      notes: "Estimated from Comptroller bulk data. Replace with live data.",
    },
  },
  {
    id: "lake-zurich",
    name: "Lake Zurich",
    county: "Lake",
    state: "IL",
    fips: "1741937",
    population: 20_120,
    fiscalYear: 2023,
    roadSpending: {
      totalRoadSpend: 4_850_000,
      spendPerCapita: 241,
      centerlineMiles: 95,
      laneMiles: 190,
      spendPerLaneMile: 25_526,
      roadBudgetPercent: 14.8,
      totalMunicipalSpend: 32_770_000,
      preventiveSpend: null,
      reactiveSpend: null,
      preventiveRatio: null,
    },
    roadConditionScore: 62,
    acceptabilityRate: null,
    referendumRevenue: null,
    vendors: [],
    metadata: {
      source: "IL Comptroller AFR (estimated for demo)",
      fetchedAt: "2026-03-20T00:00:00Z",
      fiscalYearEnd: "2023-04-30",
      notes: "Estimated from Comptroller bulk data. Replace with live data.",
    },
  },
  {
    id: "long-grove",
    name: "Long Grove",
    county: "Lake",
    state: "IL",
    fips: "1744407",
    population: 8290,
    fiscalYear: 2023,
    roadSpending: {
      totalRoadSpend: 1_540_000,
      spendPerCapita: 186,
      centerlineMiles: 48,
      laneMiles: 96,
      spendPerLaneMile: 16_042,
      roadBudgetPercent: 19.3,
      totalMunicipalSpend: 7_979_000,
      preventiveSpend: null,
      reactiveSpend: null,
      preventiveRatio: null,
    },
    roadConditionScore: null,
    acceptabilityRate: null,
    referendumRevenue: null,
    vendors: [],
    metadata: {
      source: "IL Comptroller AFR (estimated for demo)",
      fetchedAt: "2026-03-20T00:00:00Z",
      fiscalYearEnd: "2023-04-30",
      notes: "Estimated from Comptroller bulk data. Replace with live data.",
    },
  },
  {
    id: "lake-barrington",
    name: "Lake Barrington",
    county: "Lake",
    state: "IL",
    fips: "1741105",
    population: 5060,
    fiscalYear: 2023,
    roadSpending: {
      totalRoadSpend: 920_000,
      spendPerCapita: 182,
      centerlineMiles: 30,
      laneMiles: 60,
      spendPerLaneMile: 15_333,
      roadBudgetPercent: 16.7,
      totalMunicipalSpend: 5_509_000,
      preventiveSpend: null,
      reactiveSpend: null,
      preventiveRatio: null,
    },
    roadConditionScore: null,
    acceptabilityRate: null,
    referendumRevenue: null,
    vendors: [],
    metadata: {
      source: "IL Comptroller AFR (estimated for demo)",
      fetchedAt: "2026-03-20T00:00:00Z",
      fiscalYearEnd: "2023-04-30",
      notes: "Estimated from Comptroller bulk data. Replace with live data.",
    },
  },
  {
    id: "wauconda",
    name: "Wauconda",
    county: "Lake",
    state: "IL",
    fips: "1779293",
    population: 14_010,
    fiscalYear: 2023,
    roadSpending: {
      totalRoadSpend: 2_310_000,
      spendPerCapita: 165,
      centerlineMiles: 55,
      laneMiles: 110,
      spendPerLaneMile: 21_000,
      roadBudgetPercent: 13.1,
      totalMunicipalSpend: 17_634_000,
      preventiveSpend: null,
      reactiveSpend: null,
      preventiveRatio: null,
    },
    roadConditionScore: 55,
    acceptabilityRate: null,
    referendumRevenue: null,
    vendors: [],
    metadata: {
      source: "IL Comptroller AFR (estimated for demo)",
      fetchedAt: "2026-03-20T00:00:00Z",
      fiscalYearEnd: "2023-04-30",
      notes: "Estimated from Comptroller bulk data. Replace with live data.",
    },
  },
];
