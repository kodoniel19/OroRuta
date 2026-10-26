const https = require('https');

const MAPS = [
  { mid: '14XIiHN5Yge3Op6yRfY8fS4onQ1fUGpw', name: 'C2' },
  { mid: '1ZfAOkDpR1OVVBU8zp9EiQNVGLZup2BQ', name: 'LA' },
  { mid: '1jhRbShCWclO5eCExvzaVB5CUtsGjkvs', name: 'LB' },
  { mid: '1ycyKmc9oAVeCuIwMduyOid9mGTwGUHg', name: 'Bayabas' },
  { mid: '1BWMXAQmuc1Zcg9TeqiRjdPg7gPz70Wg', name: 'Bugo' },
  { mid: '1n_3ZExYSgHmpFYKIKuQLAK-Ril_fShU', name: 'Bulua (R3)' },
  { mid: '1h-iKtiI5doxfXnng42FUtUxOi00mtvU', name: 'Indahag' },
  { mid: '1T6Jg7nbbnNeCTG6g595jFq7UDO384no', name: 'Iponan' },
  { mid: '1P9XvheMsObLlAh9rFL96IAmJSPs5Hgk', name: 'Lumbia' },
  { mid: '1ARLVkDhyTXObhT3V9nidkBL7xdD7Wnc', name: 'Macasandig' },
  { mid: '1jGIxcVV3srk4kC1pi18CTOKqQUuNACA', name: 'Puerto' },
  { mid: '1RDNOfmbPlI9lPImz-sLKS70s79HSxSk', name: 'Uptown' },
  { mid: '1ojQekfQsB6BOnGdWuUfUT__jJYUzEjg', name: 'R1' },
  { mid: '1U4dw1Ug7ZuoCVirC46KCdtqJGvZ_cSM', name: 'R2' },
  { mid: '1BGud4fdlzvEn8EY0IG_6InM6QIhK4WM', name: 'RA' },
  { mid: '1Kuy7St1QrGwu2YrABNw4UFj8zPhWwg0', name: 'RBC' },
  { mid: '1zIcpiNUjxnJ-kJ_kt5VD9miIU2NI47Y', name: 'RD / RC' }
];

function fetchKml(mid) {
  return new Promise((resolve) => {
    https.get(`https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redir) => {
          let data = ''; redir.on('data', c => data += c); redir.on('end', () => resolve(data));
        });
        return;
      }
      let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(data));
    });
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
    const [lng2, lat2] = coords[i+1];
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    len += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  return len;
}

async function checkAll() {
  for (const m of MAPS) {
    const kml = await fetchKml(m.mid);
    console.log(`\n============================================================`);
    console.log(`Map: ${m.name} (${m.mid})`);
    
    // Find all Placemarks
    const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
    for (const pm of pms) {
      const nameMatch = pm.match(/<name>(.*?)<\/name>/);
      const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Unnamed';
      
      const hasMultiGeom = pm.includes('<MultiGeometry>');
      
      // Match all LineStrings within this Placemark
      const lineStrings = pm.match(/<LineString>[\s\S]*?<\/LineString>/g) || [];
      if (lineStrings.length > 0) {
        console.log(`Placemark [LineString${lineStrings.length > 1 ? 's: ' + lineStrings.length : ''}] "${name}" (MultiGeometry: ${hasMultiGeom})`);
        lineStrings.forEach((ls, i) => {
          const coordMatch = ls.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
          if (coordMatch) {
            const coords = parseCoords(coordMatch[1]);
            const lenKm = calcLengthKm(coords);
            console.log(`  LineString #${i+1}: ${coords.length} pts | ${lenKm.toFixed(2)} km | start: [${coords[0]}] -> end: [${coords[coords.length - 1]}]`);
          }
        });
      }
      
      const points = pm.match(/<Point>[\s\S]*?<\/Point>/g) || [];
      if (points.length > 0) {
        points.forEach((pt, i) => {
          const coordMatch = pt.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
          if (coordMatch) {
            const coords = parseCoords(coordMatch[1])[0];
            console.log(`  Point: "${name}" -> [${coords}]`);
          }
        });
      }
    }
  }
}

checkAll();
