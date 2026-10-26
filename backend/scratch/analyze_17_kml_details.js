const https = require('https');

const MAPS = [
  { mid: '14XIiHN5Yge3Op6yRfY8fS4onQ1fUGpw', id: 'c2-patag-gaisano-limketkai-cogon', reqName: 'C2 - Patag- Gaisano - Limketkai - Cogon', reqCode: 'C2' },
  { mid: '1ZfAOkDpR1OVVBU8zp9EiQNVGLZup2BQ', id: 'la-lapasan-cogon-agora-divisoria', reqName: 'LA — Lapasan–Cogon–Agora–Divisoria Loop', reqCode: 'LA' },
  { mid: '1jhRbShCWclO5eCExvzaVB5CUtsGjkvs', id: 'lb-lapasan-agora-loop', reqName: 'LB — Lapasan–Agora Loop', reqCode: 'LB' },
  { mid: '1ycyKmc9oAVeCuIwMduyOid9mGTwGUHg', id: 'bayabas-carmen-loop-line', reqName: 'Bayabas–Carmen Loop Line', reqCode: 'R-BAY-CAR' },
  { mid: '1BWMXAQmuc1Zcg9TeqiRjdPg7gPz70Wg', id: 'bugo-cogon-line', reqName: 'Bugo–Cogon Line', reqCode: 'R-BUG-COG' },
  { mid: '1n_3ZExYSgHmpFYKIKuQLAK-Ril_fShU', id: 'bulua-cogon-line-highway', reqName: 'Bulua (R3) – Carmen Public Market', reqCode: 'R-BUL-COG' },
  { mid: '1h-iKtiI5doxfXnng42FUtUxOi00mtvU', id: 'indahag-r1-cogon-line', reqName: 'Indahag (R1)–Cogon Line', reqCode: 'R-IND-COG' },
  { mid: '1T6Jg7nbbnNeCTG6g595jFq7UDO384no', id: 'iponan-bulua-cogon-line', reqName: 'Iponan–Bulua–Cogon Line', reqCode: 'R-IPO-BUL-COG' },
  { mid: '1P9XvheMsObLlAh9rFL96IAmJSPs5Hgk', id: 'lumbia-carmen-line', reqName: 'Lumbia–Carmen Line', reqCode: 'R-LUM-CAR' },
  { mid: '1ARLVkDhyTXObhT3V9nidkBL7xdD7Wnc', id: 'macasandig-cogon-line', reqName: 'Macasandig–Cogon Line', reqCode: 'R-MAC-COG' },
  { mid: '1jGIxcVV3srk4kC1pi18CTOKqQUuNACA', id: 'puerto-cogon-divisoria-line', reqName: 'Puerto (R1) Puerto Public Market – Agora Terminal', reqCode: 'R-PUE-COG' },
  { mid: '1RDNOfmbPlI9lPImz-sLKS70s79HSxSk', id: 'uptown-gran-europa-sm-cogon', reqName: 'Uptown — Gran Europa/SM Uptown–Cogon Line', reqCode: 'R-UPT-COG' },
  { mid: '1ojQekfQsB6BOnGdWuUfUT__jJYUzEjg', id: 'r1-gaisano-carmen-loop', reqName: 'R1 — Gaisano–Carmen Loop Line', reqCode: 'R1' },
  { mid: '1U4dw1Ug7ZuoCVirC46KCdtqJGvZ_cSM', id: 'r2-gaisano-agora-cogon-carmen', reqName: 'R2 — Gaisano–Agora–Cogon–Carmen Loop Line', reqCode: 'R2' },
  { mid: '1BGud4fdlzvEn8EY0IG_6InM6QIhK4WM', id: 'ra-pier-cogon-line', reqName: 'RA — Pier–Cogon Line', reqCode: 'RA' },
  { mid: '1Kuy7St1QrGwu2YrABNw4UFj8zPhWwg0', id: 'rbc-pier-macabalan-agora-limketkai', reqName: 'RBC — Pier–Macabalan–Agora–Limketkai–Cogon–Velez Line', reqCode: 'RBC' },
  { mid: '1zIcpiNUjxnJ-kJ_kt5VD9miIU2NI47Y', id: 'rd-gusa-cugman-limketkai-cogon', reqName: 'RC - Cugman – Gusa – Cogon', reqCode: 'RC' }
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

async function analyze() {
  for (let idx = 0; idx < MAPS.length; idx++) {
    const m = MAPS[idx];
    const kml = await fetchKml(m.mid);
    const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
    
    console.log(`\n============================================================`);
    console.log(`[${idx+1}/17] ${m.reqName} (${m.id})`);
    
    const lines = [];
    const points = [];
    
    for (const pm of pms) {
      const nameMatch = pm.match(/<name>(.*?)<\/name>/);
      const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
      if (pm.includes('<LineString>')) {
        const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        const coords = parseCoords(coordMatch[1]);
        const lenKm = calcLengthKm(coords);
        lines.push({ name, coords, lenKm, start: coords[0], end: coords[coords.length - 1] });
      } else if (pm.includes('<Point>')) {
        const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        const coords = parseCoords(coordMatch[1])[0];
        points.push({ name, coords });
      }
    }
    
    console.log(`Lines (${lines.length}):`);
    lines.forEach((l, i) => {
      console.log(`  Line ${i+1}: "${l.name}" | ${l.coords.length} pts | ${l.lenKm.toFixed(2)} km | start: [${l.start}] -> end: [${l.end}]`);
    });
    console.log(`Points (${points.length}):`);
    points.forEach((p, i) => {
      console.log(`  Point ${i+1}: "${p.name}" -> [${p.coords}]`);
    });
  }
}

analyze();
