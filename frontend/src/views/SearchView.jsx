import { useState, useEffect } from "react";
import { searchVillages, getVillage, lookupAddress } from "../api";
import VillageCard from "../components/VillageCard";

export default function SearchView({ onSelectVillage }) {
  const [mode, setMode] = useState("name"); // "name" or "address"
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Address fields
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [addressResult, setAddressResult] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);

  // Search as user types (name mode only)
  useEffect(() => {
    if (mode !== "name" || query.length < 2) {
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
  }, [query, mode]);

  async function handleSelect(name) {
    setLoading(true);
    setError(null);
    try {
      const data = await getVillage(name);
      setSelected(data);
      setAddressResult(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddressLookup(e) {
    e.preventDefault();
    if (!street.trim()) return;

    setAddressLoading(true);
    setError(null);
    setSelected(null);
    setAddressResult(null);

    try {
      const data = await lookupAddress(street.trim(), city.trim(), zip.trim());
      setAddressResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddressLoading(false);
    }
  }

  function clearAll() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setError(null);
    setStreet("");
    setCity("");
    setZip("");
    setAddressResult(null);
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          How does your village spend on roads?
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Search by village name or enter your street address to find which
          municipality and township handle your roads.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="max-w-xl mx-auto mb-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode("name"); clearAll(); }}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "name"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Search by Name
          </button>
          <button
            type="button"
            onClick={() => { setMode("address"); clearAll(); }}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "address"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Look Up by Address
          </button>
        </div>
      </div>

      {/* Name search */}
      {mode === "name" && (
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
                onClick={clearAll}
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
      )}

      {/* Address lookup */}
      {mode === "address" && (
        <form onSubmit={handleAddressLookup} className="max-w-xl mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-3">
            <div>
              <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                id="street"
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="123 Main St"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Hawthorn Woods"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
              <div>
                <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  id="zip"
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="60047"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={addressLoading || !street.trim()}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {addressLoading ? "Looking up..." : "Find My Road Budget"}
            </button>
          </div>
        </form>
      )}

      {/* Address loading */}
      {addressLoading && (
        <div className="max-w-xl mx-auto text-center py-8">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <svg
              className="animate-spin h-6 w-6 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Looking up your address with the U.S. Census Bureau...</span>
          </div>
        </div>
      )}

      {/* Address results */}
      {addressResult && !selected && (
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
            <div className="text-sm text-gray-500 mb-1">Matched address</div>
            <div className="font-medium text-gray-900">{addressResult.address}</div>
            <div className="text-sm text-gray-500 mt-1">
              {addressResult.county}
              {addressResult.place && ` | ${addressResult.place}`}
              {addressResult.township && ` | ${addressResult.township}`}
            </div>
          </div>

          {addressResult.matches?.length > 0 ? (
            <div className="space-y-4">
              {/* Combined summary */}
              {(() => {
                const muni = addressResult.matches.find((m) => m.matchType === "municipality");
                const twp = addressResult.matches.find((m) => m.matchType === "township");
                const combinedSpend = (muni?.totalRoadSpend || 0) + (twp?.totalRoadSpend || 0);
                const combinedPerCapita = (muni?.spendPerCapita || 0) + (twp?.spendPerCapita || 0);

                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <h3 className="font-semibold text-blue-900 mb-1">
                      Your combined road investment
                    </h3>
                    <p className="text-sm text-blue-700 mb-3">
                      As an Illinois resident, your property taxes fund road work through
                      both your <strong>municipality</strong> (village/city) and your{" "}
                      <strong>township</strong>. Here's what both spend on your behalf.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl p-3">
                        <div className="text-xs text-gray-500">Combined Road Spend</div>
                        <div className="text-xl font-bold text-gray-900">
                          ${combinedSpend.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-3">
                        <div className="text-xs text-gray-500">Combined Per Capita</div>
                        <div className="text-xl font-bold text-gray-900">
                          ${combinedPerCapita}/capita
                        </div>
                        <div className="text-xs text-gray-400">US avg: $622</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Individual entities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {addressResult.matches.map((m) => {
                  const isMuni = m.matchType === "municipality";
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelect(m.name)}
                      className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isMuni
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isMuni ? "Municipality" : "Township"}
                        </span>
                      </div>
                      <div className="font-semibold text-gray-900 mb-1">{m.name}</div>
                      <p className="text-xs text-gray-500 mb-3">
                        {isMuni
                          ? "Maintains roads within village/city limits. Funded by your municipal property tax levy."
                          : "Maintains roads in unincorporated areas and shared infrastructure. Funded by your township road & bridge tax levy."}
                      </p>
                      <div className="flex items-baseline gap-3">
                        {m.spendPerCapita != null && (
                          <div>
                            <span className="text-lg font-bold text-gray-900">
                              ${m.spendPerCapita}
                            </span>
                            <span className="text-xs text-gray-500">/capita</span>
                          </div>
                        )}
                        {m.totalRoadSpend != null && (
                          <div className="text-xs text-gray-500">
                            ${m.totalRoadSpend.toLocaleString()} total
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-blue-600 mt-2 font-medium">
                        View full details
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">
                  How Illinois road taxes work
                </p>
                <p>
                  Your property tax bill includes levies from both your municipality
                  and township. The <strong>municipality</strong> (village or city) is
                  typically responsible for roads within its incorporated boundaries.
                  The <strong>township</strong> road district maintains roads in
                  unincorporated areas and may contribute to shared projects. Both
                  entities may also receive Motor Fuel Tax (MFT) revenue from the state.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              No matching road spending data found for this address. The municipality
              may not have filed with the IL Comptroller, or may be listed under a
              different name.
            </div>
          )}
        </div>
      )}

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
