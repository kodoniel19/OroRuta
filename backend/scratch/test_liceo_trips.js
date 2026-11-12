const request = require('supertest');

async function test() {
  const app = require('../src/server');

  const res = await request(app)
    .get('/api/v1/trips/search?fromLat=8.4862&fromLng=124.6386&to=Agora&toLat=8.4881&toLng=124.6580')
    .expect(200);

  const opt = res.body[0];
  console.log('boarding_name:', opt.boarding_name);
  console.log('boarding_lat:', opt.boarding_lat);
  console.log('boarding_lng:', opt.boarding_lng);
  console.log('dropoff_name:', opt.dropoff_name);
  console.log('dropoff_lat:', opt.dropoff_lat);
  console.log('dropoff_lng:', opt.dropoff_lng);

  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
