const db = require('../src/config/db');

async function check() {
  const [routes] = await db.query('SELECT * FROM routes WHERE name LIKE "%Bulua%" OR origin LIKE "%Bulua%" OR destination LIKE "%Agora%" OR id = "r-05"');
  console.log(`Found ${routes.length} routes:`);
  for (const r of routes) {
    const [dirs] = await db.query('SELECT * FROM route_directions WHERE route_id = ?', [r.id]);
    const [geos] = await db.query('SELECT id, route_id, direction, geometry_status, CHAR_LENGTH(geometry) as geo_len FROM route_geometry WHERE route_id = ?', [r.id]);
    console.log(`- ${r.id} | code: ${r.code} | name: ${r.name} | origin: ${r.origin} -> ${r.destination} | in_km: ${r.inbound_distance_km} | out_km: ${r.outbound_distance_km} | dirs: ${dirs.length} | geos: ${geos.length}`);
  }
}

check().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
