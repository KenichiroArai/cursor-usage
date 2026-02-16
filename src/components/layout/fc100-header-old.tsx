'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { ROUTES } from '@/constants';
import { Fc200VersionModal } from './fc200-version-modal';

const navItems = [
  { href: ROUTES.HOME, label: 'トップページ' },
  { href: ROUTES.RECORDS, label: '使用記録' },
  { href: ROUTES.SUMMARY, label: 'サマリー' },
  { href: ROUTES.USAGE_EVENTS, label: 'Usage Events' },
  { href: ROUTES.OLD_FORMAT, label: '旧形式' },
] as const;

function shareOnX() {
  const pageTitle = document.title || 'Cursor使用記録';
  const pageUrl = window.location.href;
  const text = encodeURIComponent(`${pageTitle} ${pageUrl}`);
  window.open(
    `https://x.com/intent/tweet?text=${text}`,
    '_blank',
    'width=550,height=420'
  );
}

export function Fc100HeaderOld() {
  const pathname = usePathname();

  const isActive = useCallback(
    (href: string) => {
      if (href === ROUTES.OLD_FORMAT) {
        return pathname?.startsWith('/old/') ?? false;
      }
      return false;
    },
    [pathname]
  );

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link href={ROUTES.HOME} className="navbar-brand mb-0 h1 text-decoration-none text-white">
            Cursor使用記録
          </Link>
          <div className="navbar-nav ms-auto">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${isActive(href) ? 'active' : ''}`}
              >
                {label}
              </Link>
            ))}
            <button
              type="button"
              className="nav-link btn btn-link text-light"
              onClick={shareOnX}
              title="X（旧Twitter）でシェア"
            >
              <i className="bi bi-twitter-x" /> Xでシェア
            </button>
            <button
              type="button"
              className="nav-link btn btn-link text-light"
              data-bs-toggle="modal"
              data-bs-target="#versionModal"
            >
              情報
            </button>
          </div>
        </div>
      </nav>
      <div id="version-modal-container">
        <Fc200VersionModal />
      </div>
    </>
  );
}
