const https = require('https');
const pool = require('../src/config/db');

const NEW_MID = '1hrIfl6wuWD2_JkawDAIYRcDlyarNsaQ';

function fetchKml(mid) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (r2) => {
          let data = '';
          r2.on('data', c => data += c);
          r2.on('end', () => resolve(data));
        }).on('error', reject);
        return;
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCoords(str) {
  return str.trim().split(/\s+/).map(pt => {
    const [lng, lat] = pt.split(',').map(Number);
    return [lng, lat];
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

async function run() {
  const kml = await fetchKml(NEW_MID);
  const placemarks = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  
  console.log(`=== New C2 Map Placemarks (${placemarks.length} total) ===`);
  const lines = [];
  const points = [];

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
    const descMatch = pm.match(/<description>([\s\S]*?)<\/description>/);
    const desc = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
    const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    const coords = coordMatch ? parseCoords(coordMatch[1]) : [];

    if (pm.includes('<LineString>')) {
      const len = calcLengthKm(coords);
      lines.push({ idx: i, name, desc, coords, len });
      console.log(`Line #${lines.length}: "${name}" | ${coords.length} pts | ${len.toFixed(2)} km`);
      console.log(`   Start: [${coords[0][0].toFixed(6)}, ${coords[0][1].toFixed(6)}]`);
      console.log(`   End:   [${coords[coords.length-1][0].toFixed(6)}, ${coords[coords.length-1][1].toFixed(6)}]`);
    } else if (pm.includes('<Point>')) {
      points.push({ idx: i, name, desc, coord: coords[0] });
      console.log(`Point: "${name}" -> [${coords[0][0].toFixed(6)}, ${coords[0][1].toFixed(6)}]`);
    }
  }

  // Check how lines connect
  console.log('\n=== Line Connectivity ===');
  for (let i = 0; i < lines.length - 1; i++) {
    const endCurr = lines[i].coords[lines[i].coords.length - 1];
    const startNext = lines[i + 1].coords[0];
    const gap = distCoord(endCurr, startNext);
    console.log(`Line ${i + 1} ("${lines[i].name}") end -> Line ${i + 2} ("${lines[i + 1].name}") start: gap = ${gap.toFixed(1)}m`);
  }

  // Also check end of last line to start of first line
  const endLast = lines[lines.length - 1].coords[lines[lines.length - 1].coords.length - 1];
  const startFirst = lines[0].coords[0];
  const loopGap = distCoord(endLast, startFirst);
  console.log(`Line ${lines.length} end -> Line 1 start: gap = ${loopGap.toFixed(1)}m`);

  // Check existing C2 record in DB
  console.log('\n=== Existing DB C2 Record ===');
  const [dbRoutes] = await pool.query("SELECT * FROM routes WHERE code = 'C2' OR id LIKE '%c2%'");
  console.log(dbRoutes.map(r => ({ id: r.id, code: r.code, name: r.name, origin: r.origin, destination: r.destination })));

  const [dbGeom] = await pool.query("SELECT id, route_id, direction, ST_AsGeoJSON(geometry) as geo FROM route_geometry WHERE route_id = 'c2-patag-gaisano-limketkai-cogon'");
  for (const g of dbGeom) {
    const coords = JSON.parse(g.geo).coordinates;
    console.log(`DB Geometry [${g.direction}]: ${coords.length} pts, start=[${coords[0]}], end=[${coords[coords.length-1]}]`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
