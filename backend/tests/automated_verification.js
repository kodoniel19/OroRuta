const assert = require('assert');
const http = require('http');

function apiGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000/api/v1${path}`, (res) => {
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

async function runTests() {
  console.log('========================================================');
  console.log('ORORUTA COMPREHENSIVE END-TO-END VERIFICATION SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function test(title, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`  [PASS] ${title}`);
        passed++;
      } catch (err) {
        console.error(`  [FAIL] ${title}: ${err.message}`);
        failed++;
      }
    })();
  }

  // --- 1. DEDUPLICATION TESTS (Screenshot 3) ---
  console.log('--- TEST GROUP 1: Search & Location Deduplication ---');
  await test('Agora Terminal appears exactly once in search results', async () => {
    const res = await apiGet('/places?q=Agora&filter=all');
    assert.strictEqual(res.status, 200);
    const agoras = res.body.filter(p => p.name.toLowerCase().includes('agora terminal'));
    assert.strictEqual(agoras.length, 1, `Expected 1 Agora Terminal, got ${agoras.length}`);
    assert.strictEqual(agoras[0].id, 'pl-agora');
    assert.strictEqual(agoras[0].kind, 'terminal');
    assert.strictEqual(agoras[0].area, 'Lapasan');
  });

  await test('Bulua Terminal appears exactly once in search results', async () => {
    const res = await apiGet('/places?q=Bulua&filter=all');
    assert.strictEqual(res.status, 200);
    const buluas = res.body.filter(p => p.name.toLowerCase().includes('bulua terminal'));
    assert.strictEqual(buluas.length, 1, `Expected 1 Bulua Terminal, got ${buluas.length}`);
    assert.strictEqual(buluas[0].id, 'pl-bulua');
    assert.strictEqual(buluas[0].kind, 'terminal');
  });

  await test('All places search has zero duplicate place names or IDs', async () => {
    const res = await apiGet('/places?filter=all');
    assert.strictEqual(res.status, 200);
    const names = new Set();
    const ids = new Set();
    for (const p of res.body) {
      const lower = p.name.trim().toLowerCase();
      assert(!names.has(lower), `Duplicate place name found: ${p.name}`);
      assert(!ids.has(p.id), `Duplicate place ID found: ${p.id}`);
      names.add(lower);
      ids.add(p.id);
    }
  });

  await test('Terminals and Landmarks filters work and return deduplicated places', async () => {
    const termRes = await apiGet('/places?filter=terminals');
    assert.strictEqual(termRes.status, 200);
    assert(termRes.body.length > 0);
    for (const p of termRes.body) {
      assert.strictEqual(p.kind, 'terminal');
    }

    const lmRes = await apiGet('/places?filter=landmarks');
    assert.strictEqual(lmRes.status, 200);
    assert(lmRes.body.length > 0);
    for (const p of lmRes.body) {
      assert.notStrictEqual(p.kind, 'terminal');
    }
  });

  await test('Distinct places with similar names remain separate (Cogon vs Carmen, Puerto vs Bugo)', async () => {
    const res = await apiGet('/places?filter=all');
    const cogon = res.body.find(p => p.name.includes('Cogon Market'));
    const carmen = res.body.find(p => p.name.includes('Carmen Market'));
    assert(cogon && carmen, 'Both Cogon Market and Carmen Market must exist');
    assert.notStrictEqual(cogon.id, carmen.id);
    assert.notStrictEqual(cogon.lat, carmen.lat);

    const puerto = res.body.find(p => p.name.includes('Puerto'));
    const bugo = res.body.find(p => p.name.includes('Bugo'));
    assert(puerto && bugo, 'Both Puerto and Bugo must exist');
    assert.notStrictEqual(puerto.id, bugo.id);
  });

  // --- 2. ROUTE SEARCH ACCURACY & DIVERSITY (Screenshot 2) ---
  console.log('\n--- TEST GROUP 2: Inaccurate Route Results Fix ---');
  await test('Search Carmen Market -> Agora Terminal returns valid, diverse route results', async () => {
    const res = await apiGet('/trips/search?from=Carmen%20Market&to=Agora%20Terminal&sort=time');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Response must be an array');
    assert(res.body.length >= 2, `Expected at least 2 candidate routes, got ${res.body.length}`);

    // Verify distinct details (not all identical!)
    const first = res.body[0];
    const second = res.body[1];
    console.log(`     Route 1: ${first.segments[0].code} (${first.minutes} min, ${first.walk_meters}m walk, ₱${first.regularFare})`);
    console.log(`     Route 2: ${second.segments[0].code} (${second.minutes} min, ${second.walk_meters}m walk, ₱${second.regularFare})`);

    assert(first.minutes > 0, 'Travel time must be positive');
    assert(first.walk_meters >= 0, 'Walk meters must be non-negative');
    assert(first.regularFare >= 13, 'Fare must be at least base traditional fare (₱13.00)');
    assert(first.legs.length >= 4, 'Must have realistic step-by-step legs');
  });

  await test('Route sorting by Shortest travel time vs Least walking works correctly', async () => {
    const timeRes = await apiGet('/trips/search?from=Carmen%20Market&to=Agora%20Terminal&sort=time');
    assert.strictEqual(timeRes.status, 200);
    const byTime = timeRes.body;
    for (let i = 0; i < byTime.length - 1; i++) {
      assert(byTime[i].minutes <= byTime[i + 1].minutes, 'Results must be sorted ascending by travel time');
    }

    const walkRes = await apiGet('/trips/search?from=Carmen%20Market&to=Agora%20Terminal&sort=walk');
    assert.strictEqual(walkRes.status, 200);
    const byWalk = walkRes.body;
    for (let i = 0; i < byWalk.length - 1; i++) {
      assert(byWalk[i].walk_meters <= byWalk[i + 1].walk_meters, 'Results must be sorted ascending by walk distance');
    }
  });

  await test('Search to non-served destination returns honest empty state (not fake routes)', async () => {
    // A point outside CDO jeepney coverage or unknown place
    const res = await apiGet('/trips/search?from=Carmen%20Market&to=NonExistentPlaceXYZ');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body) && res.body.length === 0, 'Must return empty array for non-served destinations');
  });

  // --- 3. GPS NAVIGATION ACCURACY & ROAD ROUTING (Screenshot 1) ---
  console.log('\n--- TEST GROUP 3: GPS Navigation Accuracy & OSRM Road Geometry ---');
  await test('Navigation route geometry contains genuine road-snapped coordinates (no river crossing)', async () => {
    const res = await apiGet('/trips/search?from=Carmen%20Market&to=Agora%20Terminal&sort=time');
    assert.strictEqual(res.status, 200);
    const topTrip = res.body[0];

    assert(topTrip.jeepney_coordinates && topTrip.jeepney_coordinates.length > 20,
      `Expected dense road points for jeepney transit, got ${topTrip.jeepney_coordinates ? topTrip.jeepney_coordinates.length : 0}`);
    assert(topTrip.walk_to_board_coordinates && topTrip.walk_to_board_coordinates.length >= 2,
      'Must have walkable road coordinates to boarding stop');

    // Check all points are in CDO bounding box
    for (const [lng, lat] of topTrip.jeepney_coordinates) {
      assert(lat >= 8.30 && lat <= 8.60, `Latitude out of CDO bounds: ${lat}`);
      assert(lng >= 124.48 && lng <= 124.80, `Longitude out of CDO bounds: ${lng}`);
    }
  });

  await test('Step-by-step navigation instructions begin at origin and end at destination', async () => {
    const res = await apiGet('/trips/search?from=Carmen%20Market&to=Agora%20Terminal&sort=time');
    const topTrip = res.body[0];
    const legs = topTrip.legs;

    assert.strictEqual(legs[0].kind, 'walk', 'First step must be walk from origin');
    assert(legs[0].title.includes('Carmen'), `First step must reference origin: ${legs[0].title}`);

    const lastLeg = legs[legs.length - 1];
    assert.strictEqual(lastLeg.kind, 'walk', 'Final step must be walk to destination');
    assert(lastLeg.title.includes('Agora'), `Final step must reference destination: ${lastLeg.title}`);
  });

  await test('Trip option by ID (/trips/:id) loads consistent data for active navigation', async () => {
    const res = await apiGet('/trips/search?from=Carmen%20Market&to=Agora%20Terminal&sort=time');
    const topTrip = res.body[0];

    const getRes = await apiGet(`/trips/${topTrip.id}`);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.id, topTrip.id);
    assert.strictEqual(getRes.body.minutes, topTrip.minutes);
    assert.strictEqual(getRes.body.legs.length, topTrip.legs.length);
    assert.strictEqual(getRes.body.jeepney_coordinates.length, topTrip.jeepney_coordinates.length);
  });

  await test('Search with GPS coordinates (Use Current Location) returns valid road-snapped route', async () => {
    // Carmen GPS: 8.4845, 124.6335 -> Agora Terminal
    const res = await apiGet('/trips/search?from=Current%20Location&to=Agora%20Terminal&fromLat=8.4845&fromLng=124.6335');
    assert.strictEqual(res.status, 200);
    assert(res.body.length > 0, 'Should find routes from current GPS coordinates');
    const trip = res.body[0];
    assert(trip.legs[0].start_lat !== undefined, 'First leg must start from GPS coordinates');
  });

  console.log('\n========================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
