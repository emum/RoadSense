import { useState } from "react";
import { analyzeVillage } from "../api";

function Stat({ label, value, sublabel, highlight }) {
  return (
    <div
      className={`p-4 rounded-xl ${highlight ? "bg-blue-50 border border-blue-200" : "bg-gray-50"}`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sublabel && <div className="text-xs text-gray-400 mt-1">{sublabel}</div>}
    </div>
  );
}

export default function VillageCard({ data, onBenchmark }) {
  const { village, benchmarks, rankings } = data;
  const rs = village.roadSpending;

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeVillage(village.name);
      setAnalysis(result.analysis);
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{village.name}</h3>
            <p className="text-gray-500">
              {village.county} County, IL | FY {village.fiscalYear}
            </p>
          </div>
          <button
            onClick={onBenchmark}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Compare to Peers
          </button>
        </div>

        {/* Key stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Stat
            label="Total Road Spend"
            value={`$${rs.totalRoadSpend?.toLocaleString() || "N/A"}`}
            sublabel={`FY ${village.fiscalYear}`}
          />
          <Stat
            label="Spend Per Capita"
            value={`$${rs.spendPerCapita || "N/A"}`}
            sublabel={`US avg: $${benchmarks?.US_AVG_SPEND_PER_CAPITA}`}
            highlight={
              rs.spendPerCapita &&
              rs.spendPerCapita < benchmarks?.US_AVG_SPEND_PER_CAPITA * 0.5
            }
          />
          <Stat
            label="Population"
            value={village.population?.toLocaleString() || "N/A"}
          />
          <Stat
            label="Road Condition"
            value={
              village.roadConditionScore
                ? `${village.roadConditionScore}/100`
                : "N/A"
            }
            sublabel={
              village.roadConditionScore
                ? village.roadConditionScore < 50
                  ? "Below acceptable"
                  : "Acceptable"
                : undefined
            }
            highlight={
              village.roadConditionScore && village.roadConditionScore < 50
            }
          />
        </div>

        {/* Additional stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {rs.centerlineMiles && (
            <Stat
              label="Centerline Miles"
              value={rs.centerlineMiles}
            />
          )}
          {rs.spendPerLaneMile && (
            <Stat
              label="Spend Per Lane-Mile"
              value={`$${rs.spendPerLaneMile.toLocaleString()}`}
              sublabel={`IL avg: $${benchmarks?.IL_AVG_SPEND_PER_LANE_MILE?.toLocaleString()}`}
            />
          )}
          {rs.roadBudgetPercent && (
            <Stat
              label="% of Budget on Roads"
              value={`${rs.roadBudgetPercent}%`}
            />
          )}
        </div>

        {/* Referendum note */}
        {village.referendumRevenue && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            Road referendum revenue: $
            {village.referendumRevenue.toLocaleString()}/yr
          </div>
        )}
      </div>

      {/* Vendors */}
      {village.vendors?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h4 className="font-semibold text-gray-900 mb-4">Top Vendors</h4>
          <div className="space-y-3">
            {village.vendors.map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <span className="font-medium text-gray-900">{v.name}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {v.category}
                  </span>
                </div>
                <span className="font-semibold text-gray-900">
                  ${v.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peer rankings */}
      {rankings && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h4 className="font-semibold text-gray-900 mb-4">
            Peer Group Rankings
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {rankings.spendPerCapita?.total > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-500">
                  Spend Per Capita Rank
                </div>
                <div className="text-xl font-bold text-gray-900">
                  #{rankings.spendPerCapita.rank} of{" "}
                  {rankings.spendPerCapita.total}
                </div>
              </div>
            )}
            {rankings.spendPerLaneMile?.total > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-500">
                  Spend Per Lane-Mile Rank
                </div>
                <div className="text-xl font-bold text-gray-900">
                  #{rankings.spendPerLaneMile.rank} of{" "}
                  {rankings.spendPerLaneMile.total}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">AI Analysis</h4>
          {!analysis && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {analyzing ? "Analyzing..." : "Get AI Verdict"}
            </button>
          )}
        </div>

        {analyzing && (
          <div className="flex items-center gap-3 py-6 justify-center text-gray-500">
            <svg
              className="animate-spin h-5 w-5 text-purple-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Analyzing spending data against peers and benchmarks...</span>
          </div>
        )}

        {analysisError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {analysisError}
          </div>
        )}

        {analysis && (
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {analysis}
          </div>
        )}

        {!analysis && !analyzing && !analysisError && (
          <p className="text-sm text-gray-500">
            Get a plain-English verdict on whether this village is
            under-investing, over-investing, or appropriately investing in roads
            compared to peers and national benchmarks.
          </p>
        )}
      </div>

      {/* Data source note */}
      {village.metadata && (
        <div className="text-xs text-gray-400 text-center mt-4">
          Source: {village.metadata.source}
          {village.metadata.notes && ` | ${village.metadata.notes}`}
        </div>
      )}
    </div>
  );
}
