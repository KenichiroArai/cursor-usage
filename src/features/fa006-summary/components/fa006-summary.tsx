'use client';

import { useEffect, useState } from 'react';
import { Fc100HeaderMain } from '@/components/layout/fc100-header-main';
import { loadSummaryData } from '@/domain/repositories';
import type { SummaryRecord } from '@/types';

export function Fa006Summary() {
  const [data, setData] = useState<SummaryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummaryData().then(setData).finally(() => setLoading(false));
  }, []);

  const latest = data
    .filter((s) => s.model.toLowerCase() === 'auto')
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

  return (
    <>
      <Fc100HeaderMain />
      <div className="container-fluid mt-3">
        {loading && <div className="spinner-border text-primary" />}
        {!loading && (
          <>
            <h1 className="text-center">サマリー</h1>
            {latest && (
              <div className="card">
                <div className="card-body">
                  <div className="stat-item">
                    <span className="stat-label">最新使用日:</span>
                    <span className="stat-value">{latest.dateStr}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total:</span>
                    <span className="stat-value">
                      {latest.total.toLocaleString()}
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
