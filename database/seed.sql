-- OroRuta Seed Data
-- Sample research data based on CDO LPTRP
-- College of Information Technology, Liceo de Cagayan University (BSIT)
USE ororuta;

-- ─── FARE RULES ────────────────────────────────────────────
INSERT INTO fare_rules (minimum, minimum_km, per_km, discount_rate, effective_from, is_current) VALUES
(13.00, 4.00, 1.80, 0.200, '2024-01-01', 1);

-- ─── MAJOR ROADS ────────────────────────────────────────────
INSERT INTO major_roads (id, name) VALUES
('rd-01','National Highway'),
('rd-02','CM Recto Ave'),
('rd-03','RN Pelaez Blvd'),
('rd-04','Velez St'),
('rd-05','Masterson Ave'),
('rd-06','Max Suniel St'),
('rd-07','Limketkai Dr'),
('rd-08','Agora Rd'),
('rd-09','Kauswagan Rd'),
('rd-10','Patag Rd'),
('rd-11','Osmeña St'),
('rd-12','Gusa Rd');

-- ─── TERMINALS ────────────────────────────────────────────
INSERT INTO terminals (id, name, note, map_x, map_y, lat, lng) VALUES
('t-01','Cogon Market Terminal','Main city terminal at Cogon Market',195,540,8.4792,124.6541),
('t-02','Carmen Terminal','Northern terminus near Carmen Market',185,110,8.5283,124.6473),
('t-03','Bulua Terminal','Western terminus in Bulua area',20,490,8.4731,124.6201),
('t-04','Agora Terminal','Eastern terminal near Agora',370,430,8.4749,124.6642),
('t-05','Gusa Terminal','Gusa area terminal',370,290,8.5012,124.6698),
('t-06','Patag Terminal','Patag upper area',120,50,8.5389,124.6410),
('t-07','Uptown Terminal','SM CDO Uptown area',330,120,8.5198,124.6612),
('t-08','Divisoria Terminal','Divisoria downtown',210,620,8.4722,124.6521),
('t-09','Puerto Terminal','Puerto area',80,680,8.4665,124.6432);

-- ─── LANDMARKS ────────────────────────────────────────────
INSERT INTO landmarks (id, name, map_x, map_y, lat, lng) VALUES
('lm-01','Liceo de Cagayan University',155,265,8.4961,124.6483),
('lm-02','Limketkai Center',295,290,8.4987,124.6601),
('lm-03','Xavier University',170,420,8.4832,124.6503),
('lm-04','Centrio Mall',225,380,8.4821,124.6572),
('lm-05','NMMC',250,340,8.4875,124.6588),
('lm-06','Provincial Capitol',135,460,8.4777,124.6452),
('lm-07','Camp Evangelista',380,220,8.5108,124.6681);

-- ─── PLACES ────────────────────────────────────────────
INSERT INTO places (id, name, area, kind, map_x, map_y, lat, lng) VALUES
('pl-01','Liceo de Cagayan University','Lapasan','school',155,265,8.4961,124.6483),
('pl-02','Limketkai Center','Kauswagan','mall',295,290,8.4987,124.6601),
('pl-03','Cogon Market','Poblacion','market',195,540,8.4792,124.6541),
('pl-04','Divisoria','Poblacion','market',210,620,8.4722,124.6521),
('pl-05','Centrio Mall','Poblacion','mall',225,380,8.4821,124.6572),
('pl-06','Xavier University','Poblacion','school',170,420,8.4832,124.6503),
('pl-07','Carmen Market','Carmen','market',185,110,8.5283,124.6473),
('pl-08','Agora Terminal','Kauswagan','terminal',370,430,8.4749,124.6642),
('pl-09','Bulua Terminal','Bulua','terminal',20,490,8.4731,124.6201),
('pl-10','Provincial Capitol','Poblacion','government',135,460,8.4777,124.6452),
('pl-11','NMMC','Kauswagan','hospital',250,340,8.4875,124.6588),
('pl-12','Gusa','Gusa','landmark',370,290,8.5012,124.6698),
('pl-13','SM CDO Uptown','Carmen','mall',330,120,8.5198,124.6612),
('pl-14','Camp Evangelista','Kauswagan','landmark',380,220,8.5108,124.6681);

