import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function SpendChart({
  comparison,
  benchmarks,
  metric,
  label,
  highlightId,
}) {
  // Filter to villages that have this metric
  const filtered = comparison.filter((c) => c[metric] != null);

  if (filtered.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No data available for this metric.
      </div>
    );
  }

  // Sort descending
  const sorted = [...filtered].sort((a, b) => b[metric] - a[metric]);

  const colors = sorted.map((c) =>
    c.id === highlightId ? "#2563eb" : "#93c5fd"
  );

  // Add benchmark line if applicable
  let benchmarkValue = null;
  let benchmarkLabel = null;
  if (metric === "spendPerCapita" && benchmarks?.US_AVG_SPEND_PER_CAPITA) {
    benchmarkValue = benchmarks.US_AVG_SPEND_PER_CAPITA;
    benchmarkLabel = "US Average";
  } else if (
    metric === "spendPerLaneMile" &&
    benchmarks?.IL_AVG_SPEND_PER_LANE_MILE
  ) {
    benchmarkValue = benchmarks.IL_AVG_SPEND_PER_LANE_MILE;
    benchmarkLabel = "IL Average";
  }

  const data = {
    labels: sorted.map((c) => c.name),
    datasets: [
      {
        label,
        data: sorted.map((c) => c[metric]),
        backgroundColor: colors,
        borderColor: sorted.map((c) =>
          c.id === highlightId ? "#1d4ed8" : "#60a5fa"
        ),
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw;
            if (metric.includes("Percent") || metric.includes("Rate")) {
              return `${val}%`;
            }
            if (metric === "roadConditionScore") {
              return `${val}/100`;
            }
            return `$${val.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (val) => {
            if (metric === "roadConditionScore") return val;
            return `$${val.toLocaleString()}`;
          },
        },
      },
    },
  };

  // Add annotation for benchmark line if chart.js annotation plugin isn't
  // available, we'll render it as a note below the chart instead.

  return (
    <div>
      <div style={{ height: "320px" }}>
        <Bar data={data} options={options} />
      </div>
      {benchmarkValue && (
        <div className="text-center mt-2 text-sm text-gray-500">
          {benchmarkLabel}: ${benchmarkValue.toLocaleString()}
          {metric === "spendPerCapita" && "/capita"}
          {metric === "spendPerLaneMile" && "/lane-mile"}
        </div>
      )}
    </div>
  );
}
