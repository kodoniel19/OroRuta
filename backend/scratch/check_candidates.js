const db = require('../src/config/db');

async function test() {
  const [b1] = await db.query("SELECT id, code, name, origin, destination FROM routes WHERE id LIKE '%bulua%' OR name LIKE '%Bulua%'");
  console.log('Bulua routes:', b1);
  const [p1] = await db.query("SELECT id, code, name, origin, destination FROM routes WHERE id LIKE '%puerto%' OR name LIKE '%Puerto%'");
  console.log('Puerto routes:', p1);
  const [rc] = await db.query("SELECT id, code, name, origin, destination FROM routes WHERE code IN ('RC', 'RD') OR id LIKE '%rd%' OR id LIKE '%rc%'");
  console.log('RC/RD routes:', rc);
  process.exit(0);
}
test();
