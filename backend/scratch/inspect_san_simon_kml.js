const https = require('https');

function fetchKml(mid) {
  return new Promise((resolve, reject) => {
    function get(url) {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return get(res.headers.location);
        if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    }
    get(`https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`);
  });
}

(async () => {
  const kml = await fetchKml('1OsV6p0J7H57xU9I9rCEb6hlwlj6f574');
  const pms = kml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  console.log('Placemarks:', pms.length);
  pms.forEach((p, idx) => {
    const name = (p.match(/<name>(.*?)<\/name>/) || [])[1];
    const ls = p.includes('<LineString>');
    const pt = p.includes('<Point>');
    let c = '';
    const cm = p.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
    if (cm) {
      const pts = cm[1].trim().split(/\s+/);
      c = `${pts.length} coords; start: ${pts[0]}, end: ${pts[pts.length-1]}`;
    }
    console.log(`[${idx}] ${name} ${ls ? '(LineString: ' + c + ')' : ''} ${pt ? '(Point: ' + c + ')' : ''}`);
  });
})();
