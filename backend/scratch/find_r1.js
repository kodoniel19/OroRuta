const db = require('../src/config/db');

async function find() {
  const [routes] = await db.query('SELECT * FROM routes');
  console.log('Total routes in database:', routes.length);
  const r05 = routes.find(r => r.id === 'r-05');
  console.log('Is r-05 present?', !!r05, r05);
  const buluaAgora = routes.filter(r => r.origin.includes('Bulua') && r.destination.includes('Agora'));
  console.log('Routes Bulua -> Agora:', buluaAgora.map(r => ({ id: r.id, code: r.code, name: r.name, in_km: r.inbound_distance_km, out_km: r.outbound_distance_km })));
  
  // Check if there are other routes with code R1
  const r1s = routes.filter(r => r.code === 'R1');
  console.log('Routes with code R1:', r1s.map(r => ({ id: r.id, name: r.name, in_km: r.inbound_distance_km, out_km: r.outbound_distance_km })));
}

find().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
