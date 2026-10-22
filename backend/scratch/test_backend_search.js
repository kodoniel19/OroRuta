const trips = require('../src/controllers/trips');

async function testSearch(label, from, to, fromLat, fromLng, toLat, toLng) {
  console.log(`\n======================================================`);
  console.log(`TEST: ${label}`);
  console.log(`From: ${from} (${fromLat}, ${fromLng}) -> To: ${to} (${toLat}, ${toLng})`);

  const req = {
    query: {
      from,
      to,
      fromLat: fromLat != null ? String(fromLat) : undefined,
      fromLng: fromLng != null ? String(fromLng) : undefined,
      toLat: toLat != null ? String(toLat) : undefined,
      toLng: toLng != null ? String(toLng) : undefined,
      sort: 'time'
    }
  };

  let responseData = null;
  let responseStatus = 200;
  const res = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  await trips.search(req, res, (err) => {
    if (err) console.error("Search error:", err);
  });

  if (responseStatus !== 200) {
    console.log(`Status: ${responseStatus}`, responseData);
    return;
  }

  console.log(`Found ${responseData?.length || 0} candidate trip options:`);
  (responseData || []).forEach((opt, idx) => {
    const primary = opt.segments?.[0];
    console.log(`  [${idx + 1}] Option ID: ${opt.id}`);
    console.log(`      Route: ${primary?.code} - ${primary?.route_name} (${opt.direction})`);
    console.log(`      Boarding: ${opt.boarding_name} (${opt.boarding_lat}, ${opt.boarding_lng})`);
    console.log(`      Dropoff: ${opt.dropoff_name} (${opt.dropoff_lat}, ${opt.dropoff_lng})`);
    console.log(`      Distance: ${opt.totalKm} km | Walk: ${opt.walk_meters} m (~${opt.walk_minutes} mins) | Total Time: ${opt.minutes} mins`);
    console.log(`      Fare: Regular ₱${opt.regularFare} / Disc ₱${opt.discountFare} | Transfers: ${opt.transfers}`);
  });
}

async function run() {
  // Let's test from Xavier Heights / Masterson Ave area (approx 8.4600, 124.6250)
  // 1. To Liceo de Cagayan University (8.4975, 124.6407 or 8.4870, 124.6380)
  await testSearch('Masterson to Liceo', 'Current Location', 'Liceo de Cagayan University', 8.4600, 124.6250, 8.4975, 124.6407);

  // 2. To SM CDO Downtown (8.4855, 124.6535)
  await testSearch('Masterson to SM CDO Downtown', 'Current Location', 'SM CDO Downtown', 8.4600, 124.6250, 8.4855, 124.6535);

  // 3. To Centrio Mall (8.4877, 124.6517)
  await testSearch('Masterson to Centrio Mall', 'Current Location', 'Centrio Mall', 8.4600, 124.6250, 8.4877, 124.6517);

  // 4. To Agora Market (8.4857, 124.6589)
  await testSearch('Masterson to Agora Market', 'Current Location', 'Agora Market', 8.4600, 124.6250, 8.4857, 124.6589);

  // 5. Carmen to Liceo (Carmen Market 8.4845, 124.6335 -> Liceo 8.4975, 124.6407)
  await testSearch('Carmen to Liceo', 'Carmen Public Market', 'Liceo de Cagayan University', 8.4845, 124.6335, 8.4975, 124.6407);

  // 6. Carmen to SM CDO Downtown
  await testSearch('Carmen to SM CDO Downtown', 'Carmen Public Market', 'SM CDO Downtown Premier', 8.4845, 124.6335, 8.4855, 124.6535);

  process.exit(0);
}

run().catch(console.error);