-- ─── ROUTES ────────────────────────────────────────────
INSERT INTO routes (id, code, name, origin, destination, jeepney_type, direction, description, length_km, status, color, offline_size_mb, last_updated_at) VALUES
('r-01','R3','Cogon – Carmen','Cogon Market','Carmen',
 'Traditional','Northbound via CM Recto Ave and National Highway',
 'Route R3 travels from Cogon Market Terminal northbound through CM Recto Ave, passes Liceo de Cagayan University, continues along National Highway towards Carmen Market Terminal. This route serves major schools, government offices, and residential areas in the northern corridor.',
 7.8,'Active','#1471B0',0.8,'2024-08-15 00:00:00'),

('r-02','R5','Bulua – Cogon','Bulua','Cogon Market',
 'Modern','Eastbound via National Highway',
 'Route R5 is a modern jeepney route connecting Bulua in the west to Cogon Market Terminal. It travels through National Highway passing through several barangays in the western corridor.',
 8.9,'Rerouted','#1E8A4C',0.9,'2024-09-01 00:00:00'),

('r-03','R12','Cogon – Gusa','Cogon Market','Gusa',
 'Traditional','Eastbound via CM Recto Ave and Kauswagan Rd',
 'Route R12 connects Cogon Market to the Gusa area traveling eastward. It passes through the Kauswagan commercial district and serves residential communities in Gusa.',
 6.1,'Active','#C0362C',0.7,'2024-07-20 00:00:00'),

('r-04','R8','Carmen – Agora','Carmen','Agora Terminal',
 'Modern','Southbound via National Highway and Limketkai Dr',
 'Route R8 is a modern jeepney route connecting Carmen in the north to Agora Terminal in the southeast. It passes through Limketkai Center and Kauswagan area.',
 7.4,'Updated','#7C3AED',0.8,'2024-09-10 00:00:00'),

('r-05','R1','Bulua – Agora','Bulua','Agora Terminal',
 'Traditional','Eastbound via National Highway',
 'Route R1 is one of the longest traditional routes, connecting Bulua Terminal in the west to Agora Terminal in the east. It passes through the central business district.',
 9.5,'Active','#D97706',1.0,'2024-06-30 00:00:00'),

('r-06','R10','Patag – Cogon','Patag','Cogon Market',
 'Traditional','Southbound via Masterson Ave and CM Recto Ave',
 'Route R10 travels from Patag in the upper northern area southbound to Cogon Market Terminal. It serves communities along Masterson Ave and passes through the Liceo area.',
 9.2,'Temporary','#0F766E',1.0,'2024-09-05 00:00:00'),

('r-07','R14','Uptown – Divisoria','SM CDO Uptown','Divisoria',
 'Modern','Southbound via Kauswagan Rd and CM Recto Ave',
 'Route R14 is a modern jeepney route connecting SM CDO Uptown in the north to Divisoria in the south. It serves the Kauswagan commercial corridor and downtown area.',
 8.6,'Active','#DB2777',0.9,'2024-08-01 00:00:00'),

('r-08','R2','Puerto – Cogon','Puerto','Cogon Market',
 'Traditional','Northbound via Osmeña St and CM Recto Ave',
 'Route R2 travels from Puerto in the south northbound to Cogon Market Terminal. It passes through the port area and Osmeña St.',
 10.4,'Active','#475569',1.1,'2024-07-15 00:00:00');

-- ─── ROUTE–TERMINAL RELATIONSHIPS ────────────────────────────────────────────
INSERT INTO route_terminals (route_id, terminal_id, seq) VALUES
('r-01','t-01',1),('r-01','t-02',2),
('r-02','t-03',1),('r-02','t-01',2),
('r-03','t-01',1),('r-03','t-05',2),
('r-04','t-02',1),('r-04','t-04',2),
('r-05','t-03',1),('r-05','t-04',2),
('r-06','t-06',1),('r-06','t-01',2),
('r-07','t-07',1),('r-07','t-08',2),
('r-08','t-09',1),('r-08','t-01',2);

-- ─── ROUTE–ROAD RELATIONSHIPS ────────────────────────────────────────────
INSERT INTO route_major_roads (route_id, road_id, seq) VALUES
('r-01','rd-02',1),('r-01','rd-01',2),
('r-02','rd-01',1),
('r-03','rd-02',1),('r-03','rd-09',2),
('r-04','rd-01',1),('r-04','rd-07',2),
('r-05','rd-01',1),
('r-06','rd-05',1),('r-06','rd-02',2),
('r-07','rd-09',1),('r-07','rd-02',2),
('r-08','rd-11',1),('r-08','rd-02',2);

