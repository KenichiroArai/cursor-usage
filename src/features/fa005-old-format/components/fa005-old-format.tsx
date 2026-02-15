'use client';

import Link from 'next/link';
import { Fc100HeaderMain } from '@/components/layout/fc100-header-main';
import { ROUTES } from '@/constants';

export function Fa005OldFormat() {
  return (
    <>
      <Fc100HeaderMain />
      <div className="container-fluid mt-3">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="text-center">旧形式ページ</h1>
            <p className="text-center text-muted">
              以前の形式で作成されたページの一覧です。
            </p>
          </div>
        </div>
        <div className="row g-4">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <h2 className="card-title mb-2">Usage</h2>
                <Link
                  href={ROUTES.OLD_USAGE}
                  className="btn btn-primary btn-sm"
                >
                  詳細を見る
                </Link>
              </div>
              <div className="card-body">
                <div className="alert alert-warning" role="alert">
                  <strong>旧形式データ</strong>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <h2 className="card-title mb-2">Included Usage</h2>
                <Link
                  href={ROUTES.OLD_INCLUDED_USAGE}
                  className="btn btn-primary btn-sm"
                >
                  詳細を見る
                </Link>
              </div>
              <div className="card-body">
                <div className="alert alert-warning" role="alert">
                  <strong>旧形式データ</strong>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <p>
                  最新の情報については
                  <Link href={ROUTES.SUMMARY}>サマリー</Link>、
                  <Link href={ROUTES.USAGE_EVENTS}>Usage Events</Link>、
                  <Link href={ROUTES.RECORDS}>使用記録</Link>をご確認ください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
