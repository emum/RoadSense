import { useState, useEffect, useRef } from "react";
import { getVillage, searchVillages, compareVillages } from "../api";
import SpendChart from "../components/SpendChart";
import ExportButton from "../components/ExportButton";

export default function BenchmarkView({ selectedVillage }) {
  const [villageName, setVillageName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [villageData, setVillageData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // If a village was passed from SearchView, load it
  useEffect(() => {
    if (selectedVillage) {
      loadVillage(selectedVillage.name);
      setVillageName(selectedVillage.name);
    }
  }, [selectedVillage]);

  // Search as user types
  useEffect(() => {
    if (villageName.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await searchVillages(villageName);
        setSearchResults(data.results || []);
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [villageName]);

  async function loadVillage(name) {
    setLoading(true);
    setError(null);
    setSearchResults([]);
    try {
      const data = await getVillage(name);
      setVillageData(data);

      // Auto-compare with peers
      if (data.peers?.length > 0) {
        const peerNames = data.peers.map((p) => p.name);
        const comparison = await compareVillages([name, ...peerNames]);
        setComparisonData(comparison);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Benchmark Your Village
        </h2>
        <p className="text-gray-600">
          Compare road spending to peer villages in the same county and size
          range.
        </p>
      </div>

      {/* Search / select village */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <input
            type="text"
            value={villageName}
            onChange={(e) => setVillageName(e.target.value)}
            placeholder="Select a village to benchmark..."
            className="w-full px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-lg"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setVillageName(r.name);
                  loadVillage(r.name);
                }}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0"
              >
                <span className="font-medium text-gray-900">{r.name}</span>
                <span className="text-gray-500 ml-2">{r.county} County</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center text-gray-500 py-12">
          Loading benchmark data...
        </div>
      )}

      {error && (
        <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Comparison results */}
      {comparisonData && villageData && (
        <div>
          {/* Charts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Spend Per Capita Comparison
              </h3>
              <ExportButton comparisonData={comparisonData} villageName={villageData.village.name} />
            </div>
            <SpendChart
              comparison={comparisonData.comparison}
              benchmarks={comparisonData.benchmarks}
              metric="spendPerCapita"
              label="Spend Per Capita ($)"
              highlightId={villageData.village.id}
            />
          </div>

          {/* Spend per lane mile chart (if data available) */}
          {comparisonData.comparison.some((c) => c.spendPerLaneMile) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Spend Per Lane-Mile Comparison
              </h3>
              <SpendChart
                comparison={comparisonData.comparison}
                benchmarks={comparisonData.benchmarks}
                metric="spendPerLaneMile"
                label="Spend Per Lane-Mile ($)"
                highlightId={villageData.village.id}
              />
            </div>
          )}

          {/* Road condition chart (if data available) */}
          {comparisonData.comparison.some((c) => c.roadConditionScore) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Road Condition Score
              </h3>
              <SpendChart
                comparison={comparisonData.comparison}
                benchmarks={comparisonData.benchmarks}
                metric="roadConditionScore"
                label="Condition Score (0-100)"
                highlightId={villageData.village.id}
              />
            </div>
          )}

          {/* Comparison table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Detailed Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">
                      Village
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Population
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Total Spend
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Per Capita
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Per Lane-Mile
                    </th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">
                      Condition
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.comparison.map((c) => (
                    <tr
                      key={c.id}
                      className={`border-b border-gray-100 ${c.id === villageData.village.id ? "bg-blue-50 font-semibold" : ""}`}
                    >
                      <td className="py-3 px-2 text-gray-900">{c.name}</td>
                      <td className="py-3 px-2 text-right text-gray-700">
                        {c.population?.toLocaleString() || "—"}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-700">
                        {c.totalRoadSpend
                          ? `$${c.totalRoadSpend.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-700">
                        {c.spendPerCapita ? `$${c.spendPerCapita}` : "—"}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-700">
                        {c.spendPerLaneMile
                          ? `$${c.spendPerLaneMile.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-700">
                        {c.roadConditionScore
                          ? `${c.roadConditionScore}/100`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Benchmark reference row */}
            <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap gap-x-6 gap-y-1">
              <span>
                US avg: ${comparisonData.benchmarks.US_AVG_SPEND_PER_CAPITA}
                /capita
              </span>
              <span>
                IL avg: $
                {comparisonData.benchmarks.IL_AVG_SPEND_PER_LANE_MILE?.toLocaleString()}
                /lane-mile
              </span>
              <span>
                IL acceptability:{" "}
                {comparisonData.benchmarks.IL_ROAD_ACCEPTABILITY_RATE}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
