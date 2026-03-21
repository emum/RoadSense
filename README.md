# RoadSense

**See how your village spends on roads — and how it compares to neighbors.**

RoadSense pulls live road infrastructure spending data from the [Illinois Comptroller's Local Government Warehouse](https://illinoiscomptroller.gov/constituent-services/local-government/local-government-division/financial-databases/) and lets any Illinois community compare their road budget to peer villages.

Type your village name. Get a spending snapshot. See how you rank. Get an AI-generated plain-English verdict on whether your tax dollars are being spent wisely.

Built for residents, journalists, and local officials — not developers.

## Quick Start

```bash
# Clone
git clone https://github.com/your-org/roadsense.git
cd roadsense

# Set up environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY and ADMIN_API_KEY to .env

# Install dependencies
cd data && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Fetch Comptroller data
cd data && node fetch.js && cd ..

# Start backend (port 3001) — keep this terminal open
cd backend && npm start

# In a second terminal tab, start frontend (port 5173)
cd frontend && npm run dev
```

## Project Structure

```
RoadSense/
  frontend/     React app (Vite + Tailwind CSS)
  backend/      Node.js/Express API
  data/         Scripts to fetch & parse IL Comptroller data
  docs/         Data dictionary, contributing guide
  .env.example  Required environment variables
```

## Data Sources

- **Illinois Comptroller** — Annual Financial Reports (AFRs) filed by every municipality
- **U.S. Census** — Population figures for per-capita calculations
- **Seed data** — Hawthorn Woods IL 2023 from official Treasurer's Report + Priority Based Budget 2025

See [docs/data-dictionary.md](docs/data-dictionary.md) for field-level documentation.

## Key Features

1. **Search** — Type any IL village name, get their road spending snapshot
2. **Benchmark** — Compare to auto-suggested peers (same county, similar population)
3. **Charts** — Bar charts of spend per capita, road condition scores
4. **AI Analysis** — Plain-English verdict powered by Claude on spending adequacy
5. **Export** — Download comparisons as PDF or shareable link

## Metrics

- Annual road spend per capita
- Annual road spend per lane-mile
- % of budget allocated to roads
- Preventive vs reactive spend ratio
- Year-over-year trend
- Rank vs peer group

## National Benchmarks

| Metric | Value | Source |
|--------|-------|--------|
| US local govt avg road spend | $622/capita | Urban Institute 2021 |
| IL avg spend per lane-mile | $98,386 | Reason Foundation 2022 |
| IL road acceptability rate | 79.3% | USDOT 2022 |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a new state's data source or improve the app.

## License

MIT — see [LICENSE](LICENSE).

---

Built for [Chi Hack Night Chicago](https://chihacknight.org/) and [Code for America](https://codeforamerica.org/) brigades nationally.
