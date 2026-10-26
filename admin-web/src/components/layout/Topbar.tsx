import React from 'react';
import { MenuIcon } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { UserMenu } from './UserMenu';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white px-4 sm:px-6">
      <IconButton label="Open navigation" onClick={onMenuClick} className="lg:hidden">
        <MenuIcon className="h-5 w-5" />
      </IconButton>
      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  );
}
