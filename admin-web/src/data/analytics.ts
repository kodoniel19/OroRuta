// Search analytics mock data
export const dailySearches = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 8, 1 + i); // Sep 2026
  const base = 280 + Math.floor(Math.random() * 120);
  const weekend = d.getDay() === 0 || d.getDay() === 6 ? -80 : 0;
  return {
    date: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
    searches: Math.max(60, base + weekend + Math.floor(Math.random() * 60 - 30)),
  };
});

export const hourlySearches = [
  { hour: '5 AM', searches: 42 },
  { hour: '6 AM', searches: 186 },
  { hour: '7 AM', searches: 387 },
  { hour: '8 AM', searches: 521 },
  { hour: '9 AM', searches: 314 },
  { hour: '10 AM', searches: 198 },
  { hour: '11 AM', searches: 145 },
  { hour: '12 PM', searches: 231 },
  { hour: '1 PM', searches: 218 },
  { hour: '2 PM', searches: 162 },
  { hour: '3 PM', searches: 189 },
  { hour: '4 PM', searches: 298 },
  { hour: '5 PM', searches: 482 },
  { hour: '6 PM', searches: 411 },
  { hour: '7 PM', searches: 219 },
  { hour: '8 PM', searches: 98 },
  { hour: '9 PM', searches: 47 },
];

export const popularDestinations = [
  { name: 'Divisoria (CDO)', searches30: 1842, searches7: 398, change: 8.4 },
  { name: 'SM City CDO', searches30: 1627, searches7: 344, change: 5.2 },
  { name: 'Liceo de Cagayan University', searches30: 1103, searches7: 289, change: 14.8 },
  { name: 'Cogon Market', searches30: 987, searches7: 201, change: -3.1 },
  { name: 'Xavier University – Ateneo', searches30: 876, searches7: 187, change: 9.1 },
  { name: 'Corrales Ave Terminal', searches30: 741, searches7: 152, change: 2.7 },
  { name: 'Pueblo de Oro Bus Terminal', searches30: 698, searches7: 133, change: -6.4 },
  { name: 'Gaisano Mall CDO', searches30: 612, searches7: 127, change: 1.9 },
];

export const frequentRoutes = [
  { routeId: 'R-01', searches30: 2841, searches7: 587, change: 6.3 },
  { routeId: 'R-02', searches30: 2104, searches7: 489, change: 3.8 },
  { routeId: 'R-03', searches30: 1897, searches7: 398, change: -2.1 },
  { routeId: 'R-04', searches30: 1432, searches7: 302, change: 11.4 },
  { routeId: 'R-05', searches30: 1187, searches7: 248, change: 4.9 },
];

export const recentSearches = [
  { id: 's01', from: 'Puntod', to: 'Divisoria', match: 'R-02', at: new Date(Date.now() - 1 * 60000).toISOString(), found: true },
  { id: 's02', from: 'Bonbon', to: 'SM City CDO', match: 'R-01', at: new Date(Date.now() - 4 * 60000).toISOString(), found: true },
  { id: 's03', from: 'Limketkai', to: 'Bulua', match: '', at: new Date(Date.now() - 8 * 60000).toISOString(), found: false },
  { id: 's04', from: 'Cogon Market', to: 'Xavier University', match: 'R-03', at: new Date(Date.now() - 12 * 60000).toISOString(), found: true },
  { id: 's05', from: 'Baloy', to: 'Divisoria', match: 'R-04', at: new Date(Date.now() - 19 * 60000).toISOString(), found: true },
  { id: 's06', from: 'Canitoan', to: 'SM CDO Downtown', match: '', at: new Date(Date.now() - 25 * 60000).toISOString(), found: false },
  { id: 's07', from: 'El Salvador', to: 'Corrales Terminal', match: 'R-01', at: new Date(Date.now() - 31 * 60000).toISOString(), found: true },
  { id: 's08', from: 'Lapasan', to: 'Cogon', match: 'R-02', at: new Date(Date.now() - 38 * 60000).toISOString(), found: true },
  { id: 's09', from: 'Agusan', to: 'Pueblo de Oro', match: '', at: new Date(Date.now() - 44 * 60000).toISOString(), found: false },
];

export const analyticsSummary = {
  sessions30: 9421,
  sessions7: 1987,
  noResultRate30: 12.4,
  noResultRate7: 9.8,
};
