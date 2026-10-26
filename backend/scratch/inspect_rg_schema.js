const pool = require('../src/config/db');

async function run() {
  const [cols] = await pool.query('DESCRIBE route_geometry');
  console.log('route_geometry cols:', cols.map(c => `${c.Field} (${c.Type})`));
  const [rows] = await pool.query('SELECT id, route_id, direction, geometry FROM route_geometry WHERE route_id = ?', ['r2-gaisano-agora-cogon-carmen']);
  for (const r of rows) {
    const geom = typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry;
    console.log(`id: ${r.id}, dir: ${r.direction}, type: ${geom ? geom.type : typeof r.geometry}, coords count: ${geom && geom.coordinates ? geom.coordinates.length : 'none'}`);
  }
  process.exit(0);
}
run();
