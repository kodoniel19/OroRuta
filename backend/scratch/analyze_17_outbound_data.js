const fs = require('fs');
const specs = JSON.parse(fs.readFileSync('backend/scratch/specs_clean.json', 'utf8'));

console.log('=== Complete Analysis of All 17 Routes ===\n');

for (let i = 0; i < specs.length; i++) {
  const s = specs[i];
  console.log(`================================================================================`);
  console.log(`Route #${i+1}: [${s.code}] ${s.name} (id: ${s.id})`);
  console.log(`  Origin:      "${s.dbOrigin}"`);
  console.log(`  Destination: "${s.dbDest}"`);
  console.log(`  Inbound Start (Origin):        [${s.inStart}] (${s.inPts} pts)`);
  console.log(`  Inbound End   (Destination):   [${s.inEnd}]`);
  console.log(`  Outbound Start (Board Here):   [${s.outStart}] (${s.outPts} pts)`);
  console.log(`  Outbound End   (Destination):  [${s.outEnd}]`);
  console.log(`  KML Points:`);
  s.kmlPoints.forEach(p => console.log(`    - "${p.name}" [${p.coord[0]}, ${p.coord[1]}]`));
}
