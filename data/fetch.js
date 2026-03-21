#!/usr/bin/env node

// fetch.js — RoadSense data pipeline
//
// Parses Annual Financial Report (AFR) bulk data from the Illinois
// Comptroller's Local Government Warehouse. The Comptroller publishes
// this as a Microsoft Access (.accdb) database file, downloadable at:
//
//   https://illinoiscomptroller.gov/constituent-services/local-government/
//   local-government-division/financial-databases/
//
// The download is manual (form-based, no public API). Place the .accdb
// file in data/raw/ and run this script.
//
// What this script does:
//   1. Reads the .accdb file from data/raw/
//   2. Joins UnitData (municipality info) + UnitStats (population) +
//      FundsUsed (fund names & expenditures) + Expenditures (detailed spending)
//   3. Filters for road/highway-related funds by matching fund instrument names
//   4. Calculates: total road spend, spend per capita, % of budget on roads
//   5. Outputs clean JSON per municipality to data/output/
//
// Usage:
//   node fetch.js              # parse .accdb from data/raw/
//   node fetch.js --seed-only  # skip parsing, just output seed data

import fs from "fs";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import MDBReader from "mdb-reader";
import { SEED_VILLAGES, BENCHMARKS } from "./seed-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "output");
const RAW_DIR = path.join(__dirname, "raw");

// ---------------------------------------------------------------------------
// Fund instrument name patterns that indicate road infrastructure spending.
// These are matched against the "Instrument" field in the FundsUsed table.
// ---------------------------------------------------------------------------
const ROAD_FUND_PATTERNS = [
  /\broad\b/i,
  /\bstreet\b/i,
  /\bbridge\b/i,
  /\bmotor\s*fuel\s*tax\b/i,
  /\bMFT\b/,
  /\bhighway\b/i,
  /\bpavement\b/i,
  /\bpaving\b/i,
  /\bcurb\b/i,
  /\bsidewalk\b/i,
  /\bstrm?\s*sewer/i, // storm sewer, often bundled with road work
];

// Patterns to EXCLUDE — these match "road" or "street" but aren't road spending
const ROAD_FUND_EXCLUSIONS = [
  /\bTIF\b/i, // Tax Increment Financing districts named after streets
  /\bbusiness\s*district\b/i,
  /\bredevelopment\b/i,
  /\bbroadband\b/i,
  /\bfiber\b/i,
];

// ---------------------------------------------------------------------------
// IL Comptroller Chart of Accounts — expenditure category codes
// The Expenditures table uses codes like "251a", "252t", etc.
// Column codes: GN=General, SR=Special Revenue, CP=Capital Projects,
//   DS=Debt Service, EP=Enterprise, TS=Trust/Agency, FD=Fiduciary/Pension,
//   DP=Discretely Presented, OT=Other
// ---------------------------------------------------------------------------
const FUND_TYPE_COLUMNS = ["GN", "SR", "CP", "DS", "EP", "TS", "FD", "DP", "OT"];

// Category code groups — from IL Comptroller Chart of Accounts
// 251 = Personnel services, 252 = Contractual services, 255 = Commodities,
// 256 = Capital outlay, 257 = Debt service, 259 = Other expenditures
const CATEGORY_LABELS = {
  "251": "Personnel Services",
  "252": "Contractual Services",
  "255": "Commodities",
  "256": "Capital Outlay",
  "257": "Debt Service",
  "259": "Other Expenditures",
};

