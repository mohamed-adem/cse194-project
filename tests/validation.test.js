const path = require('path');
const { parseYear, validateYears, matchCountyName } = require('../js/validation.js');
const data = require(path.join(__dirname, '..', 'data', 'county-data.json'));
const countyNames = Object.values(data.counties).map(c => c.name);

const years = Array.from({ length: 25 }, (_, i) => 2000 + i); // 2000..2024

describe('parseYear', () => {
  test('accepts years inside the data range', () => {
    expect(parseYear('2000', years)).toEqual({ ok: true, value: 2000 });
    expect(parseYear(' 2024 ', years)).toEqual({ ok: true, value: 2024 });
    expect(parseYear(2015, years)).toEqual({ ok: true, value: 2015 });
  });

  test('rejects empty input', () => {
    expect(parseYear('', years).ok).toBe(false);
    expect(parseYear(undefined, years).ok).toBe(false);
  });

  test('rejects non-integers and wrong lengths', () => {
    for (const raw of ['20', '2015.5', 'abcd', '-2015', '1e3', '20155']) {
      expect(parseYear(raw, years).ok).toBe(false);
    }
  });

  test('rejects years outside the data range with the range in the message', () => {
    const result = parseYear('1999', years);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('2000');
    expect(result.error).toContain('2024');
    expect(parseYear('2025', years).ok).toBe(false);
  });
});

describe('validateYears', () => {
  test('single mode uses the start year for both ends and ignores end', () => {
    expect(validateYears({ mode: 'single', start: '2010', end: 'junk' }, years)).toEqual({
      ok: true, mode: 'single', startYear: 2010, endYear: 2010,
    });
  });

  test('range mode accepts start <= end', () => {
    expect(validateYears({ mode: 'range', start: '2010', end: '2020' }, years)).toEqual({
      ok: true, mode: 'range', startYear: 2010, endYear: 2020,
    });
    expect(validateYears({ mode: 'range', start: '2010', end: '2010' }, years).ok).toBe(true);
  });

  test('range mode rejects start > end on the end field', () => {
    const result = validateYears({ mode: 'range', start: '2020', end: '2010' }, years);
    expect(result.ok).toBe(false);
    expect(result.errors.end).toBeDefined();
    expect(result.errors.start).toBeUndefined();
  });

  test('range mode reports errors on both fields independently', () => {
    const result = validateYears({ mode: 'range', start: '', end: '1990' }, years);
    expect(result.ok).toBe(false);
    expect(result.errors.start).toBeDefined();
    expect(result.errors.end).toBeDefined();
  });

  test('throws on an unknown mode', () => {
    expect(() => validateYears({ mode: 'decade', start: '2010' }, years)).toThrow();
  });
});

describe('matchCountyName', () => {
  test('matches exact names case-insensitively', () => {
    expect(matchCountyName('san diego', countyNames)).toEqual({ ok: true, name: 'San Diego' });
    expect(matchCountyName('  LOS   ANGELES ', countyNames)).toEqual({ ok: true, name: 'Los Angeles' });
  });

  test('accepts an optional "County" suffix', () => {
    expect(matchCountyName('Kern County', countyNames)).toEqual({ ok: true, name: 'Kern' });
  });

  test('uses the real spelling of San Francisco', () => {
    expect(matchCountyName('san francisco', countyNames)).toEqual({ ok: true, name: 'San Francisco' });
  });

  test('accepts a unique prefix', () => {
    expect(matchCountyName('san d', countyNames)).toEqual({ ok: true, name: 'San Diego' });
  });

  test('exact match wins over a longer prefix match', () => {
    const names = ['Mono', 'Monomania'];
    expect(matchCountyName('mono', names)).toEqual({ ok: true, name: 'Mono' });
  });

  test('reports ambiguous prefixes', () => {
    const result = matchCountyName('san', countyNames);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/More than one county/);
  });

  test('reports unknown names', () => {
    const result = matchCountyName('Gotham', countyNames);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Gotham');
  });

  test('empty input means no county', () => {
    expect(matchCountyName('   ', countyNames)).toEqual({ ok: true, name: null });
  });
});
