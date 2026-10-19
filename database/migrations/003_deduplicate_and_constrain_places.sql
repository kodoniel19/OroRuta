-- Migration 003: Deduplicate and add unique constraint on places and terminals
-- Ensures stable unique IDs and eliminates duplicate search suggestions (Agora Terminal, Bulua Terminal, etc.)

-- 1. Ensure unique constraint on places(name)
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'places' AND index_name = 'uq_places_name');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE places ADD UNIQUE INDEX uq_places_name (name)', 'SELECT 1');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Ensure unique constraint on terminals(name)
SET @exist_term := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'terminals' AND index_name = 'uq_terminals_name');
SET @sqlstmt_term := IF(@exist_term = 0, 'ALTER TABLE terminals ADD UNIQUE INDEX uq_terminals_name (name)', 'SELECT 1');
PREPARE stmt_term FROM @sqlstmt_term;
EXECUTE stmt_term;
DEALLOCATE PREPARE stmt_term;
