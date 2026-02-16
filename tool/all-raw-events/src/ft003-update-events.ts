import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..'); // tool/all-raw-events
const projectRoot = path.join(baseDir, '..', '..');
const dataDir = path.join(projectRoot, 'public', 'data');

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
    const headers = lines[0].split(',');
    const data: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]
            ? values[index].trim().replace(/^"|"$/g, '')
            : '';
        });
        data.push(row);
      }
    }
    return data;
  } catch (e) {
    console.error(`CSVファイルの読み込みエラー: ${filePath}`, (e as Error).message);
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
  try {
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
    console.log(`CSVファイルを更新しました: ${filePath}`);
  } catch (e) {
    console.error(`CSVファイルの書き込みエラー: ${filePath}`, (e as Error).message);
  }
}

function findAllInputCSVFiles(inputDir: string) {
  try {
    const files = fs.readdirSync(inputDir);
    const csvFiles = files
      .filter((f) => f.startsWith('usage-events-') && f.endsWith('.csv'))
      .map((f) => {
        const m = f.match(/usage-events-(\d{4}-\d{2}-\d{2})/);
        if (!m) return null;
        return {
          file: f,
          path: path.join(inputDir, f),
          date: new Date(m[1]),
          dateString: m[1],
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    console.log(`${csvFiles.length}個のusage-events CSVファイルを発見しました`);
    return csvFiles;
  } catch (e) {
    console.error(`inputフォルダの読み込みエラー: ${inputDir}`, (e as Error).message);
    return [];
  }
}

function moveToArchive(
  sourceFile: string,
  archiveDir: string,
  dateString: string
) {
  try {
    const [y, m] = dateString.split('-');
    const folderPath = `${y}/${m}`;
    const targetDir = path.join(archiveDir, folderPath);
    fs.mkdirSync(targetDir, { recursive: true });
    const name = path.basename(sourceFile);
    fs.renameSync(sourceFile, path.join(targetDir, name));
    console.log(`ファイルをアーカイブに移動しました: ${name} → ${folderPath}/`);
  } catch (e) {
    console.error(`ファイルの移動エラー: ${sourceFile}`, (e as Error).message);
  }
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function main() {
  ensureDir(dataDir);
  const inputDir = path.join(baseDir, 'input');
  const outputFile = path.join(dataDir, 'usage-events.csv');
  const archiveDir = path.join(inputDir, 'archive', 'usage-events');

  console.log('usage-events CSVファイルの更新を開始します...');

  let existing: Record<string, string>[] = [];
  if (fs.existsSync(outputFile)) {
    existing = readCSV(outputFile);
    console.log(`既存のデータを読み込みました: ${existing.length}件`);
  }

  const csvFiles = findAllInputCSVFiles(inputDir);
  if (csvFiles.length === 0) {
    console.log('処理するCSVファイルが見つかりませんでした');
    return;
  }

  let allNew: Record<string, string>[] = [];
  const toArchive: { path: string; dateString: string }[] = [];

  for (const cf of csvFiles) {
    console.log(`CSVファイルを処理中: ${cf.file} (日付: ${cf.dateString})`);
    const rows = readCSV(cf.path);
    if (rows.length > 0) {
      allNew = allNew.concat(rows);
      toArchive.push({ path: cf.path, dateString: cf.dateString });
      console.log(`  ${rows.length}件のデータを読み込みました`);
    } else {
      console.log(`  ${cf.file}にはデータが含まれていませんでした`);
    }
  }

  if (allNew.length === 0) {
    console.log('処理対象となるデータが見つかりませんでした');
    return;
  }

  const merged = existing.concat(allNew);
  console.log(`合計 ${allNew.length}件の新しいデータを追加しました`);

  const unique = removeDuplicates(merged);
  console.log(`重複排除後: ${unique.length}件`);

  const sorted = sortByDate(unique);
  console.log('日付順にソートしました（最新順）');

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

  console.log('usage-events CSVファイルの更新が完了しました！');
  console.log(`最終的なデータ件数: ${sorted.length}件`);

  console.log('\n処理済みファイルをアーカイブに移動しています...');
  for (const { path: p, dateString } of toArchive) {
    moveToArchive(p, archiveDir, dateString);
  }
  console.log('アーカイブ処理が完了しました！');
}

main();
