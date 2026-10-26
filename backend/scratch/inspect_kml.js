const https = require('https');

function fetchKml(mid) {
  return new Promise((resolve, reject) => {
    function get(url) {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error('Status ' + res.statusCode));
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    }
    get(`https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`);
  });
}

(async () => {
  try {
    const kml = await fetchKml('1Oz799snyviXfzJbbwbqTr9k_WAYUlTc');
    console.log('KML length:', kml.length);
    const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
    console.log('Placemark count:', pms.length);
    pms.forEach((p, idx) => {
      const name = (p.match(/<name>(.*?)<\/name>/) || [])[1];
      const hasLine = p.includes('<LineString>');
      const hasPoint = p.includes('<Point>');
      let coordsCount = 0;
      const coordsMatch = p.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
      if (coordsMatch) {
        coordsCount = coordsMatch[1].trim().split(/\s+/).filter(Boolean).length;
      }
      console.log(`[${idx}] ${name} | ${hasLine ? 'LineString (' + coordsCount + ' pts)' : ''} ${hasPoint ? 'Point' : ''}`);
    });
  } catch (e) {
    console.error(e);
  }
})();
