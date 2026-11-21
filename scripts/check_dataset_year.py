"""Print the newest year eligible for publication across the six sources."""

import argparse
import csv
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path

from prepare_data import county_name


COUNTIES = {f"06{code:03}" for code in range(1, 116, 2)}
QUARTERS = {"1", "2", "3", "4"}
MONTHS = {f"{month:02}" for month in range(1, 13)}


def normalized(text):
    return re.sub(r"[^a-z0-9]", "", str(text).lower())


def has_value(value):
    try:
        number = float(str(value).replace(",", ""))
        return math.isfinite(number) and number > 0
    except ValueError:
        return False


def complete_county_years(counties_by_year):
    return {year for year, counties in counties_by_year.items() if COUNTIES <= counties}


def qcew_years(directory, county_ids, after):
    periods = defaultdict(set)
    for path in sorted(directory.glob("*.csv")):
        span = re.fullmatch(r"Avg_Wage_County_\d{4}_(\d{4})\.csv", path.name)
        if span and int(span[1]) <= after:
            continue
        with path.open(encoding="utf-8-sig", newline="") as source:
            rows = csv.DictReader(source)
            columns = {normalized(name): name for name in rows.fieldnames or []}
            for row in rows:
                year = row[columns["year"]].strip()
                if not year.isdigit() or int(year) <= after:
                    continue
                if normalized(row[columns["areatype"]]) != "county":
                    continue
                if normalized(row[columns["ownership"]]) not in {
                    "0", "total", "totalcovered", "allownership", "allownerships",
                } or row[columns["naicslevel"]].strip() != "0":
                    continue
                county = county_ids.get(county_name(row[columns["areaname"]]).casefold())
                if not county or not has_value(row[columns["averageweeklywages"]]):
                    continue
                period = normalized(row[columns["timeperiod"]])
                if period in {"annual", "annualaverage", "annualavg", "a", "5"}:
                    periods[int(year), county].add("annual")
                else:
                    quarter = re.fullmatch(r"(?:q|qtr|quarter)?([1-4])(?:(?:st|nd|rd|th)?(?:qtr|quarter))?", period)
                    if quarter:
                        periods[int(year), county].add(quarter[1])
    counties_by_year = defaultdict(set)
    for (year, county), observed in periods.items():
        if "annual" in observed or QUARTERS <= observed:
            counties_by_year[year].add(county)
    return complete_county_years(counties_by_year)


def saipe_years(directory, after):
    counties_by_year = defaultdict(set)
    for path in directory.iterdir():
        release = re.fullmatch(r"County_Median_Household_Income_(\d{4})\.(dat|txt)", path.name)
        if not release or (year := int(release[1])) <= after:
            continue
        for line in path.read_text(encoding="cp1252").splitlines():
            fields = line.split()
            # State and county codes occupy the first two fields, followed by
            # three blocks of six poverty estimates and then median income.
            if len(fields) > 20 and fields[0] == "06" and has_value(fields[20]):
                counties_by_year[year].add("06" + fields[1].zfill(3))
    return complete_county_years(counties_by_year)


def realtor_years(path, after):
    months = defaultdict(set)
    with path.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            county = row["county_fips"].strip().zfill(5)
            date = row["month_date_yyyymm"]
            if (county in COUNTIES and re.fullmatch(r"\d{6}", date)
                    and int(date[:4]) > after and has_value(row["median_listing_price"])):
                months[int(date[:4]), county].add(date[4:])
    counties_by_year = defaultdict(set)
    for (year, county), observed in months.items():
        if MONTHS <= observed:
            counties_by_year[year].add(county)
    return complete_county_years(counties_by_year)


def fhfa_years(path, after):
    from openpyxl import load_workbook

    workbook = load_workbook(path, read_only=True, data_only=True)
    counties_by_year = defaultdict(set)
    found_header = False
    try:
        for sheet in workbook:
            rows = iter(sheet.values)
            for row in rows:
                columns = {normalized(value): i for i, value in enumerate(row) if value}
                if {"fipscode", "year", "hpiwith2000base"} <= columns.keys():
                    found_header = True
                    break
            else:
                continue
            for row in rows:
                county = str(row[columns["fipscode"]]).strip().zfill(5)
                year = str(row[columns["year"]]).strip()
                if (county in COUNTIES and year.isdigit() and int(year) > after
                        and has_value(row[columns["hpiwith2000base"]])):
                    counties_by_year[int(year)].add(county)
    finally:
        workbook.close()
    if not found_header:
        raise ValueError(f"Missing county HPI columns in {path}")
    # FHFA's county series covers 55 California counties.
    return {year for year, counties in counties_by_year.items() if len(counties) >= 55}


def select_year(root, baseline, candidate):
    previous = max(json.loads(baseline.read_text())["allCountyYears"], default=0)
    app_years = {year for year in json.loads(candidate.read_text())["allCountyYears"] if year > previous}
    county_ids = {
        county["name"].casefold(): fips
        for fips, county in json.loads(baseline.with_name("counties.json").read_text()).items()
    }
    sources = {
        "BEA and Zillow": app_years,
        "QCEW": qcew_years(root / "dataset_01_qcew", county_ids, previous),
        "Census SAIPE": saipe_years(root / "dataset_03_county_median_household_income", previous),
        "Realtor.com": realtor_years(root / "dataset_04_county_median_listing_price"
                                    / "Median_Average_Listing_House_Price.csv", previous),
        "FHFA": fhfa_years(root / "dataset_05_county_house_price_index"
                           / "House_Price_Change_Coun.xlsx", previous),
    }
    for source, years in sources.items():
        print(f"{source}: complete years after {previous}: {sorted(years)}", file=sys.stderr)
    return max(set.intersection(*sources.values()), default=None)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("downloads", type=Path)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("candidate", type=Path)
    args = parser.parse_args()
    if (eligible_year := select_year(args.downloads, args.baseline, args.candidate)) is not None:
        print(eligible_year)
