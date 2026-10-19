const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const CANONICAL_PLACES = [
  { id: 'pl-agora',      name: 'Agora Terminal',                     area: 'Lapasan',   kind: 'terminal',   lat: 8.4857, lng: 124.6589 },
  { id: 'pl-bulua',      name: 'Bulua Terminal',                     area: 'Bulua',     kind: 'terminal',   lat: 8.5040, lng: 124.6115 },
  { id: 'pl-carmen',     name: 'Carmen Market',                      area: 'Carmen',    kind: 'market',     lat: 8.4845, lng: 124.6335 },
  { id: 'pl-cogon',      name: 'Cogon Market',                       area: 'Cogon',     kind: 'market',     lat: 8.4735, lng: 124.6497 },
  { id: 'pl-divisoria',  name: 'Divisoria',                          area: 'Poblacion', kind: 'landmark',   lat: 8.4777, lng: 124.6452 },
  { id: 'pl-centrio',    name: 'Centrio Mall',                       area: 'Poblacion', kind: 'mall',       lat: 8.4877, lng: 124.6517 },
  { id: 'pl-limketkai',  name: 'Limketkai Center',                   area: 'Lapasan',   kind: 'mall',       lat: 8.4842, lng: 124.6568 },
  { id: 'pl-liceo',      name: 'Liceo de Cagayan University',        area: 'Kauswagan', kind: 'school',     lat: 8.4965, lng: 124.6407 },
  { id: 'pl-xavier',     name: 'Xavier University',                  area: 'Poblacion', kind: 'school',     lat: 8.4784, lng: 124.6489 },
  { id: 'pl-cityhall',   name: 'Cagayan de Oro City Hall',           area: 'Poblacion', kind: 'government', lat: 8.4772, lng: 124.6424 },
  { id: 'pl-capitol',    name: 'Provincial Capitol',                 area: 'Poblacion', kind: 'government', lat: 8.4795, lng: 124.6468 },
  { id: 'pl-nmmc',       name: 'NMMC',                               area: 'Poblacion', kind: 'hospital',   lat: 8.4875, lng: 124.6468 },
  { id: 'pl-smuptown',   name: 'SM CDO Uptown',                      area: 'Carmen',    kind: 'mall',       lat: 8.4578, lng: 124.6225 },
  { id: 'pl-campevang',  name: 'Camp Evangelista',                   area: 'Patag',     kind: 'landmark',   lat: 8.5108, lng: 124.6681 },
  { id: 'pl-cathedral',  name: 'St. Augustine Metropolitan Cathedral',area:'Poblacion', kind: 'landmark',   lat: 8.4777, lng: 124.6433 },
  { id: 'pl-puerto',     name: 'Puerto Public Market',               area: 'Puerto',    kind: 'market',     lat: 8.4990, lng: 124.7420 },
  { id: 'pl-gusa',       name: 'Gusa Crossing',                      area: 'Gusa',      kind: 'landmark',   lat: 8.4775, lng: 124.6830 },
  { id: 'pl-konghua',    name: 'Kong Hua School',                    area: 'Kauswagan', kind: 'school',     lat: 8.4965, lng: 124.6345 },
  { id: 'pl-ustp',       name: 'USTP Lapasan',                       area: 'Lapasan',   kind: 'school',     lat: 8.4852, lng: 124.6572 },
  { id: 'pl-patag',      name: 'Patag',                              area: 'Patag',     kind: 'landmark',   lat: 8.4760, lng: 124.6130 },
  { id: 'pl-bugo',       name: 'Bugo Terminal',                      area: 'Bugo',      kind: 'terminal',   lat: 8.5070, lng: 124.7560 },
  { id: 'pl-kauswagan',  name: 'Kauswagan Crossing',                 area: 'Kauswagan', kind: 'landmark',   lat: 8.4965, lng: 124.6310 },
  { id: 'pl-macasandig', name: 'Macasandig Terminal',                area: 'Macasandig',kind: 'terminal',   lat: 8.4625, lng: 124.6505 }
];

