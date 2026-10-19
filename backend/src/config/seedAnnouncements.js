const db = require('./db');

async function seedAnnouncements() {
  try {
    await db.query(`
      INSERT IGNORE INTO announcements (id, title, date, category, description, effective, status) VALUES
      ('a-01','R5 Route Rerouting via National Highway','2024-09-01','Rerouting',
       'Route R5 (Bulua – Cogon) is temporarily rerouted due to ongoing road rehabilitation along the original path. Jeepneys will now travel via an alternative segment of National Highway.',
       'September 1 – October 15, 2024','Active'),
      ('a-02','R8 Route Update: New Loading Points','2024-09-10','Loading point change',
       'Route R8 (Carmen – Agora) now has updated loading and unloading designations near Limketkai Center. Please refer to the updated stop list.',
       'Effective September 10, 2024','Updated'),
      ('a-03','R10 Temporary Route: Patag – Cogon','2024-09-05','Route update',
       'Route R10 is operating on a temporary route alignment due to flooding affecting Masterson Ave. Service may be limited during heavy rains.',
       'Until further notice','Temporary'),
      ('a-04','Terminal Consolidation at Cogon Market','2024-08-20','Terminal change',
       'Loading and unloading designations at Cogon Market Terminal have been reorganized. Multiple routes are affected. Please observe updated signage.',
       'Effective August 20, 2024','Updated'),
      ('a-05','Expired Notice: Road Repairs at Gusa Rd','2024-07-01','Road closure',
       'Road repairs along Gusa Rd have been completed. Route R12 has resumed normal operations.',
       'Ended July 20, 2024','Expired');
    `);

    await db.query(`
      INSERT IGNORE INTO announcement_details (announcement_id, seq, text) VALUES
      ('a-01',1,'All R5 jeepneys will use the detour via National Highway bypassing the usual segment.'),
      ('a-01',2,'Expect longer travel time of approximately 10–15 additional minutes.'),
      ('a-01',3,'Loading and unloading designations remain the same at both terminals.'),
      ('a-02',1,'New loading zone is now 50 meters north of the previous stop near Limketkai Center.'),
      ('a-02',2,'Unloading for Agora-bound passengers has been adjusted near the eastern gate.'),
      ('a-03',1,'Alternative route avoids the flood-prone section of Masterson Ave.'),
      ('a-03',2,'Service frequency may be reduced during typhoon season.'),
      ('a-04',1,'Route R3, R5, R12, R2, and R1 are all affected by the terminal reorganization.'),
      ('a-04',2,'New loading bays are designated per route at the terminal.'),
      ('a-05',1,'Road repairs have been completed ahead of schedule.'),
      ('a-05',2,'R12 now runs on its original path through Gusa Rd.');
    `);

    const [[r5]] = await db.query("SELECT id FROM routes WHERE code='R5' LIMIT 1");
    const [[r1]] = await db.query("SELECT id FROM routes WHERE code='R1' LIMIT 1");
    const [[r2]] = await db.query("SELECT id FROM routes WHERE code='R2' LIMIT 1");
    const [[r3]] = await db.query("SELECT id FROM routes WHERE code='R3' LIMIT 1");

    if (r5) await db.query("INSERT IGNORE INTO announcement_routes (announcement_id, route_id) VALUES ('a-01', ?)", [r5.id]);
    if (r1) await db.query("INSERT IGNORE INTO announcement_routes (announcement_id, route_id) VALUES ('a-04', ?)", [r1.id]);
    if (r2) await db.query("INSERT IGNORE INTO announcement_routes (announcement_id, route_id) VALUES ('a-04', ?)", [r2.id]);
    if (r3) {
      await db.query("INSERT IGNORE INTO announcement_routes (announcement_id, route_id) VALUES ('a-04', ?)", [r3.id]);
      await db.query("INSERT IGNORE INTO announcement_routes (announcement_id, route_id) VALUES ('a-05', ?)", [r3.id]);
    }

    // Also seed content pages, help topics, faqs from seed.sql if empty
    const [[{ pageCount }]] = await db.query("SELECT COUNT(*) pageCount FROM content_pages");
    if (pageCount === 0) {
      const privacySections = JSON.stringify([
        {"heading":"Information We Collect","body":"OroRuta does not require account registration. We collect an anonymous device identifier (UUID) generated on your device to save your route history and preferences locally. We do not collect your name, email address, phone number, or any personally identifiable information."},
        {"heading":"Location Data","body":"With your permission, OroRuta accesses your device GPS to show your current location on the map and provide step-by-step navigation assistance. Your location data is processed on-device and is not transmitted to our servers. We do not track jeepney positions."},
        {"heading":"Usage Data","body":"We collect anonymized search history (origin and destination pairs) associated with your device ID to improve route suggestions. This data does not identify you personally."},
        {"heading":"Data Retention","body":"Search history and saved routes are stored on your device via the app database. You can clear this data at any time from the More screen."},
        {"heading":"Third-Party Services","body":"OroRuta uses Google Maps SDK for Android for map tile rendering and location services. Google has its own privacy policy. We do not share your data with other third parties."},
        {"heading":"Contact","body":"For privacy concerns, contact the research team at the College of Information Technology, Liceo de Cagayan University."}
      ]);
      const termsSections = JSON.stringify([
        {"heading":"Use of Information","body":"All route information in OroRuta is based on sample research data derived from the Cagayan de Oro Land Public Transportation Route Plan (LPTRP). This data is provided for academic and informational purposes only."},
        {"heading":"Fare Estimates","body":"Fare estimates shown in the app are calculated using the LTFRB minimum fare of ₱13.00 for the first 4 km and ₱1.80 per succeeding km. These are estimates only and may not reflect current LTFRB-approved fares. Always confirm fares with official sources."},
        {"heading":"Route Accuracy","body":"Route alignments, stop locations, and terminal information are approximate and based on research data. Actual jeepney routes may vary. OroRuta is not responsible for inaccurate route information."},
        {"heading":"No Jeepney Tracking","body":"OroRuta does NOT track jeepney positions. GPS is used solely for the user's own location and navigation assistance."},
        {"heading":"User Reports","body":"Reports submitted through the app are user-generated and have not been verified. They should not be treated as official information without proper verification."},
        {"heading":"Limitation of Liability","body":"The developers of OroRuta shall not be liable for any damages arising from reliance on the information provided in this app. Use at your own discretion."},
        {"heading":"Academic Research","body":"OroRuta is developed as part of a BSIT research project at the College of Information Technology, Liceo de Cagayan University. It references the CDO LPTRP and aligns with UN SDG 9 (Industry, Innovation and Infrastructure), SDG 11 (Sustainable Cities and Communities), and SDG 13 (Climate Action)."}
      ]);

      await db.query(
        "INSERT IGNORE INTO content_pages (slug, title, sections) VALUES (?, ?, ?), (?, ?, ?)",
        ['privacy', 'Privacy Policy', privacySections, 'terms', 'Terms & Disclaimer', termsSections]
      );
    }

    const [[{ helpCount }]] = await db.query("SELECT COUNT(*) helpCount FROM help_topics");
    if (helpCount === 0) {
      await db.query(`
        INSERT IGNORE INTO help_topics (seq, title, body) VALUES
        (1,'How OroRuta works','OroRuta is a jeepney route guide for Cagayan de Oro City. It helps you find jeepney routes, view route details, estimate fares, and navigate step-by-step using your phone\\'s GPS. All data is based on the CDO LPTRP. No account is needed — the app works as a guest.'),
        (2,'How to search for a route','From the Home screen, tap \"Where are you going?\" to open the search. Enter your starting location (or use your GPS location) and your destination. Tap \"Search Route\" to see available jeepney routes. You can sort results by travel time, fare, walking distance, or number of transfers.'),
        (3,'How to read jeepney routes','Each route has a code (e.g., R3), a color, and shows the origin and destination. The status pill shows if the route is Active, Rerouted, Updated, or Temporary. Tap a route to see detailed stops: Terminals (T), Loading points (L), Unloading points (U), and Transfer points.'),
        (4,'GPS navigation','Tap \"Start Navigation\" on any route result to begin step-by-step navigation. The app uses your phone\\'s GPS to track your position and auto-advance walking steps when you are within 30 meters of the next point. Jeepneys are not tracked — only your own location is used.'),
        (5,'Offline routes','You can download individual routes for offline use from the Route Information screen. Downloaded routes are available without internet. Go to More > Offline Routes to manage your downloads. The city map is also available for offline viewing once synced.');
      `);
    }

    const [[{ faqCount }]] = await db.query("SELECT COUNT(*) faqCount FROM faqs");
    if (faqCount === 0) {
      await db.query(`
        INSERT IGNORE INTO faqs (seq, q, a) VALUES
        (1,'Is OroRuta free to use?','Yes, OroRuta is completely free. No account, subscription, or payment is required.'),
        (2,'Do I need to create an account?','No. OroRuta works as a guest app. Your saved routes and history are stored on your device using an anonymous device ID.'),
        (3,'Are jeepney locations tracked in real time?','No. OroRuta does not track jeepney positions. GPS is used only for your own location and navigation.'),
        (4,'Are the fares shown exact?','Fares are estimates based on the LTFRB minimum fare schedule (₱13.00 for the first 4 km, ₱1.80 per km thereafter). Actual fares may differ. Always check with official sources.'),
        (5,'What if my route is not found?','OroRuta currently covers jeepney routes within Cagayan de Oro City based on the CDO LPTRP. If your route is not found, try changing your starting location or destination, or browse all routes in the Routes tab.'),
        (6,'How accurate are the stop locations?','Stop locations are based on research data and are approximate. Exact positions on the ground may vary slightly. If you find an error, please use the \"Report an Issue\" feature.'),
        (7,'Can I use the app without GPS?','Yes. You can manually enter your starting location instead of using GPS. Route search, route details, and offline content all work without GPS.'),
        (8,'How do I save a route?','On any Route Details or Result screen, tap the bookmark icon to save the route. Saved routes appear in the Saved tab.'),
        (9,'What does \\'Rerouted\\' mean?','A Rerouted status means the jeepney currently follows a different path from its usual route, often due to road closures or construction. Check the related announcement for details.'),
        (10,'How do I report incorrect information?','Go to More > Report an Issue. Select the type of issue, describe it, and submit. Reports are reviewed before being treated as official.'),
        (11,'What are the supported languages?','OroRuta supports English, Cebuano (Bisaya), and Filipino. Change the language from More > Preferences > Language.'),
        (12,'Does OroRuta work offline?','Yes, partially. Download routes from the Route Information screen for offline access. Downloaded routes and the city map are available without internet.');
      `);
    }

    console.log('Announcements and help data successfully verified/seeded.');
  } catch (err) {
    console.error('Error seeding announcements:', err);
  }
}

if (require.main === module) {
  seedAnnouncements().then(() => process.exit(0));
}

module.exports = seedAnnouncements;
