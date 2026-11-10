const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function test() {
  // Test 1: User is at Liceo (8.4862, 124.6388) and searches to Liceo (8.48615, 124.63918)
  console.log('--- TEST 1: Same location (Liceo -> Liceo) ---');
  const res1 = await makeRequest('http://localhost:3000/api/v1/trips/search?from=My%20Location&fromLat=8.4862&fromLng=124.6388&to=Liceo%20de%20Cagayan%20University&toLat=8.48615&toLng=124.63918');
  console.log(`Status: ${res1.status}, Results count: ${Array.isArray(res1.body) ? res1.body.length : 'not array'}`);
  if (Array.isArray(res1.body) && res1.body.length === 0) {
    console.log('✅ PASS: Returned 0 recommendations when origin and destination are < 300m apart.');
  } else {
    console.log('❌ FAIL: Returned recommendations when already at destination:', res1.body);
  }

  // Test 2: Genuine commute (Liceo -> Limketkai)
  console.log('\n--- TEST 2: Genuine commute (Liceo -> Limketkai) ---');
  const res2 = await makeRequest('http://localhost:3000/api/v1/trips/search?from=Liceo&fromLat=8.4862&fromLng=124.6388&to=Limketkai&toLat=8.4838&toLng=124.6530');
  console.log(`Status: ${res2.status}, Results count: ${Array.isArray(res2.body) ? res2.body.length : 'not array'}`);
  if (Array.isArray(res2.body) && res2.body.length > 0) {
    console.log(`✅ PASS: Found ${res2.body.length} valid trip options for genuine commute.`);
    console.log(`   Top option: ${res2.body[0].title || res2.body[0].routeCode} (fare: ₱${res2.body[0].regularFare})`);
  } else {
    console.log('❌ FAIL: No trip options found for genuine commute:', res2.body);
  }
}

test().catch(console.error);

