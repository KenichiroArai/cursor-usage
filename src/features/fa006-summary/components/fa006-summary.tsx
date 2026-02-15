'use client';

import { useEffect, useState, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Fc100HeaderMain } from '@/components/layout/fc100-header-main';
import { loadSummaryData } from '@/domain/repositories';
import type { SummaryRecord } from '@/types';
import {
  formatDifference,
  getDifferenceClass,
  calculateDifferenceWithReset,
} from '@/utils';
import { ROUTES, CHART_COLORS } from '@/constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const TABLE_COLUMNS = [
  { key: 'dateStr', label: '日付' },
  { key: 'model', label: 'モデル' },
  { key: 'cacheRead', label: 'Cache Read' },
  { key: 'cacheWrite', label: 'Cache Write' },
  { key: 'input', label: 'Input' },
  { key: 'output', label: 'Output' },
  { key: 'total', label: 'Total' },
  { key: 'apiCost', label: 'API Cost' },
  { key: 'costToYou', label: 'Cost to You' },
] as const;

type SortKey = (typeof TABLE_COLUMNS)[number]['key'];
type SortOrder = 'asc' | 'desc';

function processModelData(
  summaryData: SummaryRecord[],
  fieldName: keyof SummaryRecord
): { modelData: Record<string, Record<string, number>>; uniqueDates: string[] } {
  const modelData: Record<string, Record<string, number>> = {};
  const uniqueDates = Array.from(new Set(summaryData.map((r) => r.dateStr)))
    .map((dateStr) => new Date(dateStr))
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => d.toLocaleDateString('ja-JP'));

  summaryData.forEach((record) => {
    const model = record.model;
    const dateStr = record.dateStr;
    if (!modelData[model]) modelData[model] = {};
    if (!modelData[model][dateStr]) modelData[model][dateStr] = 0;
    const raw = record[fieldName];
    const value =
      fieldName === 'apiCost' || fieldName === 'costToYou'
        ? parseFloat(String(raw).replace(/[$,]/g, '')) || 0
        : typeof raw === 'number'
          ? raw
          : parseInt(String(raw), 10) || 0;
    modelData[model][dateStr] += value;
  });

  return { modelData, uniqueDates };
}

function calculateCumulativeData(
  modelData: Record<string, Record<string, number>>,
  uniqueDates: string[]
): {
  previousData: Record<string, { previous: number; diff: number }[]>;
} {
  const previousData: Record<string, { previous: number; diff: number }[]> = {};
  const models = Object.keys(modelData);

  models.forEach((model) => {
    previousData[model] = [];
    let previousMonthValue = 0;

    uniqueDates.forEach((dateStr, index) => {
      const currentValue = modelData[model][dateStr] ?? 0;
      const previousDate = index > 0 ? uniqueDates[index - 1] : null;
      const previousValue = previousDate
        ? modelData[model][previousDate] ?? 0
        : 0;

      if (currentValue < previousValue && previousValue > 0) {
        previousMonthValue = 0;
      }

      previousData[model].push({
        previous: previousMonthValue,
        diff: currentValue - previousMonthValue,
      });
      previousMonthValue = currentValue;
    });
  });

  return { previousData };
}

function buildStackedBarChartData(
  summaryData: SummaryRecord[],
  fieldName: keyof SummaryRecord,
  chartTitle: string
) {
  if (summaryData.length === 0)
    return { labels: [] as string[], datasets: [] };

  const { modelData, uniqueDates } = processModelData(summaryData, fieldName);
  const { previousData } = calculateCumulativeData(modelData, uniqueDates);
  const models = Object.keys(modelData);
  const datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    stack: string;
  }[] = [];

  models.forEach((model, index) => {
    const color = CHART_COLORS[index % CHART_COLORS.length];
    datasets.push({
      label: `${model} - ${chartTitle} (前日分)`,
      data: previousData[model].map((item) => item.previous),
      backgroundColor: `${color}40`,
      borderColor: color,
      borderWidth: 1,
      stack: `${model}_${String(fieldName)}`,
    });
    datasets.push({
      label: `${model} - ${chartTitle} (当日増分)`,
      data: previousData[model].map((item) => item.diff),
      backgroundColor: `${color}80`,
      borderColor: color,
      borderWidth: 1,
      stack: `${model}_${String(fieldName)}`,
    });
  });

  return {
    labels: uniqueDates,
    datasets,
  };
}

