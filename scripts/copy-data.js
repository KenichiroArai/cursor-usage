const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicData = path.join(root, 'public', 'data');

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

// From docs root or data
copyIfExists(path.join(root, 'docs', 'record.xlsx'), path.join(publicData, 'record.xlsx'));
copyIfExists(path.join(root, 'data', 'record.xlsx'), path.join(publicData, 'record.xlsx'));
copyIfExists(path.join(root, 'docs', 'data', 'fc200-version-info.yaml'), path.join(publicData, 'fc200-version-info.yaml'));

// From tool
copyIfExists(path.join(root, 'docs', 'tool', 'all-raw-events', 'data', 'usage-events.csv'), path.join(publicData, 'usage-events.csv'));
copyIfExists(path.join(root, 'docs', 'tool', 'all-raw-events', 'data', 'old', 'usage-tokens.csv'), path.join(publicData, 'old', 'usage-tokens.csv'));
copyIfExists(path.join(root, 'docs', 'tool', 'all-raw-events', 'data', 'old', 'usage-details.csv'), path.join(publicData, 'old', 'usage-details.csv'));

// Also check tool at root (after migration)
copyIfExists(path.join(root, 'tool', 'all-raw-events', 'data', 'usage-events.csv'), path.join(publicData, 'usage-events.csv'));
copyIfExists(path.join(root, 'tool', 'all-raw-events', 'data', 'old', 'usage-tokens.csv'), path.join(publicData, 'old', 'usage-tokens.csv'));
copyIfExists(path.join(root, 'tool', 'all-raw-events', 'data', 'old', 'usage-details.csv'), path.join(publicData, 'old', 'usage-details.csv'));

// From data/
copyIfExists(path.join(root, 'data', 'fc200-version-info.yaml'), path.join(publicData, 'fc200-version-info.yaml'));
copyIfExists(path.join(root, 'data', 'record.xlsx'), path.join(publicData, 'record.xlsx'));

console.log('Data copy complete.');
