const axios = require('axios');
const db = require('../src/config/db');

function distanceMeters(p1, p2) {
  const R = 6371000;
  const dLat = (p2[1] - p1[1]) * Math.PI / 180;
  const dLng = (p2[0] - p1[0]) * Math.PI / 180;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(p1[1]*Math.PI/180)*Math.cos(p2[1]*Math.PI/180) *
            Math.sin(dLng/2)*Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchOsrmSegment(p1, p2) {
  const url = `http://router.project-osrm.org/route/v1/driving/${p1[0]},${p1[1]};${p2[0]},${p2[1]}?overview=full&geometries=geojson`;
  try {
    const res = await axios.get(url, { timeout: 8000 });
    if (res.data && res.data.routes && res.data.routes.length > 0) {
      return res.data.routes[0].geometry.coordinates;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function fixGaps() {
  const [routes] = await db.query('SELECT id, code, name FROM routes');

  for (const r of routes) {
    const [geos] = await db.query('SELECT id, direction, geometry FROM route_geometry WHERE route_id = ?', [r.id]);
    for (const g of geos) {
      const geo = typeof g.geometry === 'string' ? JSON.parse(g.geometry) : g.geometry;
      const coords = geo.coordinates || [];
      if (coords.length < 2) continue;

      let newCoords = [];
      let hadGap = false;

      for (let i = 0; i < coords.length - 1; i++) {
        newCoords.push(coords[i]);
        const d = distanceMeters(coords[i], coords[i+1]);
        if (d > 450) {
          hadGap = true;
          console.log(`[${r.code}] ${r.name} (${g.direction}) gap ${Math.round(d)}m at index ${i}... fetching road segment`);
          const road = await fetchOsrmSegment(coords[i], coords[i+1]);
          if (road && road.length > 2) {
            // omit first and last because coords[i] is already added and coords[i+1] will be added
            for (let j = 1; j < road.length - 1; j++) {
              newCoords.push(road[j]);
            }
          }
          await new Promise(res => setTimeout(res, 200));
        }
      }
      newCoords.push(coords[coords.length - 1]);

      if (hadGap) {
        console.log(`Updated [${r.code}] ${g.direction}: ${coords.length} -> ${newCoords.length} points`);
        const updatedGeo = JSON.stringify({ type: 'LineString', coordinates: newCoords });
        await db.query('UPDATE route_geometry SET geometry = ? WHERE id = ?', [updatedGeo, g.id]);
      }
    }
  }

  console.log('Finished smoothing route gaps!');
  process.exit(0);
}

fixGaps();
