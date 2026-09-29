import type { FareRule } from '../types/transit';

export const fares: FareRule[] = [
  { id: 'F01', vehicle: 'Traditional Jeepney', category: 'Regular', baseFare: 13, perKm: 1.8, effectiveDate: '2025-10-08', lastUpdated: '2026-09-02T10:15:00', status: 'Current' },
  { id: 'F02', vehicle: 'Traditional Jeepney', category: 'Student', baseFare: 10.4, perKm: 1.44, effectiveDate: '2025-10-08', lastUpdated: '2026-09-02T10:15:00', status: 'Current' },
  { id: 'F03', vehicle: 'Traditional Jeepney', category: 'Senior Citizen', baseFare: 10.4, perKm: 1.44, effectiveDate: '2025-10-08', lastUpdated: '2026-09-02T10:15:00', status: 'Current' },
  { id: 'F04', vehicle: 'Traditional Jeepney', category: 'PWD', baseFare: 10.4, perKm: 1.44, effectiveDate: '2025-10-08', lastUpdated: '2026-09-02T10:15:00', status: 'Current' },
  { id: 'F05', vehicle: 'Modern Jeepney', category: 'Regular', baseFare: 15, perKm: 2.2, effectiveDate: '2025-10-08', lastUpdated: '2026-08-14T09:00:00', status: 'Current' },
  { id: 'F06', vehicle: 'Modern Jeepney', category: 'Student', baseFare: 12, perKm: 1.76, effectiveDate: '2025-10-08', lastUpdated: '2026-08-14T09:00:00', status: 'Current' },
  { id: 'F07', vehicle: 'Modern Jeepney', category: 'Senior Citizen', baseFare: 12, perKm: 1.76, effectiveDate: '2025-10-08', lastUpdated: '2026-08-14T09:00:00', status: 'Current' },
  { id: 'F08', vehicle: 'Modern Jeepney', category: 'PWD', baseFare: 12, perKm: 1.76, effectiveDate: '2025-10-08', lastUpdated: '2026-08-14T09:00:00', status: 'Current' },
  { id: 'F09', vehicle: 'Traditional Jeepney', category: 'Regular', baseFare: 14, perKm: 1.9, effectiveDate: '2026-10-15', lastUpdated: '2026-09-20T14:30:00', status: 'Scheduled' },
  { id: 'F10', vehicle: 'Traditional Jeepney', category: 'Regular', baseFare: 12, perKm: 1.5, effectiveDate: '2023-10-08', lastUpdated: '2025-10-08T08:00:00', status: 'Archived' },
];

