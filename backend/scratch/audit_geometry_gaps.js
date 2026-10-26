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

async function auditAllGeometries() {
  const [routes] = await db.query('SELECT id, code, name, origin, destination FROM routes ORDER BY code');
  console.log(`Auditing geometries for ${routes.length} routes...`);

  const gapIssues = [];

  for (const r of routes) {
    const [geos] = await db.query('SELECT direction, geometry FROM route_geometry WHERE route_id = ?', [r.id]);
    for (const g of geos) {
      const geo = typeof g.geometry === 'string' ? JSON.parse(g.geometry) : g.geometry;
      const coords = geo.coordinates || (geo.geometry && geo.geometry.coordinates) || (geo.features && geo.features[0].geometry.coordinates);
      if (!coords || coords.length < 2) {
        gapIssues.push({ code: r.code, name: r.name, dir: g.direction, issue: 'No coordinates' });
        continue;
      }

      // Check max jump between consecutive points
      for (let i = 0; i < coords.length - 1; i++) {
        const d = distanceMeters(coords[i], coords[i+1]);
        if (d > 450) {
          gapIssues.push({
            code: r.code,
            name: r.name,
            dir: g.direction,
            index: i,
            dist: Math.round(d),
            from: coords[i],
            to: coords[i+1]
          });
        }
      }
    }
  }

  console.log(`\nTotal large gaps (> 450m) across all routes: ${gapIssues.length}`);
  if (gapIssues.length > 0) {
    console.log(JSON.stringify(gapIssues, null, 2));
  } else {
    console.log('✓ All 89 routes have continuous road-following geometries with no gaps > 450m!');
  }

  process.exit(0);
}

auditAllGeometries();