-- ─── ROUTE–LANDMARK RELATIONSHIPS ────────────────────────────────────────────
INSERT INTO route_landmarks (route_id, landmark_id, seq) VALUES
('r-01','lm-01',1),('r-01','lm-03',2),
('r-03','lm-02',1),
('r-04','lm-02',1),
('r-06','lm-01',1),
('r-07','lm-02',1);

-- ─── ROUTE PATH POINTS (simplified) ────────────────────────────────────────────
-- R3: Cogon → Carmen (northbound)
INSERT INTO route_path_points (route_id, seq, map_x, map_y, lat, lng) VALUES
('r-01',1,195,540,8.4792,124.6541),
('r-01',2,185,480,8.4850,124.6520),
('r-01',3,175,400,8.4900,124.6500),
('r-01',4,165,320,8.4940,124.6490),
('r-01',5,160,250,8.4970,124.6480),
('r-01',6,175,180,8.5080,124.6475),
('r-01',7,185,110,8.5283,124.6473);
-- R5: Bulua → Cogon (eastbound)
INSERT INTO route_path_points (route_id, seq, map_x, map_y, lat, lng) VALUES
('r-02',1,20,490,8.4731,124.6201),
('r-02',2,60,490,8.4735,124.6280),
('r-02',3,100,490,8.4738,124.6360),
('r-02',4,140,510,8.4770,124.6430),
('r-02',5,195,540,8.4792,124.6541);
-- R12: Cogon → Gusa (eastbound)
INSERT INTO route_path_points (route_id, seq, map_x, map_y, lat, lng) VALUES
('r-03',1,195,540,8.4792,124.6541),
('r-03',2,230,480,8.4830,124.6570),
('r-03',3,270,400,8.4880,124.6600),
('r-03',4,310,340,8.4940,124.6640),
('r-03',5,370,290,8.5012,124.6698);
-- R8: Carmen → Agora (southbound)
INSERT INTO route_path_points (route_id, seq, map_x, map_y, lat, lng) VALUES
('r-04',1,185,110,8.5283,124.6473),
('r-04',2,220,180,8.5200,124.6520),
('r-04',3,270,260,8.5100,124.6580),
('r-04',4,310,340,8.4990,124.6630),
('r-04',5,340,380,8.4880,124.6640),
('r-04',6,370,430,8.4749,124.6642);
-- R1: Bulua → Agora
INSERT INTO route_path_points (route_id, seq, map_x, map_y, lat, lng) VALUES
('r-05',1,20,490,8.4731,124.6201),
('r-05',2,80,490,8.4738,124.6310),
('r-05',3,150,490,8.4750,124.6420),
('r-05',4,200,490,8.4755,124.6510),
('r-05',5,270,460,8.4760,124.6570),
('r-05',6,320,450,8.4755,124.6620),
('r-05',7,370,430,8.4749,124.6642);
-- R10: Patag → Cogon
INSERT INTO route_path_points (route_id, seq, map_x, map_y, lat, lng) VALUES
('r-06',1,120,50,8.5389,124.6410),
('r-06',2,140,130,8.5280,124.6440),
('r-06',3,155,210,8.5150,124.6465),
('r-06',4,160,290,8.5010,124.6475),
('r-06',5,165,380,8.4900,124.6480),
('r-06',6,180,460,8.4840,124.6510),
('r-06',7,195,540,8.4792,124.6541);
-- R14: Uptown → Divisoria
INSERT INTO route_path_points (route_id, seq, map_x, map_y, lat, lng) VALUES
('r-07',1,330,120,8.5198,124.6612),
('r-07',2,310,200,8.5100,124.6610),
('r-07',3,290,290,8.5000,124.6605),
('r-07',4,270,380,8.4900,124.6600),
('r-07',5,240,460,8.4820,124.6560),
('r-07',6,220,560,8.4750,124.6530),
('r-07',7,210,620,8.4722,124.6521);
-- R2: Puerto → Cogon
INSERT INTO route_path_points (route_id, seq, map_x, map_y, lat, lng) VALUES
('r-08',1,80,680,8.4665,124.6432),
('r-08',2,100,620,8.4700,124.6450),
('r-08',3,130,560,8.4740,124.6470),
('r-08',4,160,500,8.4770,124.6500),
('r-08',5,190,540,8.4792,124.6541);

