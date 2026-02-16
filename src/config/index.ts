const basePath =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BASE_PATH) ??
  (process.env.NODE_ENV === 'production' ? '/cursor-usage' : '');

export const config = {
  basePath,
  dataPath: `${basePath}/data`,
} as const;

export function getDataUrl(path: string): string {
  const base = config.basePath || '';
  return `${base}/data${path.startsWith('/') ? path : `/${path}`}`;
}
