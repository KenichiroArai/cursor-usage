import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');
const CSV_PATH = path.join(baseDir, 'data', 'usage-events.csv');

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

function parseInputDate(dateStr: string) {
  const m = dateStr.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return {
    startUtcMs: Date.UTC(y, mo - 1, d, 0, 0, 0, 0),
    endUtcMs: Date.UTC(y, mo - 1, d, 23, 59, 59, 999),
  };
}

function formatYmd(utcMs: number) {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function endOfTodayUtcMs() {
  const now = new Date();
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23,
    59,
    59,
    999
  );
}

function readCsvLines(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  return lines.filter((_, idx) => idx !== 0 && _ !== '');
}

function computeTotals(
  lines: string[],
  startUtcMs: number | null,
  endUtcMs: number | null,
  wantDaily: boolean
) {
  const perDay = new Map<string, number>();
  const perModel = new Map<string, number>();

  for (const line of lines) {
    const cols = parseCsvLine(line);
    if (cols.length < 10) continue;
    const dateStr = cols[0];
    const model = cols[2] || 'Unknown';
    const costStr = cols[9];
    const rowDateMs = Date.parse(dateStr);
    if (isNaN(rowDateMs)) continue;
    if (startUtcMs != null && rowDateMs < startUtcMs) continue;
    if (endUtcMs != null && rowDateMs > endUtcMs) continue;
    const cost = /^\d/.test(String(costStr)) ? Number(costStr) : 0;
    if (!Number.isFinite(cost)) continue;
    perModel.set(model, (perModel.get(model) ?? 0) + cost);
    if (wantDaily) {
      const d = new Date(rowDateMs);
      const key = formatYmd(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
      );
      perDay.set(key, (perDay.get(key) ?? 0) + cost);
    }
  }

  const total = Array.from(perModel.values()).reduce((s, v) => s + v, 0);
  return { total, perDay, perModel };
}

function printHelp() {
  console.log(`
使用方法:
  tsx ft004-calc-api-cost.ts [オプション] [開始日付] [終了日付]

オプション:
  -h, --help     ヘルプを表示
  -a, --all      全期間を即時集計
  -d, --daily    日別累計を出力
`);
}

async function main() {
  const args = process.argv.slice(2);
  const opts = { help: false, all: false, daily: false, dates: [] as string[] };
  for (const a of args) {
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '-a' || a === '--all') opts.all = true;
    else if (a === '-d' || a === '--daily') opts.daily = true;
    else opts.dates.push(a);
  }

  if (opts.help) {
    printHelp();
    return;
  }
  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV not found:', CSV_PATH);
    process.exitCode = 1;
    return;
  }

  const lines = readCsvLines(CSV_PATH);
  let startUtcMs: number | null = null;
  let endUtcMs: number | null = null;

  if (opts.dates.length === 1) {
    const start = parseInputDate(opts.dates[0]);
    if (!start) {
      console.error('Invalid start date');
      process.exitCode = 1;
      return;
    }
    startUtcMs = start.startUtcMs;
    endUtcMs = endOfTodayUtcMs();
  } else if (opts.dates.length >= 2) {
    const start = parseInputDate(opts.dates[0]);
    const end = parseInputDate(opts.dates[1]);
    if (!start || !end) {
      console.error('Invalid dates');
      process.exitCode = 1;
      return;
    }
    startUtcMs = start.startUtcMs;
    endUtcMs = end.endUtcMs;
  }

  const { total, perModel } = computeTotals(
    lines,
    startUtcMs,
    endUtcMs,
    opts.daily
  );

  const sorted = Array.from(perModel.entries()).sort((a, b) => b[1] - a[1]);
  for (const [model, cost] of sorted) {
    console.log(`  ${model}: ${cost.toFixed(2)}`);
  }
  console.log('\n合計:', total.toFixed(2));
}

main();
