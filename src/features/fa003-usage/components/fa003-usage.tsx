'use client';

import { useEffect, useState } from 'react';
import { Fc100HeaderOld } from '@/components/layout/fc100-header-old';
import { loadUsageData } from '@/domain/repositories';

export function Fa003Usage() {
  const [data, setData] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData().then(setData).catch(() => setData([])).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Fc100HeaderOld />
      <div className="container-fluid mt-3">
        {loading && <div className="spinner-border text-primary" />}
        {!loading && (
          <>
            <h1 className="text-center">Usage</h1>
            <p className="text-center text-muted">
              旧形式: usage-tokens + usage-details 統合データ
            </p>
            {data.length > 0 && (
              <div className="card">
                <div className="card-body">
                  <p>データ件数: {data.length}件</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
