const db = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function run() {
  const sqlPath = path.join(__dirname, '../../database/migrations/009_associate_verified_boarding_points.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split statements by semicolon
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.toLowerCase().startsWith('use '));

  console.log(`Running ${statements.length} migration statements...`);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    await db.query(stmt);
    console.log(`✓ Executed statement ${i + 1}`);
  }

  // Also update transit_locations L05 route_ids to include R1 and Lapasan R1
  const [tlRows] = await db.query("SELECT * FROM transit_locations WHERE id = 'L05'");
  if (tlRows.length > 0) {
    let rIds = [];
    try {
      rIds = typeof tlRows[0].route_ids === 'string' ? JSON.parse(tlRows[0].route_ids) : (tlRows[0].route_ids || []);
    } catch (_) {}
    if (!rIds.includes('R1')) rIds.push('R1');
    if (!rIds.includes('38f1362f-d2a7-4e36-a989-9e178f2ddfae')) rIds.push('38f1362f-d2a7-4e36-a989-9e178f2ddfae');
    await db.query("UPDATE transit_locations SET route_ids = ? WHERE id = 'L05'", [JSON.stringify(rIds)]);
    console.log('✓ Updated transit_locations L05 route_ids:', rIds);
  }

  console.log('Migration 009 applied successfully.');
  process.exit(0);
}

run().catch(e => { console.error('Migration failed:', e); process.exit(1); });

