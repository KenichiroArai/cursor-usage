'use client';

import { useEffect, useState } from 'react';
import { loadVersionInfo } from '@/domain/repositories';
import type { VersionInfo } from '@/types';

export function Fc200VersionModal() {
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    loadVersionInfo().then(setInfo);
  }, []);

  useEffect(() => {
    const modal = document.getElementById('versionModal');
    if (!modal) return;
    const handler = () => loadVersionInfo().then(setInfo);
    modal.addEventListener('show.bs.modal', handler);
    return () => modal.removeEventListener('show.bs.modal', handler);
  }, []);

  const version = info?.version?.current ?? '読み込み中...';
  const title = info?.metadata?.title ?? 'アプリケーション情報';
  const githubUrl = info?.github?.release_url ?? '#';
  const releaseLabel = info?.github?.release_url
    ? 'GitHub リリース'
    : '読み込み中...';
  const features = info?.features ?? [];

  return (
    <div
      className="modal fade"
      id="versionModal"
      tabIndex={-1}
      aria-labelledby="versionModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="versionModalLabel">
              <i className="bi bi-info-circle" /> {title}
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-12">
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">
                      <i className="bi bi-tag" /> バージョン情報
                    </h6>
                    <p className="card-text mb-2">
                      <strong>現在のバージョン:</strong> {version}
                    </p>
                    <p className="card-text mb-0">
                      <strong>開発・管理:</strong>{' '}
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-primary"
                      >
                        <i className="bi bi-github" /> {releaseLabel}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-12">
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">
                      <i className="bi bi-graph-up" /> 機能概要
                    </h6>
                    <ul className="mb-0">
                      {features.length > 0
                        ? features.map((f, i) => <li key={i}>{f}</li>)
                        : [<li key={0}>機能情報を読み込み中...</li>]}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              閉じる
            </button>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <i className="bi bi-github" /> GitHub で詳細を見る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
