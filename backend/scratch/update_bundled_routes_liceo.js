const fs = require('fs');
const path = require('path');

const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
const routes = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

const TARGET_ROUTE_IDS = [
  '38f1362f-d2a7-4e36-a989-9e178f2ddfae', // Lapasan (R1)
  'c2-patag-gaisano-limketkai-cogon',
  'r1-gaisano-carmen-loop',
  'r2-gaisano-agora-cogon-carmen',
  'b2682fed-e85e-43ce-b05d-d4a472c6097a',
  '09cfc7ea-4f4a-477e-89a4-13666ddf29a1',
  '9ef925b0-d6b4-4565-bd92-05b28173336d',
  'd0402f5d-da95-4132-913e-fef5733feed2',
  '262139a4-3be7-44fc-ac8a-b5f44ed01b03',
  '3bcdc4d3-4790-4a3e-a1bf-ad48b2241ee0',
  'e8a63394-79d4-4850-926a-1b34fe8c9ae1',
  '18036ed4-a14e-4b05-8a1a-2cd9dc624b6d',
  '31241d2e-0166-4c9d-9e9a-3e89b9d8a8a9'
];

let updatedCount = 0;
for (const r of routes) {
  if (TARGET_ROUTE_IDS.includes(r.id)) {
    if (!r.stops) r.stops = [];
    const hasLiceo = r.stops.some(s => s.name.toLowerCase().includes('liceo'));
    if (!hasLiceo) {
      r.stops.push({
        id: `lp-liceo-${r.code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${r.id.substring(0, 8)}`,
        route_id: r.id,
        name: 'Liceo de Cagayan Loading Zone',
        note: 'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
        point_type: 'loading',
        map_x: 0,
        map_y: 0,
        lat: 8.4862,
        lng: 124.6388
      });
      r.stop_count = r.stops.length;
      updatedCount++;
      console.log(`Added Liceo loading point to [${r.code}] ${r.name}`);
    }
  }
}

fs.writeFileSync(bundledPath, JSON.stringify(routes, null, 2), 'utf8');
console.log(`Updated ${updatedCount} routes in bundled_routes.json.`);

