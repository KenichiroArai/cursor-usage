'use client';

import { useEffect, useState, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Fc100HeaderOld } from '@/components/layout/fc100-header-old';
import { loadUsageData } from '@/domain/repositories';
import { ROUTES, CHART_COLORS } from '@/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type UsageRecord = Record<string, unknown> & {
  Date: Date;
  User?: string;
  Kind?: string;
  'Max Mode'?: string;
  Model?: string;
  'Total Tokens'?: number;
  Tokens?: number;
  'Input (w/ Cache Write)'?: number;
  'Input (w/o Cache Write)'?: number;
  'Cache Read'?: number;
  Output?: number;
  'Cost ($)'?: string;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const TABLE_COLUMNS = [
  { key: 'Date', label: '日時' },
  { key: 'User', label: 'ユーザー' },
  { key: 'Kind', label: '種類' },
  { key: 'Max Mode', label: '最大モード' },
  { key: 'Model', label: 'モデル' },
  { key: 'Total Tokens', label: '総トークン数' },
  { key: 'Input (w/ Cache Write)', label: '入力（キャッシュ書き込み含む）' },
  { key: 'Input (w/o Cache Write)', label: '入力（キャッシュ書き込み除く）' },
  { key: 'Cache Read', label: 'キャッシュ読み取り' },
  { key: 'Output', label: '出力' },
  { key: 'Cost ($)', label: 'コスト' },
] as const;

type SortKey = (typeof TABLE_COLUMNS)[number]['key'];
type SortOrder = 'asc' | 'desc';

function getNum(record: UsageRecord, key: 'Total Tokens' | 'Tokens'): number {
  const v = record['Total Tokens'] ?? record.Tokens;
  return typeof v === 'number' ? v : 0;
}

function aggregateDaily(data: UsageRecord[]) {
  const daily: Record<
    string,
    {
      total: number;
      count: number;
      max: number;
      inputTotal: number;
      outputTotal: number;
      cacheReadTotal: number;
    }
  > = {};

  data.forEach((record) => {
    const dateStr = (record.Date as Date).toLocaleDateString('ja-JP');
    if (!daily[dateStr]) {
      daily[dateStr] = {
        total: 0,
        count: 0,
        max: 0,
        inputTotal: 0,
        outputTotal: 0,
        cacheReadTotal: 0,
      };
    }
    const d = daily[dateStr];
    const totalTokens = getNum(record, 'Total Tokens');
    d.total += totalTokens;
    d.count += 1;
    d.max = Math.max(d.max, totalTokens);
    d.inputTotal +=
      (Number(record['Input (w/ Cache Write)']) || 0) +
      (Number(record['Input (w/o Cache Write)']) || 0);
    d.outputTotal += Number(record['Output']) || 0;
    d.cacheReadTotal += Number(record['Cache Read']) || 0;
  });

  const dates = Array.from(Object.keys(daily))
    .map((dateStr) => new Date(dateStr))
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => d.toLocaleDateString('ja-JP'));

  return { dates, daily };
}

