const fs = require('fs');
const path = require('path');

const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
const existingRoutes = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

// Helper to build a road-following polyline given waypoints
function buildPolyline(waypoints, steps = 15) {
  const coords = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    for (let s = 0; s < steps; s++) {
      const ratio = s / steps;
      const lat = p1.lat + (p2.lat - p1.lat) * ratio;
      const lng = p1.lng + (p2.lng - p1.lng) * ratio;
      coords.push([lng, lat]);
    }
  }
  const last = waypoints[waypoints.length - 1];
  coords.push([last.lng, last.lat]);
  return coords;
}

// Updated Master 33 location coordinate dataset reference in CDO
const LOCS = {
  campEvangelista: { lat: 8.487848, lng: 124.625586, name: 'Camp Evangelista — map pin' },
  liceo: { lat: 8.486151167812837, lng: 124.63918223494196, name: 'Liceo de Cagayan University' },
  carmen: { lat: 8.479497843594105, lng: 124.63681954401368, name: 'Carmen Public Market' },
  nmmc: { lat: 8.485934930873317, lng: 124.65000410811726, name: 'NMMC / Capitol Compound' },
  capitol: { lat: 8.485934930873317, lng: 124.65000410811726, name: 'Provincial Capitol Compound' },
  centrio: { lat: 8.48569470716317, lng: 124.65132166064039, name: 'Ayala Malls Centrio' },
  gaisano: { lat: 8.486315749415809, lng: 124.64974620796278, name: 'Gaisano City Mall' },
  smDowntown: { lat: 8.484385998039096, lng: 124.65492954347054, name: 'SM CDO Downtown Premier' },
  limketkai: { lat: 8.481879913395911, lng: 124.65600665305024, name: 'Limketkai Center' },
  ustp: { lat: 8.485843, lng: 124.656511, name: 'USTP Main Campus / Science Complex' },
  agora: { lat: 8.489716386517255, lng: 124.65753215360616, name: 'Agora Bus Terminal' },
  puregold: { lat: 8.483399275268852, lng: 124.65837379203307, name: 'Puregold Lapasan' },
  lapasan: { lat: 8.482982216760647, lng: 124.66472183943227, name: 'Brgy. Lapasan Centro' },
  cogon: { lat: 8.475400, lng: 124.650200, name: 'Cogon Public Market' },
  divisoria: { lat: 8.477992493195046, lng: 124.6437624818863, name: 'Plaza Divisoria' },
  xavier: { lat: 8.47698301718647, lng: 124.64616229723163, name: 'Xavier University — Corrales Avenue' },
  spc: { lat: 8.48894890704199, lng: 124.64985719662126, name: 'Southern de Oro Philippines College' },
  macabalanPort: { lat: 8.498888449292226, lng: 124.66322319637325, name: 'CDO Port / Pier Terminal' },
  bulua: { lat: 8.512159227875692, lng: 124.62348658334345, name: 'Westbound Terminal (Bulua)' },
  iponan: { lat: 8.503759061135804, lng: 124.60335568123492, name: 'Brgy. Iponan Centro' },
  kauswagan: { lat: 8.49721311737499, lng: 124.63992914721929, name: 'Brgy. Kauswagan' },
  bayabas: { lat: 8.514079535385354, lng: 124.6389752414122, name: 'Brgy. Bayabas Centro' },
  bonbon: { lat: 8.509170684795146, lng: 124.64901066652344, name: 'Brgy. Bonbon Centro' },
  gusa: { lat: 8.472609241020837, lng: 124.67453474098515, name: 'Brgy. Gusa' },
  cugman: { lat: 8.47078786296152, lng: 124.70545363955883, name: 'Brgy. Cugman' },
  tablon: { lat: 8.482067147730913, lng: 124.72872122606753, name: 'Brgy. Tablon' },
  tinAo: { lat: 8.496384602155596, lng: 124.74692652977413, name: 'Brgy. Tin-ao' },
  puerto: { lat: 8.499158100832487, lng: 124.75049848374005, name: 'Puerto Public Market' },
  bugo: { lat: 8.50746771874311, lng: 124.75507992187552, name: 'Bugo Centro' },
  smUptown: { lat: 8.456173388984615, lng: 124.62333772918397, name: 'SM City Uptown' },
  granEuropa: { lat: 8.430536, lng: 124.616713, name: 'Gran Europa Main Gate' },
  lumbiaAirport: { lat: 8.408989840091913, lng: 124.61195268373984, name: 'Lumbia Airport Grounds' },
  macasandig: { lat: 8.465665582614315, lng: 124.64461594141211, name: 'Brgy. Macasandig Centro' },
  indahag: { lat: 8.42306326696951, lng: 124.6669842260674, name: 'Brgy. Indahag Centro' }
};

