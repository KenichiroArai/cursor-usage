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
              以前の形式で作成されたページの一覧です。これらのページは現在は使用されていませんが、参考として残しています。
            </p>
          </div>
        </div>

        <div className="row g-4">
          {/* Usage */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <div className="d-flex flex-column">
                  <h2 className="card-title mb-2">Usage</h2>
                  <div className="d-flex justify-content-end">
                    <Link
                      href={ROUTES.OLD_USAGE}
                      className="btn btn-primary btn-sm"
                      title="usage-tokens.csvとusage-details.csvを統合した詳細なトークン使用量の記録とグラフを確認できます。日別のトークン使用量、入力/出力/キャッシュ読み取りの詳細分析、使用傾向をグラフで表示できます。"
                    >
                      詳細を見る
                    </Link>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="old-format-info">
                  <div className="alert alert-warning" role="alert">
                    <i className="bi bi-exclamation-triangle" />{' '}
                    <strong>旧形式データ</strong>
                    <br />
                    このページは以前の形式で作成されたデータを使用しています。現在は新しい形式のデータに移行されています。
                  </div>
                  <div className="old-format-description">
                    <h5>概要</h5>
                    <p>
                      usage-tokens.csvとusage-details.csvを統合した詳細なトークン使用量の記録とグラフを確認できます。
                    </p>
                    <h5>主な機能</h5>
                    <ul>
                      <li>日別のトークン使用量分析</li>
                      <li>入力/出力/キャッシュ読み取りの詳細分析</li>
                      <li>使用傾向のグラフ表示</li>
                      <li>月別・週別の集計データ</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Included Usage */}
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <div className="d-flex flex-column">
                  <h2 className="card-title mb-2">Included Usage</h2>
                  <div className="d-flex justify-content-end">
                    <Link
                      href={ROUTES.OLD_INCLUDED_USAGE}
                      className="btn btn-primary btn-sm"
                      title="Included Usage Summaryの詳細な記録とグラフを確認できます。Total Tokens、Input、Output、API Costの推移をグラフで表示し、コスト分析ができます。また、月別・週別のコスト集計や、予算管理のための分析データも確認できます。"
                    >
                      詳細を見る
                    </Link>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="old-format-info">
                  <div className="alert alert-warning" role="alert">
                    <i className="bi bi-exclamation-triangle" />{' '}
                    <strong>旧形式データ</strong>
                    <br />
                    このページは以前の形式で作成されたデータを使用しています。現在は新しい形式のデータに移行されています。
                  </div>
                  <div className="old-format-description">
                    <h5>概要</h5>
                    <p>
                      Included Usage Summaryの詳細な記録とグラフを確認できます。
                    </p>
                    <h5>主な機能</h5>
                    <ul>
                      <li>Total Tokens、Input、Output、API Costの推移グラフ</li>
                      <li>コスト分析と予算管理</li>
                      <li>月別・週別のコスト集計</li>
                      <li>詳細な使用状況分析</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="col-12 col-md-12 col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <h2 className="card-title mb-2">注意事項</h2>
              </div>
              <div className="card-body">
                <div className="alert alert-info" role="alert">
                  <i className="bi bi-info-circle" />{' '}
                  <strong>旧形式ページについて</strong>
                </div>
                <div className="old-format-notes">
                  <h5>データ形式の変更</h5>
                  <p>
                    これらのページは以前のデータ形式で作成されています。現在は新しい形式のデータに移行されているため、最新の情報については以下のページをご確認ください：
                  </p>
                  <ul>
                    <li>
                      <Link href={ROUTES.SUMMARY}>サマリー</Link> -
                      最新の使用状況
                    </li>
                    <li>
                      <Link href={ROUTES.USAGE_EVENTS}>Usage Events</Link> -
                      最新のイベント情報
                    </li>
                    <li>
                      <Link href={ROUTES.RECORDS}>使用記録</Link> -
                      最新の使用記録
                    </li>
                  </ul>

                  <h5 className="mt-3">技術的な詳細</h5>
                  <p>旧形式のページは以下の理由で残されています：</p>
                  <ul>
                    <li>過去のデータとの比較</li>
                    <li>データ移行の検証</li>
                    <li>参考資料としての価値</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
