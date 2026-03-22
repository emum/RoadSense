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
import multer from "multer";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "../data/output");
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// PDF upload config — 10MB max, PDFs only
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
  storage: multer.memoryStorage(),
});

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

// GET /api/address?street=...&city=...&state=IL&zip=... — find municipality
// and township for a given street address using the Census Bureau geocoder.
app.get("/api/address", async (req, res) => {
  const { street, city, state, zip } = req.query;
  if (!street) {
    return res.status(400).json({ error: "Provide at least ?street=..." });
  }

  try {
    const fetchMod = (await import("node-fetch")).default;

    // Census Bureau Geocoder — free, no API key required
    // Returns county subdivision (township) and place (municipality)
    const params = new URLSearchParams({
      street: street,
      city: city || "",
      state: state || "IL",
      zip: zip || "",
      benchmark: "Public_AR_Current",
      vintage: "Current_Current",
      layers: "all",
      format: "json",
    });

    const geocodeUrl = `https://geocoding.geo.census.gov/geocoder/geographies/address?${params}`;
    const response = await fetchMod(geocodeUrl, { timeout: 15_000 });

    if (!response.ok) {
      return res.status(502).json({ error: "Census geocoder request failed" });
    }

    const data = await response.json();
    const matches = data.result?.addressMatches || [];

    if (matches.length === 0) {
      return res.status(404).json({
        error: "Address not found. Try including city and zip code.",
      });
    }

    const match = matches[0];
    const geographies = match.geographies || {};

    // Extract place name (municipality) and county subdivision (township)
    const places = geographies["Incorporated Places"] || [];
    const cousubs = geographies["County Subdivisions"] || [];
    const counties = geographies["Counties"] || [];

    const placeName = places[0]?.NAME || null;
    const townshipName = cousubs[0]?.NAME || null;
    const countyName = counties[0]?.NAME || null;

    // Find matching villages in our dataset
    const matched = [];

    if (placeName) {
      // Search for the municipality — try exact name first, then fuzzy
      const placeClean = placeName.replace(/ (village|city|town|cdp)$/i, "").trim();
      const found = villages.filter(
        (v) =>
          v.name.toLowerCase() === placeClean.toLowerCase() &&
          (!v.govType || v.govType !== "Township")
      );
      if (found.length > 0) {
        matched.push(...found.map((v) => ({ ...v, matchType: "municipality" })));
      } else {
        // Fuzzy match
        const fuzzy = villages.filter(
          (v) =>
            v.name.toLowerCase().includes(placeClean.toLowerCase()) &&
            (!v.govType || v.govType !== "Township")
        );
        matched.push(...fuzzy.slice(0, 3).map((v) => ({ ...v, matchType: "municipality" })));
      }
    }

    if (townshipName) {
      // Search for the township
      const twpClean = townshipName.replace(/ township$/i, "").trim();
      const found = villages.filter(
        (v) =>
          v.govType === "Township" &&
          v.name.toLowerCase().replace(" (township)", "") === twpClean.toLowerCase() &&
          (!countyName || countyName.toLowerCase().startsWith(v.county.toLowerCase()))
      );
      matched.push(...found.map((v) => ({ ...v, matchType: "township" })));
    }

    res.json({
      address: match.matchedAddress,
      coordinates: match.coordinates,
      place: placeName,
      township: townshipName,
      county: countyName,
      matches: matched.map((v) => ({
        id: v.id,
        name: v.name,
        county: v.county,
        population: v.population,
        govType: v.govType,
        matchType: v.matchType,
        totalRoadSpend: v.roadSpending?.totalRoadSpend,
        spendPerCapita: v.roadSpending?.spendPerCapita,
      })),
    });
  } catch (err) {
    console.error("Address lookup error:", err.message);
    res.status(500).json({ error: "Address lookup failed", message: err.message });
  }
});

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
    preventiveRatio: v.roadSpending.preventiveRatio,
    preventiveSpend: v.roadSpending.preventiveSpend,
    reactiveSpend: v.roadSpending.reactiveSpend,
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

