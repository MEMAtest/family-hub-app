Property Model Scripts

Region selection
- Source file: `data/postcodes/ONSPD.csv` (extract from the ONSPD open data release).
- Output file: `data/property-model/region.json`.

Run:
```
npx tsx scripts/property-model/derive-region.ts
```

Downloads

Price Paid Data (PPD)
```
PPD_START_YEAR=2015 PPD_END_YEAR=2025 npm run model:ppd
```
Optional flags:
- `PPD_INCLUDE_MONTHLY=true` to fetch the latest monthly update.
- `PPD_INCLUDE_COMPLETE=true` to fetch the full dataset (large).
- `FORCE_DOWNLOAD=true` to overwrite existing files.

UK House Price Index (UKHPI)
```
UKHPI_FROM=2000-01-01 UKHPI_TO=2025-12-01 npm run model:ukhpi
```
Override locations:
```
UKHPI_LOCATIONS="http://landregistry.data.gov.uk/id/region/bromley,http://landregistry.data.gov.uk/id/region/lewisham" npm run model:ukhpi
```

ONSPD (postcode directory)
```
ONSPD_URL="<download-url>" npm run model:onspd
```
Optional extraction:
```
ONSPD_EXTRACT=true npm run model:onspd
```
If unzip is not available, extract the CSV manually and update `ONSPD_SOURCE_PATH` in `scripts/property-model/config.ts`.

Bromley planning applications
```
PLANNING_POSTCODES="SE20,SE19,SE21" npm run model:planning
```
Defaults to the postcode districts in `data/property-model/region.json` when available.

Dataset build
```
npm run model:dataset
```
Output: `data/property-model/training/transactions.jsonl` and `data/property-model/training/dataset-metadata.json`.

Model training
```
npm run model:train
```
Optional flags:
- `MODEL_SPLIT=temporal` to use the most recent 12 months as the test set.
- `MODEL_TEST_RATIO=0.2` for random split ratio.
- `MODEL_LAMBDA=1` to adjust ridge regularization strength.
- `MODEL_SEED=42` for deterministic random splits.

Full pipeline
```
npm run model:build
```

Notes
- The region is centered on SE20 7UA with a 5km radius.
- Postcode areas are limited to `SE` and `BR` to keep coverage in South East London
  (this includes Beckenham within the radius).
