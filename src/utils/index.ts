export function parseDate(dateStr: unknown): Date | null {
  if (!dateStr) return null;

  const serialNumber = parseFloat(String(dateStr));
  if (!isNaN(serialNumber) && serialNumber > 1) {
    const date = new Date((serialNumber - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date;
  }

  const str = String(dateStr);
  const match = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    const date = new Date(
      parseInt(match[1]),
      parseInt(match[2]) - 1,
      parseInt(match[3])
    );
    if (!isNaN(date.getTime())) return date;
  }

  const match2 = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match2) {
    const date = new Date(
      parseInt(match2[1]),
      parseInt(match2[2]) - 1,
      parseInt(match2[3])
    );
    if (!isNaN(date.getTime())) return date;
  }

  const date = new Date(str);
  return !isNaN(date.getTime()) ? date : null;
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((item) => item.replace(/^"|"$/g, ''));
}

export function formatDate(serial: number | string | unknown): string {
  if (serial == null) return '';
  const num = typeof serial === 'number' ? serial : parseFloat(String(serial));
  if (isNaN(num)) return String(serial);
  const date = new Date((num - 25569) * 86400 * 1000);
  return date.toLocaleDateString('ja-JP');
}

export function formatDifference(
  value: number | null | undefined,
  isPercentage = false
): string {
  if (value === null || value === undefined) return '-';
  if (value === 0) return '±0';
  const sign = value > 0 ? '+' : '';
  const formattedValue = Math.abs(value).toLocaleString();
  return isPercentage ? `${sign}${value.toFixed(2)}%` : `${sign}${formattedValue}`;
}

export function getDifferenceClass(
  value: number | null | undefined
): string {
  if (value === null || value === undefined) return '';
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-danger';
  return 'text-muted';
}

export function calculateDifferenceWithReset(
  currentValue: number,
  previousValue: number | null | undefined
): number | null {
  if (previousValue === null || previousValue === undefined) return null;
  if (currentValue < previousValue && previousValue > 0) return 0;
  return currentValue - previousValue;
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 80) return '#28a745';
  if (percentage >= 60) return '#17a2b8';
  if (percentage >= 40) return '#ffc107';
  return '#dc3545';
}
