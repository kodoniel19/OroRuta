const db = require('../src/config/db');

async function run() {
  const [routes] = await db.query(
    "SELECT id, code, name, origin, destination, inbound_distance_km, outbound_distance_km FROM routes WHERE name LIKE '%Pagatpat%' OR name LIKE '%Balulang%'"
  );
  console.log('Routes:', routes);

  for (const r of routes) {
    const [lp] = await db.query('SELECT name, point_type, lat, lng FROM loading_points WHERE route_id = ?', [r.id]);
    const [rl] = await db.query('SELECT rl.*, l.name, l.lat, l.lng FROM route_landmarks rl JOIN landmarks l ON l.id = rl.landmark_id WHERE rl.route_id = ?', [r.id]);
    const [rt] = await db.query('SELECT rt.*, t.name, t.lat, t.lng FROM route_terminals rt JOIN terminals t ON t.id = rt.terminal_id WHERE rt.route_id = ?', [r.id]);
    console.log(`\nRoute: ${r.code} - ${r.name} (${r.id})`);
    console.log('Loading points:', lp);
    console.log('Landmarks:', rl);
    console.log('Terminals:', rt);
    const [geos] = await db.query('SELECT direction, geometry_status, CHAR_LENGTH(geometry) as len FROM route_geometry WHERE route_id = ?', [r.id]);
    console.log('Geometries:', geos);
    if (geos.length > 0) {
      const [fullGeo] = await db.query('SELECT direction, geometry FROM route_geometry WHERE route_id = ? LIMIT 1', [r.id]);
      try {
        const parsed = typeof fullGeo[0].geometry === 'string' ? JSON.parse(fullGeo[0].geometry) : fullGeo[0].geometry;
        console.log(`Sample coord count for ${fullGeo[0].direction}:`, parsed.coordinates?.length);
        console.log('First 2 coords:', parsed.coordinates?.slice(0, 2));
        console.log('Last 2 coords:', parsed.coordinates?.slice(-2));
      } catch (e) {
        console.error('Failed to parse geometry:', e.message);
      }
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