-- ─── LOADING / UNLOADING POINTS ────────────────────────────────────────────
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng) VALUES
-- R3 loading points
('lp-r01-01','r-01','Cogon Market Loading','Near main terminal gate','loading',195,540,8.4792,124.6541),
('lp-r01-02','r-01','CM Recto Loading – Liceo Area','In front of Liceo University','loading',160,280,8.4958,124.6483),
('lp-r01-03','r-01','Carmen Loading','Near Carmen Market','loading',185,130,8.5260,124.6475),
('lp-r01-u1','r-01','CM Recto Unloading – Xavier','Near Xavier University','unloading',170,420,8.4832,124.6503),
('lp-r01-u2','r-01','Carmen Unloading','Near Carmen Terminal','unloading',185,110,8.5283,124.6473),
-- R3 (R12) loading points
('lp-r03-01','r-03','Cogon Market Loading','Near main terminal gate','loading',195,540,8.4792,124.6541),
('lp-r03-02','r-03','Kauswagan Loading – Limketkai','Near Limketkai Center','loading',290,295,8.4990,124.6600),
('lp-r03-u1','r-03','Gusa Unloading','Near Gusa Terminal','unloading',370,290,8.5012,124.6698),
-- R8
('lp-r04-01','r-04','Limketkai Loading','Near Limketkai main entrance','loading',295,290,8.4987,124.6601),
('lp-r04-u1','r-04','Agora Unloading','Near Agora Terminal','unloading',370,430,8.4749,124.6642),
-- R10
('lp-r06-01','r-06','Patag Loading','Patag Terminal area','loading',120,50,8.5389,124.6410),
('lp-r06-02','r-06','Masterson Ave Loading – Liceo','Near Liceo University','loading',158,268,8.4961,124.6483),
('lp-r06-u1','r-06','Cogon Unloading','Near Cogon Market','unloading',195,540,8.4792,124.6541);

-- ─── TRANSFER POINTS ────────────────────────────────────────────
INSERT INTO transfer_points (id, route_id, name, note, map_x, map_y, lat, lng) VALUES
('tp-01','r-06','Cogon Market Terminal','Transfer from R10 to R12 or other routes',195,540,8.4792,124.6541);

-- ─── TRIP OPTIONS (Liceo → Limketkai) ────────────────────────────────────────────
INSERT INTO trip_options (id, origin_place_id, destination_place_id, minutes, walk_meters, transfers, direction, status,
  boarding_name, boarding_map_x, boarding_map_y, boarding_lat, boarding_lng,
  dropoff_name, dropoff_map_x, dropoff_map_y, dropoff_lat, dropoff_lng,
  transfer_name, transfer_map_x, transfer_map_y) VALUES
-- Option 1: R3 (direct, 27 min)
('to-01','pl-01','pl-02',27,550,0,
 'Take R3 northbound towards Carmen, alight before Limketkai','Active',
 'CM Recto Ave Loading – Liceo Area',160,280,8.4958,124.6483,
 'Kauswagan Loading – Limketkai',290,295,8.4990,124.6600,
 NULL,NULL,NULL),
-- Option 2: R10 + R12 (38 min, 1 transfer at Cogon)
('to-02','pl-01','pl-02',38,800,1,
 'Take R10 to Cogon, transfer to R12 towards Gusa','Temporary',
 'Masterson Ave Loading – Liceo',158,268,8.4961,124.6483,
 'Kauswagan Loading – Limketkai',290,295,8.4990,124.6600,
 'Cogon Market Terminal',195,540),
-- Option 3: R8 (34 min, via Carmen–Agora)
('to-03','pl-01','pl-02',34,1200,0,
 'Take R8 southbound from near Carmen through Limketkai','Updated',
 'CM Recto Loading near Liceo',162,272,8.4960,124.6485,
 'Limketkai Loading',295,290,8.4987,124.6601,
 NULL,NULL,NULL);

-- Trip segments
INSERT INTO trip_segments (trip_option_id, seq, route_id, from_x, from_y, to_x, to_y, km) VALUES
('to-01',1,'r-01',160,280,220,310,3.2),
('to-02',1,'r-06',158,268,195,540,4.6),
('to-02',2,'r-03',195,540,290,295,3.5),
('to-03',1,'r-04',162,272,295,290,5.8);