export function Fa006Summary() {
  const [data, setData] = useState<SummaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('dateStr');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    loadSummaryData()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const autoRecords = useMemo(
    () =>
      data
        .filter((r) => r.model.toLowerCase() === 'auto')
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [data]
  );
  const latest = autoRecords[0] ?? null;
  const prev = autoRecords[1] ?? null;

  const diffTotal =
    latest && prev
      ? calculateDifferenceWithReset(latest.total, prev.total)
      : null;
  const diffCacheRead =
    latest && prev
      ? calculateDifferenceWithReset(latest.cacheRead, prev.cacheRead)
      : null;
  const diffCacheWrite =
    latest && prev
      ? calculateDifferenceWithReset(latest.cacheWrite, prev.cacheWrite)
      : null;
  const diffInput =
    latest && prev
      ? calculateDifferenceWithReset(latest.input, prev.input)
      : null;
  const diffOutput =
    latest && prev
      ? calculateDifferenceWithReset(latest.output, prev.output)
      : null;
  const diffApiCost =
    latest && prev
      ? calculateDifferenceWithReset(
          parseFloat(String(latest.apiCost).replace('$', '')) || 0,
          parseFloat(String(prev.apiCost).replace('$', '')) || 0
        )
      : null;
  const diffCostToYou =
    latest && prev
      ? calculateDifferenceWithReset(
          parseFloat(String(latest.costToYou).replace('$', '')) || 0,
          parseFloat(String(prev.costToYou).replace('$', '')) || 0
        )
      : null;

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter(
      (r) =>
        r.dateStr.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        String(r.cacheRead).toLowerCase().includes(q) ||
        String(r.total).toLowerCase().includes(q)
    );
  }, [data, search]);

  const sortedData = useMemo(() => {
    const list = [...filteredData];
    return list.sort((a, b) => {
      const av = a[sortKey as keyof SummaryRecord];
      const bv = b[sortKey as keyof SummaryRecord];
      let cmp = 0;
      if (sortKey === 'dateStr') {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (
        sortKey === 'cacheRead' ||
        sortKey === 'cacheWrite' ||
        sortKey === 'input' ||
        sortKey === 'output' ||
        sortKey === 'total'
      ) {
        cmp = (Number(av) || 0) - (Number(bv) || 0);
      } else if (sortKey === 'apiCost' || sortKey === 'costToYou') {
        cmp =
          (parseFloat(String(av).replace(/[$,]/g, '')) || 0) -
          (parseFloat(String(bv).replace(/[$,]/g, '')) || 0);
      } else {
        cmp = String(av).localeCompare(String(bv));
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

  const totalChartData = useMemo(
    () => buildStackedBarChartData(data, 'total', 'Total'),
    [data]
  );
  const apiCostChartData = useMemo(
    () => buildStackedBarChartData(data, 'apiCost', 'API Cost'),
    [data]
  );
  const costToYouChartData = useMemo(
    () => buildStackedBarChartData(data, 'costToYou', 'Cost to You'),
    [data]
  );
  const cacheReadChartData = useMemo(
    () => buildStackedBarChartData(data, 'cacheRead', 'Cache Read'),
    [data]
  );
  const cacheWriteChartData = useMemo(
    () => buildStackedBarChartData(data, 'cacheWrite', 'Cache Write'),
    [data]
  );
  const inputChartData = useMemo(
    () => buildStackedBarChartData(data, 'input', 'Input'),
    [data]
  );
  const outputChartData = useMemo(
    () => buildStackedBarChartData(data, 'output', 'Output'),
    [data]
  );

  const chartOptionsBase = {
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
          }) => {
            const v = context.parsed.y ?? 0;
            const isCur =
              context.dataset.label?.includes('API Cost') ||
              context.dataset.label?.includes('Cost to You');
            return `${context.dataset.label ?? ''}: ${
              isCur ? `$${v.toFixed(4)}` : v.toLocaleString()
            }`;
          },
        },
      },
    },
    scales: {
      x: { stacked: true },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback: (value: number | string) =>
            typeof value === 'number'
              ? Number.isInteger(value)
                ? value.toLocaleString()
                : `$${value.toFixed(4)}`
              : value,
        },
      },
    },
  };

  function getPreviousDayRecord(record: SummaryRecord): SummaryRecord | null {
    const sameModel = data
      .filter((r) => r.model === record.model)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const idx = sameModel.findIndex(
      (r) => r.date.getTime() === record.date.getTime()
    );
    if (idx <= 0) return null;
    return sameModel[idx - 1];
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
            <h1 className="text-center">サマリー</h1>
            <p className="text-center text-muted">
              Cursor使用状況の総合的なサマリーを確認できます
            </p>
          </div>
        </div>

        <div className="dashboard-container mb-4">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h2 className="card-title mb-0">最新の Summary</h2>
                </div>
                <div className="card-body">
                  <div className="usage-summary-stats">
                    <div className="card mb-3">
                      <div className="card-body">
                        <h3 className="h5 mb-2">最新使用日統計</h3>
                        <div className="usage-stats-summary">
                          <div className="stat-item">
                            <span className="stat-label">最新使用日:</span>
                            <span className="stat-value">
                              {latest?.dateStr ?? '-'}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Total:</span>
                            <span className="stat-value">
                              {latest?.total.toLocaleString() ?? '-'}
                              {diffTotal != null && (
                                <small
                                  className={getDifferenceClass(diffTotal)}
                                >
                                  {' '}
                                  ({formatDifference(diffTotal)})
                                </small>
                              )}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Cache Read:</span>
                            <span className="stat-value">
                              {latest?.cacheRead.toLocaleString() ?? '-'}
                              {diffCacheRead != null && (
                                <small
                                  className={getDifferenceClass(diffCacheRead)}
                                >
                                  {' '}
                                  ({formatDifference(diffCacheRead)})
                                </small>
                              )}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Cache Write:</span>
                            <span className="stat-value">
                              {latest?.cacheWrite.toLocaleString() ?? '-'}
                              {diffCacheWrite != null && (
                                <small
                                  className={getDifferenceClass(
                                    diffCacheWrite
                                  )}
                                >
                                  {' '}
                                  ({formatDifference(diffCacheWrite)})
                                </small>
                              )}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Input:</span>
                            <span className="stat-value">
                              {latest?.input.toLocaleString() ?? '-'}
                              {diffInput != null && (
                                <small
                                  className={getDifferenceClass(diffInput)}
                                >
                                  {' '}
                                  ({formatDifference(diffInput)})
                                </small>
                              )}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Output:</span>
                            <span className="stat-value">
                              {latest?.output.toLocaleString() ?? '-'}
                              {diffOutput != null && (
                                <small
                                  className={getDifferenceClass(diffOutput)}
                                >
                                  {' '}
                                  ({formatDifference(diffOutput)})
                                </small>
                              )}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">API Cost:</span>
                            <span className="stat-value">
                              {latest?.apiCost ?? '-'}
                              {diffApiCost != null && (
                                <small
                                  className={getDifferenceClass(diffApiCost)}
                                >
                                  {' '}
                                  ({formatDifference(diffApiCost)})
                                </small>
                              )}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Cost to You:</span>
                            <span className="stat-value">
                              {latest?.costToYou === '' ||
                              parseFloat(String(latest?.costToYou || '')) === 0
                                ? '0'
                                : latest?.costToYou ?? '-'}
                              {diffCostToYou != null && (
                                <small
                                  className={getDifferenceClass(diffCostToYou)}
                                >
                                  {' '}
                                  ({formatDifference(diffCostToYou)})
                                </small>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <small className="text-muted">
                            <i className="bi bi-info-circle" /> 括弧内の数値は前日との差です。
                            <span className="text-success">緑色</span>
                            は増加、
                            <span className="text-danger">赤色</span>
                            は減少、
                            <span className="text-muted">グレー</span>
                            は変化なしを示します。
                          </small>
                        </div>
                      </div>
                    </div>
                    {latest && (
                      <div className="usage-info">
                        {`Total: ${latest.total.toLocaleString()}\nCache Read: ${latest.cacheRead.toLocaleString()}\nCache Write: ${latest.cacheWrite.toLocaleString()}\nInput: ${latest.input.toLocaleString()}\nOutput: ${latest.output.toLocaleString()}\nAPI Cost: ${latest.apiCost}\nCost to You: ${latest.costToYou}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h2 className="card-title mb-0">Total グラフ</h2>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Bar
                      data={{
                        labels: totalChartData.labels,
                        datasets: totalChartData.datasets,
                      }}
                      options={{
                        ...chartOptionsBase,
                        plugins: {
                          ...chartOptionsBase.plugins,
                          title: {
                            display: true,
                            text: 'Total 積立推移',
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
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h2 className="card-title mb-0">API Cost グラフ</h2>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Bar
                      data={{
                        labels: apiCostChartData.labels,
                        datasets: apiCostChartData.datasets,
                      }}
                      options={{
                        ...chartOptionsBase,
                        plugins: {
                          ...chartOptionsBase.plugins,
                          title: {
                            display: true,
                            text: 'API Cost 積立推移',
                          },
                          legend: { display: true },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h2 className="card-title mb-0">Cost to You グラフ</h2>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Bar
                      data={{
                        labels: costToYouChartData.labels,
                        datasets: costToYouChartData.datasets,
                      }}
                      options={{
                        ...chartOptionsBase,
                        plugins: {
                          ...chartOptionsBase.plugins,
                          title: {
                            display: true,
                            text: 'Cost to You 積立推移',
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
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h2 className="card-title mb-0">Cache Read グラフ</h2>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Bar
                      data={{
                        labels: cacheReadChartData.labels,
                        datasets: cacheReadChartData.datasets,
                      }}
                      options={{
                        ...chartOptionsBase,
                        plugins: {
                          ...chartOptionsBase.plugins,
                          title: {
                            display: true,
                            text: 'Cache Read 積立推移',
                          },
                          legend: { display: true },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h2 className="card-title mb-0">Cache Write グラフ</h2>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Bar
                      data={{
                        labels: cacheWriteChartData.labels,
                        datasets: cacheWriteChartData.datasets,
                      }}
                      options={{
                        ...chartOptionsBase,
                        plugins: {
                          ...chartOptionsBase.plugins,
                          title: {
                            display: true,
                            text: 'Cache Write 積立推移',
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
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h2 className="card-title mb-0">Input グラフ</h2>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Bar
                      data={{
                        labels: inputChartData.labels,
                        datasets: inputChartData.datasets,
                      }}
                      options={{
                        ...chartOptionsBase,
                        plugins: {
                          ...chartOptionsBase.plugins,
                          title: {
                            display: true,
                            text: 'Input 積立推移',
                          },
                          legend: { display: true },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h2 className="card-title mb-0">Output グラフ</h2>
                </div>
                <div className="card-body">
                  <div className="chart-container">
                    <Bar
                      data={{
                        labels: outputChartData.labels,
                        datasets: outputChartData.datasets,
                      }}
                      options={{
                        ...chartOptionsBase,
                        plugins: {
                          ...chartOptionsBase.plugins,
                          title: {
                            display: true,
                            text: 'Output 積立推移',
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

        <div className="card">
          <div className="card-header">
            <h2 className="card-title mb-0">Summary 一覧</h2>
          </div>
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <label htmlFor="fa006-page-size" className="mb-0">
                <select
                  id="fa006-page-size"
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
                <label htmlFor="fa006-search" className="mb-0">
                  検索:
                </label>
                <input
                  id="fa006-search"
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="テキストで絞り込み"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Summary を検索"
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
                    const prevRecord = getPreviousDayRecord(row);
                    const renderNum = (
                      val: number,
                      prevVal: number | undefined
                    ) => {
                      const diff =
                        prevVal != null
                          ? calculateDifferenceWithReset(val, prevVal)
                          : null;
                      const text = val.toLocaleString();
                      if (diff != null && diff !== 0) {
                        return (
                          <>
                            {text}{' '}
                            <small className={getDifferenceClass(diff)}>
                              ({formatDifference(diff)})
                            </small>
                          </>
                        );
                      }
                      return text;
                    };
                    const renderCost = (
                      val: string,
                      prevVal: string | undefined
                    ) => {
                      const cur = parseFloat(String(val).replace(/[$,]/g, '')) || 0;
                      const prev = prevVal
                        ? parseFloat(String(prevVal).replace(/[$,]/g, '')) || 0
                        : undefined;
                      const diff =
                        prev != null
                          ? calculateDifferenceWithReset(cur, prev)
                          : null;
                      const text = val || '0';
                      if (diff != null && diff !== 0) {
                        return (
                          <>
                            {text}{' '}
                            <small className={getDifferenceClass(diff)}>
                              ({formatDifference(diff)})
                            </small>
                          </>
                        );
                      }
                      return text;
                    };
                    return (
                      <tr key={`${row.dateStr}-${row.model}-${idx}`}>
                        <td>{row.dateStr}</td>
                        <td>{row.model}</td>
                        <td className="text-end">
                          {renderNum(
                            row.cacheRead,
                            prevRecord?.cacheRead
                          )}
                        </td>
                        <td className="text-end">
                          {renderNum(
                            row.cacheWrite,
                            prevRecord?.cacheWrite
                          )}
                        </td>
                        <td className="text-end">
                          {renderNum(row.input, prevRecord?.input)}
                        </td>
                        <td className="text-end">
                          {renderNum(row.output, prevRecord?.output)}
                        </td>
                        <td className="text-end">
                          {renderNum(row.total, prevRecord?.total)}
                        </td>
                        <td className="text-end">
                          {renderCost(row.apiCost, prevRecord?.apiCost)}
                        </td>
                        <td className="text-end">
                          {row.costToYou === '' ||
                          parseFloat(String(row.costToYou).replace(/[$,]/g, '')) === 0
                            ? '0'
                            : renderCost(row.costToYou, prevRecord?.costToYou)}
                        </td>
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
              <nav aria-label="Summary 一覧のページネーション">
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
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
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