export function Fa003Usage() {
  const [data, setData] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('Date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    loadUsageData()
      .then((raw) => setData(raw as UsageRecord[]))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const { dates, daily } = useMemo(() => aggregateDaily(data), [data]);

  const latestDate = dates.length > 0 ? dates[dates.length - 1] : null;
  const latestDaily = latestDate ? daily[latestDate] : null;

  const dailyTotalTokens = latestDaily?.total ?? 0;
  const dailyAvgTokens = latestDaily
    ? Math.round(latestDaily.total / latestDaily.count)
    : 0;
  const dailyMaxTokens = latestDaily?.max ?? 0;
  const dailyInputTokens = latestDaily?.inputTotal ?? 0;
  const dailyOutputTokens = latestDaily?.outputTotal ?? 0;
  const dailyCacheReadTokens = latestDaily?.cacheReadTotal ?? 0;

  const chartData = useMemo(() => {
    return {
      labels: dates,
      datasets: [
        {
          label: '日別総トークン数',
          data: dates.map((d) => daily[d]?.total ?? 0),
          borderColor: CHART_COLORS[0],
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: '日別平均トークン数',
          data: dates.map((d) =>
            daily[d] ? Math.round(daily[d].total / daily[d].count) : 0
          ),
          borderColor: CHART_COLORS[1],
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          tension: 0.4,
          fill: false,
          yAxisID: 'y',
        },
        {
          label: '日別最大トークン数',
          data: dates.map((d) => daily[d]?.max ?? 0),
          borderColor: CHART_COLORS[2],
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          tension: 0.4,
          fill: false,
          yAxisID: 'y',
        },
        {
          label: '日別入力トークン数',
          data: dates.map((d) => daily[d]?.inputTotal ?? 0),
          borderColor: CHART_COLORS[3],
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          tension: 0.4,
          fill: false,
          yAxisID: 'y1',
        },
        {
          label: '日別出力トークン数',
          data: dates.map((d) => daily[d]?.outputTotal ?? 0),
          borderColor: CHART_COLORS[4],
          backgroundColor: 'rgba(111, 66, 193, 0.1)',
          tension: 0.4,
          fill: false,
          yAxisID: 'y1',
        },
        {
          label: '日別キャッシュ読み取り数',
          data: dates.map((d) => daily[d]?.cacheReadTotal ?? 0),
          borderColor: CHART_COLORS[5],
          backgroundColor: 'rgba(253, 126, 20, 0.1)',
          tension: 0.4,
          fill: false,
          yAxisID: 'y1',
        },
      ],
    };
  }, [dates, daily]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        axis: 'x' as const,
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: '日別トークン使用量（統合データ）',
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: (context: {
              dataset: { label?: string };
              parsed: { y: number | null };
            }) =>
              `${context.dataset.label ?? ''}: ${(context.parsed.y ?? 0).toLocaleString()}`,
          },
        },
        legend: {
          position: 'top' as const,
          labels: { usePointStyle: true, padding: 20 },
        },
      },
      scales: {
        x: {
          display: true,
          title: { display: true, text: '日付' },
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: { display: true, text: '総トークン数' },
          beginAtZero: true,
          ticks: {
            callback: (value: number | string) =>
              typeof value === 'number' ? value.toLocaleString() : value,
          },
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: { display: true, text: '入力/出力/キャッシュトークン数' },
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: {
            callback: (value: number | string) =>
              typeof value === 'number' ? value.toLocaleString() : value,
          },
        },
      },
    }),
    []
  );

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter(
      (r) =>
        (r.Date as Date).toLocaleString('ja-JP').toLowerCase().includes(q) ||
        String(r.User ?? '').toLowerCase().includes(q) ||
        String(r.Kind ?? '').toLowerCase().includes(q) ||
        String(r.Model ?? '').toLowerCase().includes(q) ||
        String(getNum(r, 'Total Tokens')).toLowerCase().includes(q)
    );
  }, [data, search]);

  const sortedData = useMemo(() => {
    const list = [...filteredData];
    return list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'Date') {
        cmp =
          (a.Date as Date).getTime() - (b.Date as Date).getTime();
      } else if (
        sortKey === 'Total Tokens' ||
        sortKey === 'Input (w/ Cache Write)' ||
        sortKey === 'Input (w/o Cache Write)' ||
        sortKey === 'Cache Read' ||
        sortKey === 'Output'
      ) {
        const av = Number(a[sortKey]) || 0;
        const bv = Number(b[sortKey]) || 0;
        cmp = av - bv;
      } else {
        cmp = String(a[sortKey] ?? '').localeCompare(
          String(b[sortKey] ?? '')
        );
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [filteredData, sortKey, sortOrder]);

  const totalFiltered = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(start, start + pageSize);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  function formatDateTime(date: Date) {
    return `${date.toLocaleDateString('ja-JP')} ${date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`;
  }

  function getTotalTokensClass(total: number) {
    if (total > 1000000) return 'tokens-high';
    if (total > 100000) return 'tokens-medium';
    return 'tokens-low';
  }

  if (loading) {
    return (
      <>
        <Fc100HeaderOld />
        <div className="container-fluid mt-3">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">読み込み中...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Fc100HeaderOld />
        <div className="container-fluid mt-3">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Fc100HeaderOld />
      <div className="container-fluid mt-3">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="text-center">Usage</h1>
            <p className="text-center text-muted">
              usage-tokens.csvとusage-details.csvを統合した詳細なトークン使用量の記録とグラフを確認できます
            </p>
          </div>
        </div>

        <div className="dashboard-container mb-4">
          <div className="row g-3">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title mb-0">最新の Usage 統計（統合データ）</h2>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">最新使用日</div>
                        <div className="stat-value-large">
                          {latestDate ?? '-'}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">日別総トークン数</div>
                        <div className="stat-value-large">
                          {dailyTotalTokens.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">日別平均トークン数</div>
                        <div className="stat-value-large">
                          {dailyAvgTokens.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">日別最大トークン数</div>
                        <div className="stat-value-large">
                          {dailyMaxTokens.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">日別入力トークン数</div>
                        <div className="stat-value-large">
                          {dailyInputTokens.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">日別出力トークン数</div>
                        <div className="stat-value-large">
                          {dailyOutputTokens.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">日別キャッシュ読み取り数</div>
                        <div className="stat-value-large">
                          {dailyCacheReadTokens.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">総レコード数</div>
                        <div className="stat-value-large">
                          {data.length.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-container mb-4">
          <div className="row g-3">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title mb-0">Usage グラフ（統合データ）</h2>
                </div>
                <div className="card-body">
                  <div className="chart-container-large">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title mb-0">Usage 一覧（統合データ）</h2>
          </div>
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <label htmlFor="fa003-page-size" className="mb-0">
                <select
                  id="fa003-page-size"
                  className="form-select form-select-sm"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="1ページの表示件数"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} 件表示
                    </option>
                  ))}
                </select>
              </label>
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="fa003-search" className="mb-0">
                  検索:
                </label>
                <input
                  id="fa003-search"
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="テキストで絞り込み"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Usage を検索"
                />
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-striped table-wide">
                <thead>
                  <tr>
                    {TABLE_COLUMNS.map(({ key, label }) => (
                      <th
                        key={key}
                        role="button"
                        onClick={() => handleSort(key)}
                        className="text-nowrap"
                      >
                        {label}
                        {sortKey === key && (
                          <span className="ms-1">
                            {sortOrder === 'asc' ? ' ▲' : ' ▼'}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => {
                    const total = getNum(row, 'Total Tokens');
                    return (
                      <tr key={`${(row.Date as Date).getTime()}-${idx}`}>
                        <td>{formatDateTime(row.Date as Date)}</td>
                        <td>{String(row.User ?? '')}</td>
                        <td>{String(row.Kind ?? '')}</td>
                        <td>{String(row['Max Mode'] ?? '')}</td>
                        <td>{String(row.Model ?? '')}</td>
                        <td
                          className={`text-end ${getTotalTokensClass(total)}`}
                        >
                          {total.toLocaleString()}
                        </td>
                        <td className="text-end">
                          {(Number(row['Input (w/ Cache Write)']) || 0).toLocaleString()}
                        </td>
                        <td className="text-end">
                          {(Number(row['Input (w/o Cache Write)']) || 0).toLocaleString()}
                        </td>
                        <td className="text-end">
                          {(Number(row['Cache Read']) || 0).toLocaleString()}
                        </td>
                        <td className="text-end">
                          {(Number(row['Output']) || 0).toLocaleString()}
                        </td>
                        <td>{String(row['Cost ($)'] ?? '')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
              <div className="text-muted small">
                {totalFiltered} 件中 {totalFiltered === 0 ? 0 : start + 1} から{' '}
                {Math.min(start + pageSize, totalFiltered)} まで表示
              </div>
              <nav aria-label="Usage 一覧のページネーション">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                    >
                      前
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 7) return true;
                      if (p === 1 || p === totalPages) return true;
                      if (Math.abs(p - currentPage) <= 2) return true;
                      return false;
                    })
                    .flatMap((p, i, arr) => {
                      const prev = arr[i - 1];
                      const showEllipsis = prev != null && p - prev > 1;
                      const items: ReactNode[] = [];
                      if (showEllipsis) {
                        items.push(
                          <li
                            key={`ellipsis-${p}`}
                            className="page-item disabled"
                          >
                            <span className="page-link">...</span>
                          </li>
                        );
                      }
                      items.push(
                        <li
                          key={p}
                          className={`page-item ${p === currentPage ? 'active' : ''}`}
                        >
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        </li>
                      );
                      return items;
                    })}
                  <li
                    className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      次
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="container mt-4">
        <Link href={ROUTES.HOME} className="btn btn-secondary">
          ← トップページに戻る
        </Link>
      </div>
    </>
  );
}
