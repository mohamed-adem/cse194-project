const path = require('path');
const data = require(path.join(__dirname, '..', 'data', 'county-data.json'));

describe('county-data.json', () => {
  test('has all 58 California counties', () => {
    expect(Object.keys(data.counties)).toHaveLength(58);
  });

  test('every county has an svgId and a record for every listed year', () => {
    for (const county of Object.values(data.counties)) {
      expect(typeof county.svgId).toBe('string');
      for (const year of data.metadata.years) {
        expect(county.years).toHaveProperty(String(year));
      }
    }
  });
});