-- Trip legs — Option 1 (R3 direct)
INSERT INTO trip_legs (trip_option_id, seq, kind, title, detail, minutes, distance_m, route_id, point_x, point_y) VALUES
('to-01',1,'walk','Walk to loading point','Head to CM Recto Ave Loading near Liceo',5,250,'r-01',160,280),
('to-01',2,'board','Board Jeepney R3','Board at CM Recto Ave Loading – Liceo Area',2,0,'r-01',160,280),
('to-01',3,'stay','Ride towards Carmen / Limketkai','Stay on the R3 jeepney, passing through CM Recto Ave',18,3200,'r-01',220,310),
('to-01',4,'alight','Get off at Limketkai area','Alight at Kauswagan Loading near Limketkai Center',1,0,'r-01',290,295),
('to-01',5,'walk','Walk to Limketkai Center','Short walk from drop-off to Limketkai Center main entrance',3,300,'r-01',295,290);

-- Trip legs — Option 2 (R10 + R12)
INSERT INTO trip_legs (trip_option_id, seq, kind, title, detail, minutes, distance_m, route_id, point_x, point_y) VALUES
('to-02',1,'walk','Walk to R10 loading point','Head to Masterson Ave loading stop',5,300,'r-06',158,268),
('to-02',2,'board','Board Jeepney R10','Board at Masterson Ave – Liceo area',2,0,'r-06',158,268),
('to-02',3,'stay','Ride towards Cogon Market','Stay on R10 heading south to Cogon',14,4600,'r-06',185,400),
('to-02',4,'alight','Transfer at Cogon Market Terminal','Alight at Cogon Market Terminal to transfer',1,0,'r-06',195,540),
('to-02',5,'board','Board Jeepney R12','Board R12 towards Gusa at Cogon Terminal',3,0,'r-03',195,540),
('to-02',6,'stay','Ride R12 towards Gusa / Kauswagan','Stay on R12 passing Kauswagan',10,3500,'r-03',250,400),
('to-02',7,'alight','Get off near Limketkai','Alight at Kauswagan – Limketkai stop',1,0,'r-03',290,295),
('to-02',8,'walk','Walk to Limketkai Center','Short walk to the main entrance',5,500,'r-03',295,290);

-- Trip legs — Option 3 (R8)
INSERT INTO trip_legs (trip_option_id, seq, kind, title, detail, minutes, distance_m, route_id, point_x, point_y) VALUES
('to-03',1,'walk','Walk to R8 loading point','Walk to CM Recto loading near Liceo area',7,500,'r-04',162,272),
('to-03',2,'board','Board Jeepney R8','Board at CM Recto loading near Liceo',2,0,'r-04',162,272),
('to-03',3,'stay','Ride towards Agora / Limketkai','Stay on R8, passes through Limketkai area',20,5800,'r-04',260,320),
('to-03',4,'alight','Get off at Limketkai','Alight at Limketkai loading stop',1,0,'r-04',295,290),
('to-03',5,'walk','Walk to destination','Walk to Limketkai Center entrance',6,700,'r-04',295,290);

-- ─── ANNOUNCEMENTS ────────────────────────────────────────────
INSERT INTO announcements (id, title, date, category, description, effective, status) VALUES
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

INSERT INTO announcement_details (announcement_id, seq, text) VALUES
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

INSERT INTO announcement_routes (announcement_id, route_id) VALUES
('a-01','r-02'),
('a-02','r-04'),
('a-03','r-06'),
('a-04','r-01'),('a-04','r-02'),('a-04','r-03'),('a-04','r-05'),('a-04','r-08'),
('a-05','r-03');

