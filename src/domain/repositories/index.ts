'use client';

import * as XLSX from 'xlsx';
import { parseCSVLine, formatDate } from '@/utils';
import type {
  RecordData,
  SummaryRecord,
  UsageEventRecord,
  IncludedUsageRecord,
} from '@/types';
import { mergeTokensData } from '../services';
import { getDataUrl } from '@/config';

export async function loadRecordsData(): Promise<RecordData[]> {
  const response = await fetch(getDataUrl('/record.xlsx'));
  if (!response.ok) throw new Error('Excelの読み込みに失敗しました');
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  return raw.map((r) => ({
    記録日: formatDate(r.記録日) || String(r.記録日 || ''),
    日数: parseInt(String(r.日数 || 0)) || 0,
    'Fast requests will refresh in X day':
      parseInt(String(r['Fast requests will refresh in X day'] || 0)) || 0,
    'Suggested Lines: X lines':
      parseInt(String(r['Suggested Lines: X lines'] || 0)) || 0,
    'Accepted Lines: X Lines':
      parseInt(String(r['Accepted Lines: X Lines'] || 0)) || 0,
    'Tabs Accepted: X tabs':
      parseInt(String(r['Tabs Accepted: X tabs'] || 0)) || 0,
  }));
}

export async function loadSummaryData(): Promise<SummaryRecord[]> {
  const response = await fetch(getDataUrl('/record.xlsx'));
  if (!response.ok) throw new Error('Excelの読み込みに失敗しました');
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const sheetName =
    workbook.SheetNames.find((n) => n.includes('Summary')) ||
    workbook.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(
    workbook.Sheets[sheetName],
    { header: 1 }
  );

  const result: SummaryRecord[] = [];
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row || row.length < 2) continue;
    const dateStr = row[0];
    let date: Date;
    if (dateStr instanceof Date) {
      date = dateStr;
    } else if (typeof dateStr === 'number') {
      date = new Date((dateStr - 25569) * 86400 * 1000);
    } else {
      date = new Date(String(dateStr));
    }
    if (isNaN(date.getTime())) continue;
    result.push({
      date,
      dateStr: date.toLocaleDateString('ja-JP'),
      model: String(row[1] || ''),
      cacheRead: parseFloat(String(row[2] || 0)) || 0,
      cacheWrite: parseFloat(String(row[3] || 0)) || 0,
      input: parseFloat(String(row[4] || 0)) || 0,
      output: parseFloat(String(row[5] || 0)) || 0,
      total: parseFloat(String(row[6] || 0)) || 0,
      apiCost: String(row[7] || '$0'),
      costToYou: String(row[8] || '$0'),
    });
  }
  return result;
}

export async function loadUsageEventsData(): Promise<UsageEventRecord[]> {
  const response = await fetch(getDataUrl('/usage-events.csv'));
  if (!response.ok) throw new Error('Usage Events CSVの読み込みに失敗しました');
  const text = await response.text();
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const data: UsageEventRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;
    const row: Record<string, string | number | Date> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx].trim();
    });
    const date = new Date(row['Date'] as string);
    if (isNaN(date.getTime())) continue;
    data.push({
      Date: date,
      Kind: String(row['Kind'] || ''),
      Model: String(row['Model'] || ''),
      'Max Mode': String(row['Max Mode'] || ''),
      'Input (w/ Cache Write)': parseInt(String(row['Input (w/ Cache Write)'] || 0)) || 0,
      'Input (w/o Cache Write)': parseInt(String(row['Input (w/o Cache Write)'] || 0)) || 0,
      'Cache Read': parseInt(String(row['Cache Read'] || 0)) || 0,
      'Output Tokens': parseInt(String(row['Output Tokens'] || 0)) || 0,
      'Total Tokens': parseInt(String(row['Total Tokens'] || 0)) || 0,
      Cost: String(row['Cost'] || 'Included'),
    });
  }
  data.sort((a, b) => a.Date.getTime() - b.Date.getTime());
  return data;
}

