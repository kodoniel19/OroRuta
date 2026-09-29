import React from 'react';
import { Link } from 'react-router-dom';
import { MenuIcon } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { UserMenu } from './UserMenu';
import { useData } from '../../contexts/DataContext';
import { formatRelative } from '../../utils/format';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { bundles } = useData();
  const live = bundles.find((b) => b.status === 'Published');

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4 sm:px-6">
      <IconButton label="Open navigation" onClick={onMenuClick} className="lg:hidden">
        <MenuIcon className="h-5 w-5" />
      </IconButton>
      {live && (
        <Link
          to="/offline-data"
          className="hidden items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-fg-muted transition-colors duration-150 hover:bg-canvas hover:text-fg md:flex"
        >
          <span className="h-2 w-2 rounded-full bg-primary-500" aria-hidden />
          Live on Android app:
          <span className="font-mono text-[12px] font-medium text-fg">{live.version}</span>
          <span className="text-fg-subtle">· published {formatRelative(live.publishedAt)}</span>
        </Link>
      )}
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  );
}

