import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else current += char;
  }
  values.push(current);
  return values;
}

function readCSV(filePath: string): Record<string, string>[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter((l) => l.trim());
    const headers = lines[0].split(',').map((h) => h.trim());
    const data: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = (values[idx] ?? '').trim().replace(/^"|"$/g, '');
        });
        data.push(row);
      }
    }
    return data;
  } catch (e) {
    console.error('Read error:', filePath, (e as Error).message);
    return [];
  }
}

function sortByDate(data: Record<string, string>[]) {
  return data.sort((a, b) => {
    const dA = new Date(a['Date'] ?? '').getTime();
    const dB = new Date(b['Date'] ?? '').getTime();
    return dB - dA;
  });
}

function removeDuplicates(data: Record<string, string>[]) {
  const seen = new Set<string>();
  return data.filter((row) => {
    const key = `${row['Date']}-${row['Model']}-${row['Total Tokens']}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function writeCSV(
  filePath: string,
  data: Record<string, string>[],
  headers: string[]
) {
  const csv =
    headers.join(',') +
    '\n' +
    data
      .map((row) =>
        headers
          .map((h) => {
            const v = row[h] ?? '';
            return v.includes(',') ? `"${v}"` : v;
          })
          .join(',')
      )
      .join('\n');
  fs.writeFileSync(filePath, csv, 'utf8');
  console.log('Wrote:', filePath);
}

function findAllInputCSVFiles(inputDir: string) {
  try {
    const files = fs.readdirSync(inputDir);
    return files
      .filter((f) => f.startsWith('usage-events-') && f.endsWith('.csv'))
      .map((f) => {
        const m = f.match(/usage-events-(\d{4}-\d{2}-\d{2})/);
        if (!m) return null;
        return {
          file: f,
          path: path.join(inputDir, f),
          dateString: m[1],
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.dateString.localeCompare(b.dateString));
  } catch {
    return [];
  }
}

function moveToArchive(
  sourceFile: string,
  archiveDir: string,
  dateString: string
) {
  const [y, m] = dateString.split('-');
  const targetDir = path.join(archiveDir, y, m);
  fs.mkdirSync(targetDir, { recursive: true });
  const name = path.basename(sourceFile);
  fs.renameSync(sourceFile, path.join(targetDir, name));
  console.log('Archived:', name);
}

function main() {
  const inputDir = path.join(baseDir, 'input');
  const dataDir = path.join(baseDir, 'data');
  const outputFile = path.join(dataDir, 'usage-events.csv');
  const archiveDir = path.join(inputDir, 'archive', 'usage-events');

  let existing: Record<string, string>[] = [];
  if (fs.existsSync(outputFile)) {
    existing = readCSV(outputFile);
  }

  const csvFiles = findAllInputCSVFiles(inputDir);
  if (csvFiles.length === 0) {
    console.log('No input CSV files found');
    return;
  }

  let allNew: Record<string, string>[] = [];
  const toArchive: { path: string; dateString: string }[] = [];

  for (const cf of csvFiles) {
    const rows = readCSV(cf.path);
    if (rows.length > 0) {
      allNew = allNew.concat(rows);
      toArchive.push({ path: cf.path, dateString: cf.dateString });
    }
  }

  if (allNew.length === 0) {
    console.log('No new data');
    return;
  }

  const merged = removeDuplicates(existing.concat(allNew));
  const sorted = sortByDate(merged);
  const headers =
    existing.length > 0
      ? Object.keys(existing[0])
      : [
          'Date',
          'Kind',
          'Model',
          'Max Mode',
          'Input (w/ Cache Write)',
          'Input (w/o Cache Write)',
          'Cache Read',
          'Output Tokens',
          'Total Tokens',
          'Cost',
        ];
  writeCSV(outputFile, sorted, headers);

  for (const { path: p, dateString } of toArchive) {
    moveToArchive(p, archiveDir, dateString);
  }
}

main();
