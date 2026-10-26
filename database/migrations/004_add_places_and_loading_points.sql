-- 004_add_places_and_loading_points.sql
-- Adds missing key destinations (SM Downtown, Miami Inn, Gumamela Ext)
-- and verified loading/unloading points in Carmen and Lapasan.

USE ororuta;

-- 1. Insert Key Verified CDO Places
INSERT INTO places (id, name, area, kind, map_x, map_y, lat, lng)
VALUES
  ('pl-sm-downtown', 'SM CDO Downtown Premier', 'Lapasan', 'mall', 0, 0, 8.4855000, 124.6535000),
  ('pl-miami-inn', 'Miami Inn Carmen', 'Carmen', 'landmark', 0, 0, 8.4772850, 124.6376330),
  ('pl-gumamela-ext', 'Gumamela Extension, Carmen', 'Carmen', 'landmark', 0, 0, 8.4908000, 124.6338000),
  ('pl-gaisano-city', 'Gaisano City Mall', 'Lapasan', 'mall', 0, 0, 8.4842000, 124.6515000),
  ('pl-gaisano-puerto', 'Gaisano Puerto Mall', 'Puerto', 'mall', 0, 0, 8.5005640, 124.7517570),
  ('pl-cobsat', 'Cagayan de Oro (Bugo) School of Arts and Trades (COBSAT)', 'Bugo', 'school', 0, 0, 8.5067180, 124.7615330),
  ('pl-capitol-univ', 'Capitol University', 'Lapasan', 'school', 0, 0, 8.4870000, 124.6550000),
  ('pl-polymedic-plaza', 'Cagayan de Oro Polymedic Plaza', 'Kauswagan', 'hospital', 0, 0, 8.4940000, 124.6305000),
  ('pl-savemore-kauswagan', 'Savemore Market Kauswagan', 'Kauswagan', 'market', 0, 0, 8.4960000, 124.6340000)
ON DUPLICATE KEY UPDATE 
  area = VALUES(area),
  kind = VALUES(kind),
  lat = VALUES(lat),
  lng = VALUES(lng);

-- 2. Insert Verified Loading & Unloading Points for Miami Inn (Vamenta Blvd, Carmen)
-- Routes serving Carmen/Vamenta Blvd:
-- Lapasan R1 (38f1362f-d2a7-4e36-a989-9e178f2ddfae)
-- Macabalan R5 (9ef925b0-d6b4-4565-bd92-05b28173336d)
-- Lumbia R3 Gran Europa (04f8a2d2-6a9c-41a4-80fb-64368d6fe41c)
-- Kauswagan R2 (b2682fed-e85e-43ce-b05d-d4a472c6097a)
-- Kauswagan R3 (ea9487f6-f749-41b1-b6df-a836cccb6b5e)
-- Carmen R5 (564269a7-bf89-4bff-a955-e8c518ba4dea)
-- Carmen R2 (78591a6d-93f2-4004-9e27-de1ea933fe40)
-- Baikingon R-BAI (5e26a5b7-ab6e-470e-96f9-a109990ffbe0)
-- Balulang R-BAL (70d79bf1-bb70-4eec-9673-43b92cd1f420)

