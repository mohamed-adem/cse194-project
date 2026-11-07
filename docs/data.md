# County data handoff

Prepared November 4, 2026 from the files shared in Discord. This implementation uses BEA per-capita personal income and Zillow typical home values. No frontend behavior or calculation logic has been changed.

## What is ready

- `data/county-data.json`: 58 counties keyed by five-character FIPS, then calendar year, 2000-2024.
- `data/counties.json`: FIPS, canonical county name, and exact existing SVG path ID.
- `data/coverage.json`: complete observation counts and every missing housing county/year.
- `scripts/prepare_data.py`: repeatable preparation using Python 3.9+ standard library only.

The selected snapshots produce 1,268 complete housing/income county-year pairs out of 1,450. All 58 counties have both measures in 2017-2019 and 2021-2024. In 2020, Mariposa has only ten housing months, so its annual housing value is null. Earlier years have more gaps. Preserve all counties in the map and display missing observations explicitly.

## Definitions and choices

**Housing:** Zillow Home Value Index (ZHVI), mid-tier, single-family and condo, smoothed and seasonally adjusted. The input spans January 2000-September 2026. For each calendar year, take the arithmetic mean only when all 12 monthly observations exist. This is an annual mean of modeled typical home values, not a median transaction sale price. The source's current definition and methodology are on [Zillow Research](https://www.zillow.com/research/data/).

**Income:** BEA CAINC1 LineCode 3, per capita personal income in dollars. The input spans 1969-2024 and states that it was updated February 5, 2026. It is personal income divided by midyear population, not median household income, household earnings, or average wages. Use the published LineCode 3 values directly, without multiplying them by 1,000. That conversion applies to the table's total personal income line, which is not used. See [BEA county personal income](https://www.bea.gov/data/income-saving/personal-income-by-county).

Both measures use current dollars. No inflation adjustment is applied. Limit the joined data to 2000-2024 because income ends in 2024. Missing or partial-year housing remains null; `homeValueMonths` shows the available count. No interpolation, carry-forward, or zero filling is performed.

This pair supports comparisons of percentage changes. A home-value/per-capita-income ratio is not a household affordability measure. If the team requires median household income or median sale prices, choose different inputs and update the labels and schema rather than relabeling these measures.

## Other shared files inspected

| File/source | Observed contents | Reason not selected for this draft |
| --- | --- | --- |
| `MHICA06000A052NCEN.csv` / FRED | California statewide median household income, 1989-2024, with early missing years | Statewide observations cannot supply county-level income. |
| `hpi_at_county.xlsx` / FHFA | 58 California counties; rows span 1975-2025, varying by county | Developmental all-transactions price index, not dollar home prices. Useful alternative for appreciation comparisons. Workbook notes flag missing data and revision risk. |
| CAR historical median price CSV | Monthly existing detached single-family median sale prices, January 1990-September 2026; columns for 53 counties plus aggregate regions | Different measure and incomplete county coverage. Aggregate region columns must not be treated as counties. |

The EDD, Realtor.com, and Terner Center links were shared as candidates, but no additional files from them were evaluated for this draft.

## Joining the map

FIPS remain strings to preserve the leading zero. Zillow's `StateCodeFIPS` and `MunicipalCodeFIPS` are padded to two and three characters and concatenated. BEA's `GeoFIPS` is padded to five characters. State aggregate `06000` is excluded. County names are checked across sources, and both sources must contain exactly the 58 expected California county codes.

The existing SVG in `main-page.html` already supplies county shapes. The mapping preserves its misspelled `San Franciso` ID for FIPS `06075` while exposing the canonical name `San Francisco`. No new geographic boundary dataset or precision claim is introduced.

```js
const data = await fetch('./data/county-data.json').then(r => r.json());
const county = data.counties['06073']; // San Diego
const observation = county.years['2024'];
// observation.homeValueUsd
// observation.perCapitaPersonalIncomeUsd
// observation.homeValueMonths
const shape = document.getElementById(county.svgId);
```

Frontend and calculation owners should check for null at both selected endpoints before calculating a change. Percentage change is `(end / start - 1) * 100` when both endpoints are available and the start is positive. A difference between two percentage changes is expressed in percentage points. Those calculations and the eventual map UI remain the assigned teammates' integration work.

## Rebuild and verify

Input retrieval and naming are documented in `data/raw/README.md`. Run:

```sh
python3 scripts/prepare_data.py
python3 -m unittest discover -s tests -v
```

The builder checks duplicate counties, expected FIPS membership, cross-source county names, income definitions, numeric validity, and the SVG join. Source hashes make the selected snapshots identifiable. No automated source-update workflow was added; Guthry owns that task.
