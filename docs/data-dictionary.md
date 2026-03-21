# RoadSense Data Dictionary

Every field in the RoadSense dataset is documented here with its source and methodology.

## Municipality Object Schema

```json
{
  "id": "string",
  "name": "string",
  "county": "string",
  "state": "string",
  "fips": "string",
  "population": "number",
  "fiscalYear": "number",
  "roadSpending": { ... },
  "benchmarks": { ... },
  "vendors": [ ... ],
  "metadata": { ... }
}
```

## Field Definitions

### Identity Fields

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | string | Generated | Slug of municipality name (e.g., `hawthorn-woods`) |
| `name` | string | IL Comptroller AFR | Official municipality name as filed |
| `county` | string | IL Comptroller AFR | County of primary jurisdiction |
| `state` | string | Constant | State abbreviation (`IL`) |
| `fips` | string | Census | FIPS code for the municipality |
| `population` | number | U.S. Census ACS 5-year | Most recent population estimate |

### Road Spending Fields

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `totalRoadSpend` | number | IL Comptroller AFR | Sum of all road-related fund expenditures for the fiscal year. Includes Street & Bridge, Road & Bridge, Motor Fuel Tax, and qualifying Special Service Area funds. |
| `spendPerCapita` | number | Calculated | `totalRoadSpend / population` |
| `spendPerLaneMile` | number | Calculated | `totalRoadSpend / laneMiles`. Only available when road mile data is reported or independently sourced. |
| `laneMiles` | number | Municipality / IDOT | Centerline miles * 2 (assumes 2-lane avg). Sourced from municipality reports or IDOT local road inventory. |
| `centerlineMiles` | number | Municipality / IDOT | Total centerline road miles maintained by the municipality. |
| `roadBudgetPercent` | number | Calculated | `totalRoadSpend / totalMunicipalSpend * 100` |
| `totalMunicipalSpend` | number | IL Comptroller AFR | Total expenditures across all funds |

### Fund Code Mapping (Illinois)

These are the AFR fund types that map to road infrastructure spending:

| Fund Name | Included | Notes |
|-----------|----------|-------|
| Street & Bridge | Yes | Primary road maintenance fund |
| Road & Bridge | Yes | Used by townships and some villages |
| Motor Fuel Tax (MFT) | Yes | State-distributed fuel tax revenue earmarked for roads |
| Special Service Area | Conditional | Only if the SSA is designated for road improvements |
| Capital Projects | Conditional | Only road/infrastructure line items, not buildings |
| General Fund | No | Too broad — would inflate numbers. Road line items within General Fund are not captured unless separately reported. |

### Condition & Quality Fields

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `roadConditionScore` | number (0-100) | Engineering study | Pavement Condition Index (PCI) or equivalent. Higher = better. Only available when municipality has commissioned an independent study. |
| `acceptabilityRate` | number (%) | Derived | Percentage of road miles rated "acceptable" or better. |

### Spending Category Breakdown

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `preventiveSpend` | number | AFR line items | Crack sealing, seal coating, minor patching. Categorized from vendor/description data when available. |
| `reactiveSpend` | number | AFR line items | Full resurfacing, reconstruction, emergency repairs. |
| `preventiveRatio` | number | Calculated | `preventiveSpend / totalRoadSpend`. Higher is generally better — industry target is 0.6+. |

### Vendor Data

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `vendors[].name` | string | Treasurer's Report | Vendor/contractor name |
| `vendors[].amount` | number | Treasurer's Report | Total payments in fiscal year |
| `vendors[].category` | string | Classified | One of: `paving`, `engineering`, `materials`, `salt`, `equipment`, `other` |

### Benchmark Constants

These are hardcoded reference values from national/state studies:

| Constant | Value | Source | Year |
|----------|-------|--------|------|
| `US_AVG_SPEND_PER_CAPITA` | $622 | Urban Institute | 2021 |
| `IL_AVG_SPEND_PER_LANE_MILE` | $98,386 | Reason Foundation | 2022 |
| `IL_ROAD_ACCEPTABILITY_RATE` | 79.3% | USDOT | 2022 |

### Metadata

| Field | Type | Description |
|-------|------|-------------|
| `metadata.source` | string | Where this data was obtained |
| `metadata.fetchedAt` | ISO datetime | When the data was last fetched |
| `metadata.fiscalYearEnd` | string | End date of the municipality's fiscal year (varies — often April 30 or December 31) |
| `metadata.notes` | string | Any caveats or data quality issues |

## Methodology Notes

### Per Capita Calculations
Population figures use the most recent ACS 5-year estimate available at the time of data fetch. Municipal boundaries and Census-designated places don't always align perfectly — where there's a known discrepancy, it's noted in `metadata.notes`.

### Fund Aggregation
A single municipality may report road spending across multiple funds (e.g., MFT + Street & Bridge). We sum all qualifying funds to get `totalRoadSpend`. This avoids undercounting villages that split road spending across funds.

### Peer Comparison
"Peers" are defined as municipalities in the same county with population within +/- 50% of the target village. This is a rough heuristic — geography, road density, climate zone, and age of infrastructure all matter but aren't captured in the Comptroller data.

### Preventive vs Reactive
This classification is approximate. We categorize based on vendor names and fund descriptions when available, but many municipalities don't report at this granularity. When the ratio can't be calculated, it's omitted rather than estimated.
