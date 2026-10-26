const https = require('https');

function fetchKml(mid) {
  return new Promise((resolve, reject) => {
    function get(url) {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    }
    get(`https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`);
  });
}

function parseCoords(str) {
  return str.trim().split(/\s+/).filter(Boolean).map(c => {
    const parts = c.split(',').map(Number);
    return { lng: parts[0], lat: parts[1] };
  });
}

function calcDist(pts) {
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i], p2 = pts[i+1];
    const r = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng/2)**2;
    total += r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  return total;
}

(async () => {
  const kml = await fetchKml('1Oz799snyviXfzJbbwbqTr9k_WAYUlTc');
  const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  
  const inbPlacemark = pms[0];
  const outPlacemark = pms[3];

  const inbCoords = parseCoords(inbPlacemark.match(/<coordinates>([\s\S]*?)<\/coordinates>/)[1]);
  const outCoords = parseCoords(outPlacemark.match(/<coordinates>([\s\S]*?)<\/coordinates>/)[1]);

  console.log('Inbound: count =', inbCoords.length, 'dist =', calcDist(inbCoords).toFixed(2), 'km');
  console.log('Inbound start:', inbCoords[0], 'end:', inbCoords[inbCoords.length - 1]);
  
  console.log('\nOutbound: count =', outCoords.length, 'dist =', calcDist(outCoords).toFixed(2), 'km');
  console.log('Outbound start:', outCoords[0], 'end:', outCoords[outCoords.length - 1]);

  // Check where the difference is!
  console.log('\nOutbound sample coordinates along the way:');
  for (let i = 0; i < outCoords.length; i += Math.floor(outCoords.length / 8)) {
    console.log(`  [${i}]: lat=${outCoords[i].lat.toFixed(5)}, lng=${outCoords[i].lng.toFixed(5)}`);
  }

  console.log('\nInbound sample coordinates along the way:');
  for (let i = 0; i < inbCoords.length; i += Math.floor(inbCoords.length / 8)) {
    console.log(`  [${i}]: lat=${inbCoords[i].lat.toFixed(5)}, lng=${inbCoords[i].lng.toFixed(5)}`);
  }
})();