// Preventive vs reactive classification based on expenditure categories.
// Capital outlay (256) represents long-term investment / preventive work.
// Contractual (252) + commodities (255) represent maintenance / reactive work.
// Personnel (251) and debt service (257) are excluded from the ratio.
const PREVENTIVE_CATEGORIES = ["256"]; // Capital outlay
const REACTIVE_CATEGORIES = ["252", "255"]; // Contractual + commodities

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRoadFund(instrumentName) {
  if (!instrumentName) return false;
  // Must match at least one inclusion pattern
  const included = ROAD_FUND_PATTERNS.some((p) => p.test(instrumentName));
  if (!included) return false;
  // Must not match any exclusion pattern
  const excluded = ROAD_FUND_EXCLUSIONS.some((p) => p.test(instrumentName));
  return !excluded;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Parse a numeric string from the Access DB (often "12345.0000")
function parseNum(val) {
  if (val == null) return 0;
  const n = parseFloat(String(val).replace(/[,$]/g, ""));
  return isNaN(n) ? 0 : n;
}

// C1 code to government type
const GOV_TYPES = {
  MU: "Municipality",
  TW: "Township",
  CC: "County/Community College",
  SD: "School District",
  SP: "Special Purpose",
  sp: "Special Purpose",
  HB: "Home Rule/Bond",
};

// C4 code to municipality sub-type (partial — the ones we care about)
// 30 = City, 31 = Town, 32 = Village
const MUNI_SUBTYPES = { 30: "City", 31: "Town", 32: "Village" };

// ---------------------------------------------------------------------------
// Parse the Access database
// ---------------------------------------------------------------------------

function parseAccessDB(dbPath) {
  console.log(`Reading Access database: ${dbPath}`);
  const buf = readFileSync(dbPath);
  const reader = new MDBReader(buf);

  // Load tables into memory
  const unitData = reader.getTable("UnitData").getData();
  const unitStats = reader.getTable("UnitStats").getData();
  const fundsUsed = reader.getTable("FundsUsed").getData();
  const expenditures = reader.getTable("Expenditures").getData();

  console.log(`  UnitData: ${unitData.length} units`);
  console.log(`  UnitStats: ${unitStats.length} records`);
  console.log(`  FundsUsed: ${fundsUsed.length} funds`);
  console.log(`  Expenditures: ${expenditures.length} line items`);

  // Build lookup maps
  // UnitData: keyed by Code
  const unitMap = new Map();
  for (const u of unitData) {
    unitMap.set(u.Code, u);
  }

  // UnitStats: keyed by Code (has population, EAV)
  const statsMap = new Map();
  for (const s of unitStats) {
    statsMap.set(s.Code, s);
  }

  // FundsUsed: group by Code, filter for road-related funds
  const roadFundsByUnit = new Map();
  let totalRoadFunds = 0;
  for (const f of fundsUsed) {
    if (f.Deleted === "Y") continue;
    if (!isRoadFund(f.Instrument)) continue;

    totalRoadFunds++;
    if (!roadFundsByUnit.has(f.Code)) {
      roadFundsByUnit.set(f.Code, []);
    }
    roadFundsByUnit.get(f.Code).push({
      fundName: f.Instrument,
      fundType: f.FundType,
      expenditures: parseNum(f.Expenditures),
      fiscalYearEnd: f.FYEnd,
    });
  }

  console.log(`  Road-related funds found: ${totalRoadFunds} across ${roadFundsByUnit.size} units`);

  // Expenditures: group by Code, sum across all fund type columns
  // This gives us total municipal expenditures per unit (for % of budget calc)
  // Also extract preventive (capital outlay) vs reactive (contractual + commodities)
  const totalExpByUnit = new Map();
  const preventiveByUnit = new Map();
  const reactiveByUnit = new Map();

  for (const e of expenditures) {
    // Only count "total" category rows (suffix "t") to avoid double-counting
    if (!e.Category.endsWith("t")) continue;

    const catGroup = e.Category.replace(/[a-z]$/, ""); // "256t" -> "256"
    const total = FUND_TYPE_COLUMNS.reduce((sum, col) => sum + parseNum(e[col]), 0);
    if (total <= 0) continue;

    totalExpByUnit.set(
      e.Code,
      (totalExpByUnit.get(e.Code) || 0) + total
    );

    // Classify preventive vs reactive spend
    if (PREVENTIVE_CATEGORIES.includes(catGroup)) {
      preventiveByUnit.set(e.Code, (preventiveByUnit.get(e.Code) || 0) + total);
    } else if (REACTIVE_CATEGORIES.includes(catGroup)) {
      reactiveByUnit.set(e.Code, (reactiveByUnit.get(e.Code) || 0) + total);
    }
  }

  // Now build village objects for all units that have road funds
  const villages = [];
  for (const [code, funds] of roadFundsByUnit) {
    const unit = unitMap.get(code);
    const stats = statsMap.get(code);
    if (!unit) continue;

    // We care about municipalities (MU), townships (TW — many manage roads),
    // and cities/villages/towns
    const govType = unit.C1;
    const subType = MUNI_SUBTYPES[unit.C4] || null;

    // Build a readable name
    let displayName = unit.UnitName;
    if (subType && !displayName.toLowerCase().includes(subType.toLowerCase())) {
      // Don't prefix if name already contains the type
    }

    const population = stats ? parseNum(stats.Pop) : null;
    const fiscalYear = stats ? parseNum(stats.FY) : null;
    const totalRoadSpend = Math.round(funds.reduce((s, f) => s + f.expenditures, 0));
    const totalMunicipalSpend = totalExpByUnit.get(code)
      ? Math.round(totalExpByUnit.get(code))
      : null;

    // Include gov type and county in the ID to avoid collisions between
    // townships/municipalities with the same name, and same-type units in
    // different counties (e.g., "Concord Township" in multiple counties)
    const govSuffix = govType === "TW" ? "-twp" : govType === "SP" || govType === "sp" ? "-sp" : "";
    const countySuffix = govSuffix ? `-${slugify(unit.County)}` : "";
    const village = {
      id: slugify(displayName) + govSuffix + countySuffix,
      name: displayName + (govType === "TW" ? " (Township)" : ""),
      county: unit.County,
      state: "IL",
      fips: code, // IL Comptroller unit code (e.g., "049/190/32")
      population: population || null,
      fiscalYear: fiscalYear || null,
      govType: GOV_TYPES[govType] || govType,
      subType: subType,

      roadSpending: {
        totalRoadSpend,
        spendPerCapita: population ? Math.round(totalRoadSpend / population) : null,
        centerlineMiles: null, // Not in Comptroller data
        laneMiles: null,
        spendPerLaneMile: null,
        roadBudgetPercent:
          totalMunicipalSpend && totalMunicipalSpend > 0
            ? parseFloat(((totalRoadSpend / totalMunicipalSpend) * 100).toFixed(1))
            : null,
        totalMunicipalSpend,
        preventiveSpend: preventiveByUnit.get(code) ? Math.round(preventiveByUnit.get(code)) : null,
        reactiveSpend: reactiveByUnit.get(code) ? Math.round(reactiveByUnit.get(code)) : null,
        preventiveRatio: null, // Calculated in calculateMetrics
        funds: funds.map((f) => ({
          name: f.fundName,
          type: f.fundType,
          expenditures: Math.round(f.expenditures),
        })),
      },

      roadConditionScore: null,
      acceptabilityRate: null,
      referendumRevenue: null,
      vendors: [],

      metadata: {
        source: "IL Comptroller Local Government Warehouse AFR bulk download (data2025.accdb)",
        fetchedAt: new Date().toISOString(),
        fiscalYearEnd: funds[0]?.fiscalYearEnd || null,
        notes: `Parsed from ${funds.length} road-related fund(s): ${funds.map((f) => f.fundName).join(", ")}`,
      },
    };

    villages.push(village);
  }

  console.log(`  Built ${villages.length} village objects with road spending data`);
  return villages;
}

// ---------------------------------------------------------------------------
// Merge fetched data with seed data
// ---------------------------------------------------------------------------

function mergeWithSeedData(fetchedVillages) {
  if (!fetchedVillages || fetchedVillages.length === 0) {
    console.log("No Comptroller data available. Using seed data only.");
    return SEED_VILLAGES;
  }

  // Seed data takes priority (manually verified, has extra fields like vendors)
  const seedMap = new Map(SEED_VILLAGES.map((v) => [v.id, v]));
  const merged = [...SEED_VILLAGES];
  let addedCount = 0;

  for (const fetched of fetchedVillages) {
    if (!seedMap.has(fetched.id)) {
      merged.push(fetched);
      addedCount++;
    } else {
      // For seed villages that also appear in Comptroller data, merge in
      // any fields the seed data doesn't have
      const seed = seedMap.get(fetched.id);
      if (!seed.roadSpending.totalMunicipalSpend && fetched.roadSpending.totalMunicipalSpend) {
        seed.roadSpending.totalMunicipalSpend = fetched.roadSpending.totalMunicipalSpend;
        seed.roadSpending.roadBudgetPercent = fetched.roadSpending.roadBudgetPercent;
      }
      if (!seed.roadSpending.funds) {
        seed.roadSpending.funds = fetched.roadSpending.funds;
      }
    }
  }

  console.log(
    `Merged: ${SEED_VILLAGES.length} seed + ${addedCount} from Comptroller = ${merged.length} total`
  );
  return merged;
}

// ---------------------------------------------------------------------------
// Calculate derived metrics
// ---------------------------------------------------------------------------

function calculateMetrics(village) {
  const rs = village.roadSpending;

  if (village.population && rs.totalRoadSpend) {
    rs.spendPerCapita = Math.round(rs.totalRoadSpend / village.population);
  }

  if (rs.laneMiles && rs.totalRoadSpend) {
    rs.spendPerLaneMile = Math.round(rs.totalRoadSpend / rs.laneMiles);
  }

  if (rs.totalMunicipalSpend && rs.totalRoadSpend) {
    rs.roadBudgetPercent = parseFloat(
      ((rs.totalRoadSpend / rs.totalMunicipalSpend) * 100).toFixed(1)
    );
  }

  if (rs.preventiveSpend != null && rs.reactiveSpend != null) {
    const total = rs.preventiveSpend + rs.reactiveSpend;
    rs.preventiveRatio = total > 0 ? parseFloat((rs.preventiveSpend / total).toFixed(2)) : null;
  }

  return village;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const seedOnly = process.argv.includes("--seed-only");

  console.log("=== RoadSense Data Pipeline ===");
  console.log();

  let fetchedVillages = null;

  if (!seedOnly) {
    // Look for .accdb files in data/raw/ — parse all for multi-year support
    const accdbFiles = fs.existsSync(RAW_DIR)
      ? fs.readdirSync(RAW_DIR).filter((f) => /\.accdb$/i.test(f)).sort()
      : [];

    if (accdbFiles.length > 0) {
      // Parse each file — each contains a single fiscal year
      const allYears = [];
      for (const file of accdbFiles) {
        const dbPath = path.join(RAW_DIR, file);
        console.log(`\nProcessing: ${file}`);
        const villages = parseAccessDB(dbPath);
        allYears.push({ file, villages });
      }

      // Use the most recent file as the primary dataset
      const primary = allYears[allYears.length - 1];
      fetchedVillages = primary.villages;

      // Build year-over-year data if multiple files exist
      if (allYears.length > 1) {
        console.log(`\nBuilding year-over-year data from ${allYears.length} files...`);
        const historyByCode = new Map(); // keyed by fips (Comptroller code)

        for (const { file, villages } of allYears) {
          for (const v of villages) {
            if (!historyByCode.has(v.fips)) {
              historyByCode.set(v.fips, []);
            }
            historyByCode.get(v.fips).push({
              fiscalYear: v.fiscalYear,
              totalRoadSpend: v.roadSpending.totalRoadSpend,
              spendPerCapita: v.roadSpending.spendPerCapita,
              population: v.population,
              totalMunicipalSpend: v.roadSpending.totalMunicipalSpend,
              roadBudgetPercent: v.roadSpending.roadBudgetPercent,
              preventiveSpend: v.roadSpending.preventiveSpend,
              reactiveSpend: v.roadSpending.reactiveSpend,
              source: file,
            });
          }
        }

        // Attach history to the primary villages
        for (const v of fetchedVillages) {
          const history = historyByCode.get(v.fips);
          if (history && history.length > 1) {
            v.yearOverYear = history.sort((a, b) => a.fiscalYear - b.fiscalYear);
          }
        }

        const withHistory = fetchedVillages.filter((v) => v.yearOverYear).length;
        console.log(`  ${withHistory} villages have multi-year data`);
      }
    } else {
      console.log("No .accdb file found in data/raw/.");
      console.log("Download the AFR bulk data from the IL Comptroller:");
      console.log(
        "  https://illinoiscomptroller.gov/constituent-services/local-government/"
      );
      console.log("  local-government-division/financial-databases/");
      console.log();
      console.log("Select a fiscal year, download the .accdb file, and place it in data/raw/.");
      console.log("Then re-run: node fetch.js");
      console.log();
      console.log("Falling back to seed data only.");
    }
  }

  const allVillages = mergeWithSeedData(fetchedVillages);
  const processed = allVillages.map(calculateMetrics);

  // Write output
  ensureDir(OUTPUT_DIR);

  // Individual village files
  for (const village of processed) {
    const filePath = path.join(OUTPUT_DIR, `${village.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(village, null, 2));
  }

  // Combined file
  const combinedPath = path.join(OUTPUT_DIR, "all-villages.json");
  fs.writeFileSync(combinedPath, JSON.stringify(processed, null, 2));

  // Benchmarks
  const benchmarksPath = path.join(OUTPUT_DIR, "benchmarks.json");
  fs.writeFileSync(benchmarksPath, JSON.stringify(BENCHMARKS, null, 2));

  // Index (for quick lookups by the API)
  const index = processed.map((v) => ({
    id: v.id,
    name: v.name,
    county: v.county,
    population: v.population,
    fiscalYear: v.fiscalYear,
    govType: v.govType || null,
    subType: v.subType || null,
    spendPerCapita: v.roadSpending.spendPerCapita,
    totalRoadSpend: v.roadSpending.totalRoadSpend,
  }));
  const indexPath = path.join(OUTPUT_DIR, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log();
  console.log(`Wrote ${processed.length} village files to ${OUTPUT_DIR}/`);
  console.log("  - Individual JSON files per village");
  console.log("  - all-villages.json (combined)");
  console.log("  - benchmarks.json");
  console.log("  - index.json (quick lookup)");

  // Summary stats
  const withPop = processed.filter((v) => v.population);
  const withRoadSpend = processed.filter((v) => v.roadSpending.totalRoadSpend > 0);
  console.log();
  console.log(`Summary:`);
  console.log(`  Total villages: ${processed.length}`);
  console.log(`  With population data: ${withPop.length}`);
  console.log(`  With road spending: ${withRoadSpend.length}`);
  if (withPop.length > 0) {
    const avgSpendPerCapita =
      Math.round(
        withPop.reduce((s, v) => s + (v.roadSpending.spendPerCapita || 0), 0) / withPop.length
      );
    console.log(`  Avg spend per capita: $${avgSpendPerCapita}`);
  }
  console.log();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
