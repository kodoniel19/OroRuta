const db = require('../src/config/db');
const { haversineMeters } = require('../src/utils');

async function debugR1R2() {
  const origLat = 8.4845, origLng = 124.6335; // Carmen Market
  const destLat = 8.4855, destLng = 124.6535; // SM CDO Downtown

  const [routes] = await db.execute("SELECT * FROM routes WHERE id IN ('r1-gaisano-carmen-loop', 'r2-gaisano-agora-cogon-carmen')");
  const [geos] = await db.execute("SELECT * FROM route_geometry WHERE route_id IN ('r1-gaisano-carmen-loop', 'r2-gaisano-agora-cogon-carmen')");

  console.log(`Checking ${routes.length} routes, ${geos.length} geometries...`);

  for (const r of routes) {
    console.log(`\nRoute: ${r.code} - ${r.name} (${r.id})`);
    const rGeos = geos.filter(g => g.route_id === r.id);
    for (const g of rGeos) {
      console.log(`  Direction: ${g.direction}`);
      let geom = g.geometry;
      if (typeof geom === 'string') {
        try { geom = JSON.parse(geom); } catch (_) { geom = null; }
      }
      const coords = geom && geom.coordinates ? geom.coordinates : [];
      console.log(`    Total coords: ${coords.length}`);

      if (!coords.length) continue;

      let minOrigDist = Infinity, origIdx = -1;
      for (let i = 0; i < coords.length; i++) {
        const d = haversineMeters(origLat, origLng, coords[i][1], coords[i][0]);
        if (d < minOrigDist) { minOrigDist = d; origIdx = i; }
      }

      let minDestDist = Infinity, destIdx = -1;
      for (let i = 0; i < coords.length; i++) {
        const d = haversineMeters(destLat, destLng, coords[i][1], coords[i][0]);
        if (d < minDestDist) { minDestDist = d; destIdx = i; }
      }

      console.log(`    minOrigDist: ${minOrigDist.toFixed(1)}m (idx: ${origIdx}), minDestDist: ${minDestDist.toFixed(1)}m (idx: ${destIdx})`);
      console.log(`    origIdx >= destIdx? ${origIdx >= destIdx} (destIdx - origIdx = ${destIdx - origIdx})`);

      if (minOrigDist > 850) console.log(`    REJECTED: minOrigDist ${minOrigDist.toFixed(1)}m > 850m`);
      if (minDestDist > 750) console.log(`    REJECTED: minDestDist ${minDestDist.toFixed(1)}m > 750m`);
      if (origIdx >= destIdx) console.log(`    REJECTED: Direction violation origIdx (${origIdx}) >= destIdx (${destIdx})`);
      if (destIdx - origIdx < 4) console.log(`    REJECTED: Segment too short destIdx - origIdx = ${destIdx - origIdx} < 4`);
    }
  }
  process.exit(0);
}

debugR1R2().catch(console.error);
