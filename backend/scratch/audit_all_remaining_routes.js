const pool = require('../src/config/db');

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findMaxJump(coords) {
  let maxJump = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversineM(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
    if (d > maxJump) maxJump = d;
  }
  return maxJump;
}

async function auditAllRoutes() {
  const [routes] = await pool.query('SELECT * FROM routes ORDER BY code, name');
  console.log(`=== AUDITING ALL ${routes.length} ROUTES IN DATABASE ===\n`);

  let totalAudited = routes.length;
  let target17Count = 0;
  let sanSimonCount = 0;
  let otherRoutesCount = 0;
  let routesWithOutboundGeom = 0;
  let routesWithOutboundTerminal = 0;
  let routesWithLargeJumps = 0;

  const target17Ids = new Set([
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
  ]);

  const auditReport = [];

  for (const r of routes) {
    const isTarget17 = target17Ids.has(r.id);
    const isSanSimon = r.id === 'san-simon-cogon-line' || r.code === 'R-SAN';

    if (isTarget17) target17Count++;
    else if (isSanSimon) sanSimonCount++;
    else otherRoutesCount++;

    // Geometries
    const [geoms] = await pool.query('SELECT direction, geometry FROM route_geometry WHERE route_id = ?', [r.id]);
    const inGeom = geoms.find(g => g.direction === 'Inbound');
    const outGeom = geoms.find(g => g.direction === 'Outbound');

    let inPts = 0, outPts = 0;
    let inMaxJump = 0, outMaxJump = 0;
    let inStart = null, inEnd = null, outStart = null, outEnd = null;

    if (inGeom) {
      const g = typeof inGeom.geometry === 'string' ? JSON.parse(inGeom.geometry) : inGeom.geometry;
      const coords = g.coordinates || [];
      inPts = coords.length;
      inMaxJump = findMaxJump(coords);
      if (coords.length > 0) {
        inStart = coords[0];
        inEnd = coords[coords.length - 1];
      }
    }

    if (outGeom) {
      routesWithOutboundGeom++;
      const g = typeof outGeom.geometry === 'string' ? JSON.parse(outGeom.geometry) : outGeom.geometry;
      const coords = g.coordinates || [];
      outPts = coords.length;
      outMaxJump = findMaxJump(coords);
      if (coords.length > 0) {
        outStart = coords[0];
        outEnd = coords[coords.length - 1];
      }
    }

    if (outMaxJump > 500 || inMaxJump > 500) {
      routesWithLargeJumps++;
    }

    // Terminals
    const [terms] = await pool.query(`
      SELECT rt.seq, t.id, t.name, t.lat, t.lng
      FROM route_terminals rt
      JOIN terminals t ON rt.terminal_id = t.id
      WHERE rt.route_id = ?
      ORDER BY rt.seq
    `, [r.id]);

    const hasOutboundTerm = terms.length >= 2 || (terms.length === 1 && (r.name.toLowerCase().includes('loop') || r.code.toLowerCase().includes('loop')));
    if (hasOutboundTerm) routesWithOutboundTerminal++;

    // Distance between Outbound start and Outbound terminal
    let outTermDist = null;
    if (outStart && terms.length >= 2) {
      const term2 = terms[1];
      outTermDist = haversineM(outStart[1], outStart[0], term2.lat, term2.lng).toFixed(1);
    }

    auditReport.push({
      id: r.id,
      code: r.code,
      name: r.name,
      isTarget17,
      isSanSimon,
      inPts,
      outPts,
      inMaxJump: inMaxJump.toFixed(0),
      outMaxJump: outMaxJump.toFixed(0),
      terminalsCount: terms.length,
      hasOutboundTerm,
      outTermDist
    });
  }

  console.log(`--- SUMMARY OF ALL ${totalAudited} ROUTES ---`);
  console.log(`Target 17 Routes Fixed: ${target17Count}`);
  console.log(`San Simon (R-SAN) Preserved Intact: ${sanSimonCount}`);
  console.log(`Other Database Routes: ${otherRoutesCount}`);
  console.log(`Routes with Outbound Geometries: ${routesWithOutboundGeom} / ${totalAudited}`);
  console.log(`Routes with Outbound Terminal Associations: ${routesWithOutboundTerminal} / ${totalAudited}`);
  console.log(`Routes with Jumps > 500m: ${routesWithLargeJumps}`);

  // Check San Simon details
  const ss = auditReport.find(r => r.isSanSimon);
  if (ss) {
    console.log(`\nSan Simon Verification:`);
    console.log(`  Code: [${ss.code}] (ID: ${ss.id})`);
    console.log(`  Inbound Pts: ${ss.inPts}, Outbound Pts: ${ss.outPts}`);
    console.log(`  Max jump: Inbound ${ss.inMaxJump}m, Outbound ${ss.outMaxJump}m`);
    console.log(`  Terminals: ${ss.terminalsCount}`);
  }

  process.exit(0);
}

auditAllRoutes().catch(console.error);
