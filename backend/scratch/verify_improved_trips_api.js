const tripsController = require('../src/controllers/trips');

async function testQuery(name, fromLat, fromLng, toLat, toLng, fromName, toName) {
  console.log(`\n======================================================`);
  console.log(`TEST: ${name}`);
  console.log(`From: (${fromLat}, ${fromLng}) [${fromName}]`);
  console.log(`To:   (${toLat}, ${toLng}) [${toName}]`);

  const req = {
    query: {
      fromLat: String(fromLat),
      fromLng: String(fromLng),
      toLat: String(toLat),
      toLng: String(toLng),
      from: fromName,
      to: toName,
      sort: 'time'
    }
  };

  let responseData = null;
  const res = {
    json: (data) => { responseData = data; return data; },
    status: (code) => {
      return {
        json: (err) => { console.error('Error status:', code, err); }
      };
    }
  };

  await tripsController.search(req, res, (err) => { if (err) console.error(err); });

  if (!responseData || !responseData.length) {
    console.log('No routes found.');
    return;
  }

  console.log(`Found ${responseData.length} recommendations:`);
  responseData.forEach((opt, idx) => {
    const seg = opt.segments[0];
    console.log(`  #${idx + 1}: Route [${seg.code}] ${seg.route_name} (${opt.direction})`);
    console.log(`      Match: "${opt.destination_match_type}" | Nearby Boarding: ${opt.is_nearby_boarding}`);
    console.log(`      Board: "${opt.boarding_name}" (walk ${opt.walk_to_board_meters}m)`);
    console.log(`      Alight: "${opt.dropoffName || opt.dropoff_name}" (walk ${opt.walk_from_drop_meters}m)`);
    console.log(`      Stats: ₱${opt.regularFare.toFixed(2)} | ~${opt.minutes} mins | ${opt.totalKm} km | transfers: ${opt.transfers}`);
  });
}

async function run() {
  await testQuery('Agora to SM CDO Downtown', 8.48813, 124.65800, 8.4855, 124.6535, 'Agora Bus Terminal', 'SM CDO Downtown');
  await testQuery('Carmen Market to Cogon Market', 8.4795, 124.6368, 8.4770, 124.6513, 'Carmen Public Market', 'Cogon Public Market');
  await testQuery('Patag Camp Evangelista to Limketkai Center', 8.4877, 124.6258, 8.4842, 124.6568, 'Patag Camp Evangelista', 'Limketkai Center');
  await testQuery('Bulua Westbound to Carmen Market', 8.5122, 124.6242, 8.4793, 124.6366, 'Bulua Westbound Terminal', 'Carmen Public Market');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
