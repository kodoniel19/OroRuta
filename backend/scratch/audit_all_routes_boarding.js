const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distToPolylineMeters(lat, lng, coords) {
  let minD = Infinity;
  for (const [cLng, cLat] of coords) {
    const d = haversineMeters(lat, lng, cLat, cLng);
    if (d < minD) minD = d;
  }
  return minD;
}

const CDO_LANDMARKS = [
  { name: 'Liceo de Cagayan University', lat: 8.4862, lng: 124.6388, maxDist: 400 },
  { name: 'Carmen Public Market', lat: 8.479498, lng: 124.636820, maxDist: 400 },
  { name: 'Agora Terminal', lat: 8.48813, lng: 124.658, maxDist: 400 },
  { name: 'Cogon Public Market', lat: 8.47716, lng: 124.6512, maxDist: 400 },
  { name: 'Bulua Terminal', lat: 8.5040, lng: 124.6115, maxDist: 450 },
  { name: 'Limketkai Center', lat: 8.4838, lng: 124.653, maxDist: 400 },
  { name: 'Plaza Divisoria', lat: 8.4777, lng: 124.6452, maxDist: 400 },
  { name: 'Centrio Mall', lat: 8.4856, lng: 124.6513, maxDist: 400 },
  { name: 'SM CDO Downtown', lat: 8.4843, lng: 124.6549, maxDist: 400 },
  { name: 'USTP Lapasan', lat: 8.4852, lng: 124.6572, maxDist: 400 },
  { name: 'Camp Evangelista', lat: 8.4878, lng: 124.6256, maxDist: 400 }
];

async function audit() {
  const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
  const bundled = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

  console.log(`=== AUDITING ALL ${bundled.length} BUNDLED ROUTES ===`);
  const routesPassingLiceo = [];
  const offRouteStops = [];
  const mismatchedStops = [];

  for (const r of bundled) {
    const inGeom = r.geometries?.find(g => g.direction === 'Inbound');
    const outGeom = r.geometries?.find(g => g.direction === 'Outbound');

    const inCoords = inGeom ? JSON.parse(inGeom.geometry).coordinates : [];
    const outCoords = outGeom ? JSON.parse(outGeom.geometry).coordinates : [];

    // Check if route passes Liceo
    const inLiceoD = inCoords.length ? distToPolylineMeters(8.4862, 124.6388, inCoords) : Infinity;
    const outLiceoD = outCoords.length ? distToPolylineMeters(8.4862, 124.6388, outCoords) : Infinity;
    if (inLiceoD <= 150 || outLiceoD <= 150) {
      routesPassingLiceo.push({
        code: r.code,
        name: r.name,
        id: r.id,
        inLiceoD: Math.round(inLiceoD),
        outLiceoD: Math.round(outLiceoD),
        hasLiceoStop: (r.stops || []).some(s => s.name.toLowerCase().includes('liceo'))
      });
    }

    // Check all stops for being within 150m of either direction's polyline
    const allStops = [...(r.stops || []), ...(r.terminals || [])];
    for (const s of allStops) {
      if (!s.lat || !s.lng) continue;
      const dIn = inCoords.length ? distToPolylineMeters(s.lat, s.lng, inCoords) : Infinity;
      const dOut = outCoords.length ? distToPolylineMeters(s.lat, s.lng, outCoords) : Infinity;
      const minD = Math.min(dIn, dOut);
      if (minD > 200) {
        offRouteStops.push({
          route: `[${r.code}] ${r.name}`,
          stop: s.name,
          dist: Math.round(minD)
        });
      }

      // Check for name / coordinate mismatch against CDO landmarks
      for (const lm of CDO_LANDMARKS) {
        if (s.name.toLowerCase().includes(lm.name.toLowerCase())) {
          const dLm = haversineMeters(s.lat, s.lng, lm.lat, lm.lng);
          if (dLm > lm.maxDist) {
            mismatchedStops.push({
              route: `[${r.code}] ${r.name}`,
              stop: s.name,
              landmark: lm.name,
              dist: Math.round(dLm)
            });
          }
        }
      }
    }
  }

  console.log(`\nRoutes passing within 150m of Liceo (${routesPassingLiceo.length}):`);
  for (const r of routesPassingLiceo) {
    console.log(`  [${r.code}] ${r.name} (in: ${r.inLiceoD}m, out: ${r.outLiceoD}m) - hasLiceoStop: ${r.hasLiceoStop}`);
  }

  console.log(`\nStops > 200m off route polyline (${offRouteStops.length}):`);
  for (const o of offRouteStops.slice(0, 10)) {
    console.log(`  ${o.route}: "${o.stop}" is ${o.dist}m away from route`);
  }

  console.log(`\nStops with mismatched landmark names (${mismatchedStops.length}):`);
  for (const m of mismatchedStops) {
    console.log(`  ${m.route}: "${m.stop}" is ${m.dist}m away from ${m.landmark}`);
  }

  process.exit(0);
}

audit().catch(e => { console.error(e); process.exit(1); });