export async function loadIncludedUsageData(): Promise<IncludedUsageRecord[]> {
  const response = await fetch(getDataUrl('/record.xlsx'));
  if (!response.ok) throw new Error('Excelの読み込みに失敗しました');
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const sheetName =
    workbook.SheetNames.find((n) =>
      n.toLowerCase().includes('included')
    ) || workbook.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(
    workbook.Sheets[sheetName],
    { header: 1 }
  );

  const result: IncludedUsageRecord[] = [];
  let currentDate: Date | null = null;
  let previousInput = 0;

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[];
    if (!row || row.length < 2) continue;

    const dateCell = row[0];
    const model = String(row[1] || '').trim();
    const inputWithCache =
      parseInt(String(row[2] || 0).replace(/,/g, '')) || 0;
    const inputWithoutCache =
      parseInt(String(row[3] || 0).replace(/,/g, '')) || 0;
    const cacheRead = parseInt(String(row[4] || 0).replace(/,/g, '')) || 0;
    const output = parseInt(String(row[5] || 0).replace(/,/g, '')) || 0;
    const totalTokens = parseInt(String(row[6] || 0).replace(/,/g, '')) || 0;
    const input = inputWithCache + inputWithoutCache;

    if (
      dateCell &&
      String(dateCell).trim() &&
      !String(dateCell).includes('Total')
    ) {
      const d = new Date(String(dateCell));
      if (!isNaN(d.getTime())) {
        currentDate = d;
        if (input < previousInput && previousInput > 0) {
          previousInput = input;
        } else {
          previousInput = input;
        }
      }
    }

    if (currentDate && model) {
      result.push({
        date: currentDate,
        dateStr: currentDate.toLocaleDateString('ja-JP'),
        model,
        input,
        inputWithCache,
        inputWithoutCache,
        output,
        cacheRead,
        totalTokens,
        apiCost: String(row[7] || ''),
        costToYou: String(row[8] || ''),
        month: currentDate.getMonth(),
        monthCleared: input < previousInput && previousInput > 0,
      });
    }
  }

  result.sort((a, b) => {
    if (a.date.getTime() !== b.date.getTime()) {
      return a.date.getTime() - b.date.getTime();
    }
    return a.model.localeCompare(b.model);
  });
  return result;
}

export async function loadUsageTokensData(): Promise<Array<Record<string, unknown>>> {
  const response = await fetch(getDataUrl('/old/usage-tokens.csv'));
  if (!response.ok) throw new Error('usage-tokens.csvの読み込みに失敗しました');
  const text = await response.text();
  const lines = text.split(/\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const data: Array<Record<string, unknown>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() ?? '';
    });
    const date = new Date(row['Date'] as string);
    if (isNaN(date.getTime())) continue;
    row['Date'] = date;
    row['Input (w/ Cache Write)'] = parseInt(String(row['Input (w/ Cache Write)'] || 0)) || 0;
    row['Input (w/o Cache Write)'] = parseInt(String(row['Input (w/o Cache Write)'] || 0)) || 0;
    row['Cache Read'] = parseInt(String(row['Cache Read'] || 0)) || 0;
    row['Output'] = parseInt(String(row['Output'] || 0)) || 0;
    row['Total Tokens'] = parseInt(String(row['Total Tokens'] || 0)) || 0;
    row['Cost ($)'] = row['Cost ($)'] || 'Included';
    data.push(row);
  }
  data.sort((a, b) => (a.Date as Date).getTime() - (b.Date as Date).getTime());
  return data;
}

export async function loadUsageDetailsData(): Promise<Array<Record<string, unknown>>> {
  const response = await fetch(getDataUrl('/old/usage-details.csv'));
  if (!response.ok) throw new Error('usage-details.csvの読み込みに失敗しました');
  const text = await response.text();
  const lines = text.split(/\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const data: Array<Record<string, unknown>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() ?? '';
    });
    const date = new Date(row['Date'] as string);
    if (isNaN(date.getTime())) continue;
    row['Date'] = date;
    row['Tokens'] = parseInt(String(row['Tokens'] || 0)) || 0;
    row['Cost ($)'] = row['Cost ($)'] || 'Included';
    data.push(row);
  }
  data.sort((a, b) => (a.Date as Date).getTime() - (b.Date as Date).getTime());
  return data;
}

export async function loadUsageData(): Promise<Array<Record<string, unknown>>> {
  const [tokens, details] = await Promise.all([
    loadUsageTokensData(),
    loadUsageDetailsData(),
  ]);
  return mergeTokensData(tokens, details);
}

export async function loadVersionInfo(): Promise<{
  version: { current: string };
  github?: { issue_url: string; issue_number: number };
  features?: string[];
  metadata?: Record<string, string>;
}> {
  const response = await fetch(getDataUrl('/fc200-version-info.yaml'));
  if (!response.ok) return { version: { current: 'v0.7.0' } };
  const text = await response.text();
  const yaml = await import('js-yaml');
  return yaml.load(text) as ReturnType<typeof loadVersionInfo> extends Promise<
    infer R
  >
    ? R
    : never;
}
