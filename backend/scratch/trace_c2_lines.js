const fs = require('fs');
const content = fs.readFileSync('backend/scratch/new_c2_extracted/doc.kml', 'utf8');

const COGON = [124.6514096, 8.4773674];
const LKK = [124.6560603, 8.4815828];
const PATAG = [124.6255106, 8.4876143];

function dist(c1, c2) {
  const dx = (c2[0] - c1[0]) * 111000 * Math.cos(c1[1] * Math.PI / 180);
  const dy = (c2[1] - c1[1]) * 111000;
  return Math.sqrt(dx * dx + dy * dy);
}

const pms = content.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
for (const pm of pms) {
  if (!pm.includes('<LineString>')) continue;
  const name = (pm.match(/<name>(.*?)<\/name>/) || ['',''])[1];
  const coords = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/)[1].trim().split(/\s+/).map(p => p.split(',').slice(0,2).map(Number));
  console.log(`=== ${name} (${coords.length} pts) ===`);
  coords.forEach((pt, i) => {
    const dCogon = Math.round(dist(pt, COGON));
    const dLKK = Math.round(dist(pt, LKK));
    const dPatag = Math.round(dist(pt, PATAG));
    console.log(`  ${i.toString().padStart(2)}: [${pt[0].toFixed(6)}, ${pt[1].toFixed(6)}] | d(LKK)=${dLKK}m, d(Cogon)=${dCogon}m, d(Patag)=${dPatag}m`);
  });
}
