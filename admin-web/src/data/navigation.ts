import {
  LayoutDashboardIcon,
  RouteIcon,
  BusFrontIcon,
  MapPinPlusIcon,
  MapPinMinusIcon,
  MapIcon,
  BanknoteIcon,
  MegaphoneIcon,
  MessageSquareWarningIcon,
  TrendingUpIcon,
  DatabaseIcon,
  SettingsIcon,
} from 'lucide-react';

export const navigation = [
  {
    group: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboardIcon }],
  },
  {
    group: 'Network',
    items: [
      { label: 'Jeepney Routes', to: '/routes', icon: RouteIcon },
      { label: 'Terminals', to: '/terminals', icon: BusFrontIcon },
      { label: 'Loading Points', to: '/loading-points', icon: MapPinPlusIcon },
      { label: 'Unloading Points', to: '/unloading-points', icon: MapPinMinusIcon },
      { label: 'Route Maps', to: '/route-maps', icon: MapIcon },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Fare Information', to: '/fares', icon: BanknoteIcon },
      { label: 'Announcements', to: '/announcements', icon: MegaphoneIcon },
      { label: 'Reports & Feedback', to: '/reports', icon: MessageSquareWarningIcon },
    ],
  },
  {
    group: 'System',
    items: [
      { label: 'Search Analytics', to: '/analytics', icon: TrendingUpIcon },
      { label: 'Offline Data', to: '/offline-data', icon: DatabaseIcon },
      { label: 'Settings', to: '/settings', icon: SettingsIcon },
    ],
  },
];

