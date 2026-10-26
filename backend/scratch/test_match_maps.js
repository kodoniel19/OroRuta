const https = require('https');
const fs = require('fs');
const db = require('../src/config/db');

// List of all 50 maps from the user prompt
const MAPS = [
  { mid: '1TtpHJrwjsjJWTLMztryGFYHPDvKpWQ8', label: 'Baikingon - Carmen Public Market' },
  { mid: '1-4Or6Z-3qcUHDdG9_sOBZjAxat9UOBA', label: 'Balulang (R1) Centro – Carmen Public Market' },
  { mid: '15gwsYr9oqdLnmm2MHhbIhFX9b46rERQ', label: 'Balulang (R2) Villa Verde – Cogon Public Market' },
  { mid: '1uHhE9sguyeVcd9Or7XZChovHh2XaCrI', label: 'Balulang (R3) Xavier Heights – Cogon Public Market' },
  { mid: '1fzRi8V_OanW0qwmGQpCL8lBPyCoJ9-s', label: 'Bayabas (R1) – Cogon Public Market' },
  { mid: '1S8vMzhu4REZza3wUvN7C3sF8BPjFynA', label: 'Bayabas (R2) – Carmen Public Market' },
  { mid: '1LZtRJ6OPcJ7hdW9fh6nzOCY1varBR4k', label: 'Bayabas (R3) – Carmen Public Market' },
  { mid: '1ycyKmc9oAVeCuIwMduyOid9mGTwGUHg', label: 'Bayabas (R4) – Carmen Public Market' },
  { mid: '1zrG3Bto-2HBwsal5rko6IknZaNp9fjU', label: 'Bayabas (R5) – Agora Market City and Terminal' },
  { mid: '1aGBYq0t-J_Mpt3sGEsT7QopBnYFsBYs', label: 'Bonbon (R1) - Cogon Public Market' },
  { mid: '1SRQexM1A2rhJa9IngSrivkmhKcy1590', label: 'Bonbon (R2) – Carmen Public Market' },
  { mid: '1K0VYe239AbN_Lg-iiFqcq7HWdG9Hcvk', label: 'Bonbon (R3) – Agora Market City and Terminal' },
  { mid: '1iV8tfOFHcZavsxo44OtEaEHkN4qgTGQ', label: 'Bonbon (R4) – Carmen Public Market' },
  { mid: '19nKBKwH19kU0YJzPdowxlfPS9EKTGNQ', label: 'Bulua (R1) – Agora Market City and Terminal' },
  { mid: '1SZiU99oTddsd2INzZCC-GJQUBzvwLsk', label: 'Bulua (R2) – Agora Market City and Terminal' },
  { mid: '1n_3ZExYSgHmpFYKIKuQLAK-Ril_fShU', label: 'Bulua (R3) – Carmen Public Market' },
  { mid: '1qzNUdE5mDrHmbWVo60g_IGOhBntzRtw', label: 'Bulua (R4) – Cogon Public Market' },
  { mid: '13ubt3mGeuFAjILaVz4hafRN6frZry4A', label: 'Bulua (R5) – Divisoria Park' },
  { mid: '1nN-upCvAWAzqaNqzs48MhHAadKafihM', label: 'Bulua (R6) – Carmen Public Market' },
  { mid: '1MiHNigms9rrA5hVxqh5uvQjFnxUtXZk', label: 'Bulua (R7) Terry Hills Subdivision' },
  { mid: '1trrNmgPA9Vck7mI2HNkzLL2D69nrUq0', label: 'Canitoan (R1) – Cogon Public Market' },
  { mid: '1gy1cabU8PYV99tzcdXjkFkXTLlUBR18', label: 'Canitoan (R2) Calaanan (Relocation) – Cogon Public Market' },
  { mid: '1G25RJ_E9jh5q-yw1QjE7Qbo0tFexkk0', label: 'Carmen (R1) Silver Creek Subdivision – Cogon Public Market' },
  { mid: '1BojYpsfy6YA5rTcxmtQFSWviTM0WOuY', label: 'Carmen (R2) San Agustin – Cogon Public Market' },
  { mid: '1g2H-H6qyyTSDwbMc1Ya1Vmzt7YD8bz4', label: 'Carmen (R3) Pueblo de Oro (Xavier Estates Gate 3) – Carmen Public Market' },
  { mid: '1SGE7SLQH7Qpx2bnGxamfza3j8YEK7gY', label: 'Carmen (R4) Pueblo de Oro (Xavier Estates Gate 3) – Agora Market City and Terminal' },
  { mid: '1yeCi5nw9-fvAjM8Q33W3oWuGiwQdt5U', label: 'Carmen (R5) Carmen Public Market – Agora Market City and Terminal' },
  { mid: '1Q1_RWcZMRheFAnVbASdUnjDHJYUSs2k', label: 'Carmen (R6) Zone 10 – Cogon Public Market' },
  { mid: '1LGnnmNLQkOY-GeYGuhI3LeRGUsF5xIM', label: 'Dansolihon (R1) – Carmen Public Market' },
  { mid: '1RPWpGWQewqbY2fNQNN0-c4_2sqkvNnA', label: 'Dansolihon (R2) – Carmen Public Market' },
  { mid: '14YSK9NP5exvZ3tPpJVeJz8hTbqb0V_U', label: 'Iponan (R1) Bulao – Carmen Public Market' },
  { mid: '12KOr6H-lR0Pa21LdLuZedqf3-uXdHhw', label: 'Iponan (R3) Kinasanghan Iponan – Limketkai via Agora Market City and Terminal' },
  { mid: '1ki552DiWKfQkEhUawfh7Gqvdp-dm6ng', label: 'Iponan (R4) Kisanlu/Regency – Gaisano City' },
  { mid: '1T6Jg7nbbnNeCTG6g595jFq7UDO384no', label: 'Iponan (R5) Bulao – Cogon Public Market' },
  { mid: '1tJ1SPCTYKbnR_oBhajCszoLB78eYqFQ', label: 'Kauswagan (R1) NHA – Agora Terminal' },
  { mid: '1Oz799snyviXfzJbbwbqTr9k_WAYUlTc', label: 'Kauswagan (R2) NHA – Carmen Public Market' },
  { mid: '1xmKwEr_ymbTh_D5Td-9Q9gjAkUZC-n0', label: 'Kauswagan (R3) – Carmen Public Market' },
  { mid: '1sDL1RYZ_P-NjetH9N5JSI2oKlP9YLlU', label: 'Lumbia (R1) – Cogon Public Market' },
  { mid: '1P9XvheMsObLlAh9rFL96IAmJSPs5Hgk', label: 'Lumbia (R2) – Carmen Public Market' },
  { mid: '1-8dfJNNClNNmNuX4Vr6H3K9FV3byrfg', label: 'Lumbia (R3) Gran Europa – Carmen Public Market' },
  { mid: '1RDNOfmbPlI9lPImz-sLKS70s79HSxSk', label: 'Lumbia (R4) Gran Europa – Cogon Public Market' },
  { mid: '1aJvaW4dRdTpoeaZ8vzFtlLzJ8FBwir4', label: 'Pagatpat (R1) Centro – Westbound Terminal' },
  { mid: '1jesthiEXd9h5Dt2Ojwx4kNPphBkf-Jg', label: 'Pagatpat (R2) – Carmen Public Market' },
  { mid: '1gf2sdN-vH_EroX3RbPRnx9k0ONPLML4', label: 'Pagatpat (R3) Pamalihi – Carmen Public Market' },
  { mid: '14XIiHN5Yge3Op6yRfY8fS4onQ1fUGpw', label: 'Patag Camp Evangelista – Divisoria Park' },
  { mid: '1OsV6p0J7H57xU9I9rCEb6hlwlj6f574', label: 'San Simon – Carmen Public Market' },
  { mid: '1yK65VDqFOCAfP81iKI14lZKt0ZGSCWA', label: 'Taglimao – Carmen Public Market' },
  { mid: '1-xAGL4IsUe-Mp9-T9bkQO4iYZCRl87U', label: 'Tuburan – Carmen Public Market' },
  { mid: '1uFSOK2cAsjsq6qLkeDzo4mTUZpQW0wY', label: 'Tagpangi – Carmen Public Market' },
  { mid: '1jwpsq9nK2jl-Rw7as0IGSNXdNuU3-bA', label: 'Tumpagon – Carmen Public Market' },
];

