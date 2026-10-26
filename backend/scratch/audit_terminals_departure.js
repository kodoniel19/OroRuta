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

(async () => {
  const [routes] = await db.execute('SELECT * FROM routes ORDER BY code, name');
  console.log(`Auditing terminals and boarding points for ${routes.length} routes...\n`);

  const issues = [];

  for (const r of routes) {
    const [terms] = await db.execute(
      `SELECT t.* FROM terminals t JOIN route_terminals rt ON rt.terminal_id = t.id WHERE rt.route_id = ? ORDER BY rt.seq`,
      [r.id]
    );
    const [stops] = await db.execute(`SELECT * FROM loading_points WHERE route_id = ?`, [r.id]);
    const [geos] = await db.execute(`SELECT direction, geometry FROM route_geometry WHERE route_id = ?`, [r.id]);

    const inGeo = geos.find(g => g.direction === 'Inbound');
    const outGeo = geos.find(g => g.direction === 'Outbound');

    const inCoords = inGeo ? (typeof inGeo.geometry === 'string' ? JSON.parse(inGeo.geometry) : inGeo.geometry).coordinates : [];
    const outCoords = outGeo ? (typeof outGeo.geometry === 'string' ? JSON.parse(outGeo.geometry) : outGeo.geometry).coordinates : [];

    // Check Inbound start: should have a terminal or verified boarding stop within 300m of inCoords[0]
    let inStartHasStop = false;
    let inStartStopName = '';
    if (inCoords.length > 0) {
      const startPt = inCoords[0];
      for (const t of terms) {
        if (distanceKm([t.lng, t.lat], startPt) <= 0.3) {
          inStartHasStop = true;
          inStartStopName = t.name;
          break;
        }
      }
      if (!inStartHasStop) {
        for (const s of stops) {
          if (distanceKm([s.lng, s.lat], startPt) <= 0.3) {
            inStartHasStop = true;
            inStartStopName = s.name;
            break;
          }
        }
      }
    }

    // Check Outbound start: should have a terminal or verified boarding stop within 300m of outCoords[0]
    let outStartHasStop = false;
    let outStartStopName = '';
    if (outCoords.length > 0) {
      const startPt = outCoords[0];
      for (const t of terms) {
        if (distanceKm([t.lng, t.lat], startPt) <= 0.3) {
          outStartHasStop = true;
          outStartStopName = t.name;
          break;
        }
      }
      if (!outStartHasStop) {
        for (const s of stops) {
          if (distanceKm([s.lng, s.lat], startPt) <= 0.3) {
            outStartHasStop = true;
            outStartStopName = s.name;
            break;
          }
        }
      }
    }

    const issueList = [];
    if (!inStartHasStop && inCoords.length > 0) {
      issueList.push(`Missing Inbound departure stop near ${r.origin} [${inCoords[0]}]`);
    }
    if (!outStartHasStop && outCoords.length > 0) {
      issueList.push(`Missing Outbound departure stop near ${r.destination} [${outCoords[0]}]`);
    }
    if (terms.length < 2 && !r.name.toLowerCase().includes('loop')) {
      issueList.push(`Only ${terms.length} terminal(s) defined (expected 2 for non-loop)`);
    }

    if (issueList.length > 0) {
      issues.push({
        code: r.code,
        name: r.name,
        origin: r.origin,
        destination: r.destination,
        terminals: terms.map(t => `${t.name} (${t.lat.toFixed(4)}, ${t.lng.toFixed(4)})`),
        stopsCount: stops.length,
        inStart: inCoords[0],
        outStart: outCoords[0],
        issues: issueList
      });
    }
  }

  console.log(`Found ${issues.length} routes with terminal/boarding point discrepancies:\n`);
  issues.forEach((iss, i) => {
    console.log(`[${i+1}] ${iss.code} - ${iss.name}`);
    console.log(`    Origin: "${iss.origin}" -> Destination: "${iss.destination}"`);
    console.log(`    Terminals in DB: ${iss.terminals.join(' | ') || 'NONE'}`);
    iss.issues.forEach(err => console.log(`    ⚠️  ${err}`));
  });

  process.exit(0);
})();
