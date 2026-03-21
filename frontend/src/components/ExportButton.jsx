import { useState, useRef } from "react";

export default function ExportButton({ comparisonData, villageName, captureRef }) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

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

  async function exportPDF() {
    setGenerating(true);
    setShowMenu(false);

    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      // If a capture ref is provided, screenshot that element
      // Otherwise, build a PDF from the comparison data
      if (captureRef?.current) {
        const canvas = await html2canvas(captureRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#f9fafb",
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const usableWidth = pageWidth - margin * 2;

        // Header
        pdf.setFontSize(18);
        pdf.setTextColor(17, 24, 39);
        pdf.text("RoadSense Benchmark Report", margin, 15);
        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`${villageName} vs Peers | Generated ${new Date().toLocaleDateString()}`, margin, 22);

        // Image of the charts/table
        const imgWidth = usableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // If image is too tall, scale to fit page
        const maxImgHeight = pageHeight - 35;
        const finalHeight = Math.min(imgHeight, maxImgHeight);
        const finalWidth = imgHeight > maxImgHeight
          ? (canvas.width * finalHeight) / canvas.height
          : imgWidth;

        pdf.addImage(imgData, "PNG", margin, 28, finalWidth, finalHeight);

        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(
          "Data: IL Comptroller Local Government Warehouse | roadsense.app",
          margin,
          pageHeight - 5
        );

        pdf.save(`roadsense-${villageName.toLowerCase().replace(/\s+/g, "-")}-report.pdf`);
      } else {
        // Fallback: generate a data-only PDF without screenshot
        const { jsPDF: PDF } = await import("jspdf");
        const pdf = new PDF("p", "mm", "a4");
        const margin = 15;
        let y = 20;

        // Title
        pdf.setFontSize(18);
        pdf.setTextColor(17, 24, 39);
        pdf.text("RoadSense Benchmark Report", margin, y);
        y += 8;

        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`${villageName} vs Peers | Generated ${new Date().toLocaleDateString()}`, margin, y);
        y += 12;

        // Benchmarks
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        const bm = comparisonData.benchmarks;
        pdf.text(`US avg: $${bm.US_AVG_SPEND_PER_CAPITA}/capita | IL avg: $${bm.IL_AVG_SPEND_PER_LANE_MILE?.toLocaleString()}/lane-mile | IL acceptability: ${bm.IL_ROAD_ACCEPTABILITY_RATE}%`, margin, y);
        y += 10;

        // Table header
        pdf.setFontSize(9);
        pdf.setTextColor(17, 24, 39);
        const cols = [margin, 55, 80, 110, 140, 170];
        const headers = ["Village", "Pop.", "Total Spend", "Per Capita", "Per Lane-Mi", "Condition"];

        pdf.setFont(undefined, "bold");
        headers.forEach((h, i) => pdf.text(h, cols[i], y));
        y += 2;
        pdf.setDrawColor(229, 231, 235);
        pdf.line(margin, y, 195, y);
        y += 5;

        // Table rows
        pdf.setFont(undefined, "normal");
        for (const c of comparisonData.comparison) {
          if (y > 270) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(c.name.slice(0, 20), cols[0], y);
          pdf.text(c.population?.toLocaleString() || "—", cols[1], y);
          pdf.text(c.totalRoadSpend ? `$${c.totalRoadSpend.toLocaleString()}` : "—", cols[2], y);
          pdf.text(c.spendPerCapita ? `$${c.spendPerCapita}` : "—", cols[3], y);
          pdf.text(c.spendPerLaneMile ? `$${c.spendPerLaneMile.toLocaleString()}` : "—", cols[4], y);
          pdf.text(c.roadConditionScore ? `${c.roadConditionScore}/100` : "—", cols[5], y);
          y += 6;
        }

        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(
          "Data: IL Comptroller Local Government Warehouse | roadsense.app",
          margin,
          285
        );

        pdf.save(`roadsense-${villageName.toLowerCase().replace(/\s+/g, "-")}-report.pdf`);
      }
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={generating}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {generating ? "Generating PDF..." : copied ? "Link Copied!" : "Export"}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
          <button
            onClick={exportPDF}
            className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 border-b border-gray-100 font-medium"
          >
            Download PDF
          </button>
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
