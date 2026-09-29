import { SignpostIcon, ConstructionIcon, BusFrontIcon, MapPinIcon, InfoIcon } from 'lucide-react';
import type { AnnouncementType } from '../types/transit';

export const announcementTypes: Array<{
  type: AnnouncementType;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  hint: string;
}> = [
  { type: 'Rerouting', icon: SignpostIcon, className: 'bg-amber-100 text-amber-700', hint: 'A route temporarily uses different roads' },
  { type: 'Road Closure', icon: ConstructionIcon, className: 'bg-red-100 text-red-700', hint: 'A road is closed or partially blocked' },
  { type: 'Terminal Change', icon: BusFrontIcon, className: 'bg-blue-100 text-blue-700', hint: 'A terminal or bay assignment has moved' },
  { type: 'Loading/Unloading Change', icon: MapPinIcon, className: 'bg-green-100 text-green-700', hint: 'A stop was added, moved or removed' },
  { type: 'General Update', icon: InfoIcon, className: 'bg-gray-100 text-gray-600', hint: 'Fares, schedules or other notices' },
];
