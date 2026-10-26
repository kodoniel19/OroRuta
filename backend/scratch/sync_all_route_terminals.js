const crypto = require('crypto');
const db = require('../src/config/db');

function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function run() {
  console.log('='.repeat(80));
  console.log('SYNC ALL ROUTE TERMINALS - Ensuring verified terminals at both ends for all routes');
  console.log('='.repeat(80));

  const [routes] = await db.execute('SELECT * FROM routes ORDER BY code, name');
  console.log(`Auditing and repairing ${routes.length} routes...`);

  let addedTerminals = 0;
  let linkedTerminals = 0;

  for (const r of routes) {
    const [geos] = await db.execute('SELECT direction, geometry FROM route_geometry WHERE route_id = ?', [r.id]);
    const inGeo = geos.find(g => g.direction === 'Inbound');
    const outGeo = geos.find(g => g.direction === 'Outbound');

    const inCoords = inGeo ? (typeof inGeo.geometry === 'string' ? JSON.parse(inGeo.geometry) : inGeo.geometry).coordinates : [];
    const outCoords = outGeo ? (typeof outGeo.geometry === 'string' ? JSON.parse(outGeo.geometry) : outGeo.geometry).coordinates : [];

    if (inCoords.length === 0) continue;

    const [existingTerms] = await db.execute(
      `SELECT t.*, rt.seq FROM terminals t JOIN route_terminals rt ON rt.terminal_id = t.id WHERE rt.route_id = ? ORDER BY rt.seq`,
      [r.id]
    );

    const isLoop = r.name.toLowerCase().includes('loop') || distanceKm(inCoords[0], inCoords[inCoords.length - 1]) < 0.8;

    // 1. Origin Terminal: at inCoords[0] (San Simon, Bulua, Lumbia, etc.)
    const originPt = inCoords[0]; // [lng, lat]
    let originTerm = existingTerms.find(t => distanceKm([t.lng, t.lat], originPt) <= 0.4);

    if (!originTerm) {
      // Find if any terminal exists across the database within 400m
      const [allTerms] = await db.execute('SELECT * FROM terminals');
      originTerm = allTerms.find(t => distanceKm([t.lng, t.lat], originPt) <= 0.4);

      if (!originTerm) {
        // Create new terminal for origin
        const cleanOrigin = r.origin.replace(/\s+/g, ' ').trim();
        const termName = cleanOrigin.toLowerCase().includes('terminal') ? cleanOrigin : `${cleanOrigin} Terminal`;
        const termId = crypto.randomUUID();

        await db.execute(
          `INSERT INTO terminals (id, name, note, map_x, map_y, lat, lng)
           VALUES (?, ?, ?, 0, 0, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), lat = VALUES(lat), lng = VALUES(lng)`,
          [termId, termName, `${cleanOrigin} origin terminus`, originPt[1], originPt[0]]
        );
        addedTerminals++;
        originTerm = { id: termId, name: termName, lat: originPt[1], lng: originPt[0] };
        console.log(`  [+] Created Origin Terminal for ${r.code}: "${termName}" at (${originPt[1]}, ${originPt[0]})`);
      }

      // Link to route_terminals seq 1
      await db.execute(
        `INSERT INTO route_terminals (route_id, terminal_id, seq)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE seq = 1`,
        [r.id, originTerm.id]
      );
      linkedTerminals++;
    } else {
      await db.execute(
        `UPDATE route_terminals SET seq = 1 WHERE route_id = ? AND terminal_id = ?`,
        [r.id, originTerm.id]
      );
    }

    // 2. Destination Terminal: at outCoords[0] / inCoords[last] (Carmen, Cogon, Agora, etc.)
    if (!isLoop) {
      const destPt = outCoords.length > 0 ? outCoords[0] : inCoords[inCoords.length - 1]; // [lng, lat]
      let destTerm = existingTerms.find(t => t.id !== originTerm.id && distanceKm([t.lng, t.lat], destPt) <= 0.4);

      if (!destTerm) {
        const [allTerms] = await db.execute('SELECT * FROM terminals');
        destTerm = allTerms.find(t => t.id !== originTerm.id && distanceKm([t.lng, t.lat], destPt) <= 0.4);

        if (!destTerm) {
          const cleanDest = r.destination.replace(/\s+/g, ' ').trim();
          const termName = cleanDest.toLowerCase().includes('terminal') ? cleanDest : `${cleanDest} Terminal`;
          const termId = crypto.randomUUID();

          await db.execute(
            `INSERT INTO terminals (id, name, note, map_x, map_y, lat, lng)
             VALUES (?, ?, ?, 0, 0, ?, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name), lat = VALUES(lat), lng = VALUES(lng)`,
            [termId, termName, `${cleanDest} destination terminus`, destPt[1], destPt[0]]
          );
          addedTerminals++;
          destTerm = { id: termId, name: termName, lat: destPt[1], lng: destPt[0] };
          console.log(`  [+] Created Destination Terminal for ${r.code}: "${termName}" at (${destPt[1]}, ${destPt[0]})`);
        }

        // Link to route_terminals seq 2
        await db.execute(
          `INSERT INTO route_terminals (route_id, terminal_id, seq)
           VALUES (?, ?, 2)
           ON DUPLICATE KEY UPDATE seq = 2`,
          [r.id, destTerm.id]
        );
        linkedTerminals++;
      } else {
        await db.execute(
          `UPDATE route_terminals SET seq = 2 WHERE route_id = ? AND terminal_id = ?`,
          [r.id, destTerm.id]
        );
      }
    }
  }

  console.log(`\n✓ Sync complete! Created ${addedTerminals} new terminals, linked ${linkedTerminals} route terminals.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
