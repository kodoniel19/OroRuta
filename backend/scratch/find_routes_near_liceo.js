const fs = require('fs');
const path = require('path');

const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
const routes = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

const liceoLat = 8.4965;
const liceoLng = 124.6407;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const r = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

console.log('--- ROUTES SERVING LICEO DE CAGAYAN UNIVERSITY ---');

const servingRoutes = [];

routes.forEach(r => {
  let minStopDist = Infinity;
  let nearestStopName = '';

  const stops = [...(r.terminals || []), ...(r.stops || []), ...(r.transfers || [])];
  stops.forEach(s => {
    if (s.lat && s.lng) {
      const d = haversineMeters(liceoLat, liceoLng, s.lat, s.lng);
      if (d < minStopDist) {
        minStopDist = d;
        nearestStopName = s.name;
      }
    }
  });

  let minGeomDist = Infinity;
  (r.geometries || []).forEach(g => {
    let coords = [];
    try {
      const parsed = typeof g.geometry === 'string' ? JSON.parse(g.geometry) : g.geometry;
      coords = parsed.coordinates || [];
    } catch (e) {}
    coords.forEach(([lng, lat]) => {
      const d = haversineMeters(liceoLat, liceoLng, lat, lng);
      if (d < minGeomDist) minGeomDist = d;
    });
  });

  if (minStopDist <= 1000 || minGeomDist <= 600) {
    servingRoutes.push({
      code: r.code,
      name: r.name,
      origin: r.origin,
      destination: r.destination,
      nearestStop: nearestStopName,
      stopDistMeters: Math.round(minStopDist),
      geomDistMeters: Math.round(minGeomDist)
    });
  }
});

console.log(`Found ${servingRoutes.length} routes serving Liceo area:`);
servingRoutes.forEach(sr => {
  console.log(`- Code: [${sr.code.padEnd(6)}] Name: ${sr.name}`);
  console.log(`  Nearest Stop: ${sr.nearestStop} (${sr.stopDistMeters}m away), Polyline Dist: ${sr.geomDistMeters}m`);
});
