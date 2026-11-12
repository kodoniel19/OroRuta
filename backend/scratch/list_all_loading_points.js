const db = require('../src/config/db');

async function check() {
  const [lps] = await db.query("SELECT * FROM loading_points ORDER BY name");
  console.log('=== UNIQUE LOADING POINT NAMES & COORDS IN DB ===');
  const uniqueLps = new Map();
  for (const lp of lps) {
    if (!uniqueLps.has(lp.name)) {
      uniqueLps.set(lp.name, { lat: parseFloat(lp.lat), lng: parseFloat(lp.lng), count: 1, routeIds: [lp.route_id] });
    } else {
      const item = uniqueLps.get(lp.name);
      item.count++;
      item.routeIds.push(lp.route_id);
    }
  }
  for (const [name, info] of uniqueLps.entries()) {
    console.log(`- "${name}" at [${info.lat}, ${info.lng}] (${info.count} routes)`);
  }

  const [tls] = await db.query("SELECT * FROM transit_locations WHERE kind = 'loading' ORDER BY name");
  console.log('\n=== TRANSIT LOCATIONS (KIND=LOADING) ===');
  for (const tl of tls) {
    console.log(`- [${tl.id}] "${tl.name}" (${tl.address || ''}) at [${tl.lat}, ${tl.lng}] routes: ${JSON.stringify(tl.route_ids)}`);
  }

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });

