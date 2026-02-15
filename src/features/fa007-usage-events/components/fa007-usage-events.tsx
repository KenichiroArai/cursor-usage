'use client';

import { useEffect, useState } from 'react';
import { Fc100HeaderMain } from '@/components/layout/fc100-header-main';
import { loadUsageEventsData } from '@/domain/repositories';
import type { UsageEventRecord } from '@/types';

export function Fa007UsageEvents() {
  const [data, setData] = useState<UsageEventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageEventsData().then(setData).finally(() => setLoading(false));
  }, []);

  const latest = [...data].sort(
    (a, b) => b.Date.getTime() - a.Date.getTime()
  )[0];

  return (
    <>
      <Fc100HeaderMain />
      <div className="container-fluid mt-3">
        {loading && <div className="spinner-border text-primary" />}
        {!loading && (
          <>
            <h1 className="text-center">Usage Events</h1>
            {latest && (
              <div className="card">
                <div className="card-body">
                  <div className="stat-item">
                    <span className="stat-label">最新日:</span>
                    <span className="stat-value">
                      {latest.Date.toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">総トークン数:</span>
                    <span className="stat-value">
                      {data.reduce((s, e) => s + e['Total Tokens'], 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
