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

(async () => {
  const kml = await fetchKml('1Oz799snyviXfzJbbwbqTr9k_WAYUlTc');
  const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  
  // Placemark descriptions / details
  pms.forEach((p, idx) => {
    const name = (p.match(/<name>(.*?)<\/name>/) || [])[1];
    const desc = (p.match(/<description>([\s\S]*?)<\/description>/) || [])[1];
    console.log(`\n--- Placemark [${idx}]: ${name} ---`);
    if (desc) console.log('Description:', desc.substring(0, 300));
  });
})();