// POST /api/extract — AI-assisted data extraction from a village website/PDF URL
// For villages not in the Comptroller database. Fetches the page content,
// sends it to Claude to extract structured road spending data.
app.post("/api/extract", async (req, res) => {
  const { url, villageName } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Provide a url in request body" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "AI extraction not configured",
      message: "Set ANTHROPIC_API_KEY in .env to enable this feature",
    });
  }

  try {
    // Fetch the page content
    const fetchMod = (await import("node-fetch")).default;
    const response = await fetchMod(url, {
      headers: {
        "User-Agent": "RoadSense/1.0 (civic open-source project)",
      },
      timeout: 30_000,
    });

    if (!response.ok) {
      return res.status(400).json({
        error: `Could not fetch URL: ${response.status} ${response.statusText}`,
      });
    }

    const contentType = response.headers.get("content-type") || "";
    let pageContent;

    if (contentType.includes("pdf")) {
      // For PDFs, convert to base64 and use Claude's document reading
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });

      const extractionResponse = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 },
              },
              {
                type: "text",
                text: buildExtractionPrompt(villageName),
              },
            ],
          },
        ],
      });

      const extracted = parseExtractionResponse(extractionResponse.content[0].text);
      return res.json({ extracted, sourceUrl: url, rawAnalysis: extractionResponse.content[0].text });
    }

    // For HTML pages, extract text content
    const html = await response.text();
    // Strip HTML tags to get readable text (basic approach)
    pageContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Truncate to avoid token limits (keep first ~15k chars)
    if (pageContent.length > 15000) {
      pageContent = pageContent.slice(0, 15000) + "\n[...truncated]";
    }

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const extractionResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${buildExtractionPrompt(villageName)}\n\nPAGE CONTENT FROM ${url}:\n\n${pageContent}`,
        },
      ],
    });

    const extracted = parseExtractionResponse(extractionResponse.content[0].text);
    res.json({ extracted, sourceUrl: url, rawAnalysis: extractionResponse.content[0].text });
  } catch (err) {
    console.error("Extraction error:", err.message);
    res.status(500).json({ error: "Extraction failed", message: err.message });
  }
});

function buildExtractionPrompt(villageName) {
  return `You are extracting municipal road spending data from a government document or website for a civic transparency tool called RoadSense.

${villageName ? `The user is looking for data about: ${villageName}` : "Extract data for whatever municipality this document covers."}

From this content, extract as much of the following as you can find. If a field is not available, use null.

Return ONLY a JSON object with this exact structure (no markdown, no code fences, just the JSON):

{
  "name": "Village/City Name",
  "county": "County Name",
  "state": "IL",
  "population": 12345,
  "fiscalYear": 2023,
  "totalRoadSpend": 1000000,
  "totalMunicipalSpend": 5000000,
  "centerlineMiles": 50,
  "roadConditionScore": 65,
  "referendumRevenue": null,
  "vendors": [
    {"name": "Company Name", "amount": 50000, "category": "paving"}
  ],
  "fundBreakdown": [
    {"name": "Motor Fuel Tax", "amount": 200000},
    {"name": "Road & Bridge", "amount": 800000}
  ],
  "notes": "Any relevant context about the data quality or what was found"
}

IMPORTANT RULES:
- All dollar amounts should be numbers, not strings (no $ or commas)
- Population should be a number
- Only include vendors if specific road/infrastructure vendors are listed
- The "notes" field should mention what data was found vs what was missing
- If the document covers multiple years, prefer the most recent fiscal year
- Road spending includes: road maintenance, paving, engineering, salt/materials, equipment, motor fuel tax, road & bridge funds
- Do NOT include: water/sewer (unless combined with road), parks, police, fire, general admin`;
}

function parseExtractionResponse(text) {
  // Try to extract JSON from the response
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Try to find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through
      }
    }
  }
  // Return raw text if we can't parse
  return { error: "Could not parse structured data", rawText: text };
}

// POST /api/extract/upload — AI extraction from an uploaded PDF file
// Accepts a PDF file (max 10MB) and an optional villageName field.
app.post("/api/extract/upload", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "AI extraction not configured",
      message: "Set ANTHROPIC_API_KEY in .env to enable this feature",
    });
  }

  const villageName = req.body.villageName || "";
  const base64 = req.file.buffer.toString("base64");

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });

    const extractionResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            {
              type: "text",
              text: buildExtractionPrompt(villageName),
            },
          ],
        },
      ],
    });

    const extracted = parseExtractionResponse(extractionResponse.content[0].text);
    res.json({
      extracted,
      sourceUrl: `upload://${req.file.originalname}`,
      rawAnalysis: extractionResponse.content[0].text,
    });
  } catch (err) {
    console.error("PDF extraction error:", err.message);
    res.status(500).json({ error: "PDF extraction failed", message: err.message });
  }
});

