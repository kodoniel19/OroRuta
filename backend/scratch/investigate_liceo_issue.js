const db = require('../src/config/db');

async function run() {
  console.log('=== SEARCHING TRANSIT LOCATIONS & LOADING POINTS FOR LICEO ===');
  const [lps] = await db.query("SELECT * FROM loading_points WHERE name LIKE '%Liceo%' OR note LIKE '%Liceo%' OR name LIKE '%Pelaez%'");
  console.log('Loading points:', lps);

  const [tls] = await db.query("SELECT * FROM transit_locations WHERE name LIKE '%Liceo%' OR address LIKE '%Pelaez%'");
  console.log('Transit locations:', tls);

  const [landmarks] = await db.query("SELECT * FROM landmarks WHERE name LIKE '%Liceo%'");
  console.log('Landmarks:', landmarks);

  console.log('\n=== ALL LOADING POINTS FOR LAPASAN (R1) ===');
  const [r1] = await db.query("SELECT * FROM routes WHERE code = 'R1' AND name LIKE '%Lapasan%'");
  console.log('Lapasan R1 route:', r1);

  if (r1.length > 0) {
    const routeId = r1[0].id;
    const [r1Lps] = await db.query("SELECT * FROM loading_points WHERE route_id = ?", [routeId]);
    console.log('Lapasan R1 loading points:', r1Lps);

    const [r1Terms] = await db.query(
      "SELECT rt.*, t.name, t.lat, t.lng FROM route_terminals rt JOIN terminals t ON rt.terminal_id = t.id WHERE rt.route_id = ?",
      [routeId]
    );
    console.log('Lapasan R1 terminals:', r1Terms);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

