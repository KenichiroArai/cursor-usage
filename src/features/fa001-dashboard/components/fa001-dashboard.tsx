'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Fc100HeaderMain } from '@/components/layout/fc100-header-main';
import {
  loadRecordsData,
  loadSummaryData,
  loadUsageEventsData,
} from '@/domain/repositories';
import type { RecordData, SummaryRecord, UsageEventRecord } from '@/types';
import {
  formatDifference,
  getDifferenceClass,
  calculateDifferenceWithReset,
  getProgressColor,
} from '@/utils';
import { ROUTES, TOTAL_DAYS } from '@/constants';

export function Fa001Dashboard() {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [summary, setSummary] = useState<SummaryRecord[]>([]);
  const [usageEvents, setUsageEvents] = useState<UsageEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      loadRecordsData(),
      loadSummaryData(),
      loadUsageEventsData(),
    ]).then(([r, s, u]) => {
      if (r.status === 'fulfilled') setRecords(r.value);
      else console.warn('Records load failed:', r.reason);
      if (s.status === 'fulfilled') setSummary(s.value);
      else console.warn('Summary load failed:', s.reason);
      if (u.status === 'fulfilled') setUsageEvents(u.value);
      else console.warn('UsageEvents load failed:', u.reason);
      const failed = [r, s, u].filter((x) => x.status === 'rejected').length;
      if (failed === 3) setError('データの読み込みに失敗しました。docs/ または data/ に record.xlsx を配置し、tool/all-raw-events/data/ に usage-events.csv があることを確認してください。');
    }).finally(() => setLoading(false));
  }, []);

  const latestRecord = records[records.length - 1];
  const autoSummary = summary
    .filter((s) => s.model.toLowerCase() === 'auto')
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const latestSummary = autoSummary[0];
  const prevSummary = autoSummary[1];
  // Usage Events: 旧docsと同様に最新レコードの日時から24時間以内のデータを集計
  const sortedEvents = [...usageEvents]
    .filter((e) => e.Date)
    .sort((a, b) => a.Date.getTime() - b.Date.getTime());
  const latestEventRecord = sortedEvents[sortedEvents.length - 1];
  const twentyFourHoursAgo = latestEventRecord
    ? new Date(latestEventRecord.Date.getTime() - 24 * 60 * 60 * 1000)
    : null;
  const filteredDayEvents = latestEventRecord && twentyFourHoursAgo
    ? sortedEvents.filter(
        (e) =>
          e.Date >= twentyFourHoursAgo &&
          e.Date <= latestEventRecord.Date
      )
    : [];
  const latestDateTime = latestEventRecord
    ? `${latestEventRecord.Date.toLocaleDateString('ja-JP')} ${latestEventRecord.Date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`
    : '';
  const totalTokens = filteredDayEvents.reduce(
    (s, e) => s + e['Total Tokens'],
    0
  );
  const successfulCount = filteredDayEvents.filter(
    (e) => e.Kind === 'Included'
  ).length;
  const eventCount = filteredDayEvents.length;
  const inputWithCache = filteredDayEvents.reduce(
    (s, e) => s + e['Input (w/ Cache Write)'],
    0
  );
  const inputWithoutCache = filteredDayEvents.reduce(
    (s, e) => s + e['Input (w/o Cache Write)'],
    0
  );
  const cacheRead = filteredDayEvents.reduce(
    (s, e) => s + e['Cache Read'],
    0
  );
  const outputTokens = filteredDayEvents.reduce(
    (s, e) => s + e['Output Tokens'],
    0
  );
  const dayCost = filteredDayEvents.reduce((s, e) => {
    if (e.Cost && e.Cost !== 'Included') {
      const v = parseFloat(String(e.Cost).replace(/[$,]/g, '')) || 0;
      return s + v;
    }
    return s;
  }, 0);

  return (
    <>
      <Fc100HeaderMain />
      <div className="container-fluid mt-3">
        {loading && (
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">読み込み中...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {!loading && !error && (
          <>
            <div className="row mb-4">
              <div className="col-12">
                <h1 className="text-center">Cursor使用記録ダッシュボード</h1>
              </div>
            </div>
            <div className="container">
              <div className="row g-4 justify-content-center">
                <div className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100">
                    <div className="card-header">
                      <div className="d-flex flex-column">
                        <h2 className="card-title mb-2">使用記録</h2>
                        <div className="d-flex justify-content-end">
                          <Link
                            href={ROUTES.RECORDS}
                            className="btn btn-primary btn-sm"
                          >
                            詳細を見る
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      {latestRecord && (
                        <div className="usage-stats">
                          <div className="card mb-3">
                            <div className="card-body">
                              <h3 className="h5 mb-2">使用統計</h3>
                              <div className="usage-stats-summary">
                                <div className="stat-item">
                                  <span className="stat-label">Suggested Lines:</span>
                                  <span className="stat-value">
                                    {latestRecord['Suggested Lines: X lines'].toLocaleString()}
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Accepted Lines:</span>
                                  <span className="stat-value">
                                    {latestRecord['Accepted Lines: X Lines'].toLocaleString()}
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Tabs Accepted:</span>
                                  <span className="stat-value">
                                    {latestRecord['Tabs Accepted: X tabs']}
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
                                  {latestRecord.日数}日 / {TOTAL_DAYS}日
                                </span>
                              </div>
                              <div className="progress">
                                <div
                                  className="progress-bar"
                                  role="progressbar"
                                  aria-valuenow={Math.round((latestRecord.日数 / TOTAL_DAYS) * 100)}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-label={`使用日数 ${latestRecord.日数}日 / ${TOTAL_DAYS}日`}
                                  style={{
                                    width: `${(latestRecord.日数 / TOTAL_DAYS) * 100}%`,
                                    backgroundColor: getProgressColor(
                                      (latestRecord.日数 / TOTAL_DAYS) * 100
                                    ),
                                  }}
                                >
                                  {((latestRecord.日数 / TOTAL_DAYS) * 100).toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="usage-info">
                            {`Suggested Lines: ${latestRecord['Suggested Lines: X lines'].toLocaleString()}\nAccepted Lines: ${latestRecord['Accepted Lines: X Lines'].toLocaleString()}\nTabs Accepted: ${latestRecord['Tabs Accepted: X tabs']}\nFast requests will refresh in ${latestRecord['Fast requests will refresh in X day']} day`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100">
                    <div className="card-header">
                      <div className="d-flex flex-column">
                        <h2 className="card-title mb-2">Summary</h2>
                        <div className="d-flex justify-content-end">
                          <Link
                            href={ROUTES.SUMMARY}
                            className="btn btn-primary btn-sm"
                          >
                            詳細を見る
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      {latestSummary && (
                        <div className="usage-summary-stats">
                          <div className="card mb-3">
                            <div className="card-body">
                              <h3 className="h5 mb-2">最新使用日統計</h3>
                              <div className="usage-stats-summary">
                                <div className="stat-item">
                                  <span className="stat-label">最新使用日:</span>
                                  <span className="stat-value">{latestSummary.dateStr}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Total:</span>
                                  <span className="stat-value">
                                    {latestSummary.total.toLocaleString()}
                                    {prevSummary != null && (
                                      <small
                                        className={getDifferenceClass(
                                          calculateDifferenceWithReset(
                                            latestSummary.total,
                                            prevSummary.total
                                          )
                                        )}
                                      >
                                        ({formatDifference(
                                          calculateDifferenceWithReset(
                                            latestSummary.total,
                                            prevSummary.total
                                          )
                                        )})
                                      </small>
                                    )}
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Cache Read:</span>
                                  <span className="stat-value">
                                    {latestSummary.cacheRead.toLocaleString()}
                                    {prevSummary != null && (
                                      <small
                                        className={getDifferenceClass(
                                          calculateDifferenceWithReset(
                                            latestSummary.cacheRead,
                                            prevSummary.cacheRead
                                          )
                                        )}
                                      >
                                        ({formatDifference(
                                          calculateDifferenceWithReset(
                                            latestSummary.cacheRead,
                                            prevSummary.cacheRead
                                          )
                                        )})
                                      </small>
                                    )}
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Cache Write:</span>
                                  <span className="stat-value">
                                    {latestSummary.cacheWrite.toLocaleString()}
                                    {prevSummary != null && (
                                      <small
                                        className={getDifferenceClass(
                                          calculateDifferenceWithReset(
                                            latestSummary.cacheWrite,
                                            prevSummary.cacheWrite
                                          )
                                        )}
                                      >
                                        ({formatDifference(
                                          calculateDifferenceWithReset(
                                            latestSummary.cacheWrite,
                                            prevSummary.cacheWrite
                                          )
                                        )})
                                      </small>
                                    )}
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Input:</span>
                                  <span className="stat-value">
                                    {latestSummary.input.toLocaleString()}
                                    {prevSummary != null && (
                                      <small
                                        className={getDifferenceClass(
                                          calculateDifferenceWithReset(
                                            latestSummary.input,
                                            prevSummary.input
                                          )
                                        )}
                                      >
                                        ({formatDifference(
                                          calculateDifferenceWithReset(
                                            latestSummary.input,
                                            prevSummary.input
                                          )
                                        )})
                                      </small>
                                    )}
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Output:</span>
                                  <span className="stat-value">
                                    {latestSummary.output.toLocaleString()}
                                    {prevSummary != null && (
                                      <small
                                        className={getDifferenceClass(
                                          calculateDifferenceWithReset(
                                            latestSummary.output,
                                            prevSummary.output
                                          )
                                        )}
                                      >
                                        ({formatDifference(
                                          calculateDifferenceWithReset(
                                            latestSummary.output,
                                            prevSummary.output
                                          )
                                        )})
                                      </small>
                                    )}
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">API Cost:</span>
                                  <span className="stat-value">
                                    {latestSummary.apiCost}
                                    {prevSummary != null && (
                                      <small
                                        className={getDifferenceClass(
                                          calculateDifferenceWithReset(
                                            parseFloat(String(latestSummary.apiCost || '').replace('$', '')) || 0,
                                            parseFloat(String(prevSummary.apiCost || '').replace('$', '')) || 0
                                          )
                                        )}
                                      >
                                        ({formatDifference(
                                          calculateDifferenceWithReset(
                                            parseFloat(String(latestSummary.apiCost || '').replace('$', '')) || 0,
                                            parseFloat(String(prevSummary.apiCost || '').replace('$', '')) || 0
                                          )
                                        )})
                                      </small>
                                    )}
                                  </span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Cost to You:</span>
                                  <span className="stat-value">
                                    {latestSummary.costToYou}
                                    {prevSummary != null && (
                                      <small
                                        className={getDifferenceClass(
                                          calculateDifferenceWithReset(
                                            parseFloat(String(latestSummary.costToYou || '').replace('$', '')) || 0,
                                            parseFloat(String(prevSummary.costToYou || '').replace('$', '')) || 0
                                          )
                                        )}
                                      >
                                        ({formatDifference(
                                          calculateDifferenceWithReset(
                                            parseFloat(String(latestSummary.costToYou || '').replace('$', '')) || 0,
                                            parseFloat(String(prevSummary.costToYou || '').replace('$', '')) || 0
                                          )
                                        )})
                                      </small>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2">
                                <small className="text-muted">
                                  <i className="bi bi-info-circle" /> 括弧内の数値は前日との差です。
                                  <span className="text-success">緑色</span>は増加、
                                  <span className="text-danger">赤色</span>は減少、
                                  <span className="text-muted">グレー</span>は変化なしを示します。
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100">
                    <div className="card-header">
                      <div className="d-flex flex-column">
                        <h2 className="card-title mb-2">Usage Events</h2>
                        <div className="d-flex justify-content-end">
                          <Link
                            href={ROUTES.USAGE_EVENTS}
                            className="btn btn-primary btn-sm"
                          >
                            詳細を見る
                          </Link>
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      {latestDateTime && (
                        <div className="usage-events-stats">
                          <div className="card mb-3">
                            <div className="card-body">
                              <h3 className="h5 mb-2">最新使用日統計</h3>
                              <div className="usage-stats-summary">
                                <div className="stat-item">
                                  <span className="stat-label">最新使用日:</span>
                                  <span className="stat-value">{latestDateTime}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">イベント数（成功/総数）:</span>
                                  <span className="stat-value">{successfulCount}/{eventCount}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">総トークン数:</span>
                                  <span className="stat-value">{totalTokens.toLocaleString()}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Input (w/ Cache Write):</span>
                                  <span className="stat-value">{inputWithCache.toLocaleString()}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Input (w/o Cache Write):</span>
                                  <span className="stat-value">{inputWithoutCache.toLocaleString()}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Cache Read:</span>
                                  <span className="stat-value">{cacheRead.toLocaleString()}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Output Tokens:</span>
                                  <span className="stat-value">{outputTokens.toLocaleString()}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">コスト:</span>
                                  <span className="stat-value">
                                    {dayCost > 0 ? `$${dayCost.toFixed(2)}` : '$0.00'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
