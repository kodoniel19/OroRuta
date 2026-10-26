const specs = require('./specs_17.json');

console.log('=== 17 Routes Full Specification Summary ===\n');

specs.forEach((s, idx) => {
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`#${idx + 1}: [${s.code}] ${s.name} (id: ${s.id})`);
  console.log(`   Origin:      "${s.dbOrigin}"`);
  console.log(`   Destination: "${s.dbDest}"`);
  console.log(`   Inbound:  start: [${s.inStart}] -> end: [${s.inEnd}] (${s.inPts} pts)`);
  console.log(`   Outbound: start: [${s.outStart}] -> end: [${s.outEnd}] (${s.outPts} pts)`);
  console.log(`   KML Points (${s.kmlPoints.length}):`);
  s.kmlPoints.forEach(p => console.log(`     - "${p.name}" [${p.coord[0]}, ${p.coord[1]}]`));
  console.log(`   KML Lines (${s.kmlLines.length}):`);
  s.kmlLines.forEach(l => console.log(`     - "${l.name}" (${l.pts} pts) start: [${l.start}] -> end: [${l.end}]`));
});
