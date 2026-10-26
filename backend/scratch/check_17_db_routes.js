const pool = require('../src/config/db');

const TARGET_ROUTES = [
  { mid: '14XIiHN5Yge3Op6yRfY8fS4onQ1fUGpw', id: 'c2-patag-gaisano-limketkai-cogon', reqName: 'C2 - Patag- Gaisano - Limketkai - Cogon', reqCode: 'C2' },
  { mid: '1ZfAOkDpR1OVVBU8zp9EiQNVGLZup2BQ', id: 'la-lapasan-cogon-agora-divisoria', reqName: 'LA — Lapasan–Cogon–Agora–Divisoria Loop', reqCode: 'LA' },
  { mid: '1jhRbShCWclO5eCExvzaVB5CUtsGjkvs', id: 'lb-lapasan-agora-loop', reqName: 'LB — Lapasan–Agora Loop', reqCode: 'LB' },
  { mid: '1ycyKmc9oAVeCuIwMduyOid9mGTwGUHg', id: 'bayabas-carmen-loop-line', reqName: 'Bayabas–Carmen Loop Line', reqCode: 'BAY' }, // or check existing code
  { mid: '1BWMXAQmuc1Zcg9TeqiRjdPg7gPz70Wg', id: 'bugo-cogon-line', reqName: 'Bugo–Cogon Line', reqCode: 'BUG' },
  { mid: '1n_3ZExYSgHmpFYKIKuQLAK-Ril_fShU', id: 'bulua-cogon-line-highway', reqName: 'Bulua (R3) – Carmen Public Market', reqCode: 'BUL-R3' }, // rename
  { mid: '1h-iKtiI5doxfXnng42FUtUxOi00mtvU', id: 'indahag-r1-cogon-line', reqName: 'Indahag (R1)–Cogon Line', reqCode: 'IND-R1' },
  { mid: '1T6Jg7nbbnNeCTG6g595jFq7UDO384no', id: 'iponan-bulua-cogon-line', reqName: 'Iponan–Bulua–Cogon Line', reqCode: 'IPO' },
  { mid: '1P9XvheMsObLlAh9rFL96IAmJSPs5Hgk', id: 'lumbia-carmen-line', reqName: 'Lumbia–Carmen Line', reqCode: 'LUM' },
  { mid: '1ARLVkDhyTXObhT3V9nidkBL7xdD7Wnc', id: 'macasandig-cogon-line', reqName: 'Macasandig–Cogon Line', reqCode: 'MAC' },
  { mid: '1jGIxcVV3srk4kC1pi18CTOKqQUuNACA', id: 'puerto-cogon-divisoria-line', reqName: 'Puerto (R1) Puerto Public Market – Agora Terminal', reqCode: 'PUE-R1' }, // rename
  { mid: '1RDNOfmbPlI9lPImz-sLKS70s79HSxSk', id: 'uptown-gran-europa-sm-cogon', reqName: 'Uptown — Gran Europa/SM Uptown–Cogon Line', reqCode: 'UPT' },
  { mid: '1ojQekfQsB6BOnGdWuUfUT__jJYUzEjg', id: 'r1-gaisano-carmen-loop', reqName: 'R1 — Gaisano–Carmen Loop Line', reqCode: 'R1' },
  { mid: '1U4dw1Ug7ZuoCVirC46KCdtqJGvZ_cSM', id: 'r2-gaisano-agora-cogon-carmen', reqName: 'R2 — Gaisano–Agora–Cogon–Carmen Loop Line', reqCode: 'R2' },
  { mid: '1BGud4fdlzvEn8EY0IG_6InM6QIhK4WM', id: 'ra-pier-cogon-line', reqName: 'RA — Pier–Cogon Line', reqCode: 'RA' },
  { mid: '1Kuy7St1QrGwu2YrABNw4UFj8zPhWwg0', id: 'rbc-pier-macabalan-agora-limketkai', reqName: 'RBC — Pier–Macabalan–Agora–Limketkai–Cogon–Velez Line', reqCode: 'RBC' },
  { mid: '1zIcpiNUjxnJ-kJ_kt5VD9miIU2NI47Y', id: 'rd-gusa-cugman-limketkai-cogon', reqName: 'RC - Cugman – Gusa – Cogon', reqCode: 'RC' } // code RD -> RC
];

async function check() {
  for (const t of TARGET_ROUTES) {
    const [rows] = await pool.query('SELECT id, code, name, origin, destination FROM routes WHERE id = ?', [t.id]);
    if (rows.length > 0) {
      console.log(`FOUND: ${t.id} -> code: "${rows[0].code}", name: "${rows[0].name}"`);
    } else {
      console.log(`NOT FOUND BY ID: ${t.id}, searching by name/code...`);
      const [byName] = await pool.query('SELECT id, code, name, origin, destination FROM routes WHERE name LIKE ? OR code = ?', [`%${t.reqName}%`, t.reqCode]);
      console.log('Matches:', byName);
    }
  }
  process.exit(0);
}
check();
