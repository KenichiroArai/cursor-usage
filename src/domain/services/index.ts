import type { SummaryRecord, IncludedUsageRecord } from '@/types';

export function calculatePreviousDayDifference(
  currentRecord: { totalTokens: number; inputWithCache: number; inputWithoutCache: number; output: number; apiCost: string },
  previousRecord: { totalTokens: number; inputWithCache: number; inputWithoutCache: number; output: number; apiCost: string } | null
) {
  if (!previousRecord) {
    return { totalTokens: null, input: null, output: null, apiCost: null };
  }
  return {
    totalTokens: currentRecord.totalTokens - previousRecord.totalTokens,
    input:
      currentRecord.inputWithCache +
      currentRecord.inputWithoutCache -
      (previousRecord.inputWithCache + previousRecord.inputWithoutCache),
    output: currentRecord.output - previousRecord.output,
    apiCost: parseFloat(currentRecord.apiCost || '0') - parseFloat(previousRecord.apiCost || '0'),
  };
}

export function calculatePreviousDayDifferenceWithReset(
  currentRecord: SummaryRecord | IncludedUsageRecord,
  previousRecord: SummaryRecord | IncludedUsageRecord | null
) {
  if (!previousRecord) {
    return { totalTokens: null, input: null, output: null, apiCost: null };
  }
  const curr = currentRecord as SummaryRecord & { totalTokens?: number; input?: number };
  const prev = previousRecord as SummaryRecord & { totalTokens?: number; input?: number };
  const isReset =
    (curr.totalTokens ?? curr.total) < (prev.totalTokens ?? prev.total) ||
    (curr.input ?? 0) < (prev.input ?? 0) ||
    curr.output < prev.output ||
    parseFloat((curr as SummaryRecord).apiCost || '0') < parseFloat((prev as SummaryRecord).apiCost || '0');

  if (isReset) {
    return { totalTokens: 0, input: 0, output: 0, apiCost: 0 };
  }
  return {
    totalTokens: (curr.totalTokens ?? curr.total) - (prev.totalTokens ?? prev.total),
    input: (curr.input ?? 0) - (prev.input ?? 0),
    output: curr.output - prev.output,
    apiCost: parseFloat((curr as SummaryRecord).apiCost || '0') - parseFloat((prev as SummaryRecord).apiCost || '0'),
  };
}

export function mergeTokensData(
  tokensData: Array<Record<string, unknown>>,
  detailsData: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const mergedData: Array<Record<string, unknown>> = [];
  const detailsMap = new Map<string, Record<string, unknown>>();

  detailsData.forEach((detail) => {
    const key = (detail.Date as Date).toISOString();
    detailsMap.set(key, detail);
  });

  tokensData.forEach((token) => {
    const key = (token.Date as Date).toISOString();
    const detail = detailsMap.get(key);
    if (detail) {
      mergedData.push({
        ...token,
        'Max Mode': detail['Max Mode'] || token['Max Mode'] || 'No',
        Kind: detail['Kind'] || token['Kind'] || 'Included in Pro',
      });
    } else {
      mergedData.push(token);
    }
  });

  detailsData.forEach((detail) => {
    const key = (detail.Date as Date).toISOString();
    const existing = mergedData.find((t) => (t.Date as Date).toISOString() === key);
    if (!existing) {
      mergedData.push({
        Date: detail.Date,
        User: detail.User || 'You',
        Kind: detail.Kind || 'Included in Pro',
        'Max Mode': detail['Max Mode'] || 'No',
        Model: detail.Model || 'auto',
        'Input (w/ Cache Write)': 0,
        'Input (w/o Cache Write)': 0,
        'Cache Read': 0,
        Output: 0,
        'Total Tokens': (detail as Record<string, unknown>).Tokens || 0,
        'Cost ($)': detail['Cost ($)'] || 'Included',
      });
    }
  });

  mergedData.sort(
    (a, b) => (a.Date as Date).getTime() - (b.Date as Date).getTime()
  );
  return mergedData;
}
