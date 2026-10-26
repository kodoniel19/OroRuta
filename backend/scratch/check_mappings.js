const db = require('../src/config/db');

// The 50 maps from the user prompt with their intended LPTRP route matches
const MAPPINGS = [
  {
    mid: '1TtpHJrwjsjJWTLMztryGFYHPDvKpWQ8',
    label: 'Baikingon - Carmen Public Market',
    code: 'R-BAI',
    name: 'Baikingon (R-BAI)',
    origin: 'Baikingon',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1-4Or6Z-3qcUHDdG9_sOBZjAxat9UOBA',
    label: 'Balulang (R1) Centro – Carmen Public Market',
    code: 'R-BAL',
    name: 'Balulang R1 Centro (R-BAL)',
    origin: 'Balulang R1 Centro',
    destination: 'Carmen Public Market'
  },
  {
    mid: '15gwsYr9oqdLnmm2MHhbIhFX9b46rERQ',
    label: 'Balulang (R2) Villa Verde – Cogon Public Market',
    code: 'R2',
    name: 'Balulang (R2) Villa Verde',
    origin: 'Balulang  Villa Verde',
    destination: 'Cogon Public Market'
  },
  {
    mid: '1uHhE9sguyeVcd9Or7XZChovHh2XaCrI',
    label: 'Balulang (R3) Xavier Heights – Cogon Public Market',
    code: 'R3',
    name: 'Balulang (R3) Xavier Heights',
    origin: 'Balulang  Xavier Heights',
    destination: 'Cogon Public Market'
  },
  {
    mid: '1fzRi8V_OanW0qwmGQpCL8lBPyCoJ9-s',
    label: 'Bayabas (R1) – Cogon Public Market',
    code: 'R1',
    name: 'Bayabas (R1)',
    origin: 'Bayabas',
    destination: 'Cogon Public Market'
  },
  {
    mid: '1S8vMzhu4REZza3wUvN7C3sF8BPjFynA',
    label: 'Bayabas (R2) – Carmen Public Market',
    code: 'R2',
    name: 'Bayabas (R2)',
    origin: 'Bayabas',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1LZtRJ6OPcJ7hdW9fh6nzOCY1varBR4k',
    label: 'Bayabas (R3) – Carmen Public Market',
    code: 'R3',
    name: 'Bayabas (R3)',
    origin: 'Bayabas',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1ycyKmc9oAVeCuIwMduyOid9mGTwGUHg',
    label: 'Bayabas (R4) – Carmen Public Market',
    code: 'R4',
    name: 'Bayabas (R4)',
    origin: 'Bayabas',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1zrG3Bto-2HBwsal5rko6IknZaNp9fjU',
    label: 'Bayabas (R5) – Agora Market City and Terminal',
    code: 'R5',
    name: 'Bayabas (R5)',
    origin: 'Bayabas',
    destination: 'Agora Market City and Terminal'
  },
  {
    mid: '1aGBYq0t-J_Mpt3sGEsT7QopBnYFsBYs',
    label: 'Bonbon (R1) - Cogon Public Market',
    code: 'R-BON-COG',
    name: 'Bonbon–Cogon Loop Line',
    origin: 'Brgy. Bonbon Centro',
    destination: 'Cogon Public Market'
  },
  {
    mid: '1SRQexM1A2rhJa9IngSrivkmhKcy1590',
    label: 'Bonbon (R2) – Carmen Public Market',
    code: 'R2',
    name: 'Bonbon (R2)',
    origin: 'Bonbon',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1K0VYe239AbN_Lg-iiFqcq7HWdG9Hcvk',
    label: 'Bonbon (R3) – Agora Market City and Terminal',
    code: 'R3',
    name: 'Bonbon (R3)',
    origin: 'Bonbon',
    destination: 'Agora Market City and Terminal'
  },
  {
    mid: '1iV8tfOFHcZavsxo44OtEaEHkN4qgTGQ',
    label: 'Bonbon (R4) – Carmen Public Market',
    code: 'R4',
    name: 'Bonbon (R4)',
    origin: 'Bonbon',
    destination: 'Carmen Public Market'
  },
  {
    mid: '19nKBKwH19kU0YJzPdowxlfPS9EKTGNQ',
    label: 'Bulua (R1) – Agora Market City and Terminal',
    code: 'R1',
    name: 'Bulua (R1)',
    origin: 'Bulua',
    destination: 'Agora Market City and Terminal'
  },
  {
    mid: '1SZiU99oTddsd2INzZCC-GJQUBzvwLsk',
    label: 'Bulua (R2) – Agora Market City and Terminal',
    code: 'R2',
    name: 'Bulua (R2)',
    origin: 'Bulua',
    destination: 'Agora Market City and Terminal'
  },
  {
    mid: '1n_3ZExYSgHmpFYKIKuQLAK-Ril_fShU',
    label: 'Bulua (R3) – Carmen Public Market',
    code: 'R3',
    name: 'Bulua (R3)',
    origin: 'Bulua',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1qzNUdE5mDrHmbWVo60g_IGOhBntzRtw',
    label: 'Bulua (R4) – Cogon Public Market',
    code: 'R4',
    name: 'Bulua (R4)',
    origin: 'Bulua',
    destination: 'Cogon Public Market'
  },
  {
    mid: '13ubt3mGeuFAjILaVz4hafRN6frZry4A',
    label: 'Bulua (R5) – Divisoria Park',
    code: 'R5',
    name: 'Bulua (R5)',
    origin: 'Bulua',
    destination: 'Divisoria Park'
  },
  {
    mid: '1nN-upCvAWAzqaNqzs48MhHAadKafihM',
    label: 'Bulua (R6) – Carmen Public Market',
    code: 'R6',
    name: 'Bulua (R6)',
    origin: 'Bulua',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1MiHNigms9rrA5hVxqh5uvQjFnxUtXZk',
    label: 'Bulua (R7) Terry Hills Subdivision',
    code: 'R7',
    name: 'Bulua (R7)',
    origin: 'Bulua',
    destination: 'Terry Hills Subdivision - Divisoria Park'
  },
  {
    mid: '1trrNmgPA9Vck7mI2HNkzLL2D69nrUq0',
    label: 'Canitoan (R1) – Cogon Public Market',
    code: 'R1',
    name: 'Canitoan (R1)',
    origin: 'Canitoan',
    destination: 'Cogon Public Market'
  },
  {
    mid: '1gy1cabU8PYV99tzcdXjkFkXTLlUBR18',
    label: 'Canitoan (R2) Calaanan (Relocation) – Cogon Public Market',
    code: 'R2',
    name: 'Canitoan (R2) Calaanan (Relocation)',
    origin: 'Canitoan  Calaanan (Relocation)',
    destination: 'Cogon Public Market'
  },
  {
    mid: '1G25RJ_E9jh5q-yw1QjE7Qbo0tFexkk0',
    label: 'Carmen (R1) Silver Creek Subdivision – Cogon Public Market',
    code: 'R1',
    name: 'Carmen (R1) Silver Creek Subdivision',
    origin: 'Carmen  Silver Creek Subdivision',
    destination: 'Cogon Public Market'
  },
  {
    mid: '1BojYpsfy6YA5rTcxmtQFSWviTM0WOuY',
    label: 'Carmen (R2) San Agustin – Cogon Public Market',
    code: 'R2',
    name: 'Carmen (R2) San Agustin',
    origin: 'Carmen  San Agustin',
    destination: 'Cogon Public Market'
  },
  {
    mid: '1g2H-H6qyyTSDwbMc1Ya1Vmzt7YD8bz4',
    label: 'Carmen (R3) Pueblo de Oro (Xavier Estates Gate 3) – Carmen Public Market',
    code: 'R3',
    name: 'Carmen (R3) Pueblo de Oro (Xavier Estates Gate 3)',
    origin: 'Carmen  Pueblo de Oro (Xavier Estates Gate 3)',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1SGE7SLQH7Qpx2bnGxamfza3j8YEK7gY',
    label: 'Carmen (R4) Pueblo de Oro (Xavier Estates Gate 3) – Agora Market City and Terminal',
    code: 'R4',
    name: 'Carmen (R4) Pueblo de Oro (Xavier Estates Gate 3)',
    origin: 'Carmen  Pueblo de Oro (Xavier Estates Gate 3)',
    destination: 'Agora Market City and Terminal'
  },
  {
    mid: '1yeCi5nw9-fvAjM8Q33W3oWuGiwQdt5U',
    label: 'Carmen (R5) Carmen Public Market – Agora Market City and Terminal',
    code: 'R5',
    name: 'Carmen (R5) Carmen Public Market',
    origin: 'Carmen  Carmen Public Market',
    destination: 'Agora Market City and Terminal'
  },
  {
    mid: '1Q1_RWcZMRheFAnVbASdUnjDHJYUSs2k',
    label: 'Carmen (R6) Zone 10 – Cogon Public Market',
    code: 'R6',
    name: 'Carmen (R6) Zone 10',
    origin: 'Carmen  Zone 10',
    destination: 'Cogon Public Market'
  },
  {
    mid: '1LGnnmNLQkOY-GeYGuhI3LeRGUsF5xIM',
    label: 'Dansolihon (R1) – Carmen Public Market',
    code: 'R1',
    name: 'Dansolihon (R1)',
    origin: 'Dansolihon',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1RPWpGWQewqbY2fNQNN0-c4_2sqkvNnA',
    label: 'Dansolihon (R2) – Carmen Public Market',
    code: 'R2',
    name: 'Dansolihon (R2)',
    origin: 'Dansolihon',
    destination: 'Carmen Public Market'
  },
  {
    mid: '14YSK9NP5exvZ3tPpJVeJz8hTbqb0V_U',
    label: 'Iponan (R1) Bulao – Carmen Public Market',
    code: 'R1',
    name: 'Iponan (R1) Bulao',
    origin: 'Iponan  Bulao',
    destination: 'Carmen Public Market'
  },
  {
    mid: '12KOr6H-lR0Pa21LdLuZedqf3-uXdHhw',
    label: 'Iponan (R3) Kinasanghan Iponan – Limketkai via Agora Market City and Terminal',
    code: 'R3',
    name: 'Iponan (R3) Kinasanghan Iponan',
    origin: 'Iponan  Kinasanghan Iponan',
    destination: 'Limketkai via Agora Market City and Terminal'
  },
  {
    mid: '1ki552DiWKfQkEhUawfh7Gqvdp-dm6ng',
    label: 'Iponan (R4) Kisanlu/Regency – Gaisano City',
    code: 'R4',
    name: 'Iponan (R4) Kisanlu/Regency',
    origin: 'Iponan  Kisanlu/Regency',
    destination: 'Gaisano City'
  },
  {
    mid: '1T6Jg7nbbnNeCTG6g595jFq7UDO384no',
    label: 'Iponan (R5) Bulao – Cogon Public Market',
    code: 'R5',
    name: 'Iponan (R5) Bulao',
    origin: 'Iponan  Bulao',
    destination: 'Cogon Public Market'
  },
  {
    mid: '1tJ1SPCTYKbnR_oBhajCszoLB78eYqFQ',
    label: 'Kauswagan (R1) NHA – Agora Terminal',
    code: 'R1',
    name: 'Kauswagan (R1) NHA',
    origin: 'Kauswagan  NHA',
    destination: 'Agora Terminal'
  },
  {
    mid: '1Oz799snyviXfzJbbwbqTr9k_WAYUlTc',
    label: 'Kauswagan (R2) NHA – Carmen Public Market',
    code: 'R2',
    name: 'Kauswagan (R2) NHA',
    origin: 'Kauswagan  NHA',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1xmKwEr_ymbTh_D5Td-9Q9gjAkUZC-n0',
    label: 'Kauswagan (R3) – Carmen Public Market',
    code: 'R3',
    name: 'Kauswagan (R3)',
    origin: 'Kauswagan',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1sDL1RYZ_P-NjetH9N5JSI2oKlP9YLlU',
    label: 'Lumbia (R1) – Cogon Public Market',
    code: 'R1',
    name: 'Lumbia (R1)',
    origin: 'Lumbia',
    destination: 'Cogon Public Market'
  },
  {
    mid: '1P9XvheMsObLlAh9rFL96IAmJSPs5Hgk',
    label: 'Lumbia (R2) – Carmen Public Market',
    code: 'R2',
    name: 'Lumbia (R2)',
    origin: 'Lumbia',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1-8dfJNNClNNmNuX4Vr6H3K9FV3byrfg',
    label: 'Lumbia (R3) Gran Europa – Carmen Public Market',
    code: 'R3',
    name: 'Lumbia (R3) Gran Europa',
    origin: 'Lumbia  Gran Europa',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1RDNOfmbPlI9lPImz-sLKS70s79HSxSk',
    label: 'Lumbia (R4) Gran Europa – Cogon Public Market',
    code: 'R4',
    name: 'Lumbia (R4) Gran Europa',
    origin: 'Lumbia  Gran Europa',
    destination: 'Cogon Public Market via Taguanao'
  },
  {
    mid: '1aJvaW4dRdTpoeaZ8vzFtlLzJ8FBwir4',
    label: 'Pagatpat (R1) Centro – Westbound Terminal',
    code: 'R1',
    name: 'Pagatpat (R1) Centro',
    origin: 'Pagatpat  Centro',
    destination: 'Westbound Terminal'
  },
  {
    mid: '1jesthiEXd9h5Dt2Ojwx4kNPphBkf-Jg',
    label: 'Pagatpat (R2) – Carmen Public Market',
    code: 'R2',
    name: 'Pagatpat (R2)',
    origin: 'Pagatpat',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1gf2sdN-vH_EroX3RbPRnx9k0ONPLML4',
    label: 'Pagatpat (R3) Pamalihi – Carmen Public Market',
    code: 'R3',
    name: 'Pagatpat (R3) Pamalihi',
    origin: 'Pagatpat  Pamalihi',
    destination: 'Carmen Public Market'
  },
  {
    mid: '14XIiHN5Yge3Op6yRfY8fS4onQ1fUGpw',
    label: 'Patag Camp Evangelista – Divisoria Park',
    code: 'R-PAT',
    name: 'Patag Camp Evangelsita (R-PAT)',
    origin: 'Patag Camp Evangelsita',
    destination: 'Divisoria Park'
  },
  {
    mid: '1OsV6p0J7H57xU9I9rCEb6hlwlj6f574',
    label: 'San Simon – Carmen Public Market',
    code: 'R-SAN',
    name: 'San Simon (R-SAN)',
    origin: 'San Simon',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1yK65VDqFOCAfP81iKI14lZKt0ZGSCWA',
    label: 'Taglimao – Carmen Public Market',
    code: 'R-TAGL',
    name: 'Taglimao (R-TAGL)',
    origin: 'Taglimao',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1-xAGL4IsUe-Mp9-T9bkQO4iYZCRl87U',
    label: 'Tuburan – Carmen Public Market',
    code: 'R-TUB',
    name: 'Tuburan (R-TUB)',
    origin: 'Tuburan',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1uFSOK2cAsjsq6qLkeDzo4mTUZpQW0wY',
    label: 'Tagpangi – Carmen Public Market',
    code: 'R-TAG',
    name: 'Tagpangi (R-TAG)',
    origin: 'Tagpangi',
    destination: 'Carmen Public Market'
  },
  {
    mid: '1jwpsq9nK2jl-Rw7as0IGSNXdNuU3-bA',
    label: 'Tumpagon – Carmen Public Market',
    code: 'R-TUM',
    name: 'Tumpagon (R-TUM)',
    origin: 'Tumpagon',
    destination: 'Carmen Public Market'
  },
];

