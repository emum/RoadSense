import { useState } from "react";
import SearchView from "./views/SearchView";
import BenchmarkView from "./views/BenchmarkView";
import AboutView from "./views/AboutView";
import ExtractView from "./views/ExtractView";

const TABS = [
  { id: "search", label: "Search" },
  { id: "benchmark", label: "Benchmark" },
  { id: "extract", label: "Extract Data" },
  { id: "about", label: "About" },
];

export default function App() {
  const [tab, setTab] = useState("search");
  const [selectedVillage, setSelectedVillage] = useState(null);

  function handleSelectVillage(village) {
    setSelectedVillage(village);
    setTab("benchmark");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RoadSense</h1>
            <p className="text-sm text-gray-500">
              Illinois road spending, made transparent
            </p>
          </div>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {tab === "search" && (
          <SearchView onSelectVillage={handleSelectVillage} />
        )}
        {tab === "benchmark" && (
          <BenchmarkView selectedVillage={selectedVillage} />
        )}
        {tab === "extract" && <ExtractView />}
        {tab === "about" && <AboutView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>
            RoadSense is an open-source civic project. Data from the{" "}
            <a
              href="https://illinoiscomptroller.gov/constituent-services/local-government/local-government-division/financial-databases/"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Illinois Comptroller
            </a>
            . Built for{" "}
            <a
              href="https://chihacknight.org/"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chi Hack Night
            </a>{" "}
            and Code for America brigades.
          </p>
          <p className="mt-1">MIT License</p>
        </div>
      </footer>
    </div>
  );
}
