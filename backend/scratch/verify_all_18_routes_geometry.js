const db = require('../src/config/db');

const targetRoutes = [
  'Dansolihon (R2)',
  'Kauswagan (R2) NHA',
  'Bayabas (R3)',
  'Bulua (R3)',
  'Carmen (R3) Pueblo de Oro (Xavier Estates Gate 3)',
  'Kauswagan (R3)',
  'Carmen (R4) Pueblo de Oro (Xavier Estates Gate 3)',
  'Carmen (R5) Carmen Public Market',
  'Bulua (R5)',
  'Bulua (R7)',
  'FS Catanico (R-FS )',
  'Iponan (R1) Bulao',
  'Puerto (R1) Puerto Public Market',
  'Kauswagan (R1) NHA',
  'Bugo (R1)',
  'Bulua (R1)',
  'Bulua (R2)'
];

async function check() {
  for (const name of targetRoutes) {
    const [rows] = await db.query('SELECT r.id, r.code, r.name, r.origin, r.destination FROM routes r WHERE r.name LIKE ?', ['%' + name.split(' ')[0] + '%']);
    const r = rows.find(x => x.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(x.name.toLowerCase()));
    if (!r) {
      console.log('NOT FOUND: ' + name);
      continue;
    }
    const [geos] = await db.query('SELECT direction, geometry FROM route_geometry WHERE route_id = ?', [r.id]);
    console.log('\n============================================================');
    console.log('[' + r.code + '] ' + r.name);
    console.log('Origin: ' + r.origin + '  |  Destination: ' + r.destination);
    for (const g of geos) {
      const geo = typeof g.geometry === 'string' ? JSON.parse(g.geometry) : g.geometry;
      const coords = geo.coordinates;
      console.log('  Direction: ' + g.direction + ' (' + coords.length + ' pts)');
      console.log('    Start: [' + coords[0][0].toFixed(5) + ', ' + coords[0][1].toFixed(5) + ']');
      console.log('    End:   [' + coords[coords.length-1][0].toFixed(5) + ', ' + coords[coords.length-1][1].toFixed(5) + ']');
      
      let largeHops = [];
      for (let i = 0; i < coords.length - 1; i++) {
        const dx = (coords[i+1][0] - coords[i][0]) * 111000 * Math.cos(coords[i][1]*Math.PI/180);
        const dy = (coords[i+1][1] - coords[i][1]) * 111000;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d > 400) {
          largeHops.push({ idx: i, dist: Math.round(d), from: coords[i], to: coords[i+1] });
        }
      }
      if (largeHops.length > 0) {
        console.log('    Large hops > 400m:', largeHops);
      } else {
        console.log('    OK: Smooth road-following geometry (all segments < 400m)');
      }
    }
  }
  process.exit(0);
}

check();
