const http = require('http');
const db = require('../src/config/db');

function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function osrmRoute(p1, p2) {
  return new Promise((resolve) => {
    const url = `http://router.project-osrm.org/route/v1/driving/${p1[0]},${p1[1]};${p2[0]},${p2[1]}?overview=full&geometries=geojson`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code === 'Ok' && json.routes && json.routes[0]) {
            resolve(json.routes[0].geometry.coordinates);
          } else {
            resolve(null);
          }
        } catch (_) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const [rows] = await db.execute(`
    SELECT rg.id, rg.route_id, rg.direction, rg.geometry, r.name, r.code
    FROM route_geometry rg
    JOIN routes r ON rg.route_id = r.id
  `);

  console.log(`Checking ${rows.length} route geometries for gaps > 600m...`);
  let fixedCount = 0;

  for (const row of rows) {
    const geo = typeof row.geometry === 'string' ? JSON.parse(row.geometry) : row.geometry;
    let coords = geo.coordinates || [];
    if (coords.length < 2) continue;

    let hasGap = false;
    let newCoords = [];
    newCoords.push(coords[0]);

    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i+1];
      const d = distanceKm(p1, p2);

      if (d > 0.6) { // Gap > 600m
        console.log(`Route ${row.name} (${row.direction}): gap ${(d*1000).toFixed(0)}m between [${p1}] and [${p2}]`);
        await delay(300);
        const filling = await osrmRoute(p1, p2);
        if (filling && filling.length > 2) {
          console.log(`  -> Filled with ${filling.length} OSRM road coordinates!`);
          for (let j = 1; j < filling.length - 1; j++) {
            newCoords.push(filling[j]);
          }
          hasGap = true;
        } else {
          console.log(`  -> OSRM did not return alternate road, keeping original points`);
        }
      }
      newCoords.push(p2);
    }

    if (hasGap) {
      const updatedGeo = {
        type: 'LineString',
        coordinates: newCoords
      };
      await db.execute(
        `UPDATE route_geometry SET geometry = ?, generated_at = NOW() WHERE id = ?`,
        [JSON.stringify(updatedGeo), row.id]
      );
      fixedCount++;
    }
  }

  console.log(`\nFinished! Fixed ${fixedCount} geometries with road-snapped gaps.`);
  process.exit(0);
})();
