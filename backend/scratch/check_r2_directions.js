const db = require('../src/config/db');
(async () => {
  const [r] = await db.execute(
    "SELECT * FROM route_directions WHERE route_id = (SELECT id FROM routes WHERE name LIKE 'Kauswagan (R2)%' LIMIT 1)"
  );
  console.log('route_directions:', JSON.stringify(r, null, 2));
  
  const [r2] = await db.execute(
    "SELECT outbound_distance_km, inbound_distance_km FROM routes WHERE name LIKE 'Kauswagan (R2)%' LIMIT 1"
  );
  console.log('routes table distances:', JSON.stringify(r2, null, 2));
  
  // Check what the mobile app sees in the bundled JSON
  const fs = require('fs');
  const bundled = JSON.parse(fs.readFileSync('../android/app/src/main/assets/bundled_routes.json', 'utf8'));
  const kr2 = bundled.find(x => x.name && x.name.includes('Kauswagan (R2)'));
  console.log('\nbundled_routes.json:');
  console.log('  outbound_distance_km:', kr2.outbound_distance_km);
  console.log('  inbound_distance_km:', kr2.inbound_distance_km);
  console.log('  directions:', JSON.stringify(kr2.directions));
  console.log('  geometries count:', kr2.geometries?.length);
  kr2.geometries?.forEach(g => {
    const geo = typeof g.geometry === 'string' ? JSON.parse(g.geometry) : g.geometry;
    console.log(`  geometry[${g.direction}]: ${geo?.coordinates?.length} coords`);
  });
  
  process.exit(0);
})();