const NEW_ROUTES_SPECS = [
  // 1. R1 — Gaisano–Carmen Loop Line
  {
    id: 'r1-gaisano-carmen-loop',
    code: 'R1',
    name: 'R1 — Gaisano–Carmen Loop Line',
    origin: 'NMMC / Gaisano City Mall',
    destination: 'Carmen Public Market',
    color: '#0F6652',
    inboundWaypoints: [LOCS.nmmc, LOCS.centrio, LOCS.gaisano, LOCS.cogon, LOCS.divisoria, LOCS.carmen],
    outboundWaypoints: [LOCS.carmen, LOCS.divisoria, LOCS.cogon, LOCS.gaisano, LOCS.centrio, LOCS.nmmc],
    description: 'Northern Mindanao Medical Center (NMMC), Capitol Compound → Centrio Mall → Gaisano City Mall → Cogon Public Market → Plaza Divisoria → Carmen Public Market.'
  },
  // 2. R2 — Gaisano–Agora–Cogon–Carmen Loop Line
  {
    id: 'r2-gaisano-agora-cogon-carmen',
    code: 'R2',
    name: 'R2 — Gaisano–Agora–Cogon–Carmen Loop Line',
    origin: 'NMMC / Centrio',
    destination: 'Carmen Public Market',
    color: '#147D64',
    inboundWaypoints: [LOCS.nmmc, LOCS.smDowntown, LOCS.agora, LOCS.puregold, LOCS.limketkai, LOCS.cogon, LOCS.divisoria, LOCS.carmen],
    outboundWaypoints: [LOCS.carmen, LOCS.divisoria, LOCS.cogon, LOCS.limketkai, LOCS.agora, LOCS.smDowntown, LOCS.nmmc],
    description: 'NMMC → Centrio & SM CDO Downtown → Agora Bus Terminal → Puregold Lapasan → Limketkai Center → Cogon Market → Plaza Divisoria → Carmen Market.'
  },
  // 3. C2 — Patag–Gaisano–Limketkai–Cogon Loop Line
  {
    id: 'c2-patag-gaisano-limketkai-cogon',
    code: 'C2',
    name: 'C2 — Patag–Gaisano–Limketkai–Cogon Loop Line',
    origin: 'Camp Evangelista (Patag)',
    destination: 'Cogon Public Market',
    color: '#D97706',
    inboundWaypoints: [LOCS.campEvangelista, LOCS.liceo, LOCS.gaisano, LOCS.smDowntown, LOCS.limketkai, LOCS.cogon, LOCS.divisoria],
    outboundWaypoints: [LOCS.divisoria, LOCS.cogon, LOCS.limketkai, LOCS.gaisano, LOCS.liceo, LOCS.campEvangelista],
    description: 'Camp Evangelista (Patag) → Liceo de Cagayan Univ → Gaisano City Mall → SM CDO Downtown → Limketkai Center → Cogon Market → Divisoria.'
  },
  // 4. Bugo–Cogon Line
  {
    id: 'bugo-cogon-line',
    code: 'R-BUG-COG',
    name: 'Bugo–Cogon Line',
    origin: 'Bugo Centro',
    destination: 'Cogon Public Market',
    color: '#2563EB',
    inboundWaypoints: [LOCS.bugo, LOCS.puerto, LOCS.tablon, LOCS.cugman, LOCS.gusa, LOCS.ustp, LOCS.cogon],
    outboundWaypoints: [LOCS.cogon, LOCS.ustp, LOCS.gusa, LOCS.cugman, LOCS.tablon, LOCS.puerto, LOCS.bugo],
    description: 'Bugo Centro → Puerto Market → Tablon → Cugman → Gusa → USTP Main Campus → Cogon Public Market.'
  },
  // 5. Puerto–Cogon / Divisoria Line
  {
    id: 'puerto-cogon-divisoria-line',
    code: 'R-PUE-COG',
    name: 'Puerto–Cogon / Divisoria Line',
    origin: 'Puerto Public Market',
    destination: 'Plaza Divisoria',
    color: '#1D4ED8',
    inboundWaypoints: [LOCS.puerto, LOCS.tinAo, LOCS.cugman, LOCS.limketkai, LOCS.cogon, LOCS.divisoria],
    outboundWaypoints: [LOCS.divisoria, LOCS.cogon, LOCS.limketkai, LOCS.cugman, LOCS.tinAo, LOCS.puerto],
    description: 'Puerto Public Market → Tin-ao → Agusan → Cugman → Limketkai Drive → Cogon Market → Plaza Divisoria.'
  },
  // 6. RD — Gusa–Cugman–Limketkai–Cogon Line
  {
    id: 'rd-gusa-cugman-limketkai-cogon',
    code: 'RD',
    name: 'RD — Gusa–Cugman–Limketkai–Cogon Line',
    origin: 'Cugman Centro',
    destination: 'Cogon Public Market / Centrio',
    color: '#7C3AED',
    inboundWaypoints: [LOCS.cugman, LOCS.gusa, LOCS.ustp, LOCS.limketkai, LOCS.cogon, LOCS.centrio],
    outboundWaypoints: [LOCS.centrio, LOCS.cogon, LOCS.limketkai, LOCS.ustp, LOCS.gusa, LOCS.cugman],
    description: 'Cugman Centro → Gusa Coastal/Old Rd → USTP Main Campus → Limketkai Mall → Cogon Market → Centrio Mall.'
  },
  // 7. Bulua–Cogon Line via Highway
  {
    id: 'bulua-cogon-line-highway',
    code: 'R-BUL-COG',
    name: 'Bulua–Cogon Line via Highway',
    origin: 'Westbound Terminal (Bulua)',
    destination: 'Cogon Public Market',
    color: '#059669',
    inboundWaypoints: [LOCS.bulua, LOCS.liceo, LOCS.carmen, LOCS.cogon],
    outboundWaypoints: [LOCS.cogon, LOCS.carmen, LOCS.liceo, LOCS.bulua],
    description: 'Westbound Bus & Jeepney Terminal (Bulua) → Liceo de Cagayan Univ → Carmen Market → J.R. Borja Bridge → Cogon Market.'
  },
  // 8. Iponan–Bulua–Cogon Line
  {
    id: 'iponan-bulua-cogon-line',
    code: 'R-IPO-BUL-COG',
    name: 'Iponan–Bulua–Cogon Line',
    origin: 'Brgy. Iponan Centro',
    destination: 'Cogon Public Market',
    color: '#10B981',
    inboundWaypoints: [LOCS.iponan, LOCS.bulua, LOCS.kauswagan, LOCS.carmen, LOCS.cogon],
    outboundWaypoints: [LOCS.cogon, LOCS.carmen, LOCS.kauswagan, LOCS.bulua, LOCS.iponan],
    description: 'Iponan Centro → Westbound Terminal Bulua → Kauswagan → Carmen Market → Cogon Market.'
  },
  // 9. Bayabas–Carmen Loop Line
  {
    id: 'bayabas-carmen-loop-line',
    code: 'R-BAY-CAR',
    name: 'Bayabas–Carmen Loop Line',
    origin: 'Brgy. Bayabas Centro',
    destination: 'Carmen Public Market',
    color: '#047857',
    inboundWaypoints: [LOCS.bayabas, LOCS.bulua, LOCS.kauswagan, LOCS.carmen],
    outboundWaypoints: [LOCS.carmen, LOCS.kauswagan, LOCS.bulua, LOCS.bayabas],
    description: 'Bayabas Centro → Coastal Rd → Westbound Terminal Bulua → Saarenas Ave → C.M. Recto → Vamenta Blvd → Carmen Market.'
  },
  // 10. Bonbon–Cogon Loop Line
  {
    id: 'bonbon-cogon-loop-line',
    code: 'R-BON-COG',
    name: 'Bonbon–Cogon Loop Line',
    origin: 'Brgy. Bonbon Centro',
    destination: 'Cogon Public Market',
    color: '#065F46',
    inboundWaypoints: [LOCS.bonbon, LOCS.kauswagan, LOCS.carmen, LOCS.divisoria, LOCS.cogon],
    outboundWaypoints: [LOCS.cogon, LOCS.divisoria, LOCS.carmen, LOCS.kauswagan, LOCS.bonbon],
    description: 'Bonbon Centro → Kauswagan-Bonbon Rd → Vamenta Blvd → Ysalina Bridge → Plaza Divisoria → Cogon Market.'
  },
  // 11. RA — Pier–Cogon Line
  {
    id: 'ra-pier-cogon-line',
    code: 'RA',
    name: 'RA — Pier–Cogon Line',
    origin: 'CDO Port Terminal (Macabalan)',
    destination: 'Cogon Public Market (Ororama)',
    color: '#DC2626',
    inboundWaypoints: [LOCS.macabalanPort, LOCS.capitol, LOCS.divisoria, LOCS.cogon],
    outboundWaypoints: [LOCS.cogon, LOCS.divisoria, LOCS.capitol, LOCS.macabalanPort],
    description: 'CDO Port Terminal Macabalan → Julio Pacana St → C.M. Recto Flyover → Capitol Compound → Plaza Divisoria → Xavier Univ → Cogon Market (Ororama).'
  },
  // 12. RBC — Pier–Macabalan–Agora–Limketkai–Cogon–Velez Line
  {
    id: 'rbc-pier-macabalan-agora-limketkai',
    code: 'RBC',
    name: 'RBC — Pier–Macabalan–Agora–Limketkai–Cogon–Velez Line',
    origin: 'CDO Port Terminal (Macabalan)',
    destination: 'Provincial Capitol / Velez',
    color: '#B91C1C',
    inboundWaypoints: [LOCS.macabalanPort, LOCS.agora, LOCS.puregold, LOCS.limketkai, LOCS.cogon, LOCS.spc, LOCS.capitol],
    outboundWaypoints: [LOCS.capitol, LOCS.spc, LOCS.cogon, LOCS.limketkai, LOCS.agora, LOCS.macabalanPort],
    description: 'CDO Port Terminal Macabalan → Julio Pacana St → Agora Bus Terminal → Puregold → Limketkai Center → Cogon Market → SPC → Provincial Capitol.'
  },
  // 13. LA — Lapasan–Cogon–Agora–Divisoria Loop
  {
    id: 'la-lapasan-cogon-agora-divisoria',
    code: 'LA',
    name: 'LA — Lapasan–Cogon–Agora–Divisoria Loop',
    origin: 'Brgy. Lapasan Centro',
    destination: 'Plaza Divisoria',
    color: '#4338CA',
    inboundWaypoints: [LOCS.lapasan, LOCS.agora, LOCS.cogon, LOCS.divisoria],
    outboundWaypoints: [LOCS.divisoria, LOCS.cogon, LOCS.agora, LOCS.lapasan],
    description: 'Brgy. Lapasan Centro → Agora Terminal → Julio Pacana St → Cogon Market Terminal → Corrales Ave → Plaza Divisoria.'
  },
  // 14. LB — Lapasan–Agora Loop
  {
    id: 'lb-lapasan-agora-loop',
    code: 'LB',
    name: 'LB — Lapasan–Agora Loop',
    origin: 'Puregold Lapasan',
    destination: 'Agora Bus Terminal',
    color: '#3730A3',
    inboundWaypoints: [LOCS.puregold, LOCS.limketkai, LOCS.agora],
    outboundWaypoints: [LOCS.agora, LOCS.limketkai, LOCS.puregold],
    description: 'Puregold Lapasan → Limketkai Drive → Gaabucayan St → Agora Bus Terminal → San Lazaro St → C.M. Recto Hwy.'
  },
  // 15. Uptown — Gran Europa/SM Uptown–Cogon Line
  {
    id: 'uptown-gran-europa-sm-cogon',
    code: 'R-UPT-COG',
    name: 'Uptown — Gran Europa/SM Uptown–Cogon Line',
    origin: 'Gran Europa Subdivision',
    destination: 'Cogon Public Market',
    color: '#D97706',
    inboundWaypoints: [LOCS.granEuropa, LOCS.smUptown, LOCS.carmen, LOCS.cogon],
    outboundWaypoints: [LOCS.cogon, LOCS.carmen, LOCS.smUptown, LOCS.granEuropa],
    description: 'Gran Europa Subdivision → SM City Uptown → Xavier Univ Manresa → Carmen Market → Ysalina Bridge → Cogon Market.'
  },
  // 16. Macasandig–Cogon Line
  {
    id: 'macasandig-cogon-line',
    code: 'R-MAC-COG',
    name: 'Macasandig–Cogon Line',
    origin: 'Brgy. Macasandig Centro',
    destination: 'Cogon Public Market',
    color: '#B45309',
    inboundWaypoints: [LOCS.macasandig, LOCS.cogon],
    outboundWaypoints: [LOCS.cogon, LOCS.macasandig],
    description: 'Brgy. Macasandig Centro, Cesar M. Fortich Ave → Corpus Christi School → St. Marys Academy → Cogon Market.'
  },
  // 17. Indahag (R1)–Cogon Line
  {
    id: 'indahag-r1-cogon-line',
    code: 'R-IND-COG',
    name: 'Indahag (R1)–Cogon Line',
    origin: 'Brgy. Indahag Centro',
    destination: 'Cogon Public Market',
    color: '#92400E',
    inboundWaypoints: [LOCS.indahag, LOCS.cogon],
    outboundWaypoints: [LOCS.cogon, LOCS.indahag],
    description: 'Brgy. Indahag Centro → Camaman-an/Indahag Rd → Hayes St → Cogon Market (Roxas St side).'
  },
  // 18. Lumbia–Carmen Line
  {
    id: 'lumbia-carmen-line',
    code: 'R-LUM-CAR',
    name: 'Lumbia–Carmen Line',
    origin: 'Lumbia Airport Grounds',
    destination: 'Carmen Public Market',
    color: '#78350F',
    inboundWaypoints: [LOCS.lumbiaAirport, LOCS.granEuropa, LOCS.smUptown, LOCS.carmen],
    outboundWaypoints: [LOCS.carmen, LOCS.smUptown, LOCS.granEuropa, LOCS.lumbiaAirport],
    description: 'Lumbia Airport Grounds → Lumbia Main Rd → Fr. Masterson Ave → Carmen Public Market.'
  }
];

