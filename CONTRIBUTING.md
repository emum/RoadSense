# Contributing to RoadSense

Thanks for your interest in making government spending more transparent! Here's how to get involved.

## Getting Started

1. Fork the repo and clone locally
2. Follow the [Quick Start](README.md#quick-start) instructions
3. Pick an issue labeled `good first issue` or `help wanted`

## Adding a New State

RoadSense is built to expand beyond Illinois. To add a new state:

### 1. Find the Data Source

Every state has a comptroller, auditor, or treasurer that publishes municipal financial data. Look for:
- Annual Financial Reports (AFRs) or Comprehensive Annual Financial Reports (CAFRs)
- Bulk download options (CSV, Excel, API)
- Fund-level expenditure breakdowns

### 2. Create a State Fetch Script

Create `data/states/{state_abbrev}/fetch.js` following the pattern in `data/fetch.js`:

```javascript
// data/states/wi/fetch.js
// Wisconsin Department of Revenue Municipal Financial Reports
// Source: https://www.revenue.wi.gov/...

export async function fetchStateData() {
  // 1. Download the bulk file
  // 2. Parse and filter for road/highway fund codes
  // 3. Return array of municipality objects matching the schema
}
```

### 3. Map Fund Codes

Each state uses different fund codes for road spending. Document the mapping:
- Which fund names/codes correspond to road infrastructure?
- What's the fiscal year convention?
- Are there state-specific metrics (e.g., road condition scores)?

Add the mapping to `docs/data-dictionary.md`.

### 4. Add Population Data

Cross-reference municipality names with Census data. The `data/census.js` helper handles this for Illinois — extend it for your state.

### 5. Submit a PR

- Include sample output for at least 3 municipalities
- Document the data source URL and access method
- Add any state-specific benchmarks

## Code Guidelines

- **Comments**: Explain *why*, not *what*. Every data transformation should cite its source.
- **Tests**: Add tests for data parsing logic. Mock the HTTP calls.
- **No secrets**: Never commit API keys. Use `.env`.

## Data Accuracy

This project informs public discourse about tax spending. Accuracy matters.

- Always cite the source of every number
- Document methodology for derived metrics (per capita, per mile, etc.)
- Flag when data is estimated vs reported
- Include the fiscal year for every figure

## Reporting Issues

- **Data errors**: If a village's numbers look wrong, open an issue with the correct source
- **Bugs**: Include steps to reproduce and your browser/OS
- **Feature requests**: Describe the use case, not just the solution

## Code of Conduct

Be respectful. This is a civic project — we're all here to make communities better.