// POST /api/extract/save — Save extracted data to the dataset (admin review step)
app.post("/api/extract/save", (req, res) => {
  const { extracted, sourceUrl } = req.body;
  if (!extracted || !extracted.name) {
    return res.status(400).json({ error: "Provide extracted data with at least a name" });
  }

  // Build a village object from the extracted data
  const slugify = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const id = slugify(extracted.name);

  // Check if this village already exists — if so, replace it with the new data
  const existingIndex = villages.findIndex((v) => v.id === id);
  const isUpdate = existingIndex !== -1;

  const village = {
    id,
    name: extracted.name,
    county: extracted.county || "Unknown",
    state: extracted.state || "IL",
    fips: null,
    population: extracted.population || null,
    fiscalYear: extracted.fiscalYear || null,
    roadSpending: {
      totalRoadSpend: extracted.totalRoadSpend || 0,
      spendPerCapita:
        extracted.population && extracted.totalRoadSpend
          ? Math.round(extracted.totalRoadSpend / extracted.population)
          : null,
      centerlineMiles: extracted.centerlineMiles || null,
      laneMiles: extracted.centerlineMiles ? extracted.centerlineMiles * 2 : null,
      spendPerLaneMile:
        extracted.centerlineMiles && extracted.totalRoadSpend
          ? Math.round(extracted.totalRoadSpend / (extracted.centerlineMiles * 2))
          : null,
      roadBudgetPercent:
        extracted.totalMunicipalSpend && extracted.totalRoadSpend
          ? parseFloat(
              ((extracted.totalRoadSpend / extracted.totalMunicipalSpend) * 100).toFixed(1)
            )
          : null,
      totalMunicipalSpend: extracted.totalMunicipalSpend || null,
      preventiveSpend: null,
      reactiveSpend: null,
      preventiveRatio: null,
      funds: extracted.fundBreakdown || [],
    },
    roadConditionScore: extracted.roadConditionScore || null,
    acceptabilityRate: null,
    referendumRevenue: extracted.referendumRevenue || null,
    vendors: extracted.vendors || [],
    metadata: {
      source: `AI-extracted from ${sourceUrl}`,
      fetchedAt: new Date().toISOString(),
      fiscalYearEnd: null,
      notes: extracted.notes || "Extracted via RoadSense AI extraction feature. Data should be verified.",
    },
  };

  // Add or replace in-memory dataset
  if (isUpdate) {
    villages[existingIndex] = village;
  } else {
    villages.push(village);
  }

  // Also save to disk so it persists across restarts
  const filePath = path.join(DATA_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(village, null, 2));

  // Update the combined file
  const allPath = path.join(DATA_DIR, "all-villages.json");
  fs.writeFileSync(allPath, JSON.stringify(villages, null, 2));

  // Update the index
  const indexPath = path.join(DATA_DIR, "index.json");
  const index = villages.map((v) => ({
    id: v.id,
    name: v.name,
    county: v.county,
    population: v.population,
    fiscalYear: v.fiscalYear,
    spendPerCapita: v.roadSpending.spendPerCapita,
    totalRoadSpend: v.roadSpending.totalRoadSpend,
  }));
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  res.json({
    message: isUpdate
      ? `Updated ${village.name} with new extracted data`
      : `Added ${village.name} to dataset`,
    village,
    updated: isUpdate,
  });
});

// ---------------------------------------------------------------------------
// Community Submissions — crowdsourced data from residents
// Submissions go into a review queue. Admins approve them to merge into
// the live dataset.
// ---------------------------------------------------------------------------

const SUBMISSIONS_DIR = path.join(__dirname, "../data/submissions");
if (!fs.existsSync(SUBMISSIONS_DIR)) {
  fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
}

