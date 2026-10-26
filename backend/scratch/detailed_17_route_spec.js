const https = require('https');
const pool = require('../src/config/db');

const ROUTES = [
  { mid: '1hrIfl6wuWD2_JkawDAIYRcDlyarNsaQ', id: 'c2-patag-gaisano-limketkai-cogon', code: 'C2', name: 'C2 - Patag- Gaisano - Limketkai - Cogon' },
  { mid: '1ZfAOkDpR1OVVBU8zp9EiQNVGLZup2BQ', id: 'la-lapasan-cogon-agora-divisoria', code: 'LA', name: 'LA — Lapasan–Cogon–Agora–Divisoria Loop' },
  { mid: '1jhRbShCWclO5eCExvzaVB5CUtsGjkvs', id: 'lb-lapasan-agora-loop', code: 'LB', name: 'LB — Lapasan–Agora Loop' },
  { mid: '1ycyKmc9oAVeCuIwMduyOid9mGTwGUHg', id: 'bayabas-carmen-loop-line', code: 'R-BAY-CAR', name: 'Bayabas–Carmen Loop Line' },
  { mid: '1BWMXAQmuc1Zcg9TeqiRjdPg7gPz70Wg', id: 'bugo-cogon-line', code: 'R-BUG-COG', name: 'Bugo–Cogon Line' },
  { mid: '1n_3ZExYSgHmpFYKIKuQLAK-Ril_fShU', id: 'bulua-cogon-line-highway', code: 'R-BUL-COG', name: 'Bulua (R3) – Carmen Public Market' },
  { mid: '1h-iKtiI5doxfXnng42FUtUxOi00mtvU', id: 'indahag-r1-cogon-line', code: 'R-IND-COG', name: 'Indahag (R1)–Cogon Line' },
  { mid: '1T6Jg7nbbnNeCTG6g595jFq7UDO384no', id: 'iponan-bulua-cogon-line', code: 'R-IPO-BUL-COG', name: 'Iponan–Bulua–Cogon Line' },
  { mid: '1P9XvheMsObLlAh9rFL96IAmJSPs5Hgk', id: 'lumbia-carmen-line', code: 'R-LUM-CAR', name: 'Lumbia–Carmen Line' },
  { mid: '1ARLVkDhyTXObhT3V9nidkBL7xdD7Wnc', id: 'macasandig-cogon-line', code: 'R-MAC-COG', name: 'Macasandig–Cogon Line' },
  { mid: '1jGIxcVV3srk4kC1pi18CTOKqQUuNACA', id: 'puerto-cogon-divisoria-line', code: 'R-PUE-COG', name: 'Puerto (R1) Puerto Public Market – Agora Terminal' },
  { mid: '1RDNOfmbPlI9lPImz-sLKS70s79HSxSk', id: 'uptown-gran-europa-sm-cogon', code: 'R-UPT-COG', name: 'Uptown — Gran Europa/SM Uptown–Cogon Line' },
  { mid: '1ojQekfQsB6BOnGdWuUfUT__jJYUzEjg', id: 'r1-gaisano-carmen-loop', code: 'R1', name: 'R1 — Gaisano–Carmen Loop Line' },
  { mid: '1U4dw1Ug7ZuoCVirC46KCdtqJGvZ_cSM', id: 'r2-gaisano-agora-cogon-carmen', code: 'R2', name: 'R2 — Gaisano–Agora–Cogon–Carmen Loop Line' },
  { mid: '1BGud4fdlzvEn8EY0IG_6InM6QIhK4WM', id: 'ra-pier-cogon-line', code: 'RA', name: 'RA — Pier–Cogon Line' },
  { mid: '1Kuy7St1QrGwu2YrABNw4UFj8zPhWwg0', id: 'rbc-pier-macabalan-agora-limketkai', code: 'RBC', name: 'RBC — Pier–Macabalan–Agora–Limketkai–Cogon–Velez Line' },
  { mid: '1zIcpiNUjxnJ-kJ_kt5VD9miIU2NI47Y', id: 'rd-gusa-cugman-limketkai-cogon', code: 'RC', name: 'RC - Cugman – Gusa – Cogon' }
];

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
    return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
  });
}

async function run() {
  const specs = [];

  for (const r of ROUTES) {
    const kml = await fetchKml(r.mid);
    const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];

    const lines = [];
    const points = [];

    for (const pm of pms) {
      const name = (pm.match(/<name>(.*?)<\/name>/) || ['',''])[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      const desc = (pm.match(/<description>([\s\S]*?)<\/description>/) || ['',''])[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
      if (pm.includes('<LineString>')) {
        const cMatches = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/g) || [];
        for (const cm of cMatches) {
          const raw = cm.replace(/<\/?coordinates>/g, '');
          const coords = parseCoords(raw);
          lines.push({ name, desc, coords });
        }
      } else if (pm.includes('<Point>')) {
        const cm = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        if (cm) {
          const coord = parseCoords(cm[1])[0];
          points.push({ name, desc, coord });
        }
      }
    }

    const [geoms] = await pool.query('SELECT direction, geometry FROM route_geometry WHERE route_id = ?', [r.id]);
    const inGeom = geoms.find(g => g.direction === 'Inbound');
    const outGeom = geoms.find(g => g.direction === 'Outbound');
    const inCoords = inGeom ? (typeof inGeom.geometry === 'string' ? JSON.parse(inGeom.geometry) : inGeom.geometry).coordinates : [];
    const outCoords = outGeom ? (typeof outGeom.geometry === 'string' ? JSON.parse(outGeom.geometry) : outGeom.geometry).coordinates : [];

    const [dbRoutes] = await pool.query('SELECT * FROM routes WHERE id = ?', [r.id]);
    const dbr = dbRoutes[0];

    specs.push({
      id: r.id,
      code: r.code,
      name: r.name,
      mid: r.mid,
      dbOrigin: dbr.origin,
      dbDest: dbr.destination,
      inStart: inCoords[0],
      inEnd: inCoords[inCoords.length - 1],
      outStart: outCoords[0],
      outEnd: outCoords[outCoords.length - 1],
      inPts: inCoords.length,
      outPts: outCoords.length,
      kmlPoints: points,
      kmlLines: lines.map(l => ({ name: l.name, pts: l.coords.length, start: l.coords[0], end: l.coords[l.coords.length - 1] }))
    });
  }

  console.log(JSON.stringify(specs, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
