// Basic API tests for RoadSense backend
// Run with: node --test tests/

import { describe, it } from "node:test";
import assert from "node:assert";

// Test the data files exist and are valid JSON
describe("Data files", () => {
  it("all-villages.json is valid and has entries", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const dataPath = path.join(__dirname, "../../data/output/all-villages.json");

    const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    assert.ok(Array.isArray(data), "Should be an array");
    assert.ok(data.length > 0, "Should have at least one village");
  });

  it("each village has required fields", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const dataPath = path.join(__dirname, "../../data/output/all-villages.json");

    const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

    for (const village of data) {
      assert.ok(village.id, `Village missing id`);
      assert.ok(village.name, `Village ${village.id} missing name`);
      assert.ok(village.state === "IL", `Village ${village.id} should be IL`);
      assert.ok(village.roadSpending, `Village ${village.id} missing roadSpending`);
      assert.ok(
        typeof village.roadSpending.totalRoadSpend === "number",
        `Village ${village.id} missing totalRoadSpend`
      );
    }
  });

  it("Hawthorn Woods seed data is correct", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const dataPath = path.join(__dirname, "../../data/output/hawthorn-woods.json");

    const hw = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    assert.strictEqual(hw.name, "Hawthorn Woods");
    assert.strictEqual(hw.population, 9062);
    assert.strictEqual(hw.roadSpending.totalRoadSpend, 1162000);
    assert.strictEqual(hw.roadSpending.spendPerCapita, 128);
    assert.strictEqual(hw.roadConditionScore, 48);
    assert.strictEqual(hw.vendors.length, 4);
  });
});
