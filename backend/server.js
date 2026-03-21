// server.js — RoadSense Express API
//
// Serves road spending data for Illinois municipalities.
// Data is loaded from the JSON files produced by data/fetch.js.

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data/output");
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

let villages = [];
let benchmarks = {};

function loadData() {
  const allPath = path.join(DATA_DIR, "all-villages.json");
  const benchPath = path.join(DATA_DIR, "benchmarks.json");

  if (!fs.existsSync(allPath)) {
    console.error(
      `Data not found at ${allPath}. Run "cd data && node fetch.js" first.`
    );
    return;
  }

  villages = JSON.parse(fs.readFileSync(allPath, "utf-8"));
  benchmarks = JSON.parse(fs.readFileSync(benchPath, "utf-8"));
  console.log(`Loaded ${villages.length} villages`);
}

loadData();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findVillage(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return villages.find(
    (v) =>
      v.id === slug ||
      v.name.toLowerCase() === name.toLowerCase() ||
      v.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() ===
        name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  );
}

function findPeers(village, { maxResults = 10 } = {}) {
  return villages
    .filter((v) => v.id !== village.id)
    .map((v) => {
      let score = 0;
      // Same county is a strong signal
      if (v.county === village.county) score += 50;
      // Similar population (within 50%) is important
      if (village.population && v.population) {
        const ratio = v.population / village.population;
        if (ratio >= 0.5 && ratio <= 1.5) score += 30;
        if (ratio >= 0.75 && ratio <= 1.25) score += 20;
      }
      return { village: v, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((p) => p.village);
}

function rankInGroup(village, peers, metric) {
  const all = [village, ...peers]
    .filter((v) => v.roadSpending[metric] != null)
    .sort((a, b) => b.roadSpending[metric] - a.roadSpending[metric]);

  const rank = all.findIndex((v) => v.id === village.id) + 1;
  return { rank, total: all.length };
}

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

// GET /api/village/:name — road spending data for a named village
app.get("/api/village/:name", (req, res) => {
  const village = findVillage(req.params.name);
  if (!village) {
    return res.status(404).json({
      error: "Village not found",
      suggestion: "Try searching with /api/search?q=<partial name>",
    });
  }

  const peers = findPeers(village);
  const rankings = {
    spendPerCapita: rankInGroup(village, peers, "spendPerCapita"),
    spendPerLaneMile: rankInGroup(village, peers, "spendPerLaneMile"),
  };

  res.json({ village, peers: peers.slice(0, 5), rankings, benchmarks });
});

// GET /api/compare?villages=A,B,C — normalized comparison
app.get("/api/compare", (req, res) => {
  const names = (req.query.villages || "").split(",").filter(Boolean);
  if (names.length === 0) {
    return res.status(400).json({ error: "Provide ?villages=A,B,C" });
  }

  const found = [];
  const notFound = [];

  for (const name of names) {
    const v = findVillage(name.trim());
    if (v) found.push(v);
    else notFound.push(name.trim());
  }

  if (found.length === 0) {
    return res.status(404).json({ error: "No villages found", notFound });
  }

  // Normalize comparison data
  const comparison = found.map((v) => ({
    id: v.id,
    name: v.name,
    county: v.county,
    population: v.population,
    fiscalYear: v.fiscalYear,
    totalRoadSpend: v.roadSpending.totalRoadSpend,
    spendPerCapita: v.roadSpending.spendPerCapita,
    spendPerLaneMile: v.roadSpending.spendPerLaneMile,
    roadBudgetPercent: v.roadSpending.roadBudgetPercent,
    roadConditionScore: v.roadConditionScore,
  }));

  res.json({ comparison, notFound, benchmarks });
});

// GET /api/peers?population=9000&county=Lake — similar-sized villages
app.get("/api/peers", (req, res) => {
  const targetPop = parseInt(req.query.population, 10);
  const targetCounty = req.query.county;

  if (!targetPop) {
    return res.status(400).json({ error: "Provide ?population=<number>" });
  }

  // Create a synthetic village for peer matching
  const synthetic = {
    id: "__query__",
    population: targetPop,
    county: targetCounty || "",
  };

  const peers = villages
    .filter((v) => {
      if (!v.population) return false;
      const ratio = v.population / targetPop;
      const popMatch = ratio >= 0.5 && ratio <= 2.0;
      const countyMatch = !targetCounty || v.county === targetCounty;
      return popMatch && (countyMatch || !targetCounty);
    })
    .sort((a, b) => {
      // Prefer same county, then closest population
      const aCounty = a.county === targetCounty ? 0 : 1;
      const bCounty = b.county === targetCounty ? 0 : 1;
      if (aCounty !== bCounty) return aCounty - bCounty;
      return Math.abs(a.population - targetPop) - Math.abs(b.population - targetPop);
    })
    .slice(0, 10);

  res.json({ peers, benchmarks });
});

// GET /api/search?q=<partial name> — search villages by name
app.get("/api/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  if (!q) {
    return res.json({ results: villages.map((v) => ({ id: v.id, name: v.name, county: v.county })) });
  }

  const results = villages
    .filter((v) => v.name.toLowerCase().includes(q) || v.id.includes(q))
    .map((v) => ({ id: v.id, name: v.name, county: v.county, population: v.population }));

  res.json({ results });
});

// GET /api/benchmarks — national/state benchmark constants
app.get("/api/benchmarks", (_req, res) => {
  res.json(benchmarks);
});

// POST /api/analyze — AI analysis using Claude
app.post("/api/analyze", async (req, res) => {
  const { villageName } = req.body;
  if (!villageName) {
    return res.status(400).json({ error: "Provide villageName in request body" });
  }

  const village = findVillage(villageName);
  if (!village) {
    return res.status(404).json({ error: "Village not found" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "AI analysis not configured",
      message: "Set ANTHROPIC_API_KEY in .env to enable this feature",
    });
  }

  const peers = findPeers(village);

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const prompt = buildAnalysisPrompt(village, peers, benchmarks);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const analysis = response.content[0].text;
    res.json({ village: village.name, analysis });
  } catch (err) {
    console.error("AI analysis error:", err.message);
    res.status(500).json({ error: "AI analysis failed", message: err.message });
  }
});

