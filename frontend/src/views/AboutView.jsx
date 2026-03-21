export default function AboutView() {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">About RoadSense</h2>

      <div className="prose prose-gray max-w-none">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            What is this?
          </h3>
          <p className="text-gray-600 mb-4">
            RoadSense makes municipal road spending transparent. It pulls data
            from the Illinois Comptroller's Annual Financial Reports and lets
            any resident search their village, see how much is spent on roads,
            and compare to neighboring communities.
          </p>
          <p className="text-gray-600">
            The goal: help residents, journalists, and local officials
            understand whether their tax dollars are being spent wisely on road
            infrastructure.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Where does the data come from?
          </h3>
          <ul className="space-y-3 text-gray-600">
            <li>
              <strong>Illinois Comptroller</strong> — Annual Financial Reports
              (AFRs) filed by every municipality. We look at Street & Bridge,
              Road & Bridge, and Motor Fuel Tax fund expenditures.
            </li>
            <li>
              <strong>U.S. Census</strong> — Population figures for per-capita
              calculations.
            </li>
            <li>
              <strong>Municipal reports</strong> — Treasurer's Reports and
              budget documents for vendor details and road condition scores,
              when available.
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Benchmarks
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-500">
                    Metric
                  </th>
                  <th className="text-right py-2 font-medium text-gray-500">
                    Value
                  </th>
                  <th className="text-left py-2 pl-4 font-medium text-gray-500">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-2">US local govt avg road spend</td>
                  <td className="py-2 text-right font-medium">$622/capita</td>
                  <td className="py-2 pl-4 text-gray-500">
                    Urban Institute 2021
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2">IL avg spend per lane-mile</td>
                  <td className="py-2 text-right font-medium">$98,386</td>
                  <td className="py-2 pl-4 text-gray-500">
                    Reason Foundation 2022
                  </td>
                </tr>
                <tr>
                  <td className="py-2">IL road acceptability rate</td>
                  <td className="py-2 text-right font-medium">79.3%</td>
                  <td className="py-2 pl-4 text-gray-500">USDOT 2022</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Caveats
          </h3>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li>
              Comptroller data reflects what municipalities report. Reporting
              quality varies.
            </li>
            <li>
              "Peer" comparisons use county and population as rough proxies.
              Geography, road density, climate, and infrastructure age all
              matter but aren't captured.
            </li>
            <li>
              Road condition scores are only available when a municipality has
              commissioned an independent engineering study.
            </li>
            <li>
              Per-capita figures use Census estimates which may not perfectly
              align with municipal boundaries.
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Contribute
          </h3>
          <p className="text-gray-600 mb-3">
            RoadSense is open source under the MIT license. We welcome
            contributions from civic tech volunteers.
          </p>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li>Add your state's data source</li>
            <li>Improve data parsing accuracy</li>
            <li>Add new visualizations</li>
            <li>Report data errors</li>
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            Built for Chi Hack Night Chicago and Code for America brigades
            nationally.
          </p>
        </div>
      </div>
    </div>
  );
}
