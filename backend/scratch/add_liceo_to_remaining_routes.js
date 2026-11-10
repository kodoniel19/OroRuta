/**
 * Add Liceo de Cagayan Loading Zone to remaining R3/R5 routes that pass within 50m
 * but are currently missing the stop.
 *
 * Target routes:
 *   Bayabas (R3) = 401b4d1b-e91b-4c6d-b1c9-034aa1c87b6d
 *   Bonbon (R3)  = 2e8ed762-ee8d-4694-b3ae-2c529cb926f3
 *   Bayabas (R5) = a38aba4f-1cfe-404a-862c-7603ad1a67e9
 */
const fs = require('fs');
const path = require('path');

const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
const bundled = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

const targetIds = [
  '401b4d1b-e91b-4c6d-b1c9-034aa1c87b6d', // Bayabas (R3)
  '2e8ed762-ee8d-4694-b3ae-2c529cb926f3', // Bonbon (R3)
  'a38aba4f-1cfe-404a-862c-7603ad1a67e9', // Bayabas (R5)
];

let updated = 0;
for (const r of bundled) {
  if (!targetIds.includes(r.id)) continue;

  const hasLiceo = (r.stops || []).some(s => s.name.toLowerCase().includes('liceo'));
  if (hasLiceo) {
    console.log(`[${r.code}] ${r.name} — already has Liceo stop, skipping`);
    continue;
  }

  // Generate a deterministic stop id
  const shortId = r.id.substring(0, 8);
  const newStop = {
    id: `lp-liceo-${r.code.toLowerCase()}-${shortId}`,
    route_id: r.id,
    name: "Liceo de Cagayan Loading Zone",
    note: "Rodolfo N. Pelaez Blvd (in front of Main Campus)",
    point_type: "loading",
    map_x: 0,
    map_y: 0,
    lat: 8.4862,
    lng: 124.6388
  };

  if (!r.stops) r.stops = [];
  r.stops.push(newStop);
  r.stop_count = r.stops.length;
  updated++;
  console.log(`[${r.code}] ${r.name} — added Liceo stop (now ${r.stop_count} stops)`);
}

fs.writeFileSync(bundledPath, JSON.stringify(bundled, null, 2) + '\n');
console.log(`\nUpdated ${updated} routes in bundled_routes.json`);

