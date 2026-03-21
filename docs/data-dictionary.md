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
  "govType": "string",
  "subType": "string | null",
  "roadSpending": { ... },
  "roadConditionScore": "number | null",
  "referendumRevenue": "number | null",
  "vendors": [ ... ],
  "metadata": { ... }
}
```

## Field Definitions

### Identity Fields

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | string | Generated | Slug of municipality name. Townships get `-twp-{county}` suffix, special purpose districts get `-sp-{county}` to avoid collisions (e.g., `lake-villa` vs `lake-villa-twp-lake`). |
| `name` | string | IL Comptroller AFR | Official municipality name as filed. Townships display with "(Township)" suffix. |
| `county` | string | IL Comptroller AFR | County of primary jurisdiction |
| `state` | string | Constant | State abbreviation (`IL`) |
| `fips` | string | IL Comptroller | Comptroller unit code (e.g., `049/190/32`). Format: `{county_code}/{unit_code}/{type_code}`. |
| `population` | number | IL Comptroller AFR (self-reported) | Population as reported in the AFR UnitStats table. Seed data uses Census figures. |
| `fiscalYear` | number | IL Comptroller AFR | Fiscal year of the report (e.g., 2025 = FY ending in 2025). |
| `govType` | string | IL Comptroller AFR | Government type: `Municipality`, `Township`, `Special Purpose`, `County/Community College`. Derived from C1 field: MU, TW, SP, CC. |
| `subType` | string/null | IL Comptroller AFR | Municipality sub-type where applicable. Derived from C4 field: 30=City, 31=Town, 32=Village. |

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

### Fund Instrument Matching (Illinois Comptroller)

Road spending is identified by matching the `Instrument` field in the FundsUsed table against keyword patterns. The Comptroller database uses free-text fund names rather than standardized codes.

**Inclusion patterns** (any match triggers inclusion):

| Pattern | Examples |
|---------|----------|
| `road` | "General Road", "Road & Bridge", "Road Damage" |
| `street` | "Street Improvement", "Home Rule Street Improvement" |
| `bridge` | "Bridge Construction", "Aid to Bridges", "Bridge Fund" |
| `motor fuel tax` / `MFT` | "Motor Fuel Tax" |
| `highway` | "Highway Fund", "Highway Insurance" |
| `pavement` / `paving` | "Paving Fund" |
| `curb` / `sidewalk` | "Curb & Gutter" |
| `storm sewer` | "Street Storm Sewer Improvement" |

**Exclusion patterns** (override inclusion):

| Pattern | Reason |
|---------|--------|
| `TIF` | Tax Increment Financing districts named after streets |
| `business district` | Commercial districts, not road infrastructure |
| `redevelopment` | Redevelopment zones, not road maintenance |
| `broadband` / `fiber` | Matches "road" in "Fiber Optic Broadband" |

### Comptroller Database Schema (data2025.accdb)

The bulk download is a Microsoft Access database with these tables:

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `UnitData` | Code, UnitName, County, C1 (gov type), C4 (sub-type) | Municipality identity and contact info |
| `UnitStats` | Code, FY, Pop, EAV | Population, equalized assessed valuation |
| `FundsUsed` | Code, FundType, Instrument, Expenditures | Fund names and total expenditures per fund |
| `Expenditures` | Code, Category, GN/SR/CP/DS/EP/TS/FD/DP/OT | Detailed spending by category and fund type |
| `Revenues` | Code, Category, GN/SR/CP/DS/EP/TS/FD/DP/OT | Revenue by category and fund type |
| `Component` | Code, ComponentUnit, Amount | Component units (e.g., Road & Bridge) |

**Fund type columns** in Expenditures/Revenues:

| Column | Meaning |
|--------|---------|
| GN | General Fund |
| SR | Special Revenue |
| CP | Capital Projects |
| DS | Debt Service |
| EP | Enterprise |
| TS | Trust/Agency |
| FD | Fiduciary/Pension |
| DP | Discretely Presented |
| OT | Other |

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

### AI-Extracted Data
Villages not in the Comptroller database can be added via AI extraction. A user provides a URL or uploads a PDF (treasurer's report, budget document), and Claude extracts structured data. These entries are tagged with `metadata.source` starting with `AI-extracted from` or `upload://`. AI-extracted data should be treated as approximate until manually verified. The extraction prompt instructs the model to include only road-related spending and exclude water/sewer, parks, police, and general admin.

### Address Lookup
The address lookup feature uses the [U.S. Census Bureau Geocoder](https://geocoding.geo.census.gov/geocoder/) (free, no API key). It returns:
- **Incorporated Place** — maps to a municipality (village/city) in our dataset
- **County Subdivision** — maps to a township in our dataset

This allows residents to see both their municipality and township road spending. The county name from the Census (`"Lake County"`) is matched against our dataset (`"Lake"`) using a prefix match.

### Data Quality Notes
- Population figures in the Comptroller database are self-reported by municipalities and may be outdated or incorrect (e.g., Byron reported pop=1).
- Seed data for Hawthorn Woods uses manually verified figures from official Treasurer's Reports and is more accurate than Comptroller data.
- Township and municipality names can collide (e.g., "Lake Villa" village vs "Lake Villa" township). These are deduplicated by appending government type and county to the ID.
- The FY field in the Comptroller data represents the fiscal year of the report, not necessarily the calendar year. Most IL municipalities have fiscal years ending April 30.
