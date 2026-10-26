const pool = require('../src/config/db');

async function run() {
  const ids = [
    'c2-patag-gaisano-limketkai-cogon',
    'la-lapasan-cogon-agora-divisoria',
    'lb-lapasan-agora-loop',
    'bayabas-carmen-loop-line',
    'bugo-cogon-line',
    'bulua-cogon-line-highway',
    'indahag-r1-cogon-line',
    'iponan-bulua-cogon-line',
    'lumbia-carmen-line',
    'macasandig-cogon-line',
    'puerto-cogon-divisoria-line',
    'uptown-gran-europa-sm-cogon',
    'r1-gaisano-carmen-loop',
    'r2-gaisano-agora-cogon-carmen',
    'ra-pier-cogon-line',
    'rbc-pier-macabalan-agora-limketkai',
    'rd-gusa-cugman-limketkai-cogon'
  ];

  const [terminals] = await pool.query(`
    SELECT r.id, r.code, r.origin, r.destination, rt.seq, t.id as term_id, t.name as term_name, t.lat, t.lng
    FROM routes r
    LEFT JOIN route_terminals rt ON r.id = rt.route_id
    LEFT JOIN terminals t ON rt.terminal_id = t.id
    WHERE r.id IN (${ids.map(id => `'${id}'`).join(',')})
    ORDER BY r.code, rt.seq
  `);

  console.log('=== ROUTE TERMINALS FOR 17 ROUTES ===');
  const grouped = {};
  for (const row of terminals) {
    if (!grouped[row.code]) {
      grouped[row.code] = {
        id: row.id,
        origin: row.origin,
        dest: row.destination,
        terminals: []
      };
    }
    if (row.term_name) {
      grouped[row.code].terminals.push({
        seq: row.seq,
        id: row.term_id,
        name: row.term_name,
        lat: row.lat,
        lng: row.lng
      });
    }
  }

  for (const [code, info] of Object.entries(grouped)) {
    console.log(`\nRoute [${code}] (ID: ${info.id})`);
    console.log(`  Origin: "${info.origin}" -> Dest: "${info.dest}"`);
    console.log(`  Terminals in DB:`);
    if (info.terminals.length === 0) {
      console.log('    (NONE)');
    } else {
      info.terminals.forEach(t => console.log(`    seq ${t.seq}: [${t.id}] ${t.name} (${t.lat}, ${t.lng})`));
    }
  }

  const [lpCounts] = await pool.query(`
    SELECT route_id, COUNT(*) as count
    FROM loading_points
    WHERE route_id IN (${ids.map(id => `'${id}'`).join(',')})
    GROUP BY route_id
  `);
  console.log('\n=== LOADING POINTS COUNT ===');
  console.table(lpCounts);

  process.exit(0);
}

run().catch(console.error);
