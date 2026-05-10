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
loadEnvIfPresent(path.join('app', '.env'));

module.exports = require('./app.json');

