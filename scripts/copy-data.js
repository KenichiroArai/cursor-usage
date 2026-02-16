const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicData = path.join(root, 'public', 'data');
const dataRoot = path.join(root, 'data');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    console.log('Copied:', path.relative(root, src), '->', path.relative(root, dest));
  }
}

ensureDir(publicData);
ensureDir(path.join(publicData, 'old'));

// From data/ only (single source of truth)
copyIfExists(path.join(dataRoot, 'record.xlsx'), path.join(publicData, 'record.xlsx'));
copyIfExists(path.join(dataRoot, 'fc200-version-info.yaml'), path.join(publicData, 'fc200-version-info.yaml'));
copyIfExists(path.join(dataRoot, 'usage-events.csv'), path.join(publicData, 'usage-events.csv'));
copyIfExists(path.join(dataRoot, 'old', 'usage-tokens.csv'), path.join(publicData, 'old', 'usage-tokens.csv'));
copyIfExists(path.join(dataRoot, 'old', 'usage-details.csv'), path.join(publicData, 'old', 'usage-details.csv'));

console.log('Data copy complete.');
