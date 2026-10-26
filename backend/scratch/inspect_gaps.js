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
  const routesToCheck = ['Dansolihon (R1)', 'Taglimao (R-TAGL)', 'Tumpagon (R-TUM)'];
  for (const rName of routesToCheck) {
    const [rows] = await db.execute(
      `SELECT direction, geometry FROM route_geometry WHERE route_id = (SELECT id FROM routes WHERE name LIKE ? LIMIT 1)`,
      [`%${rName}%`]
    );
    console.log(`\n=== ${rName} ===`);
    for (const row of rows) {
      const geo = typeof row.geometry === 'string' ? JSON.parse(row.geometry) : row.geometry;
      const coords = geo.coordinates || [];
      let maxGap = 0;
      let gapIdx = -1;
      for (let i = 0; i < coords.length - 1; i++) {
        const d = distanceKm(coords[i], coords[i+1]);
        if (d > maxGap) {
          maxGap = d;
          gapIdx = i;
        }
      }
      console.log(`  ${row.direction}: total pts = ${coords.length}, max gap = ${(maxGap * 1000).toFixed(0)}m at idx ${gapIdx}`);
      if (gapIdx >= 0) {
        console.log(`    p[${gapIdx}] = ${coords[gapIdx]}, p[${gapIdx+1}] = ${coords[gapIdx+1]}`);
      }
    }
  }
  process.exit(0);
})();
