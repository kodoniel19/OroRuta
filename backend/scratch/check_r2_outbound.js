const db = require('../src/config/db');

(async () => {
  const [r] = await db.execute(
    "SELECT geometry FROM route_geometry WHERE route_id = (SELECT id FROM routes WHERE name LIKE '%Kauswagan (R2)%' LIMIT 1) AND direction = 'Outbound'"
  );
  const g = typeof r[0].geometry === 'string' ? JSON.parse(r[0].geometry) : r[0].geometry;
  const c = g.coordinates;
  console.log('Outbound coords:', c.length);
  console.log('Start:', c[0], 'End:', c[c.length - 1]);
  
  // Also check inbound
  const [r2] = await db.execute(
    "SELECT geometry FROM route_geometry WHERE route_id = (SELECT id FROM routes WHERE name LIKE '%Kauswagan (R2)%' LIMIT 1) AND direction = 'Inbound'"
  );
  const g2 = typeof r2[0].geometry === 'string' ? JSON.parse(r2[0].geometry) : r2[0].geometry;
  const c2 = g2.coordinates;
  console.log('\nInbound coords:', c2.length);
  console.log('Start:', c2[0], 'End:', c2[c2.length - 1]);
  
  // Check route distances
  const [rd] = await db.execute(
    "SELECT inbound_distance_km, outbound_distance_km FROM routes WHERE name LIKE '%Kauswagan (R2)%' LIMIT 1"
  );
  console.log('\nDB distances:', rd[0]);
  
  process.exit(0);
})();
