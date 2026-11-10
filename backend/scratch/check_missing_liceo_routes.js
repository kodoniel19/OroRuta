const fs = require('fs');
const path = require('path');

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
const bundled = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

const codes = ['R3', 'R5'];
const missing = bundled.filter(r => {
  if (!codes.includes(r.code)) return false;
  const hasLiceo = (r.stops || []).some(s => s.name.toLowerCase().includes('liceo'));
  if (hasLiceo) return false;

  // Check if route passes near Liceo
  const geoms = r.geometries || [];
  for (const g of geoms) {
    const coords = JSON.parse(g.geometry).coordinates;
    for (const [lng, lat] of coords) {
      if (haversineMeters(lat, lng, 8.4862, 124.6388) <= 50) {
        return true; // passes very close but has no stop
      }
    }
  }
  return false;
});

console.log(`Routes passing very close to Liceo (<50m) but missing the stop (${missing.length}):`);
for (const r of missing) {
  console.log(`  [${r.code}] ${r.name} (id: ${r.id})`);
  console.log(`    Stops: ${(r.stops || []).map(s => s.name).join(', ') || 'NONE'}`);
  console.log(`    Terminals: ${(r.terminals || []).map(t => t.name).join(', ')}`);

  // Check inbound vs outbound proximity
  for (const g of r.geometries || []) {
    const coords = JSON.parse(g.geometry).coordinates;
    let minD = Infinity;
    for (const [lng, lat] of coords) {
      const d = haversineMeters(lat, lng, 8.4862, 124.6388);
      if (d < minD) minD = d;
    }
    console.log(`    ${g.direction}: ${Math.round(minD)}m from Liceo`);
  }
}

