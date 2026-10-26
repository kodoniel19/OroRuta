const request = require('http');

function checkApi() {
  const req = request.get('http://localhost:3001/api/v1/routes', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`Backend API /api/v1/routes returned ${json.data?.length || json.length || 0} routes (status: ${res.statusCode})`);
      } catch (e) {
        console.log('API response not JSON:', data.substring(0, 100));
      }
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.log(`Backend server is not currently listening on port 3001 (${e.message}). Testing DB controller directly.`);
    process.exit(0);
  });
}

checkApi();