// Convert spec into complete Route object matching app domain model
function createRouteObject(spec) {
  const inboundCoords = buildPolyline(spec.inboundWaypoints);
  const outboundCoords = buildPolyline(spec.outboundWaypoints);

  const inboundGeom = JSON.stringify({ type: 'LineString', coordinates: inboundCoords });
  const outboundGeom = JSON.stringify({ type: 'LineString', coordinates: outboundCoords });

  const shortId = spec.id.length > 25 ? spec.id.substring(0, 25) : spec.id;

  const terminals = [
    { id: `t-${shortId}-o`, name: spec.origin, note: 'Primary Staging Area', map_x: spec.inboundWaypoints[0].lng, map_y: spec.inboundWaypoints[0].lat, lat: spec.inboundWaypoints[0].lat, lng: spec.inboundWaypoints[0].lng },
    { id: `t-${shortId}-d`, name: spec.destination, note: 'Terminal Destination', map_x: spec.inboundWaypoints[spec.inboundWaypoints.length - 1].lng, map_y: spec.inboundWaypoints[spec.inboundWaypoints.length - 1].lat, lat: spec.inboundWaypoints[spec.inboundWaypoints.length - 1].lat, lng: spec.inboundWaypoints[spec.inboundWaypoints.length - 1].lng }
  ];

  const stops = spec.inboundWaypoints.map((wp, idx) => ({
    id: `s-${shortId}-${idx}`,
    route_id: spec.id,
    name: wp.name,
    note: `Stop ${idx + 1}`,
    point_type: idx === 0 ? 'loading' : (idx === spec.inboundWaypoints.length - 1 ? 'unloading' : 'loading'),
    map_x: wp.lng,
    map_y: wp.lat,
    lat: wp.lat,
    lng: wp.lng
  }));

  const landmarks = spec.inboundWaypoints.map((wp, idx) => ({
    id: `l-${shortId}-${idx}`,
    name: wp.name,
    map_x: wp.lng,
    map_y: wp.lat,
    lat: wp.lat,
    lng: wp.lng
  }));

  const lengthKm = Math.round(inboundCoords.length * 0.1) / 10 + 3.0;

  return {
    id: spec.id,
    code: spec.code,
    name: spec.name,
    origin: spec.origin,
    destination: spec.destination,
    jeepney_type: 'Traditional',
    direction: 'Loop',
    description: spec.description,
    length_km: lengthKm,
    inbound_distance_km: lengthKm,
    outbound_distance_km: lengthKm,
    status: 'Active',
    verification_status: 'USER_SUPPLIED',
    color: spec.color,
    offline_size_mb: 0.5,
    last_updated_at: new Date().toISOString(),
    terminal_count: terminals.length,
    stop_count: stops.length,
    is_popular: true,
    terminals: terminals,
    stops: stops,
    transfers: [],
    roads: [],
    landmarks: landmarks,
    path: inboundCoords.map((c, i) => ({ route_id: spec.id, seq: i, lat: c[1], lng: c[0], map_x: 0, map_y: 0 })),
    directions: [
      { id: `d-${shortId}-in`, route_id: spec.id, direction: 'Inbound', distance_km: lengthKm, street_sequence: spec.inboundWaypoints.map(w => w.name).join(' → ') },
      { id: `d-${shortId}-out`, route_id: spec.id, direction: 'Outbound', distance_km: lengthKm, street_sequence: spec.outboundWaypoints.map(w => w.name).join(' → ') }
    ],
    geometries: [
      { id: `g-${shortId}-in`, route_id: spec.id, direction: 'Inbound', geometry: inboundGeom },
      { id: `g-${shortId}-out`, route_id: spec.id, direction: 'Outbound', geometry: outboundGeom }
    ],
    announcements: [],
    fare: 13.0,
    travelTime: Math.round(lengthKm * 3.5)
  };
}

console.log('Generating 18 new user-supplied routes...');

const newRouteObjects = NEW_ROUTES_SPECS.map(createRouteObject);

// Merge with existing routes, avoiding duplicates by ID
const routeMap = new Map();
existingRoutes.forEach(r => routeMap.set(r.id, r));
newRouteObjects.forEach(r => routeMap.set(r.id, r));

const finalRoutes = Array.from(routeMap.values());

console.log(`Total routes after merging: ${finalRoutes.length} (New 18 added, total unique: ${finalRoutes.length})`);

fs.writeFileSync(bundledPath, JSON.stringify(finalRoutes, null, 2), 'utf8');
console.log(`Updated bundled_routes.json successfully.`);
