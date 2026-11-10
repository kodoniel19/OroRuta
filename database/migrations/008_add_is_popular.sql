-- Migration 008: Add is_popular flag to routes
-- Marks curated high-demand CDO jeepney routes for the "Popular" filter
-- in the mobile app. Additive and reversible.

ALTER TABLE routes
  ADD COLUMN `is_popular` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Marks route as popular/featured in the mobile app home screen and Popular filter'
  AFTER `verification_status`;

-- Mark the main high-demand CDO routes as popular.
-- These correspond to the routes featured on the HomeScreen Popular carousel
-- and in the RoutesScreen "Popular" filter tab.
UPDATE routes SET is_popular = 1 WHERE id IN (
  'c2-patag-gaisano-limketkai-cogon',  -- C2: Patag-Gaisano-Limketkai-Cogon (highest demand)
  'r1-gaisano-carmen-loop',            -- R1: Gaisano-Carmen Loop
  'r2-gaisano-agora-cogon-carmen',     -- R2: Gaisano-Agora-Cogon-Carmen
  'ra-pier-cogon-line',                -- RA: Pier-Cogon Line
  'rd-gusa-cugman-limketkai-cogon',    -- RC: Gusa-Cugman-Limketkai-Cogon
  'rbc-pier-macabalan-agora-limketkai',-- RBC: Pier-Macabalan-Agora-Limketkai
  'la-lapasan-cogon-agora-divisoria',  -- LA: Lapasan-Cogon-Agora-Divisoria
  'bulua-cogon-line-highway'           -- R-BUL-COG: Bulua-Cogon via Highway
);

-- To reverse this migration:
-- ALTER TABLE routes DROP COLUMN is_popular;
