const { parseYear, validateYears } = require('../js/validation.js');

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
