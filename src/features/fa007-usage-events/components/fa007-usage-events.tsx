'use client';

import { useEffect, useState, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { Fc100HeaderMain } from '@/components/layout/fc100-header-main';
import { loadUsageEventsData } from '@/domain/repositories';
import type { UsageEventRecord } from '@/types';
import { ROUTES, CHART_COLORS } from '@/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const KIND_CHART_COLORS = [
  '#20c997',
  '#e83e8c',
  '#ffc107',
  '#17a2b8',
  '#6c757d',
];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const TABLE_COLUMNS = [
  { key: 'Date', label: '日時' },
  { key: 'Kind', label: '種別' },
  { key: 'Model', label: 'モデル' },
  { key: 'Max Mode', label: 'Max Mode' },
  { key: 'Input (w/ Cache Write)', label: 'Input (w/ Cache Write)' },
  { key: 'Input (w/o Cache Write)', label: 'Input (w/o Cache Write)' },
  { key: 'Cache Read', label: 'Cache Read' },
  { key: 'Output Tokens', label: 'Output Tokens' },
  { key: 'Total Tokens', label: 'Total Tokens' },
  { key: 'Cost', label: 'コスト' },
] as const;

type SortKey = (typeof TABLE_COLUMNS)[number]['key'];
type SortOrder = 'asc' | 'desc';

type DailyRow = {
  cost: number;
  inputWithCache: number;
  inputWithoutCache: number;
  cacheRead: number;
  outputTokens: number;
  totalTokens: number;
  kindCounts: Record<string, number>;
};

function aggregateDaily(data: UsageEventRecord[]): {
  dates: string[];
  daily: Record<string, DailyRow>;
} {
  const daily: Record<
    string,
    {
      cost: number;
      inputWithCache: number;
      inputWithoutCache: number;
      cacheRead: number;
      outputTokens: number;
      totalTokens: number;
      kindCounts: Record<string, number>;
    }
  > = {};

  data.forEach((record) => {
    const dateStr = record.Date.toLocaleDateString('ja-JP');
    if (!daily[dateStr]) {
      daily[dateStr] = {
        cost: 0,
        inputWithCache: 0,
        inputWithoutCache: 0,
        cacheRead: 0,
        outputTokens: 0,
        totalTokens: 0,
        kindCounts: {},
      };
    }
    const d = daily[dateStr];
    d.inputWithCache += record['Input (w/ Cache Write)'] || 0;
    d.inputWithoutCache += record['Input (w/o Cache Write)'] || 0;
    d.cacheRead += record['Cache Read'] || 0;
    d.outputTokens += record['Output Tokens'] || 0;
    d.totalTokens += record['Total Tokens'] || 0;
    if (record.Cost && record.Cost !== 'Included') {
      d.cost += parseFloat(String(record.Cost).replace(/[$,]/g, '')) || 0;
    }
    const kind = record.Kind || 'Unknown';
    d.kindCounts[kind] = (d.kindCounts[kind] || 0) + 1;
  });

  const dates = Array.from(Object.keys(daily))
    .map((dateStr) => new Date(dateStr))
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => d.toLocaleDateString('ja-JP'));

  return { dates, daily };
}

