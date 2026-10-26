const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchKml(mid) {
  return new Promise((resolve, reject) => {
    const url = `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`;
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redirectRes) => {
          let data = '';
          redirectRes.on('data', chunk => data += chunk);
          redirectRes.on('end', () => resolve(data));
        }).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for mid ${mid}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCoordinates(coordString) {
  return coordString
    .trim()
    .split(/\s+/)
    .map(p => {
      const parts = p.split(',').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        // [lng, lat]
        return [Number(parts[0].toFixed(6)), Number(parts[1].toFixed(6))];
      }
      return null;
    })
    .filter(Boolean);
}

function parseKml(kmlText) {
  const placemarks = [];
  const pmMatches = kmlText.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];

  for (const pm of pmMatches) {
    const nameMatch = pm.match(/<name>(.*?)<\/name>/);
    const descMatch = pm.match(/<description>([\s\S]*?)<\/description>/);
    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
    const desc = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

    const lineMatch = pm.match(/<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/);
    const pointMatch = pm.match(/<Point>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Point>/);

    if (lineMatch) {
      const coords = parseCoordinates(lineMatch[1]);
      placemarks.push({ type: 'LineString', name, desc, coordinates: coords });
    } else if (pointMatch) {
      const coords = parseCoordinates(pointMatch[1]);
      if (coords.length > 0) {
        placemarks.push({ type: 'Point', name, desc, coordinate: coords[0] });
      }
    }
  }

  return placemarks;
}

async function testFetch() {
  const sampleMids = [
    { mid: '1TtpHJrwjsjJWTLMztryGFYHPDvKpWQ8', label: 'Baikingon' },
    { mid: '1-4Or6Z-3qcUHDdG9_sOBZjAxat9UOBA', label: 'Balulang (R1)' },
    { mid: '1G25RJ_E9jh5q-yw1QjE7Qbo0tFexkk0', label: 'Carmen (R1)' },
    { mid: '1ki552DiWKfQkEhUawfh7Gqvdp-dm6ng', label: 'Iponan (R4)' },
    { mid: '1yK65VDqFOCAfP81iKI14lZKt0ZGSCWA', label: 'Taglimao' }
  ];

  for (const s of sampleMids) {
    console.log(`Fetching ${s.label} (${s.mid})...`);
    const kml = await fetchKml(s.mid);
    const parsed = parseKml(kml);
    const lines = parsed.filter(p => p.type === 'LineString');
    const points = parsed.filter(p => p.type === 'Point');
    console.log(`  -> Found ${lines.length} lines, ${points.length} landmark points`);
    lines.forEach((l, i) => {
      console.log(`     Line ${i + 1}: "${l.name}" with ${l.coordinates.length} coordinates`);
    });
    if (points.length > 0) {
      console.log(`     Sample Point: "${points[0].name}" at [${points[0].coordinate}]`);
    }
  }
}

testFetch().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
