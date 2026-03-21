import { useState } from "react";

export default function ExportButton({ comparisonData, villageName }) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  function exportCSV() {
    const rows = comparisonData.comparison;
    const headers = [
      "Village",
      "County",
      "Population",
      "Fiscal Year",
      "Total Road Spend",
      "Spend Per Capita",
      "Spend Per Lane-Mile",
      "Road Budget %",
      "Condition Score",
    ];

    const csvRows = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${r.name}"`,
          `"${r.county}"`,
          r.population || "",
          r.fiscalYear || "",
          r.totalRoadSpend || "",
          r.spendPerCapita || "",
          r.spendPerLaneMile || "",
          r.roadBudgetPercent || "",
          r.roadConditionScore || "",
        ].join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roadsense-${villageName.toLowerCase().replace(/\s+/g, "-")}-comparison.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  }

  function copyShareLink() {
    const names = comparisonData.comparison.map((c) => c.name).join(",");
    const url = `${window.location.origin}?compare=${encodeURIComponent(names)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setShowMenu(false);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(comparisonData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roadsense-${villageName.toLowerCase().replace(/\s+/g, "-")}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {copied ? "Link Copied!" : "Export"}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
          <button
            onClick={exportCSV}
            className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 border-b border-gray-100"
          >
            Download CSV
          </button>
          <button
            onClick={exportJSON}
            className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 border-b border-gray-100"
          >
            Download JSON
          </button>
          <button
            onClick={copyShareLink}
            className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50"
          >
            Copy Share Link
          </button>
        </div>
      )}
    </div>
  );
}