export function Fa007UsageEvents() {
  const [data, setData] = useState<UsageEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('Date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    loadUsageEventsData()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sortedByDate = useMemo(
    () =>
      [...data]
        .filter((e) => e.Date)
        .sort((a, b) => a.Date.getTime() - b.Date.getTime()),
    [data]
  );
  const latestRecord = sortedByDate[sortedByDate.length - 1] ?? null;
  const twentyFourHoursAgo = latestRecord
    ? new Date(latestRecord.Date.getTime() - 24 * 60 * 60 * 1000)
    : null;
  const filteredDayEvents =
    latestRecord && twentyFourHoursAgo
      ? sortedByDate.filter(
          (e) =>
            e.Date >= twentyFourHoursAgo && e.Date <= latestRecord.Date
        )
      : [];

  const latestDateTime = latestRecord
    ? `${latestRecord.Date.toLocaleDateString('ja-JP')} ${latestRecord.Date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`
    : '';

  const dayStats = useMemo(() => {
    let total = 0;
    let inputWithCache = 0;
    let inputWithoutCache = 0;
    let cacheRead = 0;
    let outputTokens = 0;
    let cost = 0;
    let successful = 0;
    filteredDayEvents.forEach((e) => {
      total += e['Total Tokens'] || 0;
      inputWithCache += e['Input (w/ Cache Write)'] || 0;
      inputWithoutCache += e['Input (w/o Cache Write)'] || 0;
      cacheRead += e['Cache Read'] || 0;
      outputTokens += e['Output Tokens'] || 0;
      if (e.Cost && e.Cost !== 'Included') {
        cost += parseFloat(String(e.Cost).replace(/[$,]/g, '')) || 0;
      }
      if (e.Kind === 'Included') successful++;
    });
    return {
      total,
      inputWithCache,
      inputWithoutCache,
      cacheRead,
      outputTokens,
      cost,
      successful,
      count: filteredDayEvents.length,
    };
  }, [filteredDayEvents]);

  const { dates, daily } = useMemo(() => aggregateDaily(data), [data]);

  const costChartData = useMemo(() => {
    return {
      labels: dates,
      datasets: [
        {
          label: '日別コスト',
          data: dates.map((d) => daily[d]?.cost ?? 0),
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [dates, daily]);

  const lineChartData = (
    field: keyof typeof daily[string],
    label: string,
    borderColor: string
  ) => ({
    labels: dates,
    datasets: [
      {
        label,
        data: dates.map((d) => daily[d]?.[field] ?? 0),
        borderColor,
        backgroundColor: `${borderColor}1a`,
        tension: 0.4,
        fill: true,
      },
    ],
  });

  const kindChartData = useMemo(() => {
    const allKinds = new Set<string>();
    dates.forEach((d) => {
      Object.keys(daily[d]?.kindCounts ?? {}).forEach((k) => allKinds.add(k));
    });
    const kindList = Array.from(allKinds);
    const datasets = kindList.map((kind, index) => ({
      label: kind,
      data: dates.map((d) => daily[d]?.kindCounts[kind] ?? 0),
      backgroundColor: `${KIND_CHART_COLORS[index % KIND_CHART_COLORS.length]}80`,
      borderColor: KIND_CHART_COLORS[index % KIND_CHART_COLORS.length],
      borderWidth: 1,
    }));
    return { labels: dates, datasets };
  }, [dates, daily]);

  const chartOptionsLine = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      axis: 'x' as const,
      intersect: false,
    },
    plugins: {
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
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) =>
            typeof value === 'number' ? value.toLocaleString() : value,
        },
      },
    },
  };

  const costChartOptions = {
    ...chartOptionsLine,
    plugins: {
      ...chartOptionsLine.plugins,
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: { parsed: { y: number | null } }) =>
            `コスト: $${(context.parsed.y ?? 0).toFixed(2)}`,
        },
      },
    },
    scales: {
      ...chartOptionsLine.scales,
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) =>
            typeof value === 'number' ? `$${value.toFixed(2)}` : value,
        },
      },
    },
  };

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter(
      (r) =>
        r.Date.toLocaleString('ja-JP').toLowerCase().includes(q) ||
        r.Kind.toLowerCase().includes(q) ||
        r.Model.toLowerCase().includes(q) ||
        String(r['Total Tokens']).toLowerCase().includes(q)
    );
  }, [data, search]);

  const sortedData = useMemo(() => {
    const list = [...filteredData];
    return list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'Date') {
        cmp = a.Date.getTime() - b.Date.getTime();
      } else if (
        sortKey === 'Input (w/ Cache Write)' ||
        sortKey === 'Input (w/o Cache Write)' ||
        sortKey === 'Cache Read' ||
        sortKey === 'Output Tokens' ||
        sortKey === 'Total Tokens'
      ) {
        cmp = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
      } else {
        cmp = String(a[sortKey as keyof UsageEventRecord] ?? '').localeCompare(
          String(b[sortKey as keyof UsageEventRecord] ?? '')
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

  function getKindClass(kind: string) {
    if (kind === 'Included') return 'text-success';
    if (kind.includes('Errored')) return 'text-danger';
    return '';
  }

  function getTotalTokensClass(total: number) {
    if (total > 1000000) return 'tokens-high';
    if (total > 100000) return 'tokens-medium';
    return 'tokens-low';
  }

  if (loading) {
    return (
      <>
        <Fc100HeaderMain />
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
        <Fc100HeaderMain />
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
      <Fc100HeaderMain />
      <div className="container-fluid mt-3">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="text-center">Usage Events</h1>
            <p className="text-center text-muted">
              Cursorの使用イベント詳細データを確認できます
            </p>
          </div>
        </div>

        <div className="dashboard-container mb-4">
          <div className="row g-3">
            <div className="col-xl-6 col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title mb-0">最新の Usage Events 統計</h2>
                </div>
                <div className="card-body">
                  <div className="row mb-3">
                    <div className="col-12">
                      <div className="stat-card text-center">
                        <div className="stat-label">
                          最新使用日
                          <small
                            className="text-muted ms-1"
                            title="最終データの日時から24時間前までの統計を表示します。例：9月15日02:00:00が最終データの場合、9月14日02:00:01から9月15日02:00:00までのデータが表示されます。"
                          >
                            <span className="text-decoration-underline">ℹ️</span>
                          </small>
                        </div>
                        <div className="stat-value-large">{latestDateTime || '-'}</div>
                        <div className="stat-subtitle">（24時間以内の範囲）</div>
                      </div>
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">イベント数（成功/総数）</div>
                        <div className="stat-value-large">
                          {`${dayStats.successful.toLocaleString()}/${dayStats.count.toLocaleString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">総トークン数</div>
                        <div className="stat-value-large">
                          {dayStats.total.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">Input (w/ Cache Write)</div>
                        <div className="stat-value-large">
                          {dayStats.inputWithCache.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">Input (w/o Cache Write)</div>
                        <div className="stat-value-large">
                          {dayStats.inputWithoutCache.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">Cache Read</div>
                        <div className="stat-value-large">
                          {dayStats.cacheRead.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">Output Tokens</div>
                        <div className="stat-value-large">
                          {dayStats.outputTokens.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="stat-card">
                        <div className="stat-label">コスト</div>
                        <div className="stat-value-large">
                          {dayStats.cost > 0
                            ? `$${dayStats.cost.toFixed(2)}`
                            : '$0.00'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title mb-0">コスト推移</h3>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Line
                      data={costChartData}
                      options={{
                        ...costChartOptions,
                        plugins: {
                          ...costChartOptions.plugins,
                          title: { display: true, text: 'コスト推移' },
                          legend: { display: true },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-container mb-4">
          <div className="row g-3">
            <div className="col-xl-6 col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title mb-0">Input (w/ Cache Write)</h3>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Line
                      data={lineChartData(
                        'inputWithCache',
                        'Input (w/ Cache Write)',
                        CHART_COLORS[0] ?? '#007bff'
                      )}
                      options={{
                        ...chartOptionsLine,
                        plugins: {
                          ...chartOptionsLine.plugins,
                          title: {
                            display: true,
                            text: 'Input (w/ Cache Write)',
                          },
                          legend: { display: true },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title mb-0">Input (w/o Cache Write)</h3>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Line
                      data={lineChartData(
                        'inputWithoutCache',
                        'Input (w/o Cache Write)',
                        CHART_COLORS[3] ?? '#dc3545'
                      )}
                      options={{
                        ...chartOptionsLine,
                        plugins: {
                          ...chartOptionsLine.plugins,
                          title: {
                            display: true,
                            text: 'Input (w/o Cache Write)',
                          },
                          legend: { display: true },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-container mb-4">
          <div className="row g-3">
            <div className="col-xl-6 col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title mb-0">Cache Read</h3>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Line
                      data={lineChartData(
                        'cacheRead',
                        'Cache Read',
                        CHART_COLORS[5] ?? '#fd7e14'
                      )}
                      options={{
                        ...chartOptionsLine,
                        plugins: {
                          ...chartOptionsLine.plugins,
                          title: { display: true, text: 'Cache Read' },
                          legend: { display: true },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title mb-0">Output Tokens</h3>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Line
                      data={lineChartData(
                        'outputTokens',
                        'Output Tokens',
                        CHART_COLORS[4] ?? '#6f42c1'
                      )}
                      options={{
                        ...chartOptionsLine,
                        plugins: {
                          ...chartOptionsLine.plugins,
                          title: { display: true, text: 'Output Tokens' },
                          legend: { display: true },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-container mb-4">
          <div className="row g-3">
            <div className="col-xl-6 col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title mb-0">Total Tokens</h3>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Line
                      data={lineChartData(
                        'totalTokens',
                        'Total Tokens',
                        CHART_COLORS[1] ?? '#28a745'
                      )}
                      options={{
                        ...chartOptionsLine,
                        plugins: {
                          ...chartOptionsLine.plugins,
                          title: { display: true, text: 'Total Tokens' },
                          legend: { display: true },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title mb-0">Kind (イベント種別)</h3>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Bar
                      data={kindChartData}
                      options={{
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
                            text: 'Kind (イベント種別)',
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
                          x: { display: true },
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (value: number | string) =>
                                typeof value === 'number'
                                  ? value.toLocaleString()
                                  : value,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title mb-0">使用イベント一覧</h2>
          </div>
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <label htmlFor="fa007-page-size" className="mb-0">
                <select
                  id="fa007-page-size"
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
                <label htmlFor="fa007-search" className="mb-0">
                  検索:
                </label>
                <input
                  id="fa007-search"
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="テキストで絞り込み"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  aria-label="使用イベントを検索"
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
                  {paginatedData.map((row, idx) => (
                    <tr key={`${row.Date.getTime()}-${idx}`}>
                      <td>{formatDateTime(row.Date)}</td>
                      <td>
                        <span className={getKindClass(row.Kind)}>
                          {row.Kind}
                        </span>
                      </td>
                      <td>{row.Model}</td>
                      <td>{row['Max Mode']}</td>
                      <td className="text-end">
                        {(row['Input (w/ Cache Write)'] ?? 0).toLocaleString()}
                      </td>
                      <td className="text-end">
                        {(row['Input (w/o Cache Write)'] ?? 0).toLocaleString()}
                      </td>
                      <td className="text-end">
                        {(row['Cache Read'] ?? 0).toLocaleString()}
                      </td>
                      <td className="text-end">
                        {(row['Output Tokens'] ?? 0).toLocaleString()}
                      </td>
                      <td
                        className={`text-end ${getTotalTokensClass(
                          row['Total Tokens'] ?? 0
                        )}`}
                      >
                        {(row['Total Tokens'] ?? 0).toLocaleString()}
                      </td>
                      <td>{row.Cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2">
              <div className="text-muted small">
                {totalFiltered} 件中 {totalFiltered === 0 ? 0 : start + 1} から{' '}
                {Math.min(start + pageSize, totalFiltered)} まで表示
              </div>
              <nav aria-label="使用イベント一覧のページネーション">
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
