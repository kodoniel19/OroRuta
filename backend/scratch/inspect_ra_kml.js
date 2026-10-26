const https = require('https');

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

async function run() {
  const raKml = await fetchKml('1BGud4fdlzvEn8EY0IG_6InM6QIhK4WM');
  console.log('=== RA KML Placemarks ===');
  const pms = raKml.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  pms.forEach(p => console.log(p.replace(/<coordinates>[\s\S]*?<\/coordinates>/g, '<coordinates>...</coordinates>')));
}
run();
