const db = require('../src/config/db');
const routing = require('../src/utils/routing');

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = x => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculatePolylineMeters(coords) {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += haversineMeters(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
  }
  return total;
}

function cleanStopName(s) {
  if (!s) return '';
  return s.replace(/^[-–—\s]+/, '').replace(/[-–—\s]+$/, '').trim();
}

async function testMatch(originName, origLat, origLng, destName, destLat, destLng) {
  console.log(`\n======================================================`);
  console.log(`SEARCH: ${originName} -> ${destName}`);
  const directDistM = haversineMeters(origLat, origLng, destLat, destLng);
  console.log(`Direct Distance: ${Math.round(directDistM)}m`);

  // Direct walk test
  let walkRoute = null;
  if (directDistM <= 1600) {
    walkRoute = await routing.getWalkingRoute([origLng, origLat], [destLng, destLat]);
    if (walkRoute) {
      console.log(`  -> DIRECT WALK: ${Math.round(walkRoute.distanceMeters)}m, ~${Math.max(1, Math.round(walkRoute.durationSeconds / 60))} min walk`);
    }
  }

  // Find candidate jeepneys
  const [routes] = await db.execute("SELECT * FROM routes WHERE status = 'Active'");
  const candidates = [];

  for (const r of routes) {
    const [geos] = await db.execute("SELECT direction, geometry FROM route_geometry WHERE route_id = ?", [r.id]);
    const [dirs] = await db.execute("SELECT direction, distance_km, street_sequence FROM route_directions WHERE route_id = ?", [r.id]);
    const dirMap = {};
    dirs.forEach(d => { dirMap[d.direction] = d; });

    for (const g of geos) {
      const direction = g.direction;
      let geom = g.geometry;
      if (typeof geom === 'string') {
        try { geom = JSON.parse(geom); } catch (_) { geom = null; }
      }
      if (!geom || !geom.coordinates || geom.coordinates.length < 2) continue;
      const coords = geom.coordinates;

      let minOrigDist = Infinity;
      let origIdx = -1;
      for (let i = 0; i < coords.length; i++) {
        const d = haversineMeters(origLat, origLng, coords[i][1], coords[i][0]);
        if (d < minOrigDist) { minOrigDist = d; origIdx = i; }
      }

      let minDestDist = Infinity;
      let destIdx = -1;
      for (let i = 0; i < coords.length; i++) {
        const d = haversineMeters(destLat, destLng, coords[i][1], coords[i][0]);
        if (d < minDestDist) { minDestDist = d; destIdx = i; }
      }

      // Max walk thresholds
      const maxWalkThreshold = directDistM < 1500 ? 400 : 850;
      if (minOrigDist > maxWalkThreshold || minDestDist > maxWalkThreshold) continue;
      if (origIdx >= destIdx) continue;

      const rideCoords = coords.slice(origIdx, destIdx + 1);
      const rideDistMeters = calculatePolylineMeters(rideCoords);
      if (rideDistMeters < 350) continue;

      // DETOUR REJECTION:
      // If direct distance is short (< 1500m), don't send passengers on a massive detour > 2x direct distance
      if (directDistM < 1500 && rideDistMeters > 2.2 * directDistM) {
        // e.g. 2.8 km ride for 770m trip is rejected
        continue;
      }

      // Don't recommend a jeepney if total walking to/from stops is greater than the direct distance
      const totalWalkM = minOrigDist + minDestDist;
      if (directDistM < 1200 && totalWalkM >= directDistM * 0.95) {
        continue;
      }

      const stops = (dirMap[direction]?.street_sequence || '').split(/\s*[|–—]\s*/).map(cleanStopName).filter(Boolean);
      const verifiedDirectionDest = stops.length > 0 ? stops[stops.length - 1] : (direction === 'Inbound' ? r.destination : r.origin);

      candidates.push({
        id: r.id,
        name: r.name,
        code: r.code,
        direction,
        rideDistMeters: Math.round(rideDistMeters),
        walkMeters: Math.round(totalWalkM),
        signboardDest: verifiedDirectionDest
      });
    }
  }

  // Deduplicate by route id
  const bestById = new Map();
  for (const c of candidates) {
    if (!bestById.has(c.id) || c.rideDistMeters < bestById.get(c.id).rideDistMeters) {
      bestById.set(c.id, c);
    }
  }

  const results = Array.from(bestById.values());
  console.log(`Matching Jeepneys count: ${results.length}`);
  results.forEach((c, idx) => {
    console.log(`  [${idx+1}] ${c.name} (${c.direction}) - Ride ${c.rideDistMeters}m, Walk ${c.walkMeters}m`);
    console.log(`      Signboard text: "Look for route signboard towards ${c.signboardDest}"`);
  });
}

(async () => {
  // Carmen Market -> St. Augustine Cathedral
  await testMatch('Carmen Market', 8.4804, 124.6369, 'St. Augustine Cathedral', 8.4777, 124.6433);

  // Carmen Market -> Agora Terminal
  await testMatch('Carmen Market', 8.4804, 124.6369, 'Agora Terminal', 8.4857, 124.6589);

  // Agora Terminal -> Bayabas
  await testMatch('Agora Terminal', 8.4857, 124.6589, 'Brgy. Bayabas', 8.5150, 124.6300);

  process.exit(0);
})();
