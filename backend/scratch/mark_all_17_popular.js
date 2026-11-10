/**
 * Mark all 17 Google My Maps routes as popular (is_popular = 1) in MySQL and bundled_routes.json.
 */
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const ALL_17_IDS = [
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

async function update() {
  console.log('1. Updating MySQL...');
  const [res] = await db.execute(
    `UPDATE routes SET is_popular = 1 WHERE id IN (${ALL_17_IDS.map(() => '?').join(',')})`,
    ALL_17_IDS
  );
  console.log('Affected rows in MySQL:', res.affectedRows);

  const [rows] = await db.execute(
    'SELECT id, code, name, is_popular FROM routes WHERE is_popular = 1 ORDER BY code'
  );
  console.log(`\nAll popular routes in MySQL (${rows.length}):`);
  rows.forEach((r, idx) => console.log(`${idx + 1}. [${r.code}] ${r.name} (${r.id})`));

  console.log('\n2. Updating bundled_routes.json...');
  const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
  const bundled = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

  let bundledUpdated = 0;
  for (const r of bundled) {
    if (ALL_17_IDS.includes(r.id)) {
      if (r.is_popular !== 1) {
        r.is_popular = 1;
        bundledUpdated++;
      }
    }
  }
  fs.writeFileSync(bundledPath, JSON.stringify(bundled, null, 2) + '\n');
  console.log(`Updated ${bundledUpdated} routes in bundled_routes.json`);

  const popularBundled = bundled.filter(r => r.is_popular);
  console.log(`Total popular in bundled_routes.json: ${popularBundled.length}`);

  process.exit(0);
}

update().catch(e => { console.error(e); process.exit(1); });