// POST /api/submit — submit village data (road condition score, spend, etc.)
app.post("/api/submit", (req, res) => {
  const { villageName, submitterName, submitterEmail, data, sourceUrl, sourceDescription } = req.body;

  if (!villageName || !data) {
    return res.status(400).json({
      error: "Provide villageName and data in request body",
    });
  }

  // Validate that at least one useful field was submitted
  const validFields = [
    "roadConditionScore",
    "totalRoadSpend",
    "population",
    "centerlineMiles",
    "referendumRevenue",
    "vendors",
  ];
  const hasUsefulData = validFields.some((f) => data[f] != null);
  if (!hasUsefulData) {
    return res.status(400).json({
      error: "Submit at least one data field: " + validFields.join(", "),
    });
  }

  // Validate road condition score range
  if (data.roadConditionScore != null) {
    const score = Number(data.roadConditionScore);
    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({ error: "roadConditionScore must be 0-100" });
    }
    data.roadConditionScore = score;
  }

  // Build submission record
  const submission = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    villageName: villageName.trim(),
    submitter: {
      name: submitterName?.trim() || "Anonymous",
      email: submitterEmail?.trim() || null,
    },
    data,
    source: {
      url: sourceUrl?.trim() || null,
      description: sourceDescription?.trim() || null,
    },
    status: "pending", // pending | approved | rejected
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewNotes: null,
  };

  // Save to disk
  const filePath = path.join(SUBMISSIONS_DIR, `${submission.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(submission, null, 2));

  console.log(`New submission: ${submission.id} for ${villageName}`);

  res.json({
    message: "Thank you! Your submission is pending review.",
    submissionId: submission.id,
  });
});

// GET /api/submissions — list all submissions (admin only)
app.get("/api/submissions", (req, res) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey) {
    const providedKey = req.headers["x-api-key"] || req.query.key;
    if (providedKey !== adminKey) {
      return res.status(403).json({ error: "Invalid API key" });
    }
  }

  const files = fs.existsSync(SUBMISSIONS_DIR)
    ? fs.readdirSync(SUBMISSIONS_DIR).filter((f) => f.endsWith(".json"))
    : [];

  const submissions = files.map((f) =>
    JSON.parse(fs.readFileSync(path.join(SUBMISSIONS_DIR, f), "utf-8"))
  );

  // Sort newest first
  submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const status = req.query.status;
  const filtered = status
    ? submissions.filter((s) => s.status === status)
    : submissions;

  res.json({ submissions: filtered, total: submissions.length });
});

// POST /api/submissions/:id/approve — approve a submission and merge into dataset
app.post("/api/submissions/:id/approve", (req, res) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey) {
    const providedKey = req.headers["x-api-key"] || req.query.key;
    if (providedKey !== adminKey) {
      return res.status(403).json({ error: "Invalid API key" });
    }
  }

  const filePath = path.join(SUBMISSIONS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Submission not found" });
  }

  const submission = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (submission.status !== "pending") {
    return res.status(400).json({ error: `Submission already ${submission.status}` });
  }

  // Find the matching village
  const slugify = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const village = villages.find(
    (v) =>
      v.id === slugify(submission.villageName) ||
      v.name.toLowerCase() === submission.villageName.toLowerCase()
  );

  if (!village) {
    return res.status(404).json({
      error: `Village "${submission.villageName}" not found in dataset`,
    });
  }

  // Merge submitted data into the village
  const d = submission.data;
  if (d.roadConditionScore != null) village.roadConditionScore = d.roadConditionScore;
  if (d.totalRoadSpend != null) village.roadSpending.totalRoadSpend = d.totalRoadSpend;
  if (d.population != null) village.population = d.population;
  if (d.centerlineMiles != null) {
    village.roadSpending.centerlineMiles = d.centerlineMiles;
    village.roadSpending.laneMiles = d.centerlineMiles * 2;
  }
  if (d.referendumRevenue != null) village.referendumRevenue = d.referendumRevenue;
  if (d.vendors?.length > 0) {
    village.vendors = [...(village.vendors || []), ...d.vendors];
  }

  // Recalculate derived metrics
  const rs = village.roadSpending;
  if (village.population && rs.totalRoadSpend) {
    rs.spendPerCapita = Math.round(rs.totalRoadSpend / village.population);
  }
  if (rs.laneMiles && rs.totalRoadSpend) {
    rs.spendPerLaneMile = Math.round(rs.totalRoadSpend / rs.laneMiles);
  }

  // Add source note
  const sourceNote = submission.source.url
    ? `Community submission (${submission.source.description || submission.source.url})`
    : `Community submission by ${submission.submitter.name}`;
  village.metadata.notes = village.metadata.notes
    ? `${village.metadata.notes} | ${sourceNote}`
    : sourceNote;

  // Save updated village to disk
  const villageFilePath = path.join(DATA_DIR, `${village.id}.json`);
  fs.writeFileSync(villageFilePath, JSON.stringify(village, null, 2));

  // Update combined file
  const allPath = path.join(DATA_DIR, "all-villages.json");
  fs.writeFileSync(allPath, JSON.stringify(villages, null, 2));

  // Mark submission as approved
  submission.status = "approved";
  submission.reviewedAt = new Date().toISOString();
  submission.reviewNotes = req.body.notes || null;
  fs.writeFileSync(filePath, JSON.stringify(submission, null, 2));

  res.json({ message: `Approved and merged into ${village.name}`, village });
});

// POST /api/submissions/:id/reject — reject a submission
app.post("/api/submissions/:id/reject", (req, res) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey) {
    const providedKey = req.headers["x-api-key"] || req.query.key;
    if (providedKey !== adminKey) {
      return res.status(403).json({ error: "Invalid API key" });
    }
  }

  const filePath = path.join(SUBMISSIONS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Submission not found" });
  }

  const submission = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  submission.status = "rejected";
  submission.reviewedAt = new Date().toISOString();
  submission.reviewNotes = req.body.notes || null;
  fs.writeFileSync(filePath, JSON.stringify(submission, null, 2));

  res.json({ message: "Submission rejected" });
});

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
