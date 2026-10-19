const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'ororuta',
    password: 'ororuta',
    database: 'ororuta',
    multipleStatements: true
  });

  try {
    console.log('Publishing and activating all traditional jeepney routes...');
    await pool.query(`
      UPDATE routes 
      SET status = 'Active', verification_status = 'PUBLISHED' 
      WHERE jeepney_type = 'Traditional' OR jeepney_type IS NULL OR jeepney_type = ''
    `);

    console.log('Seeding official terminals...');
    const terminals = [
      { id: 't-agora', name: 'Agora Integrated Terminal', note: 'Eastern hub near Agora Market', lat: 8.4857, lng: 124.6589 },
      { id: 't-bulua', name: 'Bulua Integrated Bus & Jeepney Terminal', note: 'Western hub in Bulua', lat: 8.5040, lng: 124.6115 },
      { id: 't-cogon', name: 'Cogon Market Jeepney Terminal', note: 'Main downtown terminal at Cogon', lat: 8.4735, lng: 124.6497 },
      { id: 't-divisoria', name: 'Divisoria Terminal', note: 'Divisoria downtown terminal (Tirso Neri)', lat: 8.4777, lng: 124.6452 },
      { id: 't-carmen', name: 'Carmen Market Terminal', note: 'Northern Carmen terminus near market', lat: 8.4845, lng: 124.6335 },
      { id: 't-puerto', name: 'Puerto Public Market Terminal', note: 'Eastern terminus in Puerto', lat: 8.4990, lng: 124.7420 },
      { id: 't-bugo', name: 'Bugo Terminal', note: 'Far eastern terminus in Bugo', lat: 8.5070, lng: 124.7560 },
      { id: 't-gusa', name: 'Gusa Terminal', note: 'Gusa crossing terminal', lat: 8.4775, lng: 124.6830 },
      { id: 't-patag', name: 'Patag Terminal', note: 'Patag upper terminus', lat: 8.4760, lng: 124.6130 },
      { id: 't-macasandig', name: 'Macasandig Terminal', note: 'Macasandig southern terminus', lat: 8.4625, lng: 124.6505 },
      { id: 't-kauswagan', name: 'Kauswagan Crossing Terminal', note: 'Kauswagan junction terminal', lat: 8.4965, lng: 124.6310 }
    ];

    for (const t of terminals) {
      await pool.query(
        `INSERT INTO terminals (id, name, note, map_x, map_y, lat, lng) 
         VALUES (?, ?, ?, 0, 0, ?, ?) 
         ON DUPLICATE KEY UPDATE name=VALUES(name), lat=VALUES(lat), lng=VALUES(lng)`,
        [t.id, t.name, t.note, t.lat, t.lng]
      );
    }

    console.log('Seeding landmarks and places including Kong Hua School...');
    const places = [
      { id: 'pl-konghua', name: 'Kong Hua School', area: 'Kauswagan', kind: 'school', lat: 8.4965, lng: 124.6345 },
      { id: 'pl-carmen', name: 'Carmen Market', area: 'Carmen', kind: 'market', lat: 8.4845, lng: 124.6335 },
      { id: 'pl-agora', name: 'Agora Terminal', area: 'Lapasan', kind: 'terminal', lat: 8.4857, lng: 124.6589 },
      { id: 'pl-cogon', name: 'Cogon Market', area: 'Cogon', kind: 'market', lat: 8.4735, lng: 124.6497 },
      { id: 'pl-divisoria', name: 'Divisoria', area: 'Poblacion', kind: 'market', lat: 8.4777, lng: 124.6452 },
      { id: 'pl-bulua', name: 'Bulua Terminal', area: 'Bulua', kind: 'terminal', lat: 8.5040, lng: 124.6115 },
      { id: 'pl-liceo', name: 'Liceo de Cagayan University', area: 'Kauswagan', kind: 'school', lat: 8.4870, lng: 124.6380 },
      { id: 'pl-limketkai', name: 'Limketkai Center', area: 'Lapasan', kind: 'mall', lat: 8.4842, lng: 124.6568 },
      { id: 'pl-xavier', name: 'Xavier University', area: 'Poblacion', kind: 'school', lat: 8.4784, lng: 124.6489 },
      { id: 'pl-centrio', name: 'Centrio Mall', area: 'Poblacion', kind: 'mall', lat: 8.4877, lng: 124.6517 },
      { id: 'pl-ustp', name: 'USTP Lapasan', area: 'Lapasan', kind: 'school', lat: 8.4852, lng: 124.6572 },
      { id: 'pl-puerto', name: 'Puerto Public Market', area: 'Puerto', kind: 'market', lat: 8.4990, lng: 124.7420 },
      { id: 'pl-gusa', name: 'Gusa Crossing', area: 'Gusa', kind: 'landmark', lat: 8.4775, lng: 124.6830 },
      { id: 'pl-patag', name: 'Patag', area: 'Patag', kind: 'landmark', lat: 8.4760, lng: 124.6130 }
    ];

    for (const p of places) {
      await pool.query(
        `INSERT INTO places (id, name, area, kind, map_x, map_y, lat, lng) 
         VALUES (?, ?, ?, ?, 0, 0, ?, ?) 
         ON DUPLICATE KEY UPDATE name=VALUES(name), area=VALUES(area), kind=VALUES(kind), lat=VALUES(lat), lng=VALUES(lng)`,
        [p.id, p.name, p.area, p.kind, p.lat, p.lng]
      );
      await pool.query(
        `INSERT INTO landmarks (id, name, map_x, map_y, lat, lng) 
         VALUES (?, ?, 0, 0, ?, ?) 
         ON DUPLICATE KEY UPDATE name=VALUES(name), lat=VALUES(lat), lng=VALUES(lng)`,
        [p.id, p.name, p.lat, p.lng]
      );
    }

    console.log('Seeding key loading/unloading points...');
    const loadingPoints = [
      { id: 'lp-konghua-1', name: 'Kong Hua School Loading Zone', point_type: 'loading', lat: 8.4965, lng: 124.6345, note: 'Near Kong Hua School main entrance' },
      { id: 'lp-kauswagan-1', name: 'Kauswagan Rd / Pelaez Blvd Stop', point_type: 'loading', lat: 8.4920, lng: 124.6330, note: 'Kauswagan corridor loading' },
      { id: 'lp-liceo-1', name: 'Liceo de Cagayan Loading Zone', point_type: 'loading', lat: 8.4870, lng: 124.6380, note: 'Rodolfo N. Pelaez Blvd' },
      { id: 'lp-carmen-1', name: 'Carmen Public Market Loading Bay', point_type: 'loading', lat: 8.4845, lng: 124.6335, note: 'Vamenta Blvd terminal entrance' },
      { id: 'lp-agora-1', name: 'Agora Terminal Loading Bay', point_type: 'loading', lat: 8.4857, lng: 124.6589, note: 'Agora bus & jeepney terminal' },
      { id: 'lp-cogon-1', name: 'Cogon Market Loading Bay', point_type: 'loading', lat: 8.4735, lng: 124.6497, note: 'Osmeña St loading point' },
      { id: 'lp-divisoria-1', name: 'Divisoria Park Loading Point', point_type: 'loading', lat: 8.4777, lng: 124.6452, note: 'Tirso Neri St' },
      { id: 'lp-limketkai-1', name: 'Limketkai Center Loading Bay', point_type: 'loading', lat: 8.4838, lng: 124.6530, note: 'Limketkai Drive' },
      { id: 'lp-bulua-1', name: 'Bulua Terminal Loading Point', point_type: 'loading', lat: 8.5040, lng: 124.6115, note: 'Iligan-CDO Highway' }
    ];

    // Corridors paths mapping:
    const corridorPaths = {
      kauswagan: [
        [124.6290, 8.4960], [124.6345, 8.4965], [124.6330, 8.4915],
        [124.6380, 8.4870], [124.6335, 8.4845], [124.6452, 8.4777], [124.6497, 8.4735]
      ],
      carmen_agora: [
        [124.6335, 8.4845], [124.6395, 8.4812], [124.6452, 8.4777],
        [124.6517, 8.4877], [124.6568, 8.4842], [124.6589, 8.4857]
      ],
      bulua_cogon: [
        [124.6115, 8.5040], [124.6200, 8.4985], [124.6270, 8.4930],
        [124.6335, 8.4845], [124.6452, 8.4777], [124.6497, 8.4735]
      ],
      gusa_cogon: [
        [124.6830, 8.4775], [124.6740, 8.4800], [124.6660, 8.4822],
        [124.6589, 8.4857], [124.6530, 8.4838], [124.6497, 8.4735]
      ],
      puerto_cogon: [
        [124.7420, 8.4990], [124.7250, 8.4870], [124.7050, 8.4720],
        [124.6830, 8.4775], [124.6589, 8.4857], [124.6497, 8.4735]
      ],
      macasandig_cogon: [
        [124.6505, 8.4625], [124.6502, 8.4655], [124.6500, 8.4690], [124.6497, 8.4735]
      ],
      patag_cogon: [
        [124.6130, 8.4760], [124.6200, 8.4790], [124.6270, 8.4815],
        [124.6335, 8.4845], [124.6452, 8.4777], [124.6497, 8.4735]
      ]
    };

    console.log('Querying all routes...');
    const [allRoutes] = await pool.query('SELECT id, code, name, origin, destination FROM routes');
    console.log(`Linking relationships and geometries for ${allRoutes.length} routes...`);

    for (const r of allRoutes) {
      const text = `${r.code} ${r.name} ${r.origin} ${r.destination}`.toLowerCase();

      // Determine corridor
      let pathCoords = corridorPaths.carmen_agora;
      if (text.includes('kauswagan') || text.includes('bayabas') || text.includes('bonbon')) {
        pathCoords = corridorPaths.kauswagan;
      } else if (text.includes('bulua') || text.includes('iponan')) {
        pathCoords = corridorPaths.bulua_cogon;
      } else if (text.includes('gusa') || text.includes('cugman') || text.includes('fs catanico')) {
        pathCoords = corridorPaths.gusa_cogon;
      } else if (text.includes('puerto') || text.includes('bugo') || text.includes('balubal')) {
        pathCoords = corridorPaths.puerto_cogon;
      } else if (text.includes('macasandig') || text.includes('indahag')) {
        pathCoords = corridorPaths.macasandig_cogon;
      } else if (text.includes('patag') || text.includes('baikingon')) {
        pathCoords = corridorPaths.patag_cogon;
      }

      // 1. Link terminals
      if (text.includes('agora')) {
        await pool.query(`INSERT IGNORE INTO route_terminals (route_id, terminal_id, seq) VALUES (?, 't-agora', 1)`, [r.id]);
      }
      if (text.includes('carmen')) {
        await pool.query(`INSERT IGNORE INTO route_terminals (route_id, terminal_id, seq) VALUES (?, 't-carmen', 2)`, [r.id]);
      }
      if (text.includes('cogon')) {
        await pool.query(`INSERT IGNORE INTO route_terminals (route_id, terminal_id, seq) VALUES (?, 't-cogon', 1)`, [r.id]);
      }
      if (text.includes('bulua')) {
        await pool.query(`INSERT IGNORE INTO route_terminals (route_id, terminal_id, seq) VALUES (?, 't-bulua', 1)`, [r.id]);
      }
      if (text.includes('divisoria')) {
        await pool.query(`INSERT IGNORE INTO route_terminals (route_id, terminal_id, seq) VALUES (?, 't-divisoria', 2)`, [r.id]);
      }
      if (text.includes('puerto')) {
        await pool.query(`INSERT IGNORE INTO route_terminals (route_id, terminal_id, seq) VALUES (?, 't-puerto', 1)`, [r.id]);
      }
      if (text.includes('kauswagan') || text.includes('bayabas') || text.includes('bonbon')) {
        await pool.query(`INSERT IGNORE INTO route_terminals (route_id, terminal_id, seq) VALUES (?, 't-kauswagan', 1)`, [r.id]);
        await pool.query(`INSERT IGNORE INTO route_landmarks (route_id, landmark_id, seq) VALUES (?, 'pl-konghua', 1)`, [r.id]);
        await pool.query(`INSERT IGNORE INTO route_landmarks (route_id, landmark_id, seq) VALUES (?, 'pl-liceo', 2)`, [r.id]);
      }

      // 2. Link relevant loading points
      for (const lp of loadingPoints) {
        const lpName = lp.name.toLowerCase();
        if (
          (text.includes('kauswagan') && (lpName.includes('kong hua') || lpName.includes('kauswagan') || lpName.includes('liceo'))) ||
          (text.includes('carmen') && (lpName.includes('carmen') || lpName.includes('liceo'))) ||
          (text.includes('agora') && (lpName.includes('agora') || lpName.includes('limketkai'))) ||
          (text.includes('cogon') && (lpName.includes('cogon') || lpName.includes('divisoria'))) ||
          (text.includes('bulua') && lpName.includes('bulua'))
        ) {
          await pool.query(
            `INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
             VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), lat=VALUES(lat), lng=VALUES(lng)`,
            [`${lp.id}-${r.code}`, r.id, lp.name, lp.note, lp.point_type, lp.lat, lp.lng]
          );
        }
      }

      // 3. Insert geometry and path points
      const lineString = {
        type: 'LineString',
        coordinates: pathCoords
      };
      const geoJsonStr = JSON.stringify(lineString);

      await pool.query(
        `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
         VALUES (?, ?, 'Inbound', ?, 'VERIFIED', NOW())
         ON DUPLICATE KEY UPDATE geometry=VALUES(geometry), geometry_status='VERIFIED'`,
        [uuidv4(), r.id, geoJsonStr]
      );
      await pool.query(
        `INSERT INTO route_geometry (id, route_id, direction, geometry, geometry_status, generated_at)
         VALUES (?, ?, 'Outbound', ?, 'VERIFIED', NOW())
         ON DUPLICATE KEY UPDATE geometry=VALUES(geometry), geometry_status='VERIFIED'`,
        [uuidv4(), r.id, JSON.stringify({ type: 'LineString', coordinates: [...pathCoords].reverse() })]
      );

      // Path points
      await pool.query('DELETE FROM route_path_points WHERE route_id = ?', [r.id]);
      for (let i = 0; i < pathCoords.length; i++) {
        const c = pathCoords[i];
        await pool.query(
          `INSERT INTO route_path_points (route_id, seq, map_x, map_y, lat, lng)
           VALUES (?, ?, 0, 0, ?, ?)`,
          [r.id, i + 1, c[1], c[0]]
        );
      }
    }

    console.log('Seeding Carmen Market to Agora Terminal Trip Option...');
    const [existingTo] = await pool.query(
      `SELECT id FROM trip_options WHERE origin_place_id = 'pl-carmen' AND destination_place_id = 'pl-agora'`
    );
    if (!existingTo.length) {
      const toId = 'to-carmen-agora';
      const lapasanRoute = allRoutes.find(r => r.name.toLowerCase().includes('lapasan') && r.name.toLowerCase().includes('carmen')) || allRoutes[0];
      await pool.query(`
        INSERT INTO trip_options (
          id, origin_place_id, destination_place_id, minutes, walk_meters, transfers, direction, status,
          boarding_name, boarding_lat, boarding_lng, dropoff_name, dropoff_lat, dropoff_lng
        ) VALUES (
          ?, 'pl-carmen', 'pl-agora', 22, 180, 0, 'Eastbound via Recto Ave', 'Active',
          'Carmen Public Market Loading Bay', 8.4845, 124.6335, 'Agora Terminal Drop-off', 8.4857, 124.6589
        )
      `, [toId]);

      await pool.query(`
        INSERT INTO trip_segments (trip_option_id, seq, route_id, from_x, from_y, to_x, to_y, km)
        VALUES (?, 1, ?, 0, 0, 0, 0, 7.8)
      `, [toId, lapasanRoute.id]);

      await pool.query(`
        INSERT INTO trip_legs (trip_option_id, seq, kind, title, detail, minutes, distance_m, route_id)
        VALUES 
          (?, 1, 'walk', 'Walk to Carmen Market Loading Bay', 'Walk north along Vamenta Blvd', 2, 80, NULL),
          (?, 2, 'board', 'Board Lapasan (R1) Traditional Jeepney', 'Wait at Carmen market terminal entrance', 3, 0, ?),
          (?, 3, 'ride', 'Ride through Recto Ave to Agora', 'Passing Marcos Bridge and Lapasan', 15, 7800, ?),
          (?, 4, 'alight', 'Alight at Agora Terminal', 'Get off at main arrival gate', 1, 0, ?),
          (?, 5, 'walk', 'Walk to Agora Integrated Terminal', 'Walk into terminal concourse', 1, 100, NULL)
      `, [toId, toId, lapasanRoute.id, toId, lapasanRoute.id, toId, lapasanRoute.id, toId]);
    }

    console.log('Transit database enrichment completed successfully!');
  } catch (e) {
    console.error('Error during enrichment:', e);
  } finally {
    await pool.end();
  }
}

run();
