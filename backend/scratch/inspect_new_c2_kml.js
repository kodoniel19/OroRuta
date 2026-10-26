const https = require('https');

const NEW_MID = '1hrIfl6wuWD2_JkawDAIYRcDlyarNsaQ';

function fetchKml(mid) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redir) => {
          let data = ''; redir.on('data', c => data += c); redir.on('end', () => resolve(data));
          redir.on('error', reject);
        });
        return;
      }
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCoords(str) {
  return str.trim().split(/\s+/).map(s => {
    const p = s.split(',').map(Number);
    return [p[0], p[1]]; // [lng, lat]
  });
}

function calcLengthKm(coords) {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    len += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return len;
}

function distCoord(p1, p2) {
  const dx = (p1[0] - p2[0]) * 111320 * Math.cos(p1[1] * Math.PI / 180);
  const dy = (p1[1] - p2[1]) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
}

async function inspect() {
  console.log(`Fetching KML from mid=${NEW_MID}...`);
  const kml = await fetchKml(NEW_MID);
  console.log(`KML size: ${kml.length} bytes\n`);

  // Document name
  const docNameMatch = kml.match(/<Document>[\s\S]*?<name>(.*?)<\/name>/);
  const docName = docNameMatch ? docNameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : 'Unknown';
  console.log(`Document name: ${docName}\n`);

  // Parse all Placemarks
  const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  console.log(`Total Placemarks: ${pms.length}\n`);

  for (const pm of pms) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Unnamed';
    const hasMultiGeom = pm.includes('<MultiGeometry>');

    // All LineStrings within this Placemark
    const lineStrings = pm.match(/<LineString>[\s\S]*?<\/LineString>/g) || [];
    if (lineStrings.length > 0) {
      console.log(`Placemark [LineString${lineStrings.length > 1 ? 's: ' + lineStrings.length : ''}] "${name}" (MultiGeometry: ${hasMultiGeom})`);
      lineStrings.forEach((ls, i) => {
        const coordMatch = ls.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        if (coordMatch) {
          const coords = parseCoords(coordMatch[1]);
          const lenKm = calcLengthKm(coords);
          const startEnd = distCoord(coords[0], coords[coords.length - 1]);
          console.log(`  LS #${i + 1}: ${coords.length} pts | ${lenKm.toFixed(2)} km | start: [${coords[0]}] -> end: [${coords[coords.length - 1]}] | start-end dist: ${startEnd.toFixed(0)}m`);
        }
      });
    }

    // Points
    if (pm.includes('<Point>')) {
      const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordMatch) {
        const coords = parseCoords(coordMatch[1])[0];
        console.log(`Point: "${name}" -> [${coords}]`);
      }
    }
  }
}

inspect();
