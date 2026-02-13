#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CSV_PATH = path.resolve(__dirname, 'data', 'usage-events.csv');
const SCRIPT_NAME = path.basename(process.argv[1] || __filename);

function printHelp() {
	console.log([
		'使用方法:',
		`  node ${SCRIPT_NAME} [オプション] [開始日付] [終了日付]`,
		'',
		'日付形式:',
		'  YYYY/MM/DD （例: 2025/11/01）',
		'  開始日のみ指定時は、終了日 = 実行日',
		'  指定なしの場合は、ヘルプを表示し、全期間集計実行可否を確認',
		'',
		'オプション:',
		'  -h, --help     このヘルプを表示',
		'  -a, --all      引数なし時に確認なしで全期間のモデル別コストを算出',
		'  -d, --daily    日別累計を出力（期間指定時に有効）',
		'',
		'例:',
		`  node ${SCRIPT_NAME} 2025/11/01 2025/11/30`,
		`  node ${SCRIPT_NAME} 2025/11/01               # 終了日は実行日`,
		`  node ${SCRIPT_NAME} --daily 2025/11/01 2025/11/30`,
		`  node ${SCRIPT_NAME} --all                    # 全期間を即時集計`,
	].join('\n'));
}

function isNumeric(value) {
	return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)));
}

// CSV 1行を簡易パースして列配列を返す（ダブルクォートで囲まれたカンマに対応）
function parseCsvLine(line) {
	const cols = [];
	let cur = '';
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
				cur += '"';
				i++; // エスケープされた二重引用符を1つとして扱う
			} else {
				inQuotes = !inQuotes;
			}
		} else if (ch === ',' && !inQuotes) {
			cols.push(cur.trim());
			cur = '';
		} else {
			cur += ch;
		}
	}
	cols.push(cur.trim());
	return cols;
}

function parseInputDate(dateStr) {
	// 許容: YYYY/MM/DD または YYYY-MM-DD
	const m = dateStr.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
	// UTCの一日の始端/終端で扱う
	const startUtcMs = Date.UTC(y, mo - 1, d, 0, 0, 0, 0);
	const endUtcMs = Date.UTC(y, mo - 1, d, 23, 59, 59, 999);
	return { y, mo, d, startUtcMs, endUtcMs };
}

