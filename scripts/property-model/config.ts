export const MODEL_REGION_CONFIG = {
  center: {
    postcode: 'SE20 7UA',
    latitude: 51.405312,
    longitude: -0.062353,
  },
  radiusKm: 5,
  allowedPostcodeAreas: ['SE', 'BR'],
};

export const MODEL_DATA_DIR = 'data/property-model';
export const PPD_DIR = `${MODEL_DATA_DIR}/ppd`;
export const UKHPI_DIR = `${MODEL_DATA_DIR}/ukhpi`;
export const PLANNING_DIR = `${MODEL_DATA_DIR}/planning`;
export const EPC_DIR = `${MODEL_DATA_DIR}/epc`;
export const TRAINING_DIR = `${MODEL_DATA_DIR}/training`;

export const PPD_SOURCE_BASE =
  process.env.PPD_SOURCE_BASE ||
  'http://prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com';

export const UKHPI_DOWNLOAD_URL =
  process.env.UKHPI_DOWNLOAD_URL ||
  'https://landregistry.data.gov.uk/app/ukhpi/download/new.csv';

export const ONSPD_SOURCE_PATH =
  process.env.ONSPD_SOURCE_PATH || 'data/postcodes/ONSPD.csv';

export const REGION_OUTPUT_PATH = 'data/property-model/region.json';
export const DATASET_OUTPUT_PATH = `${TRAINING_DIR}/transactions.jsonl`;
export const MODEL_OUTPUT_PATH = `${MODEL_DATA_DIR}/model.json`;