async function matchMapsWithRoutes() {
  const [routes] = await db.query('SELECT * FROM routes');
  console.log(`Loaded ${routes.length} routes from database.`);

  const matches = [];
  const unmatched = [];

  for (const m of MAPS) {
    const labelNorm = m.label.toLowerCase().replace(/[–—-]/g, '-').replace(/\s+/g, ' ').trim();
    
    // Find best match in DB routes
    let bestRoute = null;

    // Strategy 1: Exact label or code + destination match
    for (const r of routes) {
      const rName = r.name.toLowerCase().replace(/[–—-]/g, '-').replace(/\s+/g, ' ').trim();
      const rOrig = (r.origin || '').toLowerCase().replace(/[–—-]/g, '-').replace(/\s+/g, ' ').trim();
      const rDest = (r.destination || '').toLowerCase().replace(/[–—-]/g, '-').replace(/\s+/g, ' ').trim();
      const rCode = (r.code || '').toLowerCase().trim();

      // Check if route name + destination matches
      if (labelNorm.includes(rName) || rName.includes(labelNorm)) {
        bestRoute = r;
        break;
      }

      // Check pattern: "Balulang (R1) Centro" -> label has "Balulang (R1)" and "Carmen Public Market"
      const nameTokens = rName.split(/[\s-]+/).filter(t => t.length > 2);
      const destTokens = rDest.split(/[\s-]+/).filter(t => t.length > 2);
      
      const nameMatch = nameTokens.filter(t => labelNorm.includes(t)).length >= Math.min(2, nameTokens.length);
      const destMatch = destTokens.some(t => labelNorm.includes(t));

      if (nameMatch && destMatch) {
        bestRoute = r;
        break;
      }
    }

    if (bestRoute) {
      matches.push({ map: m, route: bestRoute });
      console.log(`✓ MATCHED: "${m.label}" ===> [${bestRoute.id}] ${bestRoute.name} (${bestRoute.origin} -> ${bestRoute.destination})`);
    } else {
      unmatched.push(m);
      console.log(`✗ UNMATCHED: "${m.label}"`);
    }
  }

  console.log(`\nResults: ${matches.length} matched, ${unmatched.length} unmatched out of ${MAPS.length} maps.`);
}

matchMapsWithRoutes().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
