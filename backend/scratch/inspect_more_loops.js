const pool = require('../src/config/db');

async function run() {
  const ids = ['ra-pier-cogon-line', 'rbc-pier-macabalan-agora-limketkai', 'rd-gusa-cugman-limketkai-cogon'];
  for (const id of ids) {
    const [dirs] = await pool.query('SELECT * FROM route_directions WHERE route_id = ?', [id]);
    const [geoms] = await pool.query('SELECT id, direction, ST_Length(ST_GeomFromGeoJSON(geometry)) as len, geometry FROM route_geometry WHERE route_id = ?', [id]);
    console.log(`\nRoute: ${id}`);
    console.log('Directions:', dirs);
    console.log('Geometries:', geoms.map(g => {
      const geom = typeof g.geometry === 'string' ? JSON.parse(g.geometry) : g.geometry;
      return { dir: g.direction, pts: geom ? geom.coordinates.length : 0 };
    }));
  }
  process.exit(0);
}
run();
