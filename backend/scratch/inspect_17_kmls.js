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
          let data = '';
          redir.on('data', c => data += c);
          redir.on('end', () => resolve(data));
        });
        return;
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
  });
}

async function inspectPlacemarks() {
  for (const m of MAPS) {
    const kml = await fetchKml(m.mid);
    const docNameMatch = kml.match(/<Document>[\s\S]*?<name>(.*?)<\/name>/);
    const docName = docNameMatch ? docNameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : 'Unknown';
    
    console.log('\n============================================================');
    console.log(`Map: ${m.name} [${m.mid}] -> Doc: ${docName}`);
    
    const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
    for (const pm of pms) {
      const nameMatch = pm.match(/<name>(.*?)<\/name>/);
      const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
      const isLine = pm.includes('<LineString>');
      const isPoint = pm.includes('<Point>');
      if (isLine) {
        const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        const count = coordMatch ? coordMatch[1].trim().split(/\s+/).length : 0;
        console.log(`  [LineString] "${name}" (${count} coords)`);
      } else if (isPoint) {
        const coordMatch = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
        console.log(`  [Point] "${name}" -> ${coordMatch ? coordMatch[1].trim() : ''}`);
      }
    }
  }
}

inspectPlacemarks();
