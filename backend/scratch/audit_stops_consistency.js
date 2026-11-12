const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Major CDO reference points
const REFERENCE_LANDMARKS = [
  { name: 'Carmen Public Market', lat: 8.479498, lng: 124.636820, threshold: 450 },
  { name: 'Liceo de Cagayan University', lat: 8.4862, lng: 124.6388, threshold: 400 },
  { name: 'Agora Terminal', lat: 8.48813, lng: 124.658, threshold: 450 },
  { name: 'Cogon Public Market', lat: 8.47716, lng: 124.6512, threshold: 450 },
  { name: 'Bulua Westbound Terminal', lat: 8.5040, lng: 124.6115, threshold: 500 },
  { name: 'Limketkai Center', lat: 8.4838, lng: 124.653, threshold: 450 },
  { name: 'Divisoria Plaza', lat: 8.4777, lng: 124.6452, threshold: 400 },
  { name: 'USTP Lapasan', lat: 8.4852, lng: 124.6572, threshold: 400 },
  { name: 'Centrio Mall', lat: 8.4856, lng: 124.6513, threshold: 400 },
  { name: 'SM CDO Downtown', lat: 8.4843, lng: 124.6549, threshold: 400 }
];

async function run() {
  const bundledPath = path.join(__dirname, '../../android/app/src/main/assets/bundled_routes.json');
  const bundled = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));

  console.log('=== AUDITING BUNDLED STOPS FOR NAME / COORDINATE MISMATCHES ===');
  let mismatchCount = 0;
  for (const r of bundled) {
    const stops = [...(r.terminals || []), ...(r.stops || [])];
    for (const s of stops) {
      if (!s.lat || !s.lng) continue;
      for (const lm of REFERENCE_LANDMARKS) {
        if (s.name.toLowerCase().includes(lm.name.toLowerCase())) {
          const d = haversineMeters(s.lat, s.lng, lm.lat, lm.lng);
          if (d > lm.threshold) {
            console.log(`[MISMATCH] Route [${r.code}] ${r.name}: Stop "${s.name}" is at [${s.lat}, ${s.lng}], but ${lm.name} is ${Math.round(d)}m away!`);
            mismatchCount++;
          }
        }
      }
    }
  }
  console.log(`Total stop name/coordinate mismatches found: ${mismatchCount}`);

  console.log('\n=== AUDITING DB LOADING_POINTS FOR NAME / COORDINATE MISMATCHES ===');
  const [dbLps] = await db.query("SELECT lp.*, r.code, r.name as route_name FROM loading_points lp LEFT JOIN routes r ON lp.route_id = r.id");
  let dbMismatchCount = 0;
  for (const lp of dbLps) {
    if (!lp.lat || !lp.lng) continue;
    for (const lm of REFERENCE_LANDMARKS) {
      if (lp.name.toLowerCase().includes(lm.name.toLowerCase())) {
        const d = haversineMeters(parseFloat(lp.lat), parseFloat(lp.lng), lm.lat, lm.lng);
        if (d > lm.threshold) {
          console.log(`[DB MISMATCH] Route [${lp.code}] ${lp.route_name}: Loading Point "${lp.name}" (${lp.id}) is at [${lp.lat}, ${lp.lng}], but ${lm.name} is ${Math.round(d)}m away!`);
          dbMismatchCount++;
        }
      }
    }
  }
  console.log(`Total DB loading point mismatches found: ${dbMismatchCount}`);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });

