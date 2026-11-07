"""Contract checks for the data teammates will consume; no external dependencies."""
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class CountyDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / 'data/county-data.json').read_text())
        cls.mapping = json.loads((ROOT / 'data/counties.json').read_text())
        cls.coverage = json.loads((ROOT / 'data/coverage.json').read_text())

    def test_county_and_svg_join(self):
        expected = {f'06{n:03}' for n in range(1, 116, 2)}
        self.assertEqual(set(self.data['counties']), expected)
        self.assertEqual(set(self.mapping), expected)
        shapes = re.findall(r'<path\b[^>]*\bid="([^"]+)"', (ROOT / 'main-page.html').read_text(), re.S)
        self.assertEqual(len(shapes), 58)
        self.assertEqual(set(shapes), {c['svgId'] for c in self.mapping.values()})
        self.assertEqual(self.mapping['06075'], {'name': 'San Francisco', 'svgId': 'San Franciso'})

    def test_years_units_and_missing_values(self):
        years = self.data['metadata']['years']
        self.assertEqual(years, list(range(2000, 2025)))
        for county in self.data['counties'].values():
            self.assertEqual(set(county['years']), {str(y) for y in years})
            for record in county['years'].values():
                self.assertGreater(record['perCapitaPersonalIncomeUsd'], 0)
                self.assertTrue(0 <= record['homeValueMonths'] <= 12)
                self.assertEqual(record['homeValueUsd'] is None, record['homeValueMonths'] < 12)
        self.assertIsNone(self.data['counties']['06043']['years']['2020']['homeValueUsd'])
        self.assertEqual(self.data['counties']['06043']['years']['2020']['homeValueMonths'], 10)
        # Published source observation catches accidental thousands-of-dollars conversion.
        self.assertEqual(self.data['counties']['06115']['years']['2024']['perCapitaPersonalIncomeUsd'], 54741)

    def test_coverage_reconciles(self):
        for year, count in self.coverage['completeCountyPairsByYear'].items():
            actual = sum(c['years'][year]['homeValueUsd'] is not None and c['years'][year]['perCapitaPersonalIncomeUsd'] is not None for c in self.data['counties'].values())
            self.assertEqual(count, actual)
        self.assertEqual(sum(self.coverage['completeCountyPairsByYear'].values()), 1268)


if __name__ == '__main__':
    unittest.main()
