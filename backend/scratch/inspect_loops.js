const https = require('https');

const MAPS = [
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
    return [p[0], p[1]];
  });
}

function dist(p1, p2) {
  const dx = (p1[0] - p2[0]) * 111320 * Math.cos(p1[1] * Math.PI / 180);
  const dy = (p1[1] - p2[1]) * 110540;
  return Math.sqrt(dx*dx + dy*dy);
}

async function run() {
  for (const m of MAPS) {
    const kml = await fetchKml(m.mid);
    console.log(`\n--- ${m.name} ---`);
    const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
    for (const pm of pms) {
      if (pm.includes('<LineString>')) {
        const nameMatch = pm.match(/<name>(.*?)<\/name>/);
        const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
        const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        const coords = parseCoords(coordMatch[1]);
        const start = coords[0];
        const end = coords[coords.length - 1];
        const d = dist(start, end);
        console.log(`LineString: "${name}" | count: ${coords.length} | start: [${start}] | end: [${end}] | dist: ${d.toFixed(1)}m`);
      }
    }
  }
}
run();
