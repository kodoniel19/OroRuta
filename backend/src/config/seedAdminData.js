const pool = require('./db');

async function seedAdminData() {
  console.log('Checking and seeding admin tables if empty...');

  // 1. Transit Locations
  const [[locCount]] = await pool.query('SELECT COUNT(*) as cnt FROM transit_locations');
  if (locCount.cnt === 0) {
    const locations = [
      { id: 'T01', kind: 'terminal', name: 'Agora Integrated Terminal', address: 'C.M. Recto Ave, Lapasan', barangay: 'Lapasan', lat: 8.4857, lng: 124.6589, routeIds: ['r-01', 'r-02', 'r-03'], status: 'Active', notes: 'Eastbound hub. Bugo-bound units load at Bay 4.' },
      { id: 'T02', kind: 'terminal', name: 'Bulua Integrated Bus & Jeepney Terminal', address: 'Iligan–CDO Highway, Bulua', barangay: 'Bulua', lat: 8.504, lng: 124.6115, routeIds: ['r-01', 'r-02'], status: 'Active', notes: 'Westbound hub shared with provincial buses.' },
      { id: 'T03', kind: 'terminal', name: 'Cogon Market Jeepney Terminal', address: 'Osmeña St, Cogon', barangay: 'Brgy. 34 (Cogon)', lat: 8.4735, lng: 124.6497, routeIds: ['r-01', 'r-02', 'r-03', 'r-04', 'r-05'], status: 'Active', notes: 'Busiest downtown terminal.' },
      { id: 'T04', kind: 'terminal', name: 'Divisoria Terminal (Tirso Neri St)', address: 'Tirso Neri St, Poblacion', barangay: 'Brgy. 1 (Poblacion)', lat: 8.4777, lng: 124.6452, routeIds: ['r-01', 'r-05', 'r-06'], status: 'Active', notes: '' },
      { id: 'T05', kind: 'terminal', name: 'Carmen Market Terminal', address: 'Vamenta Blvd, Carmen', barangay: 'Carmen', lat: 8.4845, lng: 124.6335, routeIds: ['r-01', 'r-03'], status: 'Active', notes: '' },
      { id: 'T06', kind: 'terminal', name: 'Puerto Terminal', address: 'Butuan–CDO Highway, Puerto', barangay: 'Puerto', lat: 8.499, lng: 124.742, routeIds: ['r-04'], status: 'Active', notes: '' },
      { id: 'T07', kind: 'terminal', name: 'Bugo Terminal', address: 'Butuan–CDO Highway, Bugo', barangay: 'Bugo', lat: 8.507, lng: 124.756, routeIds: ['r-04'], status: 'Under Review', notes: 'Relocation proposal under review by RTA.' },
      { id: 'L01', kind: 'loading', name: 'Limketkai Center Loading Bay', address: 'Limketkai Drive, Lapasan', barangay: 'Lapasan', lat: 8.4838, lng: 124.653, routeIds: ['r-02', 'r-03'], status: 'Active', notes: '' },
      { id: 'L02', kind: 'loading', name: 'Xavier University – Corrales Ave', address: 'Corrales Ave, Brgy. 13', barangay: 'Brgy. 13 (Poblacion)', lat: 8.479, lng: 124.646, routeIds: ['r-01', 'r-05'], status: 'Active', notes: 'Heavy student volume 6–8 AM.' },
      { id: 'L03', kind: 'loading', name: 'SM CDO Downtown Premier Bay', address: 'Claro M. Recto Ave, Lapasan', barangay: 'Lapasan', lat: 8.4868, lng: 124.6557, routeIds: ['r-02', 'r-03', 'r-04'], status: 'Active', notes: '' },
      { id: 'L04', kind: 'loading', name: 'Capitol University Loading Zone', address: 'Corrales Ext., Gusa', barangay: 'Gusa', lat: 8.4815, lng: 124.6655, routeIds: ['r-03', 'r-04'], status: 'Under Review', notes: 'Reported as informal stop — validating with RTA.' },
      { id: 'L05', kind: 'loading', name: 'Liceo de Cagayan University', address: 'Rodolfo N. Pelaez Blvd, Kauswagan', barangay: 'Kauswagan', lat: 8.487, lng: 124.638, routeIds: ['r-06'], status: 'Active', notes: '' },
      { id: 'L06', kind: 'loading', name: 'Centrio Mall – C.M. Recto', address: 'C.M. Recto Ave, Brgy. 13', barangay: 'Brgy. 13 (Poblacion)', lat: 8.48, lng: 124.6448, routeIds: ['r-01', 'r-05'], status: 'Inactive', notes: 'Suspended during sidewalk works.' },
      { id: 'L07', kind: 'loading', name: 'USTP Lapasan Gate', address: 'C.M. Recto Ave, Lapasan', barangay: 'Lapasan', lat: 8.4852, lng: 124.6572, routeIds: ['r-02', 'r-03', 'r-04'], status: 'Active', notes: '' },
      { id: 'U01', kind: 'unloading', name: 'Cogon Market – Osmeña St Drop-off', address: 'Osmeña St, Cogon', barangay: 'Brgy. 34 (Cogon)', lat: 8.474, lng: 124.649, routeIds: ['r-02', 'r-07'], status: 'Active', notes: '' },
      { id: 'U02', kind: 'unloading', name: 'Velez St near Gaisano Main', address: 'Velez St, Poblacion', barangay: 'Brgy. 25 (Poblacion)', lat: 8.477, lng: 124.6445, routeIds: ['r-01', 'r-05'], status: 'Active', notes: '' },
      { id: 'U03', kind: 'unloading', name: 'Carmen Public Market Drop-off', address: 'Vamenta Blvd, Carmen', barangay: 'Carmen', lat: 8.485, lng: 124.633, routeIds: ['r-01', 'r-05'], status: 'Active', notes: '' },
      { id: 'U04', kind: 'unloading', name: 'SM CDO Uptown – Masterson Ave', address: 'Masterson Ave, Upper Carmen', barangay: 'Upper Carmen', lat: 8.457, lng: 124.6305, routeIds: ['r-08'], status: 'Under Review', notes: '' },
      { id: 'U05', kind: 'unloading', name: 'Gaisano City – Lapasan', address: 'C.M. Recto Ave, Lapasan', barangay: 'Lapasan', lat: 8.485, lng: 124.6555, routeIds: ['r-02', 'r-03'], status: 'Active', notes: 'New zone effective Sept 20.' },
      { id: 'U06', kind: 'unloading', name: 'Macasandig Barangay Hall', address: 'Macasandig Road', barangay: 'Macasandig', lat: 8.4625, lng: 124.6505, routeIds: ['r-07'], status: 'Active', notes: '' },
      { id: 'X01', kind: 'transfer', name: 'Cogon Rotunda Transfer Hub', address: 'Osmeña St × Capistrano St', barangay: 'Brgy. 34 (Cogon)', lat: 8.4738, lng: 124.6493, routeIds: ['r-01', 'r-02', 'r-03'], status: 'Active', notes: '' },
      { id: 'X02', kind: 'transfer', name: 'Agora Transfer Point', address: 'C.M. Recto Ave, Lapasan', barangay: 'Lapasan', lat: 8.4859, lng: 124.6592, routeIds: ['r-02', 'r-03', 'r-04'], status: 'Active', notes: '' },
      { id: 'X03', kind: 'transfer', name: 'Carmen Crossing', address: 'Vamenta Blvd × Max Suniel St', barangay: 'Carmen', lat: 8.4842, lng: 124.6338, routeIds: ['r-01', 'r-05'], status: 'Active', notes: '' },
      { id: 'X04', kind: 'transfer', name: 'Limketkai Rotunda', address: 'Limketkai Drive × C.M. Recto', barangay: 'Lapasan', lat: 8.4835, lng: 124.6527, routeIds: ['r-02', 'r-03'], status: 'Active', notes: '' },
      { id: 'X05', kind: 'transfer', name: 'Gusa Crossing', address: 'C.M. Recto Highway, Gusa', barangay: 'Gusa', lat: 8.4775, lng: 124.683, routeIds: ['r-03', 'r-04'], status: 'Active', notes: '' },
      { id: 'X06', kind: 'transfer', name: 'Bulua Crossing', address: 'Iligan–CDO Highway, Bulua', barangay: 'Bulua', lat: 8.5036, lng: 124.612, routeIds: ['r-01'], status: 'Inactive', notes: 'Closed for flyover construction.' },
    ];
    for (const l of locations) {
      await pool.query(
        `INSERT INTO transit_locations (id, kind, name, address, barangay, lat, lng, route_ids, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [l.id, l.kind, l.name, l.address, l.barangay, l.lat, l.lng, JSON.stringify(l.routeIds), l.status, l.notes]
      );
    }
    console.log(`Seeded ${locations.length} transit locations.`);
  }

  // 2. Admin Fares
  const [[fareCount]] = await pool.query('SELECT COUNT(*) as cnt FROM admin_fares');
  if (fareCount.cnt === 0) {
    const fares = [
      { id: 'F01', vehicle: 'Traditional Jeepney', category: 'Regular', baseFare: 13, perKm: 1.8, effectiveDate: '2025-10-08', status: 'Current' },
      { id: 'F02', vehicle: 'Traditional Jeepney', category: 'Student', baseFare: 10.4, perKm: 1.44, effectiveDate: '2025-10-08', status: 'Current' },
      { id: 'F03', vehicle: 'Traditional Jeepney', category: 'Senior Citizen', baseFare: 10.4, perKm: 1.44, effectiveDate: '2025-10-08', status: 'Current' },
      { id: 'F04', vehicle: 'Traditional Jeepney', category: 'PWD', baseFare: 10.4, perKm: 1.44, effectiveDate: '2025-10-08', status: 'Current' },
      { id: 'F05', vehicle: 'Modern Jeepney', category: 'Regular', baseFare: 15, perKm: 2.2, effectiveDate: '2025-10-08', status: 'Current' },
      { id: 'F06', vehicle: 'Modern Jeepney', category: 'Student', baseFare: 12, perKm: 1.76, effectiveDate: '2025-10-08', status: 'Current' },
      { id: 'F07', vehicle: 'Modern Jeepney', category: 'Senior Citizen', baseFare: 12, perKm: 1.76, effectiveDate: '2025-10-08', status: 'Current' },
      { id: 'F08', vehicle: 'Modern Jeepney', category: 'PWD', baseFare: 12, perKm: 1.76, effectiveDate: '2025-10-08', status: 'Current' },
      { id: 'F09', vehicle: 'Traditional Jeepney', category: 'Regular', baseFare: 14, perKm: 1.9, effectiveDate: '2026-10-15', status: 'Scheduled' },
      { id: 'F10', vehicle: 'Traditional Jeepney', category: 'Regular', baseFare: 12, perKm: 1.5, effectiveDate: '2023-10-08', status: 'Archived' },
    ];
    for (const f of fares) {
      await pool.query(
        `INSERT INTO admin_fares (id, vehicle, category, base_fare, per_km, effective_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [f.id, f.vehicle, f.category, f.baseFare, f.perKm, f.effectiveDate, f.status]
      );
    }
    console.log(`Seeded ${fares.length} admin fare rules.`);
  }

  // 3. Reports
  const [[repCount]] = await pool.query('SELECT COUNT(*) as cnt FROM reports');
  if (repCount.cnt === 0) {
    // ensure anonymous device exists
    await pool.query("INSERT IGNORE INTO devices (id) VALUES ('device-anon-default')");
    const reports = [
      { id: 'RP-1042', ref: 'RP-1042', type: 'Incorrect route information', desc: 'R05 jeepneys no longer pass Vamenta Blvd in the afternoon. Drivers use Masterson Ave instead and skip Carmen Market.', routeId: 'r-05', loc: 'Carmen, Vamenta Blvd', status: 'pending' },
      { id: 'RP-1041', ref: 'RP-1041', type: 'Route change', desc: 'Flooding at the Macasandig bridge approach. Jeepneys are turning back at Pacana St.', routeId: 'r-07', loc: 'Macasandig bridge', status: 'pending' },
      { id: 'RP-1040', ref: 'RP-1040', type: 'Other', desc: 'I was charged ₱15 for a student fare from Agora to Cogon.', routeId: 'r-02', loc: 'Agora Integrated Terminal', status: 'verified', note: 'Confirmed with LTFRB matrix — student fare should be ₱10.40.' },
      { id: 'RP-1039', ref: 'RP-1039', type: 'Incorrect loading point', desc: "There's a loading point in front of Capitol University that isn't shown in the app.", routeId: 'r-03', loc: 'Corrales Ext., Gusa', status: 'pending' },
      { id: 'RP-1038', ref: 'RP-1038', type: 'Other', desc: "The offline map didn't load the Bugo area even after downloading.", routeId: null, loc: 'Bugo', status: 'resolved', note: 'Tile coverage extended east to Bugo in bundle v2026.09.3.' },
      { id: 'RP-1037', ref: 'RP-1037', type: 'Incorrect route information', desc: 'The app says R09 goes to Divisoria but it ends at Cogon now.', routeId: 'r-08', loc: 'Cogon Market', status: 'rejected', note: 'Checked with operators — still terminates at Divisoria per LPTRP.' },
    ];
    for (const r of reports) {
      await pool.query(
        `INSERT INTO reports (id, reference_no, device_id, type, description, location_text, status, route_id)
         VALUES (?, ?, 'device-anon-default', ?, ?, ?, ?, ?)`,
        [r.id, r.ref, r.type, r.desc, r.loc, r.status, r.routeId]
      );
      if (r.note) {
        await pool.query(
          `INSERT INTO report_notes (report_id, author, text) VALUES (?, 'Maria Santos', ?)`,
          [r.id, r.note]
        );
      }
    }
    console.log(`Seeded ${reports.length} user reports.`);
  }

  // 4. Admin Activity
  const [[actCount]] = await pool.query('SELECT COUNT(*) as cnt FROM admin_activity');
  if (actCount.cnt === 0) {
    const activities = [
      { id: 'ACT-1', route_id: 'R3', action: 'Rerouted', detail: 'Path updated via map editor (22 points)', admin_by: 'Maria Santos' },
      { id: 'ACT-2', route_id: 'R5', action: 'Fare updated', detail: 'Regular fare updated to ₱15.00', admin_by: 'Maria Santos' },
      { id: 'ACT-3', route_id: 'R7', action: 'Activated', detail: 'Route activated after review', admin_by: 'Maria Santos' },
    ];
    for (const a of activities) {
      await pool.query(
        `INSERT INTO admin_activity (id, route_id, action, detail, admin_by) VALUES (?, ?, ?, ?, ?)`,
        [a.id, a.route_id, a.action, a.detail, a.admin_by]
      );
    }
    console.log(`Seeded ${activities.length} activity records.`);
  }
}

if (require.main === module) {
  seedAdminData().then(() => process.exit(0)).catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = seedAdminData;
