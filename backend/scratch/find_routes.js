const db = require('../src/config/db');
const fs = require('fs');

async function main() {
  const [rows] = await db.query('SELECT id, code, name, origin, destination FROM routes ORDER BY name');
  const text = rows.map(r => `${r.id} | ${r.code || '-'} | ${r.name} | ${r.origin} -> ${r.destination}`).join('\n');
  fs.writeFileSync('scratch/all_db_routes_utf8.txt', text, 'utf8');
  console.log(`Wrote ${rows.length} routes to scratch/all_db_routes_utf8.txt`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
