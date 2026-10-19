-- Migration 002: Add LPTRP metadata columns
-- Run: mysql -u root -p ororuta < database/migrations/002_add_route_metadata.sql
USE ororuta;

-- Add district and source metadata to routes
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS district TINYINT NULL AFTER description,
  ADD COLUMN IF NOT EXISTS source_reference VARCHAR(255) NULL AFTER district,
  ADD COLUMN IF NOT EXISTS lptrp_name VARCHAR(200) NULL AFTER source_reference;

-- Add direction to route_path_points for inbound/outbound
ALTER TABLE route_path_points
  ADD COLUMN IF NOT EXISTS direction ENUM('Inbound','Outbound') NOT NULL DEFAULT 'Inbound' AFTER route_id;

-- Add index on route_path_points direction
-- (safe to run multiple times because IF NOT EXISTS on index isn't standard MySQL, so we ignore errors)
-- CREATE INDEX idx_rpp_direction ON route_path_points (route_id, direction, seq);

-- Add loading_points direction for inbound/outbound association
ALTER TABLE loading_points
  ADD COLUMN IF NOT EXISTS direction ENUM('Inbound','Outbound') NULL AFTER point_type;

-- Increase code field to support longer route codes like "Indahag-R3"
ALTER TABLE routes MODIFY COLUMN code VARCHAR(30) NOT NULL;

-- Add ON UPDATE CURRENT_TIMESTAMP to routes if not already there
ALTER TABLE routes MODIFY COLUMN last_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
