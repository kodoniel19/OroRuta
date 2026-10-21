const fs = require('fs');
const path = require('path');
const axios = require('axios');

const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
const routes = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

// Filter the 18 user-supplied routes
const targetIds = [
  'r1-gaisano-carmen-loop',
  'r2-gaisano-agora-cogon-carmen',
  'c2-patag-gaisano-limketkai-cogon',
  'bugo-cogon-line',
  'puerto-cogon-divisoria-line',
  'rd-gusa-cugman-limketkai-cogon',
  'bulua-cogon-line-highway',
  'iponan-bulua-cogon-line',
  'bayabas-carmen-loop-line',
  'bonbon-cogon-loop-line',
  'ra-pier-cogon-line',
  'rbc-pier-macabalan-agora-limketkai',
  'la-lapasan-cogon-agora-divisoria',
  'lb-lapasan-agora-loop',
  'uptown-gran-europa-sm-cogon',
  'macasandig-cogon-line',
  'indahag-r1-cogon-line',
  'lumbia-carmen-line'
];

async function fetchOsrmPolyline(waypoints) {
  const coordsStr = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
  const url = `http://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
  try {
    const res = await axios.get(url, { timeout: 10000 });
    if (res.data && res.data.routes && res.data.routes.length > 0) {
      return {
        coordinates: res.data.routes[0].geometry.coordinates,
        distanceMeters: res.data.routes[0].distance
      };
    }
  } catch (e) {
    console.warn(`OSRM failed for waypoints:`, e.message);
  }
  return null;
}

async function routeAll() {
  console.log(`Processing OSRM road network routing for 18 candidate routes...`);

  let routedCount = 0;

  for (const r of routes) {
    if (!targetIds.includes(r.id)) continue;

    console.log(`\nRouting [${r.code}] ${r.name}...`);

    for (const g of r.geometries || []) {
      const stops = [...r.terminals, ...r.stops].filter(s => s.lat && s.lng);
      if (stops.length < 2) continue;

      const waypoints = stops.map(s => ({ lat: s.lat, lng: s.lng }));
      if (g.direction === 'Outbound') {
        waypoints.reverse();
      }

      const res = await fetchOsrmPolyline(waypoints);
      if (res && res.coordinates.length > 2) {
        g.geometry = JSON.stringify({ type: 'LineString', coordinates: res.coordinates });
        g.geometry_status = 'road_routed';
        r.path = res.coordinates.map((c, i) => ({ route_id: r.id, seq: i, lat: c[1], lng: c[0], map_x: 0, map_y: 0 }));
        r.length_km = Math.round(res.distanceMeters / 100) / 10;
        r.inbound_distance_km = r.length_km;
        r.outbound_distance_km = r.length_km;
        console.log(`  [OK] Direction: ${g.direction} -> Road-snapped ${res.coordinates.length} points (${r.length_km} km)`);
        routedCount++;
      } else {
        console.log(`  [WARN] Fallback used for ${g.direction}`);
      }

      // Respect OSRM public demo server rate limits (250ms pause)
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  console.log(`\nSuccessfully routed ${routedCount} directional geometries with real OSRM road coordinates.`);
  fs.writeFileSync(bundledPath, JSON.stringify(routes, null, 2), 'utf8');
  console.log(`Saved updated bundled_routes.json.`);
}

routeAll().catch(err => console.error('Error during OSRM routing:', err));
