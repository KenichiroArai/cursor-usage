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
import { loadRecordsData } from '@/domain/repositories';
import type { RecordData } from '@/types';
import { getProgressColor } from '@/utils';
import { ROUTES, TOTAL_DAYS, CHART_COLORS } from '@/constants';

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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const TABLE_COLUMNS = [
  { key: '番号', label: '番号' },
  { key: '記録日', label: '記録日' },
  { key: '日数', label: '日数' },
  { key: 'Fast requests will refresh in X day', label: 'Fast requests will refresh in X day' },
  { key: 'Suggested Lines: X lines', label: 'Suggested Lines' },
  { key: 'Accepted Lines: X Lines', label: 'Accepted Lines' },
  { key: 'Tabs Accepted: X tabs', label: 'Tabs Accepted' },
] as const;

type SortKey = (typeof TABLE_COLUMNS)[number]['key'];
type SortOrder = 'asc' | 'desc';

export function Fa002Records() {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('記録日');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    loadRecordsData()
      .then(setRecords)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const latest = records.length > 0 ? records[records.length - 1] : null;

  const recordsWithNumber = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const da = new Date(a.記録日).getTime();
      const db = new Date(b.記録日).getTime();
      return db - da;
    });
    return sorted.map((r, i) => ({
      ...r,
      番号: records.length - i,
    }));
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return recordsWithNumber;
    const q = search.trim().toLowerCase();
    return recordsWithNumber.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [recordsWithNumber, search]);

  const totalFiltered = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  type RowWithNumber = RecordData & { 番号: number };

  const sortedForTable = useMemo(() => {
    const list = filteredRecords as RowWithNumber[];
    if (sortKey === '番号') {
      return [...list].sort((a, b) =>
        sortOrder === 'desc' ? b.番号 - a.番号 : a.番号 - b.番号
      );
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey as keyof RecordData];
      const bv = b[sortKey as keyof RecordData];
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }, [filteredRecords, sortKey, sortOrder]);

  const finalPaginated = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedForTable.slice(startIdx, startIdx + pageSize);
  }, [sortedForTable, currentPage, pageSize]);

  const chartLabels = useMemo(
    () => recordsWithNumber.map((r) => r.記録日).reverse(),
    [recordsWithNumber]
  );
  const suggestedLinesData = useMemo(
    () => [...recordsWithNumber].reverse().map((r) => r['Suggested Lines: X lines']),
    [recordsWithNumber]
  );
  const acceptedLinesData = useMemo(
    () => [...recordsWithNumber].reverse().map((r) => r['Accepted Lines: X Lines']),
    [recordsWithNumber]
  );
  const tabsAcceptedData = useMemo(
    () => [...recordsWithNumber].reverse().map((r) => r['Tabs Accepted: X tabs']),
    [recordsWithNumber]
  );

  const combinedLinesChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Suggested Lines',
        data: suggestedLinesData,
        borderColor: CHART_COLORS[0] ?? '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Accepted Lines',
        data: acceptedLinesData,
        borderColor: CHART_COLORS[1] ?? '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const tabsAcceptedChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Tabs Accepted',
        data: tabsAcceptedData,
        backgroundColor: CHART_COLORS[2] ?? '#ffc107',
        borderColor: CHART_COLORS[2] ?? '#ffc107',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) =>
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
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

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
            <h1 className="text-center">使用記録</h1>
            <p className="text-center text-muted">
              使用状況の詳細な記録とグラフを確認できます
            </p>
          </div>
        </div>

        <div className="dashboard-container mb-4">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h2 className="card-title mb-0">最新の使用記録</h2>
                </div>
                <div className="card-body">
                  <div className="usage-stats">
                    <div className="card mb-3">
                      <div className="card-body">
                        <h3 className="h5 mb-2">使用統計</h3>
                        <div className="usage-stats-summary">
                          <div className="stat-item">
                            <span className="stat-label">Suggested Lines:</span>
                            <span className="stat-value">
                              {latest
                                ? latest['Suggested Lines: X lines'].toLocaleString()
                                : '0'}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Accepted Lines:</span>
                            <span className="stat-value">
                              {latest
                                ? latest['Accepted Lines: X Lines'].toLocaleString()
                                : '0'}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Tabs Accepted:</span>
                            <span className="stat-value">
                              {latest
                                ? String(latest['Tabs Accepted: X tabs'])
                                : '0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="card mb-3">
                      <div className="card-body">
                        <h3 className="h5 mb-2">使用日数</h3>
                        <div className="progress-label">
                          <span>使用状況</span>
                          <span>
                            {latest ? `${latest.日数}日 / ${TOTAL_DAYS}日` : `0日 / ${TOTAL_DAYS}日`}
                          </span>
                        </div>
                        <div className="progress">
                          <div
                            className="progress-bar"
                            role="progressbar"
                            aria-valuenow={
                              latest
                                ? Math.round((latest.日数 / TOTAL_DAYS) * 100)
                                : 0
                            }
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`使用日数 ${latest ? latest.日数 : 0}日 / ${TOTAL_DAYS}日`}
                            style={{
                              width: latest
                                ? `${(latest.日数 / TOTAL_DAYS) * 100}%`
                                : '0%',
                              backgroundColor: getProgressColor(
                                latest ? (latest.日数 / TOTAL_DAYS) * 100 : 0
                              ),
                            }}
                          >
                            {latest
                              ? `${((latest.日数 / TOTAL_DAYS) * 100).toFixed(2)}%`
                              : '0.00%'}
                          </div>
                        </div>
                      </div>
                    </div>
                    {latest && (
                      <div className="usage-info">
                        {`Suggested Lines: ${latest['Suggested Lines: X lines'].toLocaleString()}\nAccepted Lines: ${latest['Accepted Lines: X Lines'].toLocaleString()}\nTabs Accepted: ${latest['Tabs Accepted: X tabs']}\nFast requests will refresh in ${latest['Fast requests will refresh in X day']} day`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h2 className="card-title mb-0">使用状況グラフ</h2>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="chart-container">
                        <Line
                          data={combinedLinesChartData}
                          options={{
                            ...chartOptions,
                            plugins: {
                              ...chartOptions.plugins,
                              title: {
                                display: true,
                                text: 'Suggested Lines & Accepted Lines 推移',
                              },
                              legend: { display: true },
                            },
                          }}
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="chart-container">
                        <Bar
                          data={tabsAcceptedChartData}
                          options={{
                            ...chartOptions,
                            plugins: {
                              ...chartOptions.plugins,
                              title: {
                                display: true,
                                text: 'Tabs Accepted 推移',
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
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title mb-0">使用記録一覧</h2>
          </div>
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="fa002-page-size" className="mb-0 text-nowrap">
                  <select
                    id="fa002-page-size"
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
              </div>
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="fa002-search" className="mb-0 text-nowrap">
                  検索:
                </label>
                <input
                  id="fa002-search"
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="テキストで絞り込み"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  aria-label="使用記録を検索"
                />
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    {TABLE_COLUMNS.map(({ key, label }) => (
                      <th
                        key={key}
                        role="button"
                        onClick={() => handleSort(key as SortKey)}
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
                  {finalPaginated.map((row, idx) => {
                    const r = row as RowWithNumber;
                    return (
                      <tr key={`${r.記録日}-${r.番号}-${idx}`}>
                        <td>{r.番号}</td>
                        <td>{r.記録日}</td>
                        <td>{r.日数}</td>
                        <td>{r['Fast requests will refresh in X day']}</td>
                        <td>{r['Suggested Lines: X lines'].toLocaleString()}</td>
                        <td>{r['Accepted Lines: X Lines'].toLocaleString()}</td>
                        <td>{r['Tabs Accepted: X tabs']}</td>
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
              <nav aria-label="使用記録一覧のページネーション">
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
                          <li key={`ellipsis-${p}`} className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        );
                      }
                      items.push(
                        <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
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
                  <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
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
