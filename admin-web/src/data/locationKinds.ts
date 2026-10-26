import type { LocationKind } from '../types/transit';

export const locationKinds: Record<
  LocationKind,
  { title: string; singular: string; description: string; color: string; prefix: string; path: string }
> = {
  terminal: {
    title: 'Terminals',
    singular: 'terminal',
    description: 'Jeepney terminals where routes originate, end, or lay over.',
    color: '#0E1C2B',
    prefix: 'T',
    path: '/terminals',
  },
  loading: {
    title: 'Loading Points',
    singular: 'loading point',
    description: 'Designated zones where commuters may board jeepneys.',
    color: '#12825F',
    prefix: 'L',
    path: '/loading-points',
  },
  unloading: {
    title: 'Unloading Points',
    singular: 'unloading point',
    description: 'Designated drop-off zones where jeepneys may let passengers alight.',
    color: '#D93A3A',
    prefix: 'U',
    path: '/unloading-points',
  },
  transfer: {
    title: 'Transfer Points',
    singular: 'transfer point',
    description: 'Places where commuters switch between routes to complete a trip.',
    color: '#E9A21B',
    prefix: 'X',
    path: '/transfer-points',
  },
  landmark: {
    title: 'Landmarks',
    singular: 'landmark',
    description: 'Key landmarks and points of interest along the route.',
    color: '#6366F1',
    prefix: 'M',
    path: '/landmarks',
  },
  verified_stop: {
    title: 'Verified Stops',
    singular: 'verified stop',
    description: 'Official verified jeepney stops and boarding areas.',
    color: '#0B6E4F',
    prefix: 'S',
    path: '/verified-stops',
  },
};

