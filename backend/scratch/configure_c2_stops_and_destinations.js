/**
 * configure_c2_stops_and_destinations.js
 * 
 * Accurately configures boarding points, terminals, stops, and destinations
 * for route C2 (c2-patag-gaisano-limketkai-cogon) in MySQL database.
 */

const pool = require('../src/config/db');

const ROUTE_ID = 'c2-patag-gaisano-limketkai-cogon';
const ORIGIN = 'Patag Camp Evangelista';
const DESTINATION = 'Cogon Public Market';
const PATAG_LAT = 8.487726;
const PATAG_LNG = 124.625783;
const COGON_LAT = 8.476986;
const COGON_LNG = 124.651284;

async function run() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    console.log(`Configuring C2 (${ROUTE_ID}) stops, terminals, and destinations...`);

    // 1. Update routes table
    await conn.execute(
      `UPDATE routes SET
         origin = ?,
         destination = ?,
         last_updated_at = NOW()
       WHERE id = ?`,
      [ORIGIN, DESTINATION, ROUTE_ID]
    );
    console.log(`✓ Updated routes table: origin='${ORIGIN}', destination='${DESTINATION}'`);

    // 2. Ensure terminals exist and have accurate coordinates and labels
    await conn.execute(
      `INSERT INTO terminals (id, name, note, lat, lng, map_x, map_y)
       VALUES ('t-patag', ?, 'Camp Evangelista, 4th Infantry Division, Patag', ?, ?, 0, 0)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         note = VALUES(note),
         lat = VALUES(lat),
         lng = VALUES(lng)`,
      [ORIGIN, PATAG_LAT, PATAG_LNG]
    );
    await conn.execute(
      `INSERT INTO terminals (id, name, note, lat, lng, map_x, map_y)
       VALUES ('t-cogon', ?, 'Cogon Public Market Terminal', ?, ?, 0, 0)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         note = VALUES(note),
         lat = VALUES(lat),
         lng = VALUES(lng)`,
      [DESTINATION, COGON_LAT, COGON_LNG]
    );
    console.log(`✓ Configured terminals t-patag and t-cogon`);

    // 3. Link route_terminals
    await conn.execute('DELETE FROM route_terminals WHERE route_id = ?', [ROUTE_ID]);
    await conn.execute(
      `INSERT INTO route_terminals (route_id, terminal_id, seq) VALUES
       (?, 't-patag', 1),
       (?, 't-cogon', 2)`,
      [ROUTE_ID, ROUTE_ID]
    );
    console.log(`✓ Linked route_terminals for C2 (t-patag and t-cogon)`);

    // 4. Configure loading_points
    await conn.execute('DELETE FROM loading_points WHERE route_id = ?', [ROUTE_ID]);
    const loadingPoints = [
      {
        id: 'lp-c2-patag',
        name: 'Patag Camp Evangelista',
        note: 'Camp Evangelista Gate / Terminal',
        lat: PATAG_LAT,
        lng: PATAG_LNG
      },
      {
        id: 'lp-c2-cogon',
        name: 'Cogon Public Market',
        note: 'Cogon Public Market Boarding Point',
        lat: COGON_LAT,
        lng: COGON_LNG
      },
      {
        id: 'lp-c2-gaisano',
        name: 'Gaisano City Mall',
        note: 'CM Recto Ave Boarding Point',
        lat: 8.486359,
        lng: 124.649879
      },
      {
        id: 'lp-c2-lkk',
        name: 'Limketkai Center',
        note: 'Limketkai Center Boarding Area',
        lat: 8.481583,
        lng: 124.656060
      }
    ];

    for (const lp of loadingPoints) {
      await conn.execute(
        `INSERT INTO loading_points (id, route_id, name, note, point_type, lat, lng, map_x, map_y)
         VALUES (?, ?, ?, ?, 'loading', ?, ?, 0, 0)`,
        [lp.id, ROUTE_ID, lp.name, lp.note, lp.lat, lp.lng]
      );
    }
    console.log(`✓ Added ${loadingPoints.length} loading points for C2`);

    // 5. Configure route_major_roads
    await conn.execute('DELETE FROM route_major_roads WHERE route_id = ?', [ROUTE_ID]);
    const roads = ['rd-10', 'rd-01', 'rd-02', 'rd-07', 'rd-11', 'rd-06'];
    for (let i = 0; i < roads.length; i++) {
      await conn.execute(
        `INSERT INTO route_major_roads (route_id, road_id, seq) VALUES (?, ?, ?)`,
        [ROUTE_ID, roads[i], i + 1]
      );
    }
    console.log(`✓ Linked major roads for C2`);

    // 6. Update route_directions
    await conn.execute(
      `UPDATE route_directions SET
         distance_km = 5.44,
         street_sequence = 'Patag Camp Evangelista → Butuan-CDO-Iligan Rd → Marcos Bridge → CM Recto Ave → Gaisano City Mall → Limketkai Center → Cogon Public Market'
       WHERE route_id = ? AND direction = 'Inbound'`,
      [ROUTE_ID]
    );
    await conn.execute(
      `UPDATE route_directions SET
         distance_km = 4.32,
         street_sequence = 'Cogon Public Market → JR Borja St → Plaza Divisoria → Carmen Bridge → Vamenta Blvd → Max Suniel St → Patag Road → Patag Camp Evangelista'
       WHERE route_id = ? AND direction = 'Outbound'`,
      [ROUTE_ID]
    );
    console.log(`✓ Updated route_directions street sequences for C2`);

    await conn.commit();
    console.log('\n✓ Database configuration committed successfully!');
  } catch (e) {
    await conn.rollback();
    console.error('Error:', e);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();
