/**
 * Run the 3 additional Liceo loading point associations (statements 11-13 of migration 009).
 */
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'ororuta',
    password: 'ororuta',
    database: 'ororuta'
  });

  const statements = [
    {
      label: 'Bayabas (R3)',
      sql: `INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
            VALUES (?, ?, 'Liceo de Cagayan Loading Zone', 'Rodolfo N. Pelaez Blvd (in front of Main Campus)', 'loading', 0, 0, 8.4862000, 124.6388000)
            ON DUPLICATE KEY UPDATE name = VALUES(name), note = VALUES(note), lat = VALUES(lat), lng = VALUES(lng)`,
      params: ['lp-liceo-r3-401b4d1b', '401b4d1b-e91b-4c6d-b1c9-034aa1c87b6d']
    },
    {
      label: 'Bonbon (R3)',
      sql: `INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
            VALUES (?, ?, 'Liceo de Cagayan Loading Zone', 'Rodolfo N. Pelaez Blvd (in front of Main Campus)', 'loading', 0, 0, 8.4862000, 124.6388000)
            ON DUPLICATE KEY UPDATE name = VALUES(name), note = VALUES(note), lat = VALUES(lat), lng = VALUES(lng)`,
      params: ['lp-liceo-r3-2e8ed762', '2e8ed762-ee8d-4694-b3ae-2c529cb926f3']
    },
    {
      label: 'Bayabas (R5)',
      sql: `INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
            VALUES (?, ?, 'Liceo de Cagayan Loading Zone', 'Rodolfo N. Pelaez Blvd (in front of Main Campus)', 'loading', 0, 0, 8.4862000, 124.6388000)
            ON DUPLICATE KEY UPDATE name = VALUES(name), note = VALUES(note), lat = VALUES(lat), lng = VALUES(lng)`,
      params: ['lp-liceo-r5-a38aba4f', 'a38aba4f-1cfe-404a-862c-7603ad1a67e9']
    }
  ];

  for (const { label, sql, params } of statements) {
    const [result] = await conn.execute(sql, params);
    console.log(`${label}: affectedRows=${result.affectedRows}`);
  }

  // Verify all Liceo loading points
  const [rows] = await conn.execute(
    `SELECT lp.id, lp.name, lp.lat, lp.lng, r.code, r.name AS route_name
     FROM loading_points lp
     JOIN routes r ON lp.route_id = r.id
     WHERE lp.name LIKE '%Liceo%'
     ORDER BY r.code`
  );
  console.log(`\nAll Liceo loading points in MySQL (${rows.length}):`);
  for (const row of rows) {
    console.log(`  [${row.code}] ${row.route_name} — ${row.name} @ (${row.lat}, ${row.lng})`);
  }

  await conn.end();
}

run().catch(e => { console.error(e); process.exit(1); });

