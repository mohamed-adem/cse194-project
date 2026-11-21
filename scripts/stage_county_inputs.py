"""Stage BEA and Zillow workflow downloads for prepare_data.py."""

import argparse
import csv
import io
import re
import shutil
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
BEA_DOWNLOAD = Path("dataset_02_bea_county_personal_income/CAINC1_CA_1969_2024.zip")
ZILLOW_DOWNLOAD = Path("dataset_06_zillow_county_home_value_index/Zillow_County_house.csv")


def read_bea_table(path):
    with ZipFile(path) as archive:
        tables = [
            name for name in archive.namelist()
            if re.fullmatch(r"CAINC1__ALL_AREAS_\d{4}_\d{4}\.csv", Path(name).name, re.I)
        ]
        if len(tables) != 1:
            raise ValueError(f"Expected one CAINC1 all-areas CSV in {path}")
        data = archive.read(tables[0])

    try:
        return data.decode("utf-8-sig")
    except UnicodeDecodeError:
        return data.decode("cp1252")


def stage(download_dir, raw_dir):
    zillow = download_dir / ZILLOW_DOWNLOAD
    with zillow.open(encoding="utf-8-sig", newline="") as source:
        header = set(next(csv.reader(source), []))
    required = {"State", "StateCodeFIPS", "MunicipalCodeFIPS", "RegionName"}
    if not required <= header or not any(re.fullmatch(r"\d{4}-\d{2}-\d{2}", key) for key in header):
        raise ValueError(f"Expected county metadata and monthly columns in {zillow}")

    bea = read_bea_table(download_dir / BEA_DOWNLOAD)
    bea_rows = csv.reader(io.StringIO(bea))
    header = next((row for row in bea_rows if row and row[0] == "GeoFIPS"), [])
    if not {"GeoName", "LineCode", "Description"} <= set(header) or not any(
        re.fullmatch(r"\d{4}", name) for name in header
    ):
        raise ValueError("Expected county metadata and annual columns in CAINC1")

    raw_dir.mkdir(parents=True, exist_ok=True)
    with (raw_dir / "bea_cainc1.csv").open("w", encoding="utf-8", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(header)
        for row in bea_rows:
            if row and row[0].startswith("Legend/Footnotes"):
                break
            if row and re.fullmatch(r"06\d{3}", code := row[0].strip().zfill(5)) and code != "06000":
                writer.writerow(row)
    shutil.copyfile(zillow, raw_dir / "zillow_county_zhvi.csv")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download-dir", type=Path, default=ROOT / "raw_data",
                        help="Directory containing the two extracted dataset folders")
    parser.add_argument("--raw-dir", type=Path, default=ROOT / "data/raw",
                        help="Directory where prepare_data.py reads its CSV inputs")
    args = parser.parse_args()
    stage(args.download_dir, args.raw_dir)
    print(f"Staged bea_cainc1.csv and zillow_county_zhvi.csv in {args.raw_dir}")
