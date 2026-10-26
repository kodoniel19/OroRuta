const db = require('../src/config/db');

const NEW_MAPS = [
  { mid: '1SYsQTJnTEcYVHdgBEUnKXC79mnKcEB4', label: 'Balubal (R1) – Puerto Public Market', query: 'Balubal' },
  { mid: '1Iz6uPzwnVW9jltAu4hNiGi17gKuJZpM', label: 'Balubal (R2) – Puerto Public Market', query: 'Balubal' },
  { mid: '1HJRJ8iLal_co2SpH55hcchR0D5_zjAM', label: 'Bugo (R1) – Agora Market City and Terminal', query: 'Bugo' },
  { mid: '1BWMXAQmuc1Zcg9TeqiRjdPg7gPz70Wg', label: 'Bugo (R2) – Cogon Public Market', query: 'Bugo' },
  { mid: '1b_jy9Qkhb7WVUSZs-2ED2urK05QUUf4', label: 'Cugman – Cogon Public Market', query: 'Cugman' },
  { mid: '1PmIw_b1zJyxRDiWCUH_5tL5ftwkn0ks', label: 'FS Catanico – Agora Market City and Terminal', query: 'Catanico' },
  { mid: '1KM3XRg0N9TN2s67vR8xvmAOygI6I65Y', label: 'Gusa (R1) – Puerto Public Market', query: 'Gusa' },
  { mid: '1LSlCQE0ORaSUFQHPSv_CZd45jhVCOj8', label: 'Gusa (R2) – Divisoria Park', query: 'Gusa' },
  { mid: '1h-iKtiI5doxfXnng42FUtUxOi00mtvU', label: 'Indahag (R1) – Cogon Public Market', query: 'Indahag' },
  { mid: '1dN7EhLtbBnJK6_IU4KjNP35amMmW26M', label: 'Indahag (R2) – Cogon Public Market', query: 'Indahag' },
  { mid: '1CHf--A7mY7oVhWQE55a1yk4jGhv05TQ', label: 'Indahag (R3) Taguanao – Cogon Public Market', query: 'Indahag' },
  { mid: '1lgq8KT9RZYeXfzIOSy7Lk0_qIsUXKpo', label: 'Camaman-an (R3) Macapaya – Cogon Public Market', query: 'Camaman' },
  { mid: '1hJke1i4ax8qBcqpNqnH97rrswyOQG_E', label: 'Lapasan (R1) – Carmen Public Market', query: 'Lapasan' },
  { mid: '1jhRbShCWclO5eCExvzaVB5CUtsGjkvs', label: 'Lapasan (R2) – Cogon Public Market', query: 'Lapasan' },
  { mid: '1ZfAOkDpR1OVVBU8zp9EiQNVGLZup2BQ', label: 'Lapasan (R3) – Cogon Public Market', query: 'Lapasan' },
  { mid: '131p2dJrEoyCfmE-XSfAsoIi3JAxO_yQ', label: 'Macabalan (R1) Centro – Cogon Public Market', query: 'Macabalan' },
  { mid: '1pB4ablWgnKEVlwI-vfL_3_0sGsVlZ2w', label: 'Macabalan (R2) Centro – Westbound Terminal and Public Market', query: 'Macabalan' },
  { mid: '1PQstIRULx27lpEz9ljRaFue6vK4JpuM', label: 'Macabalan (R3) Centro – Cogon Public Market', query: 'Macabalan' },
  { mid: '17EoUgfs_okxHDwkxo99ekk9_2d23CEU', label: 'Macabalan (R4) Centro – Cogon Public Market', query: 'Macabalan' },
  { mid: '1Ec9xknePFyEj0-8bKf7LEk8uDiXe9bY', label: 'Macabalan (R5) Centro – Carmen Public Market', query: 'Macabalan' },
  { mid: '1ARLVkDhyTXObhT3V9nidkBL7xdD7Wnc', label: 'Macasandig (Centro Buena Oro) – Cogon Public Market', query: 'Macasandig' },
  { mid: '1jGIxcVV3srk4kC1pi18CTOKqQUuNACA', label: 'Puerto (R1) Puerto Public Market – Agora Terminal', query: 'Puerto' },
];

async function check() {
  const [allRoutes] = await db.execute("SELECT id, code, name, origin, destination FROM routes ORDER BY code, name");
  console.log(`Total routes in DB: ${allRoutes.length}`);

  for (const m of NEW_MAPS) {
    console.log(`\nChecking: "${m.label}" (query: "${m.query}")`);
    const candidates = allRoutes.filter(r => 
      r.name.toLowerCase().includes(m.query.toLowerCase()) || 
      r.code.toLowerCase().includes(m.query.toLowerCase()) ||
      r.origin.toLowerCase().includes(m.query.toLowerCase())
    );
    console.log(`Candidates (${candidates.length}):`);
    candidates.forEach(c => {
      console.log(`  - [${c.id}] Code: "${c.code}" | Name: "${c.name}" | ${c.origin} -> ${c.destination}`);
    });
  }
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
