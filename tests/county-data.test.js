const path = require('path');
const { buildIndex, getRecord, formatUsd } = require('../js/county-data.js');
const data = require(path.join(__dirname, '..', 'data', 'county-data.json'));

describe('buildIndex', () => {
  const index = buildIndex(data);

  test('indexes all 58 counties by FIPS and by SVG id', () => {
    expect(Object.keys(index.byFips)).toHaveLength(58);
    expect(Object.keys(index.bySvgId)).toHaveLength(58);
    expect(index.bySvgId['San Diego'].fips).toBe('06073');
  });

  test('maps the misspelled SVG id for San Francisco', () => {
    expect(index.bySvgId['San Franciso'].name).toBe('San Francisco');
  });

  test('years are sorted ascending', () => {
    expect(index.years[0]).toBe(2000);
    expect(index.years[index.years.length - 1]).toBe(2024);
  });

  test('throws on malformed data', () => {
    expect(() => buildIndex({})).toThrow();
  });
});

describe('getRecord', () => {
  const index = buildIndex(data);

  test('returns values for a known county/year', () => {
    expect(getRecord(index, '06073', 2024)).toEqual({
      homeValueUsd: 935608.41,
      perCapitaPersonalIncomeUsd: 84312,
    });
  });

  test('returns null for unknown county or year', () => {
    expect(getRecord(index, '99999', 2024)).toBeNull();
    expect(getRecord(index, '06073', 1990)).toBeNull();
  });
});

describe('formatUsd', () => {
  test('formats dollars with thousands separators', () => {
    expect(formatUsd(935608.41)).toBe('$935,608');
  });

  test('shows "No data" for missing values', () => {
    expect(formatUsd(null)).toBe('No data');
    expect(formatUsd(undefined)).toBe('No data');
  });
});
