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

function calculatePathDistanceKm(coords) {
  let dist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    dist += haversineM(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
  }
  return (dist / 1000).toFixed(2);
}

function findMaxJump(coords) {
  let maxJump = 0;
  let maxIdx = -1;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = haversineM(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]);
    if (d > maxJump) {
      maxJump = d;
      maxIdx = i;
    }
  }
  return { maxJump: maxJump.toFixed(1), maxIdx };
}

async function run() {
  const ids = [
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

  console.log('=== VERIFYING 17 ROUTE GEOMETRIES IN DATABASE ===\n');

  for (const id of ids) {
    const [rows] = await pool.query(
      'SELECT r.code, r.name, rg.direction, rg.geometry FROM routes r JOIN route_geometry rg ON r.id = rg.route_id WHERE r.id = ? ORDER BY rg.direction',
      [id]
    );

    console.log(`Route [${rows[0]?.code || id}] (${id}):`);
    for (const row of rows) {
      const geom = typeof row.geometry === 'string' ? JSON.parse(row.geometry) : row.geometry;
      const coords = geom.coordinates || [];
      const distKm = calculatePathDistanceKm(coords);
      const { maxJump } = findMaxJump(coords);
      const start = coords[0] ? `[${coords[0][0].toFixed(5)}, ${coords[0][1].toFixed(5)}]` : 'N/A';
      const end = coords[coords.length - 1] ? `[${coords[coords.length - 1][0].toFixed(5)}, ${coords[coords.length - 1][1].toFixed(5)}]` : 'N/A';

      console.log(`  ${row.direction}: ${coords.length} pts, ${distKm} km | Max step: ${maxJump}m | Start: ${start} -> End: ${end}`);
    }
  }

  process.exit(0);
}

run().catch(console.error);