-- ─── CONTENT PAGES ────────────────────────────────────────────
INSERT INTO content_pages (slug, title, sections) VALUES
('privacy','Privacy Policy','[{"heading":"Information We Collect","body":"OroRuta does not require account registration. We collect an anonymous device identifier (UUID) generated on your device to save your route history and preferences locally. We do not collect your name, email address, phone number, or any personally identifiable information."},{"heading":"Location Data","body":"With your permission, OroRuta accesses your device GPS to show your current location on the map and provide step-by-step navigation assistance. Your location data is processed on-device and is not transmitted to our servers. We do not track jeepney positions."},{"heading":"Usage Data","body":"We collect anonymized search history (origin and destination pairs) associated with your device ID to improve route suggestions. This data does not identify you personally."},{"heading":"Data Retention","body":"Search history and saved routes are stored on your device via the app database. You can clear this data at any time from the More screen."},{"heading":"Third-Party Services","body":"OroRuta uses Google Maps SDK for Android for map tile rendering and location services. Google has its own privacy policy. We do not share your data with other third parties."},{"heading":"Contact","body":"For privacy concerns, contact the research team at the College of Information Technology, Liceo de Cagayan University."}]'),
('terms','Terms & Disclaimer','[{"heading":"Use of Information","body":"All route information in OroRuta is based on sample research data derived from the Cagayan de Oro Land Public Transportation Route Plan (LPTRP). This data is provided for academic and informational purposes only."},{"heading":"Fare Estimates","body":"Fare estimates shown in the app are calculated using the LTFRB minimum fare of ₱13.00 for the first 4 km and ₱1.80 per succeeding km. These are estimates only and may not reflect current LTFRB-approved fares. Always confirm fares with official sources."},{"heading":"Route Accuracy","body":"Route alignments, stop locations, and terminal information are approximate and based on research data. Actual jeepney routes may vary. OroRuta is not responsible for inaccurate route information."},{"heading":"No Jeepney Tracking","body":"OroRuta does NOT track jeepney positions. GPS is used solely for the user\'s own location and navigation assistance."},{"heading":"User Reports","body":"Reports submitted through the app are user-generated and have not been verified. They should not be treated as official information without proper verification."},{"heading":"Limitation of Liability","body":"The developers of OroRuta shall not be liable for any damages arising from reliance on the information provided in this app. Use at your own discretion."},{"heading":"Academic Research","body":"OroRuta is developed as part of a BSIT research project at the College of Information Technology, Liceo de Cagayan University. It references the CDO LPTRP and aligns with UN SDG 9 (Industry, Innovation and Infrastructure), SDG 11 (Sustainable Cities and Communities), and SDG 13 (Climate Action)."}]');

-- ─── HELP TOPICS ────────────────────────────────────────────
INSERT INTO help_topics (seq, title, body) VALUES
(1,'How OroRuta works','OroRuta is a jeepney route guide for Cagayan de Oro City. It helps you find jeepney routes, view route details, estimate fares, and navigate step-by-step using your phone''s GPS. All data is based on the CDO LPTRP. No account is needed — the app works as a guest.'),
(2,'How to search for a route','From the Home screen, tap "Where are you going?" to open the search. Enter your starting location (or use your GPS location) and your destination. Tap "Search Route" to see available jeepney routes. You can sort results by travel time, fare, walking distance, or number of transfers.'),
(3,'How to read jeepney routes','Each route has a code (e.g., R3), a color, and shows the origin and destination. The status pill shows if the route is Active, Rerouted, Updated, or Temporary. Tap a route to see detailed stops: Terminals (T), Loading points (L), Unloading points (U), and Transfer points.'),
(4,'GPS navigation','Tap "Start Navigation" on any route result to begin step-by-step navigation. The app uses your phone''s GPS to track your position and auto-advance walking steps when you are within 30 meters of the next point. Jeepneys are not tracked — only your own location is used.'),
(5,'Offline routes','You can download individual routes for offline use from the Route Information screen. Downloaded routes are available without internet. Go to More > Offline Routes to manage your downloads. The city map is also available for offline viewing once synced.');

-- ─── FAQs ────────────────────────────────────────────
INSERT INTO faqs (seq, q, a) VALUES
(1,'Is OroRuta free to use?','Yes, OroRuta is completely free. No account, subscription, or payment is required.'),
(2,'Do I need to create an account?','No. OroRuta works as a guest app. Your saved routes and history are stored on your device using an anonymous device ID.'),
(3,'Are jeepney locations tracked in real time?','No. OroRuta does not track jeepney positions. GPS is used only for your own location and navigation.'),
(4,'Are the fares shown exact?','Fares are estimates based on the LTFRB minimum fare schedule (₱13.00 for the first 4 km, ₱1.80 per km thereafter). Actual fares may differ. Always check with official sources.'),
(5,'What if my route is not found?','OroRuta currently covers jeepney routes within Cagayan de Oro City based on the CDO LPTRP. If your route is not found, try changing your starting location or destination, or browse all routes in the Routes tab.'),
(6,'How accurate are the stop locations?','Stop locations are based on research data and are approximate. Exact positions on the ground may vary slightly. If you find an error, please use the "Report an Issue" feature.'),
(7,'Can I use the app without GPS?','Yes. You can manually enter your starting location instead of using GPS. Route search, route details, and offline content all work without GPS.'),
(8,'How do I save a route?','On any Route Details or Result screen, tap the bookmark icon to save the route. Saved routes appear in the Saved tab.'),
(9,'What does ''Rerouted'' mean?','A Rerouted status means the jeepney currently follows a different path from its usual route, often due to road closures or construction. Check the related announcement for details.'),
(10,'How do I report incorrect information?','Go to More > Report an Issue. Select the type of issue, describe it, and submit. Reports are reviewed before being treated as official.'),
(11,'What are the supported languages?','OroRuta supports English, Cebuano (Bisaya), and Filipino. Change the language from More > Preferences > Language.'),
(12,'Does OroRuta work offline?','Yes, partially. Download routes from the Route Information screen for offline access. Downloaded routes and the city map are available without internet.');

