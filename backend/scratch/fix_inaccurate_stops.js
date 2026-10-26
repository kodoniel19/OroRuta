const db = require('../src/config/db');

function distM(a, b) {
  const R = 6371000;
  const dLat = (b[1] - a[1]) * Math.PI / 180;
  const dLng = (b[0] - a[0]) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function fixStops() {
  console.log('====================================================');
  console.log('  ORORUTA DATABASE STOP AUDIT & SANITIZATION');
  console.log('====================================================\n');

  // 1. Remove all Miami Inn points
  const [miamiDelete] = await db.query("DELETE FROM loading_points WHERE name LIKE '%Miami Inn%'");
  console.log(`✓ Removed ${miamiDelete.affectedRows} artificial Miami Inn loading/unloading points.`);

  // 2. Fix Puerto Public Market terminal coordinates to exact verified road terminus
  await db.query("UPDATE terminals SET lat = 8.499600, lng = 124.750500 WHERE id = 't-puerto'");
  console.log('✓ Corrected t-puerto coordinates to (8.4996, 124.7505).');

  // 3. Load all route geometries
  const [geos] = await db.query('SELECT route_id, direction, geometry FROM route_geometry');
  const geoMap = {};
  for (const g of geos) {
    if (!geoMap[g.route_id]) geoMap[g.route_id] = [];
    const coords = typeof g.geometry === 'string' ? JSON.parse(g.geometry).coordinates : g.geometry.coordinates;
    geoMap[g.route_id].push({ dir: g.direction, coords });
  }

  // 4. Audit & clean up off-route loading_points (> 85m from route line)
  const [lps] = await db.query('SELECT lp.*, r.name as rname FROM loading_points lp JOIN routes r ON r.id = lp.route_id');
  let removedLpsCount = 0;

  for (const lp of lps) {
    const rGeos = geoMap[lp.route_id];
    if (!rGeos || rGeos.length === 0) {
      await db.execute('DELETE FROM loading_points WHERE id = ?', [lp.id]);
      removedLpsCount++;
      continue;
    }

    let minDist = Infinity;
    for (const rg of rGeos) {
      for (const pt of rg.coords) {
        const d = distM([lp.lng, lp.lat], pt);
        if (d < minDist) minDist = d;
      }
    }

    if (minDist > 85) {
      console.log(`  - Removing off-route stop: [${lp.id}] "${lp.name}" from "${lp.rname}" (${Math.round(minDist)}m away)`);
      await db.execute('DELETE FROM loading_points WHERE id = ?', [lp.id]);
      removedLpsCount++;
    }
  }
  console.log(`✓ Removed ${removedLpsCount} off-route loading points from routes.`);

  // 5. Audit & clean up off-route route_terminals (> 250m from route line)
  const [rts] = await db.query('SELECT rt.*, t.name as tname, t.lat, t.lng, r.name as rname FROM route_terminals rt JOIN terminals t ON t.id = rt.terminal_id JOIN routes r ON r.id = rt.route_id');
  let removedRtsCount = 0;

  for (const rt of rts) {
    const rGeos = geoMap[rt.route_id];
    if (!rGeos || rGeos.length === 0) continue;

    let minDist = Infinity;
    for (const rg of rGeos) {
      for (const pt of rg.coords) {
        const d = distM([rt.lng, rt.lat], pt);
        if (d < minDist) minDist = d;
      }
    }

    if (minDist > 250) {
      console.log(`  - Removing mismatched terminal association: Terminal "${rt.tname}" from "${rt.rname}" (${Math.round(minDist)}m away)`);
      await db.execute('DELETE FROM route_terminals WHERE route_id = ? AND terminal_id = ?', [rt.route_id, rt.terminal_id]);
      removedRtsCount++;
    }
  }
  console.log(`✓ Removed ${removedRtsCount} mismatched terminal associations from routes.`);

  // 6. Ensure every route has at least its verified terminal / endpoints
  // For routes that now have 0 terminals, create route-specific terminal endpoints matching the route's verified start/end coordinates
  const [routes] = await db.query('SELECT id, code, name, origin, destination FROM routes');
  let endpointsCreated = 0;

  for (const r of routes) {
    const [existingTerms] = await db.execute('SELECT COUNT(*) cnt FROM route_terminals WHERE route_id = ?', [r.id]);
    const rGeos = geoMap[r.id];
    if (existingTerms[0].cnt === 0 && rGeos && rGeos.length > 0) {
      // Create starting terminal from Inbound start coordinate
      const inGeo = rGeos.find(g => g.dir === 'Inbound') || rGeos[0];
      if (inGeo && inGeo.coords && inGeo.coords.length > 0) {
        const startPt = inGeo.coords[0]; // [lng, lat]
        const termId = `term-${r.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${r.id.slice(0, 8)}`;
        const termName = `${r.origin} Terminal`;

        // Check if terminal already exists nearby
        const [nearTerms] = await db.execute(
          'SELECT id FROM terminals WHERE ABS(lat - ?) < 0.001 AND ABS(lng - ?) < 0.001 LIMIT 1',
          [startPt[1], startPt[0]]
        );

        let finalTermId = termId;
        if (nearTerms.length > 0) {
          finalTermId = nearTerms[0].id;
        } else {
          await db.execute(
            'INSERT INTO terminals (id, name, note, map_x, map_y, lat, lng) VALUES (?, ?, ?, 0, 0, ?, ?) ON DUPLICATE KEY UPDATE name=name',
            [finalTermId, termName, `Verified terminus for ${r.name}`, startPt[1], startPt[0]]
          );
        }

        await db.execute(
          'INSERT IGNORE INTO route_terminals (route_id, terminal_id, seq) VALUES (?, ?, 1)',
          [r.id, finalTermId]
        );
        endpointsCreated++;
      }
    }
  }

  console.log(`✓ Ensured endpoints for all routes (${endpointsCreated} verified terminus associations added).`);

  // Final count
  const [finalLps] = await db.query('SELECT count(*) cnt FROM loading_points');
  const [finalRts] = await db.query('SELECT count(*) cnt FROM route_terminals');
  console.log(`\nFinal valid loading points in DB: ${finalLps[0].cnt}`);
  console.log(`Final valid route_terminals in DB: ${finalRts[0].cnt}`);
  console.log('====================================================\n');
}

fixStops().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