INSERT INTO loading_points (id, route_id, name, note, point_type, map_x, map_y, lat, lng)
VALUES
  ('lp-miami-lapasan-r1', '38f1362f-d2a7-4e36-a989-9e178f2ddfae', 'Miami Inn - Vamenta Blvd Loading Point', 'Verified Stop near 126 Vamenta Blvd, Carmen', 'loading', 0, 0, 8.4772850, 124.6376330),
  ('lp-miami-macabalan-r5', '9ef925b0-d6b4-4565-bd92-05b28173336d', 'Miami Inn - Vamenta Blvd Loading Point', 'Verified Stop near 126 Vamenta Blvd, Carmen', 'loading', 0, 0, 8.4772850, 124.6376330),
  ('lp-miami-lumbia-r3', '04f8a2d2-6a9c-41a4-80fb-64368d6fe41c', 'Miami Inn - Vamenta Blvd Loading Point', 'Verified Stop near 126 Vamenta Blvd, Carmen', 'loading', 0, 0, 8.4772850, 124.6376330),
  ('lp-miami-kauswagan-r2', 'b2682fed-e85e-43ce-b05d-d4a472c6097a', 'Miami Inn - Vamenta Blvd Loading Point', 'Verified Stop near 126 Vamenta Blvd, Carmen', 'loading', 0, 0, 8.4772850, 124.6376330),
  ('lp-miami-carmen-r5', '564269a7-bf89-4bff-a955-e8c518ba4dea', 'Miami Inn - Vamenta Blvd Loading Point', 'Verified Stop near 126 Vamenta Blvd, Carmen', 'loading', 0, 0, 8.4772850, 124.6376330),
  ('lp-miami-baikingon-rbai', '5e26a5b7-ab6e-470e-96f9-a109990ffbe0', 'Miami Inn - Vamenta Blvd Loading Point', 'Verified Stop near 126 Vamenta Blvd, Carmen', 'loading', 0, 0, 8.4772850, 124.6376330),
  ('lp-miami-balulang-rbal', '70d79bf1-bb70-4eec-9673-43b92cd1f420', 'Miami Inn - Vamenta Blvd Loading Point', 'Verified Stop near 126 Vamenta Blvd, Carmen', 'loading', 0, 0, 8.4772850, 124.6376330),

  -- Miami Inn Unloading Points
  ('up-miami-lapasan-r1', '38f1362f-d2a7-4e36-a989-9e178f2ddfae', 'Miami Inn - Vamenta Blvd Drop-off Stop', 'Verified Stop near 126 Vamenta Blvd, Carmen', 'unloading', 0, 0, 8.4772850, 124.6376330),
  ('up-miami-macabalan-r5', '9ef925b0-d6b4-4565-bd92-05b28173336d', 'Miami Inn - Vamenta Blvd Drop-off Stop', 'Verified Stop near 126 Vamenta Blvd, Carmen', 'unloading', 0, 0, 8.4772850, 124.6376330),
  ('up-miami-lumbia-r3', '04f8a2d2-6a9c-41a4-80fb-64368d6fe41c', 'Miami Inn - Vamenta Blvd Drop-off Stop', 'Verified Stop near 126 Vamenta Blvd, Carmen', 'unloading', 0, 0, 8.4772850, 124.6376330),

  -- 3. Insert Verified Loading Points for SM CDO Downtown Premier (CM Recto Ave)
  -- Bulua R1 (785b6016-46e6-4dbb-9e9d-147d2ba36ef7)
  -- Bulua R2 (09cfc7ea-4f4a-477e-89a4-13666ddf29a1)
  -- Bugo R1 (7f29e17a-f3e8-46b2-932c-c02377a48da3)
  -- Bugo R2 (eebc29e6-2f6f-4c21-afa4-8348627fe8b7)
  -- Kauswagan R1 (55f15c69-1061-4ca1-9989-95253b08d41f)
  -- Puerto R1 (c80f880d-6491-4e83-89e7-1142a1c06749)
  -- Iponan R3 (cb0010d4-bbf2-4261-9499-c69506f9f358)
  ('lp-smdt-bulua-r1', '785b6016-46e6-4dbb-9e9d-147d2ba36ef7', 'SM CDO Downtown Loading/Unloading Point', 'CM Recto Ave corridor stop', 'loading', 0, 0, 8.4855000, 124.6535000),
  ('lp-smdt-bulua-r2', '09cfc7ea-4f4a-477e-89a4-13666ddf29a1', 'SM CDO Downtown Loading/Unloading Point', 'CM Recto Ave corridor stop', 'loading', 0, 0, 8.4855000, 124.6535000),
  ('lp-smdt-bugo-r1', '7f29e17a-f3e8-46b2-932c-c02377a48da3', 'SM CDO Downtown Loading/Unloading Point', 'CM Recto Ave corridor stop', 'loading', 0, 0, 8.4855000, 124.6535000),
  ('lp-smdt-kauswagan-r1', '55f15c69-1061-4ca1-9989-95253b08d41f', 'SM CDO Downtown Loading/Unloading Point', 'CM Recto Ave corridor stop', 'loading', 0, 0, 8.4855000, 124.6535000),
  ('lp-smdt-puerto-r1', 'c80f880d-6491-4e83-89e7-1142a1c06749', 'SM CDO Downtown Loading/Unloading Point', 'CM Recto Ave corridor stop', 'loading', 0, 0, 8.4855000, 124.6535000),
  ('lp-smdt-iponan-r3', 'cb0010d4-bbf2-4261-9499-c69506f9f358', 'SM CDO Downtown Loading/Unloading Point', 'CM Recto Ave corridor stop', 'loading', 0, 0, 8.4855000, 124.6535000)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  note = VALUES(note),
  point_type = VALUES(point_type),
  lat = VALUES(lat),
  lng = VALUES(lng);
