-- 005_fix_liceo_loading_points.sql
-- Fixes mismatched loading points so only routes genuinely passing RN Pelaez Blvd / Liceo de Cagayan University
-- are associated with Liceo de Cagayan Loading Zone.
-- Hinterland routes (Baikingon, Dansolihon, San Simon, Tagpangi, Tuburan, Tumpagon) are re-labeled
-- to their verified terminal/barangay loading points.

USE ororuta;

-- 1. Associate Liceo Loading Zone with routes whose verified geometries travel on RN Pelaez Blvd:
-- Macabalan R5 (9ef925b0-d6b4-4565-bd92-05b28173336d)
UPDATE loading_points 
SET route_id = '9ef925b0-d6b4-4565-bd92-05b28173336d',
    name = 'Liceo de Cagayan Loading Zone',
    note = 'RN Pelaez Blvd, Kauswagan (in front of Main Campus)',
    lat = 8.4965000,
    lng = 124.6407000
WHERE id = 'lp-liceo-1-R5';

-- Kauswagan R2 NHA (b2682fed-e85e-43ce-b05d-d4a472c6097a)
UPDATE loading_points 
SET route_id = 'b2682fed-e85e-43ce-b05d-d4a472c6097a',
    name = 'Liceo de Cagayan Loading Zone',
    note = 'RN Pelaez Blvd, Kauswagan (in front of Main Campus)',
    lat = 8.4965000,
    lng = 124.6407000
WHERE id = 'lp-liceo-1-R2';

-- Lapasan R1 (38f1362f-d2a7-4e36-a989-9e178f2ddfae)
UPDATE loading_points 
SET route_id = '38f1362f-d2a7-4e36-a989-9e178f2ddfae',
    name = 'Liceo de Cagayan Loading Zone',
    note = 'RN Pelaez Blvd, Kauswagan (in front of Main Campus)',
    lat = 8.4965000,
    lng = 124.6407000
WHERE id = 'lp-liceo-1-R1';

-- Bulua R2 (09cfc7ea-4f4a-477e-89a4-13666ddf29a1)
UPDATE loading_points 
SET route_id = '09cfc7ea-4f4a-477e-89a4-13666ddf29a1',
    name = 'Liceo de Cagayan Loading Zone',
    note = 'RN Pelaez Blvd, Kauswagan (in front of Main Campus)',
    lat = 8.4965000,
    lng = 124.6407000
WHERE id = 'lp-liceo-1-R6';

-- Patag Camp Evangelista R-PAT (e8a63394-79d4-4850-926a-1b34fe8c9ae1)
UPDATE loading_points 
SET route_id = 'e8a63394-79d4-4850-926a-1b34fe8c9ae1',
    name = 'Liceo de Cagayan Loading Zone',
    note = 'RN Pelaez Blvd, Kauswagan (in front of Main Campus)',
    lat = 8.4965000,
    lng = 124.6407000
WHERE id = 'lp-liceo-1-R3';

-- Bayabas R1 (d0402f5d-da95-4132-913e-fef5733feed2)
UPDATE loading_points 
SET route_id = 'd0402f5d-da95-4132-913e-fef5733feed2',
    name = 'Liceo de Cagayan Loading Zone',
    note = 'RN Pelaez Blvd, Kauswagan (in front of Main Campus)',
    lat = 8.4965000,
    lng = 124.6407000
WHERE id = 'lp-liceo-1-R4';

-- 2. Correct the remaining hinterland routes to their actual route corridor loading zones
-- Baikingon
UPDATE loading_points 
SET name = 'Centro Baikingon Loading Zone',
    note = 'Baikingon Road, Centro Baikingon',
    lat = 8.4410000,
    lng = 124.5820000
WHERE id = 'lp-liceo-1-R-BAI';

-- Balulang R1 Centro
UPDATE loading_points 
SET name = 'Balulang Centro Loading Zone',
    note = 'Balulang Road, Centro Balulang',
    lat = 8.4689670,
    lng = 124.6309710
WHERE id = 'lp-liceo-1-R-BAL';

-- San Simon
UPDATE loading_points 
SET name = 'Centro San Simon Loading Zone',
    note = 'San Simon Barangay Road',
    lat = 8.4320000,
    lng = 124.5750000
WHERE id = 'lp-liceo-1-R-SAN';

-- Tagpangi
UPDATE loading_points 
SET name = 'Centro Tagpangi Loading Zone',
    note = 'Tagpangi Barangay Road',
    lat = 8.3950000,
    lng = 124.5600000
WHERE id = 'lp-liceo-1-R-TAG';

-- Tuburan
UPDATE loading_points 
SET name = 'Centro Tuburan Loading Zone',
    note = 'Tuburan Barangay Road',
    lat = 8.3650000,
    lng = 124.5450000
WHERE id = 'lp-liceo-1-R-TUB';

-- Tumpagon
UPDATE loading_points 
SET name = 'Centro Tumpagon Loading Zone',
    note = 'Tumpagon Barangay Road',
    lat = 8.3200000,
    lng = 124.5300000
WHERE id = 'lp-liceo-1-R-TUM';
