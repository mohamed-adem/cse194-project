# Source snapshots

Download the attachments posted by **meh** in the project Discord `#sources` on November 3, 2026 at 10:18 PM:

- Save `Table.csv` here as `bea_cainc1.csv`.
- Save `County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv` here as `zillow_county_zhvi.csv`.

The downloaded originals are unchanged. They are excluded from Git to avoid committing the national Zillow file. SHA-256 hashes of the exact inputs are recorded in `../county-data.json`. The checked-in JSON can be consumed without these raw files or Python. To rebuild, run `python3 scripts/prepare_data.py` from the repository root. The script does not download or silently refresh inputs. Replace snapshots deliberately and review the resulting diff when the team adds its update workflow.