const CANONICAL_TERMINALS = [
  { id: 't-agora',      name: 'Agora Integrated Terminal',               note: 'Eastern hub near Agora Market', lat: 8.4857, lng: 124.6589 },
  { id: 't-bulua',      name: 'Bulua Integrated Bus & Jeepney Terminal', note: 'Western hub in Bulua',          lat: 8.5040, lng: 124.6115 },
  { id: 't-carmen',     name: 'Carmen Market Terminal',                  note: 'Northern Carmen terminus',      lat: 8.4845, lng: 124.6335 },
  { id: 't-cogon',      name: 'Cogon Market Jeepney Terminal',           note: 'Main downtown terminal',        lat: 8.4735, lng: 124.6497 },
  { id: 't-divisoria',  name: 'Divisoria Terminal',                      note: 'Divisoria downtown terminal',   lat: 8.4777, lng: 124.6452 },
  { id: 't-puerto',     name: 'Puerto Public Market Terminal',           note: 'Eastern terminus in Puerto',    lat: 8.4990, lng: 124.7420 },
  { id: 't-bugo',       name: 'Bugo Terminal',                           note: 'Far eastern terminus in Bugo',  lat: 8.5070, lng: 124.7560 },
  { id: 't-gusa',       name: 'Gusa Terminal',                           note: 'Gusa crossing terminal',        lat: 8.4775, lng: 124.6830 },
  { id: 't-patag',      name: 'Patag Terminal',                          note: 'Patag upper terminus',          lat: 8.4760, lng: 124.6130 },
  { id: 't-macasandig', name: 'Macasandig Terminal',                     note: 'Macasandig southern terminus',  lat: 8.4625, lng: 124.6505 },
  { id: 't-kauswagan',  name: 'Kauswagan Crossing Terminal',             note: 'Kauswagan junction terminal',   lat: 8.4965, lng: 124.6310 }
];

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'ororuta',
    password: process.env.DB_PASS || 'ororuta',
    database: process.env.DB_NAME || 'ororuta',
    waitForConnections: true,
    connectionLimit: 5
  });

  console.log('Cleaning up duplicate places and terminals...');

  // 1. Remap any foreign keys in trip_options
  const idMapping = {
    'pl-01': 'pl-liceo',
    'pl-02': 'pl-limketkai',
    'pl-17': 'pl-limketkai',
    'pl-03': 'pl-cogon',
    'pl-04': 'pl-divisoria',
    'pl-05': 'pl-centrio',
    'pl-06': 'pl-xavier',
    'pl-07': 'pl-carmen',
    'pl-08': 'pl-agora',
    'pl-09': 'pl-bulua',
    'pl-10': 'pl-capitol',
    'pl-11': 'pl-nmmc',
    'pl-12': 'pl-gusa',
    'pl-13': 'pl-smuptown',
    'pl-14': 'pl-campevang',
    'pl-15': 'pl-cathedral',
    'pl-16': 'pl-cityhall'
  };

  for (const [oldId, newId] of Object.entries(idMapping)) {
    await pool.query('UPDATE trip_options SET origin_place_id = ? WHERE origin_place_id = ?', [newId, oldId]).catch(() => {});
    await pool.query('UPDATE trip_options SET destination_place_id = ? WHERE destination_place_id = ?', [newId, oldId]).catch(() => {});
  }

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  // 2. Clear out duplicate rows from places table
  await pool.query('DELETE FROM places');
  console.log('  Cleared old places.');

  // 3. Insert canonical places
  for (const p of CANONICAL_PLACES) {
    await pool.query(
      `INSERT INTO places (id, name, area, kind, map_x, map_y, lat, lng)
       VALUES (?, ?, ?, ?, 0, 0, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), area=VALUES(area), kind=VALUES(kind), lat=VALUES(lat), lng=VALUES(lng)`,
      [p.id, p.name, p.area, p.kind, p.lat, p.lng]
    );
  }
  console.log(`  Inserted ${CANONICAL_PLACES.length} clean, canonical places.`);
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  // 4. Remap route_terminals if any old terminal IDs exist
  const termMapping = {
    't-01': 't-cogon',
    't-02': 't-carmen',
    't-03': 't-bulua',
    't-04': 't-agora',
    't-05': 't-gusa',
    't-06': 't-patag',
    't-07': 't-macasandig',
    't-08': 't-divisoria',
    't-09': 't-puerto'
  };

  for (const [oldId, newId] of Object.entries(termMapping)) {
    await pool.query('UPDATE IGNORE route_terminals SET terminal_id = ? WHERE terminal_id = ?', [newId, oldId]).catch(() => {});
  }

  // Delete orphaned or duplicate terminals
  await pool.query("DELETE FROM terminals WHERE id LIKE 't-0%'");
  for (const t of CANONICAL_TERMINALS) {
    await pool.query(
      `INSERT INTO terminals (id, name, note, map_x, map_y, lat, lng)
       VALUES (?, ?, ?, 0, 0, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), note=VALUES(note), lat=VALUES(lat), lng=VALUES(lng)`,
      [t.id, t.name, t.note, t.lat, t.lng]
    );
  }
  console.log(`  Cleaned up terminals (${CANONICAL_TERMINALS.length} canonical terminals).`);

  // 5. Add unique index on places(name) if not present
  try {
    await pool.query('ALTER TABLE places ADD UNIQUE INDEX uq_places_name (name)');
    console.log('  Added UNIQUE INDEX uq_places_name on places table.');
  } catch (e) {
    if (!e.message.includes('Duplicate key name')) {
      console.warn('  Index creation warning:', e.message);
    }
  }

  await pool.end();
  console.log('✓ Places & Terminals cleanup finished successfully.');
}

run().catch(console.error);
