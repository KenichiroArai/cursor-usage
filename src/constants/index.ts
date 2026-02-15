/** basePath は含めない。Next.js の Link が自動で付与する。 */
export const ROUTES = {
  HOME: '/',
  RECORDS: '/fa002-records/',
  SUMMARY: '/fa006-summary/',
  USAGE_EVENTS: '/fa007-usage-events/',
  OLD_FORMAT: '/fa005-old-format/',
  OLD_USAGE: '/old/fa003-usage/',
  OLD_INCLUDED_USAGE: '/old/fa004-included-usage/',
} as const;

export const TOTAL_DAYS = 30;

export const CHART_COLORS = [
  '#007bff',
  '#28a745',
  '#ffc107',
  '#dc3545',
  '#6f42c1',
  '#fd7e14',
  '#20c997',
  '#6c757d',
];
