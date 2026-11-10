-- Migration 010: Mark all 17 Google My Maps verified core routes as popular
-- Additive and reversible.

USE ororuta;

UPDATE routes SET is_popular = 1 WHERE id IN (
  'c2-patag-gaisano-limketkai-cogon',  -- C2: Patag - Gaisano - Limketkai - Cogon
  'la-lapasan-cogon-agora-divisoria',  -- LA: Lapasan - Cogon - Agora - Divisoria Loop
  'lb-lapasan-agora-loop',             -- LB: Lapasan - Agora Loop
  'bayabas-carmen-loop-line',          -- R-BAY-CAR: Bayabas - Carmen Loop Line
  'bugo-cogon-line',                   -- R-BUG-COG: Bugo - Cogon Line
  'bulua-cogon-line-highway',          -- R-BUL-COG: Bulua (R3) - Carmen Public Market
  'indahag-r1-cogon-line',             -- R-IND-COG: Indahag (R1) - Cogon Line
  'iponan-bulua-cogon-line',           -- R-IPO-BUL-COG: Iponan - Bulua - Cogon Line
  'lumbia-carmen-line',                -- R-LUM-CAR: Lumbia - Carmen Line
  'macasandig-cogon-line',             -- R-MAC-COG: Macasandig - Cogon Line
  'puerto-cogon-divisoria-line',       -- R-PUE-COG: Puerto (R1) Puerto Public Market - Agora Terminal
  'uptown-gran-europa-sm-cogon',       -- R-UPT-COG: Uptown - Gran Europa/SM Uptown - Cogon Line
  'r1-gaisano-carmen-loop',            -- R1: Gaisano - Carmen Loop Line
  'r2-gaisano-agora-cogon-carmen',     -- R2: Gaisano - Agora - Cogon - Carmen Loop Line
  'ra-pier-cogon-line',                -- RA: Pier - Cogon Line
  'rbc-pier-macabalan-agora-limketkai',-- RBC: Pier - Macabalan - Agora - Limketkai - Cogon - Velez Line
  'rd-gusa-cugman-limketkai-cogon'     -- RC: Cugman - Gusa - Cogon
);

-- Reversible rollback:
-- UPDATE routes SET is_popular = 0 WHERE id IN (
--   'lb-lapasan-agora-loop',
--   'bayabas-carmen-loop-line',
--   'bugo-cogon-line',
--   'indahag-r1-cogon-line',
--   'iponan-bulua-cogon-line',
--   'lumbia-carmen-line',
--   'macasandig-cogon-line',
--   'puerto-cogon-divisoria-line',
--   'uptown-gran-europa-sm-cogon'
-- );