function formatYmdSlashFromUtcMs(utcMs) {
	const d = new Date(utcMs);
	// UTCで日付を取り出す
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${y}/${m}/${day}`;
}

function endOfTodayUtcMs() {
	const now = new Date();
	return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999);
}

function readCsvLines(filePath) {
	const content = fs.readFileSync(filePath, 'utf8');
	const lines = content.split(/\r?\n/);
	// 先頭はヘッダ
	return lines.filter((_, idx) => idx !== 0 && _ !== '');
}

function computeTotals(lines, startUtcMs, endUtcMs, wantDaily) {
	const perDay = new Map();   // key: 'YYYY/MM/DD', value: sum
	const perModel = new Map(); // key: model, value: sum

	for (const line of lines) {
		const cols = parseCsvLine(line);
		if (cols.length < 10) continue;

		const dateStr = cols[0];
		const model = cols[2] || 'Unknown';
		const costStr = cols[9];

		if (!dateStr) continue;
		const rowDateMs = Date.parse(dateStr); // ISO (Z) を想定
		if (isNaN(rowDateMs)) continue;
		if (startUtcMs != null && rowDateMs < startUtcMs) continue;
		if (endUtcMs != null && rowDateMs > endUtcMs) continue;

		const cost = isNumeric(costStr) ? Number(costStr) : 0;
		if (!Number.isFinite(cost)) continue;

		perModel.set(model, (perModel.get(model) || 0) + cost);

		if (wantDaily) {
			// UTC日付基準
			const dayKey = formatYmdSlashFromUtcMs(Date.UTC(
				new Date(rowDateMs).getUTCFullYear(),
				new Date(rowDateMs).getUTCMonth(),
				new Date(rowDateMs).getUTCDate(), 0, 0, 0, 0
			));
			perDay.set(dayKey, (perDay.get(dayKey) || 0) + cost);
		}
	}

	const total = Array.from(perModel.values()).reduce((sum, v) => sum + v, 0);
	return { total, perDay, perModel };
}

function printPerModel(perModel) {
	console.log('\nモデル別コスト:');
	if (perModel.size === 0) {
		console.log('  該当データがありません。');
		return;
	}
	const sorted = Array.from(perModel.entries()).sort((a, b) => {
		if (b[1] !== a[1]) return b[1] - a[1];
		return a[0].localeCompare(b[0]);
	});
	for (const [model, cost] of sorted) {
		console.log(`  ${model}: ${cost.toFixed(2)}`);
	}
}

function parseArgs(argv) {
	const args = argv.slice(2);
	const opts = { help: false, all: false, daily: false, dates: [] };
	for (const a of args) {
		if (a === '-h' || a === '--help') opts.help = true;
		else if (a === '-a' || a === '--all') opts.all = true;
		else if (a === '-d' || a === '--daily') opts.daily = true;
		else opts.dates.push(a);
	}
	return opts;
}

async function promptYesNo(question) {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const answer = await new Promise(resolve => rl.question(question, ans => resolve(ans)));
	rl.close();
	const a = String(answer).trim().toLowerCase();
	return a === 'y' || a === 'yes';
}

async function main() {
	try {
		const opts = parseArgs(process.argv);
		if (opts.help) {
			printHelp();
			return;
		}
		if (!fs.existsSync(CSV_PATH)) {
			console.error('CSVファイルが見つかりません:', CSV_PATH);
			process.exitCode = 1;
			return;
		}

		const lines = readCsvLines(CSV_PATH);

		// 日付解釈
		let startUtcMs = null;
		let endUtcMs = null;

		if (opts.dates.length === 0) {
			// 引数なし
			printHelp();
			if (opts.all) {
				const { perModel, total } = computeTotals(lines, null, null, false);
				console.log('');
				printPerModel(perModel);
				console.log('\n合計(total): ', total.toFixed(2));
				return;
			}
			const ok = await promptYesNo('\n全期間のモデル別コストを算出しますか？ (y/N): ');
			if (!ok) {
				console.log('キャンセルしました。');
				return;
			}
			const { perModel, total } = computeTotals(lines, null, null, false);
			printPerModel(perModel);
			console.log('\n合計(total): ', total.toFixed(2));
			return;
		} else if (opts.dates.length === 1) {
			const start = parseInputDate(opts.dates[0]);
			if (!start) {
				console.error('開始日付の形式が不正です: ', opts.dates[0]);
				process.exitCode = 1;
				return;
			}
			startUtcMs = start.startUtcMs;
			endUtcMs = endOfTodayUtcMs();
		} else if (opts.dates.length >= 2) {
			const start = parseInputDate(opts.dates[0]);
			const end = parseInputDate(opts.dates[1]);
			if (!start) {
				console.error('開始日付の形式が不正です: ', opts.dates[0]);
				process.exitCode = 1;
				return;
			}
			if (!end) {
				console.error('終了日付の形式が不正です: ', opts.dates[1]);
				process.exitCode = 1;
				return;
			}
			startUtcMs = start.startUtcMs;
			endUtcMs = end.endUtcMs;
			if (endUtcMs < startUtcMs) {
				console.error('終了日付は開始日付以降を指定してください。');
				process.exitCode = 1;
				return;
			}
		}

		const { perDay, perModel, total } = computeTotals(lines, startUtcMs, endUtcMs, opts.daily);

		// 出力
		if (startUtcMs != null || endUtcMs != null) {
			const rangeStr = [
				startUtcMs != null ? formatYmdSlashFromUtcMs(startUtcMs) : '（指定なし）',
				endUtcMs != null ? formatYmdSlashFromUtcMs(endUtcMs) : '（指定なし）',
			].join(' 〜 ');
			console.log('集計期間: ', rangeStr);
		}

		if (opts.daily) {
			console.log('\n日別累計:');
			// 期間内の全日を表示（合計0も表示）
			let cursor = (startUtcMs != null) ? Date.UTC(new Date(startUtcMs).getUTCFullYear(), new Date(startUtcMs).getUTCMonth(), new Date(startUtcMs).getUTCDate(), 0, 0, 0, 0) : null;
			const last = (endUtcMs != null) ? Date.UTC(new Date(endUtcMs).getUTCFullYear(), new Date(endUtcMs).getUTCMonth(), new Date(endUtcMs).getUTCDate(), 0, 0, 0, 0) : null;
			if (cursor != null && last != null) {
				let running = 0;
				while (cursor <= last) {
					const key = formatYmdSlashFromUtcMs(cursor);
					const v = perDay.get(key) || 0;
					running += v;
					console.log(`  ${key}: ${running.toFixed(2)}`);
					// 翌日へ（UTCで1日進める）
					cursor = cursor + 24 * 60 * 60 * 1000;
				}
			} else {
				// 日付未指定の場合は、存在するキーのみ表示
				const sorted = Array.from(perDay.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
				let running = 0;
				for (const [k, v] of sorted) {
					running += v;
					console.log(`  ${k}: ${running.toFixed(2)}`);
				}
			}
		}

		printPerModel(perModel);
		console.log('\n合計(total): ', total.toFixed(2));
	} catch (err) {
		console.error('エラーが発生しました:', err && err.message ? err.message : err);
		process.exitCode = 1;
	}
}

main();

