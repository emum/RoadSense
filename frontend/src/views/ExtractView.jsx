import { useState } from "react";
import { extractFromUrl, extractFromPdf, saveExtracted } from "../api";

function Field({ label, value, suffix }) {
  if (value == null) return null;
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold text-gray-900">
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix && <span className="text-sm font-normal text-gray-500"> {suffix}</span>}
      </div>
    </div>
  );
}

export default function ExtractView() {
  const [mode, setMode] = useState("url"); // "url" or "upload"
  const [url, setUrl] = useState("");
  const [villageName, setVillageName] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  async function handleExtract(e) {
    e.preventDefault();

    const hasInput = mode === "url" ? url.trim() : pdfFile;
    if (!hasInput) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    setSaveError(null);

    try {
      let data;
      if (mode === "upload" && pdfFile) {
        data = await extractFromPdf(pdfFile, villageName.trim());
      } else {
        data = await extractFromUrl(url.trim(), villageName.trim());
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const [saveMessage, setSaveMessage] = useState("");

  async function handleSave() {
    if (!result?.extracted) return;

    setSaving(true);
    setSaveError(null);

    try {
      const res = await saveExtracted(result.extracted, result.sourceUrl);
      setSaved(true);
      setSaveMessage(res.message || "Saved successfully.");
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const ext = result?.extracted;
  const hasData = ext && !ext.error;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Extract Village Data</h2>
        <p className="text-gray-500 mt-1">
          For villages not in the Comptroller database. Paste a link to a village's
          budget, treasurer's report, or financial page — AI will extract the road
          spending data.
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleExtract} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "url"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Paste URL
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "upload"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Upload PDF
            </button>
          </div>

          {mode === "url" ? (
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                URL to budget document or financial page
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example-village.org/treasurer-report-2023.pdf"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">
                Works with PDF budget documents, treasurer's reports, or HTML financial pages
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="pdf" className="block text-sm font-medium text-gray-700 mb-1">
                Upload a treasurer's report or budget PDF
              </label>
              <div className="relative">
                <input
                  id="pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files[0] || null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {pdfFile && (
                <p className="text-xs text-gray-500 mt-1">
                  {pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                PDF only, 10MB max
              </p>
            </div>
          )}

          <div>
            <label htmlFor="villageName" className="block text-sm font-medium text-gray-700 mb-1">
              Village name (optional — helps the AI focus)
            </label>
            <input
              id="villageName"
              type="text"
              value={villageName}
              onChange={(e) => setVillageName(e.target.value)}
              placeholder="e.g. Byron"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading || (mode === "url" ? !url.trim() : !pdfFile)}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? "Extracting..." : "Extract Road Spending Data"}
          </button>
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex flex-col items-center gap-4 text-gray-500">
            <svg
              className="animate-spin h-8 w-8 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div className="text-center">
              <p className="font-medium text-gray-700">Fetching and analyzing document...</p>
              <p className="text-sm mt-1">
                AI is reading the page and extracting road spending data.
                This may take 15-30 seconds for large documents.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {hasData && (
        <div className="space-y-6">
          {/* Extracted data card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{ext.name || "Unknown"}</h3>
                <p className="text-gray-500">
                  {ext.county && `${ext.county} County, `}{ext.state || "IL"}
                  {ext.fiscalYear && ` | FY ${ext.fiscalYear}`}
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                AI Extracted — Review
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Total Road Spend" value={ext.totalRoadSpend ? `$${ext.totalRoadSpend.toLocaleString()}` : null} />
              <Field
                label="Spend Per Capita"
                value={
                  ext.population && ext.totalRoadSpend
                    ? `$${Math.round(ext.totalRoadSpend / ext.population)}`
                    : null
                }
              />
              <Field label="Population" value={ext.population} />
              <Field label="Total Municipal Spend" value={ext.totalMunicipalSpend ? `$${ext.totalMunicipalSpend.toLocaleString()}` : null} />
              <Field label="Centerline Miles" value={ext.centerlineMiles} />
              <Field label="Road Condition Score" value={ext.roadConditionScore} suffix="/100" />
            </div>

            {/* Fund breakdown */}
            {ext.fundBreakdown?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Fund Breakdown</h4>
                <div className="space-y-2">
                  {ext.fundBreakdown.map((f, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-gray-100 last:border-0 text-sm">
                      <span className="text-gray-700">{f.name}</span>
                      <span className="font-medium text-gray-900">${f.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vendors */}
            {ext.vendors?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Vendors</h4>
                <div className="space-y-2">
                  {ext.vendors.map((v, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0 text-sm">
                      <div>
                        <span className="text-gray-700">{v.name}</span>
                        {v.category && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {v.category}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">${v.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes from AI */}
            {ext.notes && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                <span className="font-medium">AI notes: </span>{ext.notes}
              </div>
            )}
          </div>

          {/* Save / review actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h4 className="font-semibold text-gray-900 mb-2">Add to RoadSense?</h4>
            <p className="text-sm text-gray-500 mb-4">
              Review the extracted data above. If it looks correct, save it to the
              dataset so it appears in search and benchmark comparisons.
            </p>

            {saved ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
                {saveMessage} {ext.name} is now available in Search and Benchmark views.
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-sm"
                >
                  {saving ? "Saving..." : "Save to Dataset"}
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setSaved(false);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  Discard
                </button>
              </div>
            )}

            {saveError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {saveError}
              </div>
            )}
          </div>

          {/* Source */}
          <div className="text-xs text-gray-400 text-center">
            Source: <a href={result.sourceUrl} className="underline" target="_blank" rel="noopener noreferrer">{result.sourceUrl}</a>
          </div>
        </div>
      )}

      {/* Parse error from AI */}
      {ext?.error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
          <h4 className="font-semibold text-amber-800 mb-2">Could not extract structured data</h4>
          <p className="text-sm text-amber-700 mb-3">
            The AI was unable to parse structured road spending data from this URL.
            This can happen with heavily formatted pages, login-gated content, or
            documents that don't contain financial data.
          </p>
          {result?.rawAnalysis && (
            <details className="text-sm text-gray-600">
              <summary className="cursor-pointer text-amber-700 font-medium">View raw AI response</summary>
              <pre className="mt-2 p-3 bg-white rounded-xl overflow-x-auto whitespace-pre-wrap text-xs">
                {result.rawAnalysis}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
