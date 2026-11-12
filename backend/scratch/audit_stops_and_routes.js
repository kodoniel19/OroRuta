const db = require('../src/config/db');
const fs = require('fs');
const path = require('path');

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function run() {
  console.log('=== AUDITING TRANSIT LOCATIONS ===');
  const [tls] = await db.query("SELECT id, kind, name, address, lat, lng, route_ids FROM transit_locations ORDER BY kind, name");
  console.log(`Total transit_locations: ${tls.length}`);
  const liceoTL = tls.filter(t => t.name.toLowerCase().includes('liceo') || (t.address && t.address.toLowerCase().includes('pelaez')));
  console.log('Liceo transit_locations:', liceoTL);

  console.log('\n=== AUDITING LOADING POINTS ===');
  const [lps] = await db.query("SELECT lp.*, r.code as route_code, r.name as route_name FROM loading_points lp LEFT JOIN routes r ON lp.route_id = r.id");
  console.log(`Total loading_points in DB: ${lps.length}`);
  
  // Group loading points by route
  const lpByRoute = {};
  for (const lp of lps) {
    const key = `${lp.route_code || 'NONE'} (${lp.route_id})`;
    if (!lpByRoute[key]) lpByRoute[key] = [];
    lpByRoute[key].push(lp.name);
  }
  console.log('Routes with loading points count:', Object.keys(lpByRoute).length);

  console.log('\n=== CHECKING BUNDLED ROUTES ===');
  const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
  const bundled = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
  console.log(`Total bundled routes: ${bundled.length}`);

  const liceoLat = 8.4862;
  const liceoLng = 124.6388;

  console.log(`\n=== CHECKING WHICH ROUTES PASS WITHIN 150m OF LICEO (${liceoLat}, ${liceoLng}) ===`);
  const routesPassingLiceo = [];
  for (const r of bundled) {
    let minD = Infinity;
    let closestDir = '';
    let closestPt = null;
    for (const g of (r.geometries || [])) {
      const coords = JSON.parse(g.geometry).coordinates;
      for (const [lng, lat] of coords) {
        const d = haversineMeters(lat, lng, liceoLat, liceoLng);
        if (d < minD) {
          minD = d;
          closestDir = g.direction;
          closestPt = [lat, lng];
        }
      }
    }
    if (minD <= 200) {
      routesPassingLiceo.push({
        id: r.id,
        code: r.code,
        name: r.name,
        minD: Math.round(minD),
        closestDir,
        closestPt,
        stops: (r.stops || []).map(s => s.name),
        terminals: (r.terminals || []).map(t => t.name)
      });
    }
  }

  console.log(`Routes passing Liceo (${routesPassingLiceo.length}):`);
  for (const r of routesPassingLiceo) {
    console.log(`  [${r.code}] ${r.name} - minD: ${r.minD}m (${r.closestDir}) - Stops: ${r.stops.join(', ') || 'NONE'}`);
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

