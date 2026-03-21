import { useState, useEffect } from "react";
import { searchVillages, getVillage } from "../api";
import VillageCard from "../components/VillageCard";

export default function SearchView({ onSelectVillage }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search as user types
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await searchVillages(query);
        setResults(data.results || []);
      } catch {
        // Silently fail on search — user is still typing
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  async function handleSelect(name) {
    setLoading(true);
    setError(null);
    try {
      const data = await getVillage(name);
      setSelected(data);
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
          How does your village spend on roads?
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Search for any Illinois village to see their road infrastructure
          spending, compare to peers, and get an AI-powered analysis.
        </p>
      </div>

      {/* Search input */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a village name... (e.g., Hawthorn Woods)"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-lg"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                setSelected(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {results.length > 0 && !selected && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  handleSelect(r.name);
                  setQuery(r.name);
                  setResults([]);
                }}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
              >
                <span className="font-medium text-gray-900">{r.name}</span>
                <span className="text-gray-500 ml-2">
                  {r.county} County
                  {r.population && ` | Pop. ${r.population.toLocaleString()}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center text-gray-500 py-12">
          Loading village data...
        </div>
      )}

      {error && (
        <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Village snapshot */}
      {selected && !loading && (
        <VillageCard
          data={selected}
          onBenchmark={() => onSelectVillage(selected.village)}
        />
      )}
    </div>
  );
}
