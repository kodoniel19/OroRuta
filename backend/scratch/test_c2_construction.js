const fs = require('fs');

const content = fs.readFileSync('backend/scratch/new_c2_extracted/doc.kml', 'utf8');

function parseCoords(str) {
  return str.trim().split(/\s+/).map(pt => {
    const [lng, lat] = pt.split(',').map(Number);
    return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
  });
}

function distCoord(c1, c2) {
  const dx = (c2[0] - c1[0]) * 111000 * Math.cos(c1[1] * Math.PI / 180);
  const dy = (c2[1] - c1[1]) * 111000;
  return Math.sqrt(dx * dx + dy * dy);
}

function calcLengthKm(coords) {
  let d = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    d += distCoord(coords[i], coords[i + 1]);
  }
  return d / 1000;
}

const pms = content.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
const linesByName = {};

for (const pm of pms) {
  if (!pm.includes('<LineString>')) continue;
  const name = (pm.match(/<name>(.*?)<\/name>/) || ['',''])[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
  const coords = parseCoords(pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/)[1]);
  linesByName[name] = coords;
}

// Inbound: Line 5 + Line 6 + Line 7 + Line 8 (pts 0..13)
const l5 = linesByName['Line 5'];
const l6 = linesByName['Line 6'];
const l7 = linesByName['Line 7'];
const l8 = linesByName['Line 8'];
const l9 = linesByName['Line 9'];
const l11 = linesByName['Line 11'];
const l12 = linesByName['Line 12'];

// Helper to concatenate lines without duplicate boundary points
function concatLines(lines) {
  const result = [];
  for (const line of lines) {
    if (result.length === 0) {
      result.push(...line);
    } else {
      const last = result[result.length - 1];
      const start = line[0];
      const d = distCoord(last, start);
      if (d < 1) {
        result.push(...line.slice(1));
      } else {
        result.push(...line);
      }
    }
  }
  return result;
}

// Inbound: Patag -> Gaisano -> Limketkai -> Cogon
const inbound = concatLines([
  l5,
  l6,
  l7,
  l8.slice(0, 14) // includes pt 13 (Cogon Public Market)
]);

// Outbound: Cogon -> Divisoria/Carmen -> Patag
// Line 8 (from Cogon pt 13 to end)
// Line 9 (all)
// Line 11 (all)
// Line 12 (all)
// Line 5 (reverse from junction pt 12 down to pt 0)
const l5Return = l5.slice(0, 13).reverse();

const outbound = concatLines([
  l8.slice(13),
  l9,
  l11,
  l12,
  l5Return
]);

console.log('=== Inbound Route ===');
console.log(`Points: ${inbound.length}`);
console.log(`Length: ${calcLengthKm(inbound).toFixed(2)} km`);
console.log(`Start: [${inbound[0]}] (Camp Evangelista, Patag)`);
console.log(`End:   [${inbound[inbound.length - 1]}] (Cogon Public Market)`);

console.log('\n=== Outbound Route ===');
console.log(`Points: ${outbound.length}`);
console.log(`Length: ${calcLengthKm(outbound).toFixed(2)} km`);
console.log(`Start: [${outbound[0]}] (Cogon Public Market)`);
console.log(`End:   [${outbound[outbound.length - 1]}] (Camp Evangelista, Patag)`);

// Check hops > 400m
function checkHops(name, coords) {
  console.log(`\nChecking hops for ${name}:`);
  let maxHop = 0;
  let largeHops = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distCoord(coords[i], coords[i + 1]);
    if (d > maxHop) maxHop = d;
    if (d > 450) {
      console.log(`  Hop #${i} -> #${i+1}: ${Math.round(d)}m from [${coords[i]}] to [${coords[i+1]}]`);
      largeHops++;
    }
  }
  console.log(`  Max hop: ${Math.round(maxHop)}m, Hops > 450m: ${largeHops}`);
}

checkHops('Inbound', inbound);
checkHops('Outbound', outbound);
