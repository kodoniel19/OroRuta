const tripsController = require('../src/controllers/trips');

const testCases = [
  {
    name: 'Agora to SM CDO Downtown Premier',
    query: {
      from: 'Agora Terminal',
      to: 'SM CDO Downtown Premier',
      fromLat: 8.48813,
      fromLng: 124.65800,
      toLat: 8.4855,
      toLng: 124.6535
    }
  },
  {
    name: 'Carmen Market to Cogon Market',
    query: {
      from: 'Carmen Public Market',
      to: 'Cogon Market',
      fromLat: 8.4795,
      fromLng: 124.6368,
      toLat: 8.4770,
      toLng: 124.6513
    }
  },
  {
    name: 'Bulua Westbound to Carmen Market',
    query: {
      from: 'Westbound Terminal Bulua',
      to: 'Carmen Public Market',
      fromLat: 8.5122,
      fromLng: 124.6242,
      toLat: 8.4793,
      toLng: 124.6366
    }
  },
  {
    name: 'Patag Camp Evangelista to Limketkai Center',
    query: {
      from: 'Patag Camp Evangelista',
      to: 'Limketkai Center',
      fromLat: 8.4877,
      fromLng: 124.6258,
      toLat: 8.4842,
      toLng: 124.6568
    }
  }
];

async function run() {
  console.log('=== TESTING CURRENT TRIP RECOMMENDATIONS ===\n');

  for (const tc of testCases) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`TEST CASE: ${tc.name}`);
    console.log(`Query: from (${tc.query.fromLat}, ${tc.query.fromLng}) -> to (${tc.query.toLat}, ${tc.query.toLng})`);

    let output = null;
    const req = { query: tc.query };
    const res = {
      status(code) { return this; },
      json(data) { output = data; return this; }
    };

    await tripsController.search(req, res);

    if (!output || output.length === 0) {
      console.log('  ❌ NO ROUTES FOUND!');
    } else {
      console.log(`  Found ${output.length} recommendations:`);
      output.forEach((opt, idx) => {
        const seg = opt.segments?.[0];
        console.log(`  #${idx + 1}: [${seg?.code}] ${seg?.routeName} (${opt.direction || 'Inbound'})`);
        console.log(`      Board at: "${opt.boarding_name}" (${opt.boarding_lat}, ${opt.boarding_lng}) | Walk to board: ${opt.legs?.[0]?.distance_m || opt.walk_meters}m`);
        console.log(`      Alight at: "${opt.dropoff_name}" (${opt.dropoff_lat}, ${opt.dropoff_lng}) | Walk to dest: ${opt.legs?.[4]?.distance_m || 0}m`);
        console.log(`      Fare: ₱${opt.regularFare} | Time: ~${opt.minutes} mins | Ride: ${opt.totalKm} km`);
      });
    }
  }

  process.exit(0);
}

run().catch(console.error);
