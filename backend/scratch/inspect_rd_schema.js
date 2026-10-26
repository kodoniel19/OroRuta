const pool = require('../src/config/db');

async function run() {
  const [cols] = await pool.query('DESCRIBE route_directions');
  console.log('route_directions cols:', cols.map(c => `${c.Field} (${c.Type})`));
  const [rows] = await pool.query('SELECT * FROM route_directions WHERE route_id = ?', ['r2-gaisano-agora-cogon-carmen']);
  console.log('r2 directions:', rows);
  process.exit(0);
}
run();
