'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Fc100HeaderMain } from '@/components/layout/fc100-header-main';
import { loadRecordsData } from '@/domain/repositories';
import type { RecordData } from '@/types';
import { getProgressColor } from '@/utils';
import { ROUTES, TOTAL_DAYS } from '@/constants';

export function Fa002Records() {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecordsData()
      .then(setRecords)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const latest = records[records.length - 1];

  return (
    <>
      <Fc100HeaderMain />
      <div className="container-fluid mt-3">
        {loading && (
          <div className="text-center">
            <div className="spinner-border text-primary" role="status" />
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && !error && (
          <>
            <h1 className="text-center">使用記録</h1>
            <p className="text-center text-muted">
              使用状況の詳細な記録とグラフを確認できます
            </p>
            {latest && (
              <div className="card">
                <div className="card-body">
                  <div className="stat-item">
                    <span className="stat-label">Suggested Lines:</span>
                    <span className="stat-value">
                      {latest['Suggested Lines: X lines'].toLocaleString()}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Accepted Lines:</span>
                    <span className="stat-value">
                      {latest['Accepted Lines: X Lines'].toLocaleString()}
                    </span>
                  </div>
                  <div className="progress-label">
                    <span>使用状況</span>
                    <span>
                      {latest.日数}日 / {TOTAL_DAYS}日
                    </span>
                  </div>
                  <div
                    className="progress-bar progress"
                    style={{
                      width: `${(latest.日数 / TOTAL_DAYS) * 100}%`,
                      backgroundColor: getProgressColor(
                        (latest.日数 / TOTAL_DAYS) * 100
                      ),
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
