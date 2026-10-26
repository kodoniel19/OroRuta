const pool = require('../src/config/db');

const ROUTE_IDS = [
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

function distM(c1, c2) {
  const dx = (c2[0] - c1[0]) * 111000 * Math.cos(c1[1] * Math.PI / 180);
  const dy = (c2[1] - c1[1]) * 111000;
  return Math.sqrt(dx * dx + dy * dy);
}

async function run() {
  console.log('=== Diagnosing 17 Routes Outbound Configuration ===\n');

  for (const rId of ROUTE_IDS) {
    const [rRows] = await pool.query('SELECT * FROM routes WHERE id = ?', [rId]);
    if (rRows.length === 0) {
      console.log(`❌ Route NOT FOUND in DB: ${rId}`);
      continue;
    }
    const r = rRows[0];
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`Route: [${r.code}] ${r.name} (id: ${r.id})`);
    console.log(`  Origin:      "${r.origin}"`);
    console.log(`  Destination: "${r.destination}"`);

    // Geometries
    const [geoms] = await pool.query('SELECT direction, geometry FROM route_geometry WHERE route_id = ?', [rId]);
    const inGeom = geoms.find(g => g.direction === 'Inbound');
    const outGeom = geoms.find(g => g.direction === 'Outbound');

    const inCoords = inGeom ? (typeof inGeom.geometry === 'string' ? JSON.parse(inGeom.geometry) : inGeom.geometry).coordinates : [];
    const outCoords = outGeom ? (typeof outGeom.geometry === 'string' ? JSON.parse(outGeom.geometry) : outGeom.geometry).coordinates : [];

    console.log(`  Inbound geom:  ${inCoords.length} pts | Start: [${inCoords[0]}] -> End: [${inCoords[inCoords.length - 1]}]`);
    console.log(`  Outbound geom: ${outCoords.length} pts | Start: [${outCoords[0]}] -> End: [${outCoords[outCoords.length - 1]}]`);

    if (inCoords.length > 0 && outCoords.length > 0) {
      const dInStartOutEnd = Math.round(distM(inCoords[0], outCoords[outCoords.length - 1]));
      const dInEndOutStart = Math.round(distM(inCoords[inCoords.length - 1], outCoords[0]));
      console.log(`  Geom Alignment: Inbound Start <-> Outbound End: ${dInStartOutEnd}m | Inbound End <-> Outbound Start: ${dInEndOutStart}m`);
    }

    // Terminals
    const [terminals] = await pool.query(
      `SELECT t.id, t.name, t.lat, t.lng, rt.seq FROM terminals t
       JOIN route_terminals rt ON rt.terminal_id = t.id
       WHERE rt.route_id = ? ORDER BY rt.seq`, [rId]);
    console.log(`  Linked Terminals (${terminals.length}):`);
    for (const t of terminals) {
      const dToOutStart = outCoords.length > 0 ? Math.round(distM([t.lng, t.lat], outCoords[0])) : null;
      console.log(`    #${t.seq}: [${t.id}] "${t.name}" (${t.lat}, ${t.lng}) -> ${dToOutStart}m to Outbound Start`);
    }

    // Loading points
    const [stops] = await pool.query(
      `SELECT id, name, point_type, lat, lng FROM loading_points WHERE route_id = ?`, [rId]);
    console.log(`  Linked Loading Points (${stops.length}):`);
    for (const s of stops) {
      const dToOutStart = outCoords.length > 0 ? Math.round(distM([s.lng, s.lat], outCoords[0])) : null;
      console.log(`    [${s.id}] "${s.name}" (${s.lat}, ${s.lng}) [${s.point_type}] -> ${dToOutStart}m to Outbound Start`);
    }

    // Check what the mobile app would pick for Outbound boarding:
    // In Mobile App:
    // rawBoarding = terminals + stops
    // candidateBoardingStops = rawBoarding filtered within 100m of Outbound geom occurring before dropoff
    const rawBoarding = [
      ...terminals.map(t => ({ id: t.id, name: t.name, lat: t.lat, lng: t.lng, type: 'terminal' })),
      ...stops.map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng, type: s.point_type }))
    ];

    const outCandidates = rawBoarding.filter(s => {
      if (outCoords.length === 0) return true;
      const minD = Math.min(...outCoords.map(c => distM([s.lng, s.lat], c)));
      return minD <= 100;
    });

    // Sort along outCoords
    outCandidates.sort((a, b) => {
      const idxA = outCoords.findIndex(c => distM([a.lng, a.lat], c) < 100);
      const idxB = outCoords.findIndex(c => distM([b.lng, b.lat], c) < 100);
      return idxA - idxB;
    });

    console.log(`  Simulated App Outbound Candidates (${outCandidates.length}):`);
    if (outCandidates.length > 0) {
      console.log(`    => PRIMARY BOARDING STOP SELECTED: "${outCandidates[0].name}" at (${outCandidates[0].lat}, ${outCandidates[0].lng})`);
    } else {
      console.log(`    => NO CANDIDATES FOUND! Fallback will trigger.`);
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
