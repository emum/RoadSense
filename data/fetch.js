#!/usr/bin/env node

// fetch.js — RoadSense data pipeline
//
// Downloads Annual Financial Report (AFR) bulk data from the Illinois
// Comptroller's Local Government Warehouse, parses it, filters for
// road/highway-related fund codes, and outputs clean JSON per municipality.
//
// Data source:
//   https://illinoiscomptroller.gov/constituent-services/local-government/
//   local-government-division/financial-databases/
//
// The Comptroller publishes AFRs as downloadable CSV/Excel files. Each
// municipality files annually. We look for fund types related to road
// infrastructure spending:
//   - Street & Bridge
//   - Road & Bridge
//   - Motor Fuel Tax (MFT)
//   - Special Service Area (road-designated only)
//
// Usage:
//   node fetch.js              # fetch latest data
//   node fetch.js --seed-only  # skip fetch, just output seed data

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SEED_VILLAGES, BENCHMARKS } from "./seed-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "output");
const RAW_DIR = path.join(__dirname, "raw");

// ---------------------------------------------------------------------------
// Fund codes / names that indicate road infrastructure spending.
// The Comptroller's AFR data uses these fund type descriptions.
// ---------------------------------------------------------------------------
const ROAD_FUND_PATTERNS = [
  /street\s*&?\s*bridge/i,
  /road\s*&?\s*bridge/i,
  /motor\s*fuel\s*tax/i,
  /MFT/i,
  /highway/i,
  /pavement/i,
  /road\s*improvement/i,
  /road\s*maintenance/i,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRoadFund(fundName) {
  return ROAD_FUND_PATTERNS.some((pattern) => pattern.test(fundName));
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

// ---------------------------------------------------------------------------
// Parse CSV rows into municipality road spending objects
// ---------------------------------------------------------------------------

/**
 * Parse raw AFR CSV data into structured municipality objects.
 *
 * Expected CSV columns (based on Comptroller bulk download format):
 *   Government Name, Government ID, County, Government Type,
 *   Fund Name, Fund Type, Fiscal Year, Expenditures, Revenue, ...
 *
 * We filter for:
 *   - Government Type containing "Village", "City", or "Town"
 *   - Fund names matching ROAD_FUND_PATTERNS
 *
 * Then aggregate expenditures per municipality per fiscal year.
 */
function parseAFRData(rows) {
  // Group by municipality + fiscal year
  const byMuni = {};

  for (const row of rows) {
    const govName = (row["Government Name"] || row["government_name"] || "").trim();
    const govType = (row["Government Type"] || row["government_type"] || "").trim();
    const fundName = (row["Fund Name"] || row["fund_name"] || "").trim();
    const county = (row["County"] || row["county"] || "").trim();
    const govId = (row["Government ID"] || row["government_id"] || "").trim();
    const fiscalYear = parseInt(row["Fiscal Year"] || row["fiscal_year"] || "0", 10);
    const expenditures = parseFloat(
      (row["Expenditures"] || row["expenditures"] || "0").toString().replace(/[,$]/g, "")
    );

    // Only include municipal governments
    if (!/village|city|town/i.test(govType)) continue;

    // Only include road-related funds
    if (!isRoadFund(fundName)) continue;

    // Skip invalid data
    if (!govName || !fiscalYear || isNaN(expenditures)) continue;

    const key = `${slugify(govName)}-${fiscalYear}`;
    if (!byMuni[key]) {
      byMuni[key] = {
        id: slugify(govName),
        name: govName,
        county,
        state: "IL",
        fips: govId,
        population: null, // Will be filled from Census data
        fiscalYear,
        funds: [],
        totalRoadSpend: 0,
      };
    }

    byMuni[key].funds.push({ fundName, expenditures });
    byMuni[key].totalRoadSpend += expenditures;
  }

  // Convert to final schema
  return Object.values(byMuni).map((muni) => ({
    id: muni.id,
    name: muni.name,
    county: muni.county,
    state: muni.state,
    fips: muni.fips,
    population: muni.population,
    fiscalYear: muni.fiscalYear,
    roadSpending: {
      totalRoadSpend: Math.round(muni.totalRoadSpend),
      spendPerCapita: null, // Requires population
      centerlineMiles: null,
      laneMiles: null,
      spendPerLaneMile: null,
      roadBudgetPercent: null,
      totalMunicipalSpend: null,
      preventiveSpend: null,
      reactiveSpend: null,
      preventiveRatio: null,
    },
    roadConditionScore: null,
    acceptabilityRate: null,
    referendumRevenue: null,
    vendors: [],
    metadata: {
      source: "IL Comptroller Local Government Warehouse AFR bulk download",
      fetchedAt: new Date().toISOString(),
      fiscalYearEnd: null,
      notes: `Aggregated from ${muni.funds.length} road-related fund(s): ${muni.funds.map((f) => f.fundName).join(", ")}`,
    },
  }));
}

// ---------------------------------------------------------------------------
// Fetch from Comptroller (when bulk data is available)
// ---------------------------------------------------------------------------

/**
 * Attempt to download the latest AFR bulk file from the Comptroller.
 *
 * The Comptroller's download page provides files at URLs that change
 * periodically. This function tries known URL patterns. If the bulk
 * download is unavailable (common — the page sometimes requires manual
 * navigation or CAPTCHA), we fall back to seed data.
 *
 * In production, this should be run on a schedule (e.g., weekly cron)
 * and the admin can trigger it via the /api/refresh endpoint.
 */
async function fetchComptrollerData() {
  // Known URL patterns for the Comptroller's bulk data downloads.
  // These are based on historical URLs — the Comptroller may change them.
  const POSSIBLE_URLS = [
    "https://illinoiscomptroller.gov/financial-data/local-government-division/financial-databases/expenditure-data",
    "https://illinoiscomptroller.gov/financial-data/local-government-division/financial-databases",
  ];

  console.log("Attempting to fetch IL Comptroller AFR bulk data...");
  console.log(
    "Note: The Comptroller's bulk download page may require manual",
    "navigation. If auto-fetch fails, download manually from:"
  );
  console.log(
    "  https://illinoiscomptroller.gov/constituent-services/local-government/"
  );
  console.log(
    "  local-government-division/financial-databases/"
  );
  console.log();

  // Try to fetch — this will likely fail in automated environments
  // because the Comptroller site doesn't expose a stable API.
  for (const url of POSSIBLE_URLS) {
    try {
      const fetch = (await import("node-fetch")).default;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "RoadSense/1.0 (civic open-source project)",
        },
        timeout: 30_000,
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("csv") || contentType.includes("text")) {
          const text = await response.text();
          console.log(`Downloaded ${text.length} bytes from ${url}`);

          // Parse CSV
          const { parse } = await import("csv-parse/sync");
          const records = parse(text, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          });

          return parseAFRData(records);
        }

        if (contentType.includes("spreadsheet") || contentType.includes("excel")) {
          const buffer = await response.arrayBuffer();
          const XLSX = (await import("xlsx")).default;
          const workbook = XLSX.read(Buffer.from(buffer));
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const records = XLSX.utils.sheet_to_json(sheet);
          return parseAFRData(records);
        }
      }
    } catch (err) {
      console.log(`Could not fetch from ${url}: ${err.message}`);
    }
  }

  // Check if user has manually placed a file in raw/
  const manualFiles = fs.existsSync(RAW_DIR)
    ? fs.readdirSync(RAW_DIR).filter((f) => /\.(csv|xlsx?)$/i.test(f))
    : [];

  if (manualFiles.length > 0) {
    const filePath = path.join(RAW_DIR, manualFiles[0]);
    console.log(`Found manual download: ${filePath}`);

    if (/\.csv$/i.test(filePath)) {
      const { parse } = await import("csv-parse/sync");
      const text = fs.readFileSync(filePath, "utf-8");
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      return parseAFRData(records);
    }

    if (/\.xlsx?$/i.test(filePath)) {
      const XLSX = (await import("xlsx")).default;
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const records = XLSX.utils.sheet_to_json(sheet);
      return parseAFRData(records);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Merge fetched data with seed data
// ---------------------------------------------------------------------------

function mergeWithSeedData(fetchedVillages) {
  if (!fetchedVillages || fetchedVillages.length === 0) {
    console.log("No Comptroller data available. Using seed data only.");
    return SEED_VILLAGES;
  }

  // Build a map of seed villages by ID for quick lookup
  const seedMap = new Map(SEED_VILLAGES.map((v) => [v.id, v]));

  // Merge: seed data takes priority (it has manually verified fields)
  const merged = [...SEED_VILLAGES];
  for (const fetched of fetchedVillages) {
    if (!seedMap.has(fetched.id)) {
      merged.push(fetched);
    }
  }

  console.log(
    `Merged ${merged.length} villages (${SEED_VILLAGES.length} seed + ${merged.length - SEED_VILLAGES.length} from Comptroller)`
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
    fetchedVillages = await fetchComptrollerData();
  }

  const allVillages = mergeWithSeedData(fetchedVillages);

  // Calculate derived metrics for all villages
  const processed = allVillages.map(calculateMetrics);

  // Write output
  ensureDir(OUTPUT_DIR);

  // Write individual village files
  for (const village of processed) {
    const filePath = path.join(OUTPUT_DIR, `${village.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(village, null, 2));
  }

  // Write combined file
  const combinedPath = path.join(OUTPUT_DIR, "all-villages.json");
  fs.writeFileSync(combinedPath, JSON.stringify(processed, null, 2));

  // Write benchmarks
  const benchmarksPath = path.join(OUTPUT_DIR, "benchmarks.json");
  fs.writeFileSync(benchmarksPath, JSON.stringify(BENCHMARKS, null, 2));

  // Write index (for quick lookups)
  const index = processed.map((v) => ({
    id: v.id,
    name: v.name,
    county: v.county,
    population: v.population,
    fiscalYear: v.fiscalYear,
    spendPerCapita: v.roadSpending.spendPerCapita,
  }));
  const indexPath = path.join(OUTPUT_DIR, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log();
  console.log(`Wrote ${processed.length} village files to ${OUTPUT_DIR}/`);
  console.log(`  - Individual JSON files per village`);
  console.log(`  - all-villages.json (combined)`);
  console.log(`  - benchmarks.json`);
  console.log(`  - index.json (quick lookup)`);
  console.log();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
