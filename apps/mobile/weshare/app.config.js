/**
 * Expo only auto-loads `.env` from the project root (`apps/mobile/weshare/`).
 * Many setups keep secrets in `app/.env`; load both so EXPO_PUBLIC_* work after restart.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const root = __dirname;

function loadEnvIfPresent(relativePath) {
  const full = path.join(root, relativePath);
  if (fs.existsSync(full)) {
    dotenv.config({ path: full, override: false });
  }
}

loadEnvIfPresent('.env');
loadEnvIfPresent('.env.local');
loadEnvIfPresent('.env.production');
loadEnvIfPresent(path.join('app', '.env'));

const appJson = require('./app.json');
const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Prefer env for Maps keys so real keys stay out of app.json in git.
if (googleMapsKey) {
  if (appJson.expo?.ios?.config) {
    appJson.expo.ios.config.googleMapsApiKey = googleMapsKey;
  }
  if (appJson.expo?.android?.config?.googleMaps) {
    appJson.expo.android.config.googleMaps.apiKey = googleMapsKey;
  }
}

module.exports = appJson;

