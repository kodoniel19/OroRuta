/**
 * Comprehensive validation of the improved route recommendation system.
 * Tests multiple origin-destination pairs across the full route database.
 * Uses the trips.search function directly to bypass HTTP issues.
 */
const path = require('path');
const db = require(path.resolve(__dirname, '../src/config/db'));

// Import the internal functions by running the search logic directly
async function directSearch(from, to, fromLat, fromLng, toLat, toLng, sort = 'time') {
  // Simulate req.query
  const req = {
    query: { from, to, fromLat: String(fromLat), fromLng: String(fromLng), toLat: String(toLat), toLng: String(toLng), sort }
  };
  
  const { haversineMeters } = require(path.resolve(__dirname, '../src/utils'));
  const { calculateTraditionalFare, getDynamicFareConfig } = require(path.resolve(__dirname, '../src/services/fareService'));
  
  const trips = require(path.resolve(__dirname, '../src/controllers/trips'));
  
  return new Promise((resolve, reject) => {
    const fakeRes = {
      json: (data) => resolve(data),
      status: (code) => ({ json: (data) => reject(new Error(JSON.stringify(data))) })
    };
    trips.search(req, fakeRes, (err) => reject(err));
  });
}

async function testSearch(from, to, fromLat, fromLng, toLat, toLng) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`SEARCH: "${from}" → "${to}"`);
  console.log(`Origin: (${fromLat}, ${fromLng}) → Dest: (${toLat}, ${toLng})`);
  
  try {
    const results = await directSearch(from, to, fromLat, fromLng, toLat, toLng);
    
    if (!Array.isArray(results)) {
      console.log(`  ERROR: Unexpected response: ${JSON.stringify(results).substring(0, 200)}`);
      return { from, to, count: 0, error: true };
    }
    
    console.log(`Results: ${results.length}`);
    
    const summary = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const seg = r.segments?.[0];
      const code = seg?.code || '??';
      const dir = r.direction || '??';
      const matchType = r.destination_match_type || '??';
      const boardName = r.boarding_name || 'N/A';
      const dropName = r.dropoff_name || 'N/A';
      const walkBoard = r.walk_to_board_meters || 0;
      const walkDrop = r.walk_from_drop_meters || 0;
      const mins = r.minutes || 0;
      const fare = r.regularFare || 0;
      const transfers = r.transfers || 0;
      const isNearby = r.is_nearby_boarding ? ' ✓nearby' : '';
      
      // Validate ranking rules
      const issues = [];
      if (i === 0 && matchType !== 'Direct Route' && results.some(x => x.destination_match_type === 'Direct Route')) {
        issues.push('⚠ Non-direct route ranked #1 but direct routes exist');
      }
      if (transfers > 0 && results.some((x, j) => j > i && x.transfers === 0 && x.walk_from_drop_meters < walkDrop)) {
        issues.push('⚠ Transfer route ranked above better direct route');
      }
      
      const issueStr = issues.length ? ` [${issues.join('; ')}]` : '';
      console.log(`  #${i+1}: [${code}] ${dir} | ${matchType} | Board: ${boardName} (${walkBoard}m${isNearby}) | Drop: ${dropName} (${walkDrop}m) | ${mins}min ₱${fare.toFixed(2)} | Xfer:${transfers}${issueStr}`);
      summary.push({ code, dir, matchType, walkBoard, walkDrop, mins, fare, transfers, issues });
    }
    
    return { from, to, count: results.length, results: summary };
  } catch (e) {
    console.log(`  FAILED: ${e.message}`);
    return { from, to, count: 0, error: e.message };
  }
}

async function main() {
  console.log('=== OroRuta Route Recommendation Validation ===\n');
  
  const tests = [
    // Test 1: Agora to SM CDO Downtown (short ride, should find direct routes)
    { from: 'Agora Terminal', to: 'SM CDO Downtown', fLat: 8.4857, fLng: 124.6589, tLat: 8.4855, tLng: 124.6535 },
    
    // Test 2: Carmen Market to Cogon Market (classic cross-city)
    { from: 'Carmen Market', to: 'Cogon Market', fLat: 8.479498, fLng: 124.636820, tLat: 8.477160, tLng: 124.651208 },
    
    // Test 3: Patag to Limketkai (C2 should be top)
    { from: 'Patag Camp Evangelista', to: 'Limketkai Center', fLat: 8.487848, fLng: 124.625586, tLat: 8.4842, tLng: 124.6568 },
    
    // Test 4: Bulua to Carmen Market
    { from: 'Bulua Terminal', to: 'Carmen Market', fLat: 8.5040, fLng: 124.6115, tLat: 8.479498, tLng: 124.636820 },
    
    // Test 5: Cogon to Gaisano City Mall
    { from: 'Cogon Market', to: 'Gaisano City Mall', fLat: 8.477160, fLng: 124.651208, tLat: 8.4842, tLng: 124.6515 },
    
    // Test 6: Xavier University to SM CDO Downtown
    { from: 'Xavier University', to: 'SM CDO Downtown', fLat: 8.4784, fLng: 124.6489, tLat: 8.4855, tLng: 124.6535 },
    
    // Test 7: Centrio Mall to Carmen Market
    { from: 'Centrio Mall', to: 'Carmen Market', fLat: 8.4877, fLng: 124.6517, tLat: 8.479498, tLng: 124.636820 },
    
    // Test 8: Camp Evangelista to Cogon Market (C2 end-to-end)
    { from: 'Camp Evangelista', to: 'Cogon Market', fLat: 8.487848, fLng: 124.625586, tLat: 8.477160, tLng: 124.651208 },
    
    // Test 9: Liceo to Cogon
    { from: 'Liceo de Cagayan', to: 'Cogon Market', fLat: 8.4965, fLng: 124.6407, tLat: 8.477160, tLng: 124.651208 },
    
    // Test 10: CDO Port to Centrio (RA, RBC should serve)
    { from: 'CDO Port', to: 'Centrio Mall', fLat: 8.4813, fLng: 124.6585, tLat: 8.4877, tLng: 124.6517 },
  ];
  
  const allResults = [];
  for (const t of tests) {
    const r = await testSearch(t.from, t.to, t.fLat, t.fLng, t.tLat, t.tLng);
    allResults.push(r);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  let totalRoutes = 0;
  let testsWithResults = 0;
  let testsNoResults = 0;
  let totalIssues = 0;
  
  for (const r of allResults) {
    const status = r.count > 0 ? '✓' : '✗';
    const issueCount = r.results ? r.results.reduce((s, x) => s + (x.issues?.length || 0), 0) : 0;
    totalIssues += issueCount;
    const issueNote = issueCount > 0 ? ` ⚠ ${issueCount} issues` : '';
    console.log(`  ${status} ${r.from} → ${r.to}: ${r.count} results${issueNote}${r.error ? ` (ERROR: ${r.error})` : ''}`);
    totalRoutes += r.count;
    if (r.count > 0) testsWithResults++;
    else testsNoResults++;
  }
  
  console.log(`\nTotal: ${allResults.length} tests, ${testsWithResults} with results, ${testsNoResults} empty, ${totalRoutes} route options, ${totalIssues} ranking issues`);
  
  await db.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