-- ─── OFFLINE MAP PACK ────────────────────────────────────────────
INSERT INTO offline_map_pack (version, name, size_mb, updated_at) VALUES
('1.0.0','CDO City Map Pack',4.20,'2024-09-01 00:00:00');

-- ─── MAP BASE GEOMETRY (simplified CDO abstract coordinates) ────────────────────────────────────────────
INSERT INTO map_base (type, name, geometry) VALUES
-- Sea: Macajalar Bay (top area)
('sea','Macajalar Bay','{"type":"polygon","points":[[0,0],[400,0],[400,80],[280,100],[180,90],[80,85],[0,80]]}'),
-- River: Cagayan River
('river','Cagayan River','{"type":"polyline","points":[[155,50],[160,100],[162,170],[160,250],[158,340],[155,440],[160,550],[165,640],[170,720],[175,800]],"strokeWidth":10}'),
-- Parks
('park','Gaston Park','{"type":"polygon","points":[[195,500],[215,500],[215,520],[195,520]]}'),
('park','Macapagal Park','{"type":"polygon","points":[[160,550],[185,550],[185,575],[160,575]]}'),
-- Area labels
('area_label','BULUA','{"type":"label","x":50,"y":490}'),
('area_label','KAUSWAGAN','{"type":"label","x":310,"y":370}'),
('area_label','CARMEN','{"type":"label","x":185,"y":150}'),
('area_label','POBLACION','{"type":"label","x":180,"y":520}'),
('area_label','LAPASAN','{"type":"label","x":155,"y":320}'),
('area_label','GUSA','{"type":"label","x":360,"y":320}'),
('area_label','PATAG','{"type":"label","x":110,"y":100}'),
('area_label','UPPER CARMEN','{"type":"label","x":200,"y":60}'),
('area_label','Macajalar Bay','{"type":"label","x":200,"y":40}'),
-- Major roads
('road','National Highway','{"type":"polyline","points":[[0,480],[50,485],[100,488],[150,490],[200,492],[250,490],[300,485],[350,480],[400,478]],"width":8}'),
('road','CM Recto Ave','{"type":"polyline","points":[[170,580],[172,520],[175,460],[178,400],[180,340],[183,280],[185,220],[188,160],[190,100]],"width":7}'),
('road','RN Pelaez Blvd','{"type":"polyline","points":[[150,520],[200,510],[250,505],[300,500],[350,495]],"width":6}'),
('road','Velez St','{"type":"polyline","points":[[160,540],[210,540],[260,535]],"width":5}'),
('road','Masterson Ave','{"type":"polyline","points":[[155,265],[155,210],[155,150],[155,90],[145,50],[125,55]],"width":6}'),
('road','Max Suniel St','{"type":"polyline","points":[[200,310],[250,305],[300,300]],"width":5}'),
('road','Limketkai Dr','{"type":"polyline","points":[[280,280],[295,295],[300,320],[295,350]],"width":5}'),
('road','Agora Rd','{"type":"polyline","points":[[350,420],[370,430],[390,425]],"width":5}'),
('road','Kauswagan Rd','{"type":"polyline","points":[[280,200],[290,250],[295,300],[300,360],[310,400],[320,440],[340,470]],"width":6}'),
('road','Patag Rd','{"type":"polyline","points":[[120,50],[130,100],[140,160],[150,230]],"width":5}'),
('road','Osmeña St','{"type":"polyline","points":[[100,640],[130,600],[160,560],[190,530]],"width":5}'),
('road','Gusa Rd','{"type":"polyline","points":[[310,340],[340,310],[360,290],[380,280]],"width":5}');