function buildAnalysisPrompt(village, peers, benchmarks) {
  const vs = village.roadSpending;
  const peerSummary = peers
    .slice(0, 5)
    .map(
      (p) =>
        `  - ${p.name} (pop ${p.population?.toLocaleString() || "?"}, $${p.roadSpending.spendPerCapita || "?"}/capita)`
    )
    .join("\n");

  return `You are a municipal finance analyst helping Illinois residents understand their village's road spending. Write in plain English for a general audience — residents, journalists, local officials.

Analyze this village's road spending and provide:
1. A one-sentence verdict: is this village under-investing, over-investing, or appropriately investing in roads compared to peers and national benchmarks?
2. Key findings (3-4 bullet points)
3. One "quick win" recommendation (something achievable in the next budget cycle)
4. One "long game" recommendation (a multi-year strategic move)

VILLAGE: ${village.name}, ${village.county} County, IL
Population: ${village.population?.toLocaleString() || "unknown"}
Fiscal Year: ${village.fiscalYear}
Total Road Spend: $${vs.totalRoadSpend?.toLocaleString() || "unknown"}
Spend Per Capita: $${vs.spendPerCapita || "unknown"}
Spend Per Lane-Mile: $${vs.spendPerLaneMile?.toLocaleString() || "unknown"}
Road Condition Score: ${village.roadConditionScore || "not available"}/100
Centerline Miles: ${vs.centerlineMiles || "unknown"}
${village.referendumRevenue ? `Road Referendum Revenue: $${village.referendumRevenue.toLocaleString()}/yr` : ""}

PEER VILLAGES:
${peerSummary || "  No peers available for comparison"}

BENCHMARKS:
  - US local gov avg road spend: $${benchmarks.US_AVG_SPEND_PER_CAPITA}/capita (Urban Institute 2021)
  - IL avg spend per lane-mile: $${benchmarks.IL_AVG_SPEND_PER_LANE_MILE?.toLocaleString()} (Reason Foundation 2022)
  - IL road acceptability rate: ${benchmarks.IL_ROAD_ACCEPTABILITY_RATE}% (USDOT 2022)

${village.vendors?.length > 0 ? `TOP VENDORS:\n${village.vendors.map((v) => `  - ${v.name}: $${v.amount.toLocaleString()} (${v.category})`).join("\n")}` : ""}

Be specific with numbers. Cite the benchmarks. Keep it under 300 words.`;
}

// GET /api/refresh — re-fetch Comptroller data (admin only)
app.get("/api/refresh", async (req, res) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return res.status(503).json({ error: "Admin key not configured" });
  }

  const providedKey = req.headers["x-api-key"] || req.query.key;
  if (providedKey !== adminKey) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  try {
    // Run the fetch script as a child process
    const { execSync } = await import("child_process");
    const output = execSync("node fetch.js", {
      cwd: path.join(__dirname, "../data"),
      timeout: 120_000,
      encoding: "utf-8",
    });

    // Reload data
    loadData();

    res.json({
      message: "Data refreshed successfully",
      villageCount: villages.length,
      output,
    });
  } catch (err) {
    res.status(500).json({ error: "Refresh failed", message: err.message });
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`RoadSense API running on http://localhost:${PORT}`);
  console.log(`CORS enabled for ${FRONTEND_URL}`);
  console.log(`Loaded ${villages.length} villages`);
});
