const db = require('../src/config/db');

const locations = [
  // Terminals
  {
    id: 'T01',
    kind: 'terminal',
    name: 'Agora Integrated Terminal',
    address: 'C.M. Recto Ave, Lapasan',
    barangay: 'Lapasan',
    lat: 8.4857,
    lng: 124.6589,
    routeIds: ['R02', 'R03', 'R04', 'R2', 'R3', 'R4'],
    status: 'Active',
    notes: 'Eastbound hub. Bugo-bound units load at Bay 4.'
  },
  {
    id: 'T02',
    kind: 'terminal',
    name: 'Bulua Integrated Bus & Jeepney Terminal',
    address: 'Iligan–CDO Highway, Bulua',
    barangay: 'Bulua',
    lat: 8.5040,
    lng: 124.6115,
    routeIds: ['R01', 'R10', 'R1', 'R-BUL-COG'],
    status: 'Active',
    notes: 'Westbound hub shared with provincial buses.'
  },
  {
    id: 'T03',
    kind: 'terminal',
    name: 'Cogon Market Jeepney Terminal',
    address: 'Osmeña St, Cogon',
    barangay: 'Brgy. 34 (Cogon)',
    lat: 8.47716,
    lng: 124.651208,
    routeIds: ['R01', 'R02', 'R03', 'R05', 'R07', 'R08', 'R09', 'R10', 'R11', 'R1', 'R2', 'R3', 'R5', 'R7'],
    status: 'Active',
    notes: 'Busiest downtown terminal.'
  },
  {
    id: 'T04',
    kind: 'terminal',
    name: 'Divisoria Terminal (Tirso Neri St)',
    address: 'Tirso Neri St, Poblacion',
    barangay: 'Brgy. 1 (Poblacion)',
    lat: 8.4777,
    lng: 124.6452,
    routeIds: ['R01', 'R05', 'R06', 'R09', 'R12', 'R1', 'R5', 'R6', 'R-PAT'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'T05',
    kind: 'terminal',
    name: 'Carmen Market Terminal',
    address: 'Vamenta Blvd, Carmen',
    barangay: 'Carmen',
    lat: 8.479498,
    lng: 124.636820,
    routeIds: ['R01', 'R05', 'R10', 'R1', 'R5', 'C2', 'R-BUL-COG'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'T06',
    kind: 'terminal',
    name: 'Puerto Terminal',
    address: 'Butuan–CDO Highway, Puerto',
    barangay: 'Puerto',
    lat: 8.4990,
    lng: 124.7420,
    routeIds: ['R04', 'R4', 'R-PUE-COG', 'R-BUG-COG'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'T07',
    kind: 'terminal',
    name: 'Bugo Terminal',
    address: 'Butuan–CDO Highway, Bugo',
    barangay: 'Bugo',
    lat: 8.5070,
    lng: 124.7560,
    routeIds: ['R04', 'R4', 'R-BUG-COG'],
    status: 'Under Review',
    notes: 'Relocation proposal under review by RTA.'
  },

  // Loading Points (7 items matching screenshot with verified CDO coordinates)
  {
    id: 'L01',
    kind: 'loading',
    name: 'Limketkai Center Loading Bay',
    address: 'Limketkai Drive, Lapasan',
    barangay: 'Brgy. Lapasan',
    lat: 8.4838,
    lng: 124.6530,
    routeIds: ['R02', 'R03', 'R2', 'R3', 'C2'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'L02',
    kind: 'loading',
    name: 'Xavier University – Corrales Ave',
    address: 'Corrales Ave, Brgy. 13',
    barangay: 'Brgy. 13 (Poblacion)',
    lat: 8.4790,
    lng: 124.6460,
    routeIds: ['R01', 'R05', 'R1', 'R5', 'R2'],
    status: 'Active',
    notes: 'Heavy student volume 6–8 AM.'
  },
  {
    id: 'L03',
    kind: 'loading',
    name: 'SM CDO Downtown Premier Bay',
    address: 'Claro M. Recto Ave, Lapasan',
    barangay: 'Brgy. Lapasan',
    lat: 8.4868,
    lng: 124.6557,
    routeIds: ['R02', 'R03', 'R04', 'R2', 'R3', 'R4', 'C2'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'L04',
    kind: 'loading',
    name: 'Capitol University Loading Zone',
    address: 'Corrales Ext., Gusa',
    barangay: 'Brgy. Gusa',
    lat: 8.4815,
    lng: 124.6655,
    routeIds: ['R03', 'R04', 'R3', 'R4', 'R-BUG-COG'],
    status: 'Under Review',
    notes: 'Reported as informal stop — validating with RTA.'
  },
  {
    id: 'L05',
    kind: 'loading',
    name: 'Liceo de Cagayan University',
    address: 'Rodolfo N. Pelaez Blvd, Kauswagan',
    barangay: 'Brgy. Kauswagan',
    lat: 8.4870,
    lng: 124.6380,
    routeIds: ['R06', 'R6', 'R2', 'C2', 'R-BUL-COG', 'R-BAY-CAR'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'L06',
    kind: 'loading',
    name: 'Centrio Mall – C.M. Recto',
    address: 'C.M. Recto Ave, Brgy. 13',
    barangay: 'Brgy. 13 (Poblacion)',
    lat: 8.4800,
    lng: 124.6448,
    routeIds: ['R01', 'R05', 'R1', 'R5', 'R2', 'RD'],
    status: 'Inactive',
    notes: 'Suspended during sidewalk works.'
  },
  {
    id: 'L07',
    kind: 'loading',
    name: 'USTP Lapasan Gate',
    address: 'C.M. Recto Ave, Lapasan',
    barangay: 'Brgy. Lapasan',
    lat: 8.4852,
    lng: 124.6572,
    routeIds: ['R02', 'R03', 'R04', 'R2', 'R3', 'R4', 'RD', 'R-BUG-COG'],
    status: 'Active',
    notes: ''
  },

  // Unloading Points (6 items matching screenshot with verified CDO coordinates)
  {
    id: 'U01',
    kind: 'unloading',
    name: 'Cogon Market – Osmeña St Drop-off',
    address: 'Osmeña St, Cogon',
    barangay: 'Brgy. 34 (Cogon)',
    lat: 8.4740,
    lng: 124.6490,
    routeIds: ['R02', 'R07', 'R08', 'R2', 'R7', 'R-BUL-COG', 'R-UPT-COG'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'U02',
    kind: 'unloading',
    name: 'Velez St near Gaisano Main',
    address: 'Velez St, Poblacion',
    barangay: 'Brgy. 25 (Poblacion)',
    lat: 8.4770,
    lng: 124.6445,
    routeIds: ['R01', 'R05', 'R1', 'R5', 'R-PAT', 'C2'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'U03',
    kind: 'unloading',
    name: 'Carmen Public Market Drop-off',
    address: 'Vamenta Blvd, Carmen',
    barangay: 'Carmen',
    lat: 8.4850,
    lng: 124.6330,
    routeIds: ['R01', 'R05', 'R10', 'R1', 'R5', 'C2', 'R-BUL-COG', 'R-BAY-CAR'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'U04',
    kind: 'unloading',
    name: 'SM CDO Uptown – Masterson Ave',
    address: 'Masterson Ave, Upper Carmen',
    barangay: 'Brgy. Upper Carmen',
    lat: 8.4570,
    lng: 124.6305,
    routeIds: ['R08', 'R8', 'R-UPT-COG', 'R-LUM-CAR', 'R4'],
    status: 'Under Review',
    notes: ''
  },
  {
    id: 'U05',
    kind: 'unloading',
    name: 'Gaisano City – Lapasan',
    address: 'C.M. Recto Ave, Lapasan',
    barangay: 'Brgy. Lapasan',
    lat: 8.4850,
    lng: 124.6555,
    routeIds: ['R02', 'R03', 'R2', 'R3', 'C2', 'R1'],
    status: 'Active',
    notes: 'New zone effective Sept 20.'
  },
  {
    id: 'U06',
    kind: 'unloading',
    name: 'Macasandig Barangay Hall',
    address: 'Macasandig Road',
    barangay: 'Brgy. Macasandig',
    lat: 8.4625,
    lng: 124.6505,
    routeIds: ['R07', 'R7', 'R-MAC-COG'],
    status: 'Active',
    notes: ''
  },

  // Transfer Points (for map rendering & legend consistency)
  {
    id: 'X01',
    kind: 'transfer',
    name: 'Cogon Rotunda Transfer Hub',
    address: 'Osmeña St × Capistrano St',
    barangay: 'Brgy. 34 (Cogon)',
    lat: 8.4738,
    lng: 124.6493,
    routeIds: ['R01', 'R02', 'R03', 'R05', 'R07', 'R08', 'R09', 'R1', 'R2', 'R3', 'R5', 'R7'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'X02',
    kind: 'transfer',
    name: 'Agora Transfer Point',
    address: 'C.M. Recto Ave, Lapasan',
    barangay: 'Lapasan',
    lat: 8.4859,
    lng: 124.6592,
    routeIds: ['R02', 'R03', 'R04', 'R2', 'R3', 'R4'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'X03',
    kind: 'transfer',
    name: 'Carmen Crossing',
    address: 'Vamenta Blvd × Max Suniel St',
    barangay: 'Carmen',
    lat: 8.4842,
    lng: 124.6338,
    routeIds: ['R01', 'R05', 'R10', 'R1', 'R5', 'C2'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'X04',
    kind: 'transfer',
    name: 'Limketkai Rotunda',
    address: 'Limketkai Drive × C.M. Recto',
    barangay: 'Lapasan',
    lat: 8.4835,
    lng: 124.6527,
    routeIds: ['R02', 'R03', 'R2', 'R3'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'X05',
    kind: 'transfer',
    name: 'Gusa Crossing',
    address: 'C.M. Recto Highway, Gusa',
    barangay: 'Gusa',
    lat: 8.4775,
    lng: 124.6830,
    routeIds: ['R03', 'R04', 'R3', 'R4'],
    status: 'Active',
    notes: ''
  },
  {
    id: 'X06',
    kind: 'transfer',
    name: 'Bulua Crossing',
    address: 'Iligan–CDO Highway, Bulua',
    barangay: 'Bulua',
    lat: 8.5036,
    lng: 124.6120,
    routeIds: ['R01', 'R10', 'R1'],
    status: 'Inactive',
    notes: 'Closed for flyover construction.'
  }
];

async function seed() {
  await db.execute('DELETE FROM transit_locations');
  for (const l of locations) {
    await db.execute(
      `INSERT INTO transit_locations (id, kind, name, address, barangay, lat, lng, route_ids, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [l.id, l.kind, l.name, l.address, l.barangay, l.lat, l.lng, JSON.stringify(l.routeIds), l.status, l.notes]
    );
  }
  const [cnt] = await db.execute('SELECT count(*) c FROM transit_locations');
  console.log('Successfully seeded transit_locations in MySQL. Count:', cnt[0].c);
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
