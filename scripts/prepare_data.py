"""Build county/year JSON from the team's BEA and Zillow CSV snapshots (stdlib only)."""
import argparse
import csv
import hashlib
import io
import json
import math
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def number(value):
    value = value.strip()
    if value in ('', 'NA', '(NA)', '(D)', '(L)', '.'):
        return None
    result = float(value.replace(',', ''))
    if not math.isfinite(result) or result <= 0:
        raise ValueError(f'Unexpected nonpositive/nonfinite observation: {value}')
    return result


def build(raw_dir, output_dir):
    bea_path = raw_dir / 'bea_cainc1.csv'
    zillow_path = raw_dir / 'zillow_county_zhvi.csv'
    lines = bea_path.read_text(encoding='utf-8-sig').splitlines()
    header = next(i for i, line in enumerate(lines) if line.startswith('GeoFIPS,'))
    end = next((i for i in range(header, len(lines)) if lines[i].startswith('Legend/Footnotes')), len(lines))
    income, names = {}, {}
    for row in csv.DictReader(io.StringIO('\n'.join(lines[header:end]))):
        fips = row['GeoFIPS'].strip().strip('"').zfill(5)
        if not re.fullmatch(r'06\d{3}', fips) or fips == '06000' or row['LineCode'] != '3':
            continue
        if fips in income:
            raise ValueError(f'Duplicate BEA county: {fips}')
        if not row['Description'].startswith('Per capita personal income (dollars)'):
            raise ValueError('BEA income definition changed')
        names[fips] = row['GeoName'].removesuffix(', CA')
        income[fips] = {int(year): number(value) for year, value in row.items() if year.isdigit()}
    housing = {}
    with zillow_path.open(encoding='utf-8-sig', newline='') as source:
        reader = csv.DictReader(source)
        dates = [key for key in reader.fieldnames if re.fullmatch(r'\d{4}-\d{2}-\d{2}', key)]
        for row in reader:
            if row['State'] != 'CA':
                continue
            fips = row['StateCodeFIPS'].zfill(2) + row['MunicipalCodeFIPS'].zfill(3)
            if fips in housing:
                raise ValueError(f'Duplicate Zillow county: {fips}')
            if names.get(fips) != row['RegionName'].removesuffix(' County'):
                raise ValueError(f'County name/FIPS mismatch: {fips}')
            housing[fips] = {date: number(row[date]) for date in dates}
    expected = {f'06{code:03}' for code in range(1, 116, 2)}
    if set(income) != expected or set(housing) != expected:
        raise ValueError('Expected all 58 California county FIPS in each source')
    svg_file = ROOT / 'main-page.html'
    svg_ids = re.findall(r'<path\b[^>]*\bid="([^"]+)"', svg_file.read_text(), re.S)
    aliases = {'San Francisco': 'San Franciso'}
    if set(svg_ids) != {aliases.get(name, name) for name in names.values()} or len(svg_ids) != 58:
        raise ValueError('SVG county identifiers changed; review mapping')
    years = sorted(set.intersection(*(set(values) for values in income.values())) & {int(d[:4]) for d in dates})
    # Exclude source calendar years that do not have all twelve monthly columns.
    years = [year for year in years if sum(d.startswith(str(year)) for d in dates) == 12]
    counties, mapping, coverage = {}, {}, defaultdict(int)
    for fips in sorted(expected):
        name = names[fips]
        svg_id = aliases.get(name, name)
        mapping[fips] = {'name': name, 'svgId': svg_id}
        records = {}
        for year in years:
            months = [housing[fips][d] for d in dates if d.startswith(str(year))]
            available = [v for v in months if v is not None]
            value = round(math.fsum(available) / 12, 2) if len(available) == 12 else None
            records[str(year)] = {'homeValueUsd': value, 'perCapitaPersonalIncomeUsd': income[fips][year], 'homeValueMonths': len(available)}
            if value is not None and income[fips][year] is not None:
                coverage[year] += 1
        counties[fips] = {'name': name, 'svgId': svg_id, 'years': records}
    output_dir.mkdir(parents=True, exist_ok=True)
    metadata = {
        'schemaVersion': 1, 'sourceSelection': 'bea_per_capita_income_and_zillow_zhvi',
        'years': years, 'countyCount': 58,
        'metrics': {
            'homeValueUsd': {'label': 'Typical home value (annual mean ZHVI)', 'unit': 'current USD', 'source': 'Zillow county mid-tier single-family and condo ZHVI, smoothed and seasonally adjusted', 'aggregation': 'Arithmetic mean of all 12 monthly observations; otherwise null'},
            'perCapitaPersonalIncomeUsd': {'label': 'Per capita personal income', 'unit': 'current USD per person per year', 'source': 'BEA CAINC1, LineCode 3', 'aggregation': 'Published annual observation, no household conversion'},
        },
        'missingData': 'null; no interpolation, extrapolation, or zero filling',
        'sources': [
            {'id': 'bea', 'url': 'https://www.bea.gov/data/income-saving/personal-income-by-county', 'file': bea_path.name, 'sha256': hashlib.sha256(bea_path.read_bytes()).hexdigest()},
            {'id': 'zillow', 'url': 'https://www.zillow.com/research/data/', 'file': zillow_path.name, 'sha256': hashlib.sha256(zillow_path.read_bytes()).hexdigest()},
        ],
    }
    outputs = {'county-data.json': {'metadata': metadata, 'counties': counties}, 'counties.json': mapping,
               'coverage.json': {'completeCountyPairsByYear': {str(y): coverage[y] for y in years},
                                 'allCountyYears': [y for y in years if coverage[y] == 58],
                                 'missingHousingCountyYears': [{'fips': f, 'name': names[f], 'year': y, 'availableMonths': counties[f]['years'][str(y)]['homeValueMonths']} for f in sorted(expected) for y in years if counties[f]['years'][str(y)]['homeValueUsd'] is None]}}
    for filename, data in outputs.items():
        (output_dir / filename).write_text(json.dumps(data, indent=2, allow_nan=False) + '\n')
    print(f'Built {len(counties)} counties, {years[0]}-{years[-1]}; complete pairs: {sum(coverage.values())}/{58 * len(years)}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--raw-dir', type=Path, default=ROOT / 'data/raw')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'data')
    args = parser.parse_args()
    build(args.raw_dir, args.output_dir)
