import { useState } from "react";
import { submitVillageData, searchVillages } from "../api";

export default function SubmitView() {
  const [villageName, setVillageName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [matched, setMatched] = useState(false);

  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceDescription, setSourceDescription] = useState("");

  // Data fields
  const [roadConditionScore, setRoadConditionScore] = useState("");
  const [totalRoadSpend, setTotalRoadSpend] = useState("");
  const [population, setPopulation] = useState("");
  const [centerlineMiles, setCenterlineMiles] = useState("");
  const [referendumRevenue, setReferendumRevenue] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Search for village as user types
  async function handleVillageSearch(value) {
    setVillageName(value);
    setMatched(false);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await searchVillages(value);
      setSearchResults(data.results?.slice(0, 5) || []);
    } catch {
      // ignore
    }
  }

  function selectVillage(name) {
    setVillageName(name);
    setSearchResults([]);
    setMatched(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!villageName.trim()) return;

    setSubmitting(true);
    setError(null);

    // Build data object with only non-empty fields
    const data = {};
    if (roadConditionScore) data.roadConditionScore = Number(roadConditionScore);
    if (totalRoadSpend) data.totalRoadSpend = Number(totalRoadSpend.replace(/[,$]/g, ""));
    if (population) data.population = Number(population.replace(/,/g, ""));
    if (centerlineMiles) data.centerlineMiles = Number(centerlineMiles);
    if (referendumRevenue) data.referendumRevenue = Number(referendumRevenue.replace(/[,$]/g, ""));

    try {
      const res = await submitVillageData({
        villageName: villageName.trim(),
        submitterName: submitterName.trim() || undefined,
        submitterEmail: submitterEmail.trim() || undefined,
        data,
        sourceUrl: sourceUrl.trim() || undefined,
        sourceDescription: sourceDescription.trim() || undefined,
      });
      setResult(res);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const hasData = roadConditionScore || totalRoadSpend || population || centerlineMiles || referendumRevenue;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Submit Village Data</h2>
        <p className="text-gray-500 mt-1">
          Know your village's road condition score, spending, or road miles?
          Submit it here. Your data will be reviewed before appearing in
          RoadSense.
        </p>
      </div>

      {submitted ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">&#10003;</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Submission received!
          </h3>
          <p className="text-gray-500 mb-4">
            {result?.message || "Your data is pending review."}
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Submission ID: {result?.submissionId}
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setVillageName("");
              setRoadConditionScore("");
              setTotalRoadSpend("");
              setPopulation("");
              setCenterlineMiles("");
              setReferendumRevenue("");
              setSourceUrl("");
              setSourceDescription("");
              setResult(null);
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Submit another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Village selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Which village?</h3>
            <div className="relative">
              <input
                type="text"
                value={villageName}
                onChange={(e) => handleVillageSearch(e.target.value)}
                placeholder="Start typing a village name..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                required
              />
              {matched && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  Matched
                </span>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => selectVillage(r.name)}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0 text-sm"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-gray-400 ml-2">{r.county} County</span>
                  </button>
                ))}
              </div>
            )}
            {!matched && villageName.length > 2 && (
              <p className="text-xs text-amber-600 mt-1">
                If your village doesn't appear, you can still submit — we'll
                match it during review.
              </p>
            )}
          </div>

          {/* Data fields */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-1">
              What do you know?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Fill in whatever you have. Even one field helps.
            </p>

            <div className="space-y-4">
              {/* Road condition score — the most wanted field */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <label className="block text-sm font-medium text-blue-900 mb-1">
                  Road Condition Score (PCI)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={roadConditionScore}
                    onChange={(e) => setRoadConditionScore(e.target.value)}
                    placeholder="0-100"
                    className="w-32 px-4 py-2 rounded-lg border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                  <span className="text-sm text-blue-700">/ 100</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  From a pavement study, board meeting, or capital improvement plan.
                  This is the #1 data point we're looking for.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Road Spend ($)
                  </label>
                  <input
                    type="text"
                    value={totalRoadSpend}
                    onChange={(e) => setTotalRoadSpend(e.target.value)}
                    placeholder="1,200,000"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Population
                  </label>
                  <input
                    type="text"
                    value={population}
                    onChange={(e) => setPopulation(e.target.value)}
                    placeholder="9,000"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Centerline Road Miles
                  </label>
                  <input
                    type="number"
                    value={centerlineMiles}
                    onChange={(e) => setCenterlineMiles(e.target.value)}
                    placeholder="60"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referendum Revenue ($/yr)
                  </label>
                  <input
                    type="text"
                    value={referendumRevenue}
                    onChange={(e) => setReferendumRevenue(e.target.value)}
                    placeholder="900,000"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Source */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Source</h3>
            <p className="text-sm text-gray-500 mb-4">
              Where did you find this data? A source link helps us verify faster.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source URL (optional)
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://village-website.org/board-packet-2024.pdf"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={sourceDescription}
                  onChange={(e) => setSourceDescription(e.target.value)}
                  placeholder="e.g. 2024 Board Meeting Packet, page 12"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submitter info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-1">About you</h3>
            <p className="text-sm text-gray-500 mb-4">
              Optional. Helps us follow up if we have questions.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !villageName.trim() || !hasData}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-lg"
          >
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            All submissions are reviewed before being added to the dataset.
            We verify data against public sources where possible.
          </p>
        </form>
      )}
    </div>
  );
}
