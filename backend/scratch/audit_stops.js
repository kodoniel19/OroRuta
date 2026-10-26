const db = require('../src/config/db');

function distM(a, b) {
  const R = 6371000;
  const dLat = (b[1] - a[1]) * Math.PI / 180;
  const dLng = (b[0] - a[0]) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function audit() {
  console.log('--- AUDITING DATABASE BOARDING & LOADING POINTS ---');

  // 1. Check Miami Inn references
  const [miamiLps] = await db.query("SELECT * FROM loading_points WHERE name LIKE '%Miami%'");
  console.log(`\nMiami Inn loading points count: ${miamiLps.length}`);
  for (const m of miamiLps) {
    console.log(`  - [${m.id}] Route: ${m.route_id} | ${m.name} | ${m.lat}, ${m.lng}`);
  }

  // 2. Load all route geometries
  const [geos] = await db.query('SELECT route_id, direction, geometry FROM route_geometry');
  const geoMap = {};
  for (const g of geos) {
    if (!geoMap[g.route_id]) geoMap[g.route_id] = {};
    const coords = typeof g.geometry === 'string' ? JSON.parse(g.geometry).coordinates : g.geometry.coordinates;
    geoMap[g.route_id][g.direction] = coords;
  }

  // 3. Audit all loading points
  const [lps] = await db.query('SELECT lp.*, r.code, r.name as rname FROM loading_points lp JOIN routes r ON r.id = lp.route_id');
  console.log(`\nAuditing all ${lps.length} loading points against verified route geometry:`);
  
  const invalidLps = [];
  const validLps = [];

  for (const lp of lps) {
    const rGeos = geoMap[lp.route_id];
    if (!rGeos) {
      invalidLps.push({ lp, dist: Infinity, reason: 'Route has no geometry' });
      continue;
    }

    let minDist = Infinity;
    for (const dir in rGeos) {
      for (const pt of rGeos[dir]) {
        const d = distM([lp.lng, lp.lat], pt);
        if (d < minDist) minDist = d;
      }
    }

    // A stop more than 85 meters from the road centerline is invalid for that route
    if (minDist > 85 || lp.name.includes('Miami Inn')) {
      invalidLps.push({ lp, dist: Math.round(minDist), reason: lp.name.includes('Miami Inn') ? 'Unverified Motel' : 'Off-route' });
    } else {
      validLps.push({ lp, dist: Math.round(minDist) });
    }
  }

  console.log(`\nValid loading points: ${validLps.length}`);
  console.log(`Invalid / Misplaced loading points: ${invalidLps.length}`);
  invalidLps.forEach(inv => {
    console.log(`  DELETE CANDIDATE: [${inv.lp.id}] ${inv.lp.rname} -> "${inv.lp.name}" (${inv.dist}m away, reason: ${inv.reason})`);
  });

  // 4. Audit route_terminals
  const [rts] = await db.query('SELECT rt.*, t.name as tname, t.lat, t.lng, r.code, r.name as rname FROM route_terminals rt JOIN terminals t ON t.id = rt.terminal_id JOIN routes r ON r.id = rt.route_id');
  console.log(`\nAuditing all ${rts.length} route_terminals against route geometry:`);

  const invalidRts = [];
  const validRts = [];

  for (const rt of rts) {
    const rGeos = geoMap[rt.route_id];
    if (!rGeos) {
      invalidRts.push({ rt, dist: Infinity, reason: 'Route has no geometry' });
      continue;
    }

    let minDist = Infinity;
    for (const dir in rGeos) {
      for (const pt of rGeos[dir]) {
        const d = distM([rt.lng, rt.lat], pt);
        if (d < minDist) minDist = d;
      }
    }

    // Terminal more than 150m away from the route line
    if (minDist > 150) {
      invalidRts.push({ rt, dist: Math.round(minDist) });
    } else {
      validRts.push({ rt, dist: Math.round(minDist) });
    }
  }

  console.log(`\nValid route terminals: ${validRts.length}`);
  console.log(`Invalid / Misplaced route terminals: ${invalidRts.length}`);
  invalidRts.forEach(inv => {
    console.log(`  REMOVE CANDIDATE: [route_id: ${inv.rt.route_id}, terminal_id: ${inv.rt.terminal_id}] ${inv.rt.rname} -> "${inv.rt.tname}" (${inv.dist}m away)`);
  });
}

audit().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
