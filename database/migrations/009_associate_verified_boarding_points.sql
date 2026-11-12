-- 009_associate_verified_boarding_points.sql
-- Additive, reversible migration ensuring verified loading points along the
-- Rodolfo N. Pelaez Blvd / Liceo de Cagayan University corridor are properly associated
-- with Lapasan (R1) and other routes whose verified geometries travel along this corridor.

USE ororuta;

-- 1. Associate Liceo de Cagayan Loading Zone with Lapasan (R1) (38f1362f-d2a7-4e36-a989-9e178f2ddfae)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-lapasan-r1',
    '38f1362f-d2a7-4e36-a989-9e178f2ddfae',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);

-- 2. Associate Liceo de Cagayan Loading Zone with C2 (c2-patag-gaisano-limketkai-cogon)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-c2',
    'c2-patag-gaisano-limketkai-cogon',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);

-- 3. Associate Liceo de Cagayan Loading Zone with R1 Gaisano-Carmen Loop (r1-gaisano-carmen-loop)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-r1-loop',
    'r1-gaisano-carmen-loop',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);

-- 4. Associate Liceo de Cagayan Loading Zone with R2 Gaisano-Agora-Cogon-Carmen Loop (r2-gaisano-agora-cogon-carmen)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-r2-loop',
    'r2-gaisano-agora-cogon-carmen',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);

-- 5. Associate Liceo de Cagayan Loading Zone with Kauswagan (R2) NHA (b2682fed-e85e-43ce-b05d-d4a472c6097a)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-kauswagan-r2',
    'b2682fed-e85e-43ce-b05d-d4a472c6097a',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);

-- 6. Associate Liceo de Cagayan Loading Zone with Bulua (R2) (09cfc7ea-4f4a-477e-89a4-13666ddf29a1)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-bulua-r2',
    '09cfc7ea-4f4a-477e-89a4-13666ddf29a1',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);

-- 7. Associate Liceo de Cagayan Loading Zone with Macabalan (R5) Centro (9ef925b0-d6b4-4565-bd92-05b28173336d)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-macabalan-r5',
    '9ef925b0-d6b4-4565-bd92-05b28173336d',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);

-- 8. Associate Liceo de Cagayan Loading Zone with Bayabas (R1) (d0402f5d-da95-4132-913e-fef5733feed2)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-bayabas-r1',
    'd0402f5d-da95-4132-913e-fef5733feed2',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);

-- 9. Associate Liceo de Cagayan Loading Zone with Bayabas (R2) (262139a4-3be7-44fc-ac8a-b5f44ed01b03)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-bayabas-r2',
    '262139a4-3be7-44fc-ac8a-b5f44ed01b03',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);

-- 10. Associate Liceo de Cagayan Loading Zone with Patag Camp Evangelista (R-PAT) (e8a63394-79d4-4850-926a-1b34fe8c9ae1)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-patag-rpat',
    'e8a63394-79d4-4850-926a-1b34fe8c9ae1',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);


-- 11. Associate Liceo de Cagayan Loading Zone with Bayabas (R3) (401b4d1b-e91b-4c6d-b1c9-034aa1c87b6d)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-r3-401b4d1b',
    '401b4d1b-e91b-4c6d-b1c9-034aa1c87b6d',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);

-- 12. Associate Liceo de Cagayan Loading Zone with Bonbon (R3) (2e8ed762-ee8d-4694-b3ae-2c529cb926f3)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-r3-2e8ed762',
    '2e8ed762-ee8d-4694-b3ae-2c529cb926f3',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);

-- 13. Associate Liceo de Cagayan Loading Zone with Bayabas (R5) (a38aba4f-1cfe-404a-862c-7603ad1a67e9)
INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES (
    'lp-liceo-r5-a38aba4f',
    'a38aba4f-1cfe-404a-862c-7603ad1a67e9',
    'Liceo de Cagayan Loading Zone',
    'Rodolfo N. Pelaez Blvd (in front of Main Campus)',
    'loading',
    0, 0,
    8.4862000,
    124.6388000
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    note = VALUES(note),
    lat = VALUES(lat),
    lng = VALUES(lng);
