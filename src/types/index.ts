export interface RecordData {
  記録日: string;
  日数: number;
  'Fast requests will refresh in X day': number;
  'Suggested Lines: X lines': number;
  'Accepted Lines: X Lines': number;
  'Tabs Accepted: X tabs': number;
}

export interface SummaryRecord {
  date: Date;
  dateStr: string;
  model: string;
  cacheRead: number;
  cacheWrite: number;
  input: number;
  output: number;
  total: number;
  apiCost: string;
  costToYou: string;
}

export interface UsageEventRecord {
  Date: Date;
  Kind: string;
  Model: string;
  'Max Mode': string;
  'Input (w/ Cache Write)': number;
  'Input (w/o Cache Write)': number;
  'Cache Read': number;
  'Output Tokens': number;
  'Total Tokens': number;
  Cost: string;
}

export interface IncludedUsageRecord {
  date: Date;
  dateStr: string;
  model: string;
  input: number;
  inputWithCache: number;
  inputWithoutCache: number;
  output: number;
  cacheRead: number;
  totalTokens: number;
  apiCost: string;
  costToYou: string;
  month: number;
  monthCleared: boolean;
}

export interface UsageTokensRecord {
  Date: Date;
  User: string;
  Kind: string;
  'Max Mode': string;
  Model: string;
  'Input (w/ Cache Write)': number;
  'Input (w/o Cache Write)': number;
  'Cache Read': number;
  Output: number;
  'Total Tokens': number;
  'Cost ($)': string;
}

export interface VersionInfo {
  version: { current: string };
  github?: { release_url: string };
  features?: string[];
  metadata?: Record<string, string>;
}