async function check() {
  const [routes] = await db.query('SELECT * FROM routes');
  console.log(`Loaded ${routes.length} existing routes from database.`);

  const usedRouteIds = new Map();

  for (let i = 0; i < MAPPINGS.length; i++) {
    const m = MAPPINGS[i];
    let match = routes.find(r => r.name.toLowerCase().trim() === m.name.toLowerCase().trim());
    if (!match) {
      match = routes.find(r => {
        const origWord = m.origin.toLowerCase().split(/[\s-]+/)[0];
        const destWord = m.destination.toLowerCase().split(/[\s-]+/)[0];
        const rOrig = (r.origin || '').toLowerCase();
        const rDest = (r.destination || '').toLowerCase();
        const rCode = (r.code || '').toLowerCase();
        const mCode = (m.code || '').toLowerCase();
        return rOrig.includes(origWord) && rDest.includes(destWord) && (rCode === mCode || r.name.toLowerCase().includes(m.name.toLowerCase()));
      });
    }

    if (match) {
      m.matchedRouteId = match.id;
      m.matchedRouteName = match.name;
      if (usedRouteIds.has(match.id)) {
        console.warn(`⚠️ DUPLICATE MATCH: Map #${i} "${m.label}" and Map #${usedRouteIds.get(match.id)} both matched route [${match.id}] ${match.name}`);
      } else {
        usedRouteIds.set(match.id, i);
      }
      console.log(`[${i + 1}/50] ✓ "${m.label}" ==> [${match.id}] "${match.name}" (code: ${match.code})`);
    } else {
      console.log(`[${i + 1}/50] ✗ "${m.label}" ==> NOT FOUND in DB`);
    }
  }

  console.log(`\nUnique routes matched: ${usedRouteIds.size} / 50`);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
