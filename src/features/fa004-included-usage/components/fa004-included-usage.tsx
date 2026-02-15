'use client';

import { useEffect, useState } from 'react';
import { Fc100HeaderOld } from '@/components/layout/fc100-header-old';
import { loadIncludedUsageData } from '@/domain/repositories';
import type { IncludedUsageRecord } from '@/types';

export function Fa004IncludedUsage() {
  const [data, setData] = useState<IncludedUsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncludedUsageData().then(setData).finally(() => setLoading(false));
  }, []);

  const latest = [...data].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  )[0];

  return (
    <>
      <Fc100HeaderOld />
      <div className="container-fluid mt-3">
        {loading && <div className="spinner-border text-primary" />}
        {!loading && (
          <>
            <h1 className="text-center">Included Usage Summary</h1>
            {latest && (
              <div className="card">
                <div className="card-body">
                  <div className="stat-item">
                    <span className="stat-label">最新日:</span>
                    <span className="stat-value">{latest.dateStr}</span>
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
