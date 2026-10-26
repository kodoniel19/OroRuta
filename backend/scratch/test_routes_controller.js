const routesController = require('../src/controllers/routes');

const testIds = [
  'c2-patag-gaisano-limketkai-cogon',
  'bulua-cogon-line-highway',
  'puerto-cogon-divisoria-line',
  'r2-gaisano-agora-cogon-carmen',
  'rd-gusa-cugman-limketkai-cogon'
];

async function run() {
  console.log('Testing routesController.getRouteById for sample routes:\n');

  for (const id of testIds) {
    let result = null;
    let statusCode = 200;
    const req = { params: { id } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        result = data;
        return this;
      }
    };

    await routesController.getById(req, res);
    const data = result.data || result;
    console.log(`Route [${data.code}] ${data.name} (id: ${data.id}):`);
    console.log(`  Origin: "${data.origin}" | Destination: "${data.destination}"`);
    console.log(`  Terminals (${data.terminals?.length || 0}):`, data.terminals?.map(t => `${t.name} (${t.lat}, ${t.lng})`).join(' -> '));
    console.log(`  Loading Points (${data.stops?.length || 0}):`, data.stops?.map(s => s.name).join(', '));
    console.log(`  Directions (${data.directions?.length || 0}):`, data.directions?.map(d => `${d.direction}: ${d.distance_km}km`).join(' | '));
    console.log(`  Geometries (${data.geometries?.length || 0}):`, data.geometries?.map(g => g.direction).join(', '));
    console.log('');
  }

  process.exit(0);
}

run().catch(console.error);
