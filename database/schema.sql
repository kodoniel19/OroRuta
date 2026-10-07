-- OroRuta Database Schema
-- MySQL 8, InnoDB, utf8mb4
-- Run: mysql -u root -p ororuta < schema.sql

CREATE DATABASE IF NOT EXISTS ororuta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ororuta;

-- ─────────────────────────────────────────────
-- DEVICES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id                    CHAR(36)     PRIMARY KEY,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  language              VARCHAR(8)   NOT NULL DEFAULT 'en',
  precise_location      TINYINT(1)   NOT NULL DEFAULT 0,
  manual_start_place_id CHAR(36)     NULL,
  INDEX idx_devices_last_seen (last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS device_notification_prefs (
  device_id        CHAR(36)   PRIMARY KEY,
  route_changes    TINYINT(1) NOT NULL DEFAULT 1,
  closures         TINYINT(1) NOT NULL DEFAULT 1,
  terminals        TINYINT(1) NOT NULL DEFAULT 1,
  offline_updates  TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- PLACES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS places (
  id      CHAR(36)    PRIMARY KEY,
  name    VARCHAR(120) NOT NULL,
  area    VARCHAR(80)  NULL,
  kind    ENUM('school','mall','market','terminal','landmark','government','hospital') NOT NULL DEFAULT 'landmark',
  map_x   DECIMAL(8,4) NOT NULL DEFAULT 0,
  map_y   DECIMAL(8,4) NOT NULL DEFAULT 0,
  lat     DECIMAL(10,7) NOT NULL DEFAULT 0,
  lng     DECIMAL(10,7) NOT NULL DEFAULT 0,
  INDEX idx_places_name (name),
  INDEX idx_places_kind (kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- ROUTES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
  id              CHAR(36)         PRIMARY KEY,
  code            VARCHAR(10)      NOT NULL,
  name            VARCHAR(120)     NOT NULL,
  origin          VARCHAR(120)     NOT NULL,
  destination     VARCHAR(120)     NOT NULL,
  jeepney_type    ENUM('Traditional','Modern') NOT NULL DEFAULT 'Traditional',
  description     TEXT             NULL,
  inbound_distance_km DECIMAL(5,2) NOT NULL DEFAULT 0,
  outbound_distance_km DECIMAL(5,2) NOT NULL DEFAULT 0,
  status          ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  verification_status ENUM('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'PUBLISHED', 'DATA_REVIEW_REQUIRED', 'ERROR') NOT NULL DEFAULT 'DRAFT',
  color           VARCHAR(9)       NOT NULL DEFAULT '#1471B0',
  offline_size_mb DECIMAL(5,2)     NOT NULL DEFAULT 0.5,
  last_updated_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_routes_code (code),
  INDEX idx_routes_status (status),
  INDEX idx_routes_verification (verification_status),
  INDEX idx_routes_type (jeepney_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_directions (
  id CHAR(36) PRIMARY KEY,
  route_id CHAR(36) NOT NULL,
  direction ENUM('Inbound', 'Outbound') NOT NULL,
  distance_km DECIMAL(5,2) NOT NULL DEFAULT 0,
  street_sequence TEXT NOT NULL,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  UNIQUE KEY uq_route_dir (route_id, direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_geometry (
  id CHAR(36) PRIMARY KEY,
  route_id CHAR(36) NOT NULL,
  direction ENUM('Inbound', 'Outbound') NOT NULL,
  geometry JSON NOT NULL,
  geometry_status ENUM('PENDING', 'GENERATED', 'VERIFIED', 'ERROR') NOT NULL DEFAULT 'PENDING',
  generated_at DATETIME NULL,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  UNIQUE KEY uq_route_geom_dir (route_id, direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_path_points (
  id        INT          AUTO_INCREMENT PRIMARY KEY,
  route_id  CHAR(36)     NOT NULL,
  seq       INT          NOT NULL,
  map_x     DECIMAL(8,4) NOT NULL,
  map_y     DECIMAL(8,4) NOT NULL,
  lat       DECIMAL(10,7) NOT NULL,
  lng       DECIMAL(10,7) NOT NULL,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  INDEX idx_rpp_route (route_id, seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- ROADS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS major_roads (
  id   CHAR(36)    PRIMARY KEY,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_major_roads (
  route_id CHAR(36) NOT NULL,
  road_id  CHAR(36) NOT NULL,
  seq      INT      NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, road_id),
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  FOREIGN KEY (road_id)  REFERENCES major_roads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- TERMINALS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS terminals (
  id      CHAR(36)      PRIMARY KEY,
  name    VARCHAR(120)  NOT NULL,
  note    VARCHAR(200)  NULL,
  map_x   DECIMAL(8,4)  NOT NULL DEFAULT 0,
  map_y   DECIMAL(8,4)  NOT NULL DEFAULT 0,
  lat     DECIMAL(10,7) NOT NULL DEFAULT 0,
  lng     DECIMAL(10,7) NOT NULL DEFAULT 0,
  INDEX idx_terminals_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_terminals (
  route_id    CHAR(36) NOT NULL,
  terminal_id CHAR(36) NOT NULL,
  seq         INT      NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, terminal_id),
  FOREIGN KEY (route_id)    REFERENCES routes(id)    ON DELETE CASCADE,
  FOREIGN KEY (terminal_id) REFERENCES terminals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- LOADING / UNLOADING POINTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loading_points (
  id          CHAR(36)    PRIMARY KEY,
  route_id    CHAR(36)    NOT NULL,
  name        VARCHAR(120) NOT NULL,
  note        VARCHAR(200) NULL,
  point_type  ENUM('loading','unloading') NOT NULL DEFAULT 'loading',
  map_x       DECIMAL(8,4) NOT NULL DEFAULT 0,
  map_y       DECIMAL(8,4) NOT NULL DEFAULT 0,
  lat         DECIMAL(10,7) NOT NULL DEFAULT 0,
  lng         DECIMAL(10,7) NOT NULL DEFAULT 0,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  INDEX idx_lp_route (route_id),
  INDEX idx_lp_type (point_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- TRANSFER POINTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfer_points (
  id       CHAR(36)     PRIMARY KEY,
  route_id CHAR(36)     NOT NULL,
  name     VARCHAR(120) NOT NULL,
  note     VARCHAR(200) NULL,
  map_x    DECIMAL(8,4) NOT NULL DEFAULT 0,
  map_y    DECIMAL(8,4) NOT NULL DEFAULT 0,
  lat      DECIMAL(10,7) NOT NULL DEFAULT 0,
  lng      DECIMAL(10,7) NOT NULL DEFAULT 0,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  INDEX idx_tp_route (route_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- LANDMARKS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS landmarks (
  id      CHAR(36)     PRIMARY KEY,
  name    VARCHAR(120) NOT NULL,
  map_x   DECIMAL(8,4) NOT NULL DEFAULT 0,
  map_y   DECIMAL(8,4) NOT NULL DEFAULT 0,
  lat     DECIMAL(10,7) NOT NULL DEFAULT 0,
  lng     DECIMAL(10,7) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_landmarks (
  route_id    CHAR(36) NOT NULL,
  landmark_id CHAR(36) NOT NULL,
  seq         INT      NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, landmark_id),
  FOREIGN KEY (route_id)    REFERENCES routes(id)    ON DELETE CASCADE,
  FOREIGN KEY (landmark_id) REFERENCES landmarks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- TRIP OPTIONS / SEGMENTS / LEGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_options (
  id                  CHAR(36)      PRIMARY KEY,
  origin_place_id     CHAR(36)      NOT NULL,
  destination_place_id CHAR(36)     NOT NULL,
  minutes             INT           NOT NULL,
  walk_meters         INT           NOT NULL DEFAULT 0,
  transfers           INT           NOT NULL DEFAULT 0,
  direction           VARCHAR(200)  NULL,
  status              ENUM('Active','Rerouted','Updated','Temporary') NOT NULL DEFAULT 'Active',
  boarding_name       VARCHAR(120)  NULL,
  boarding_map_x      DECIMAL(8,4)  NULL,
  boarding_map_y      DECIMAL(8,4)  NULL,
  boarding_lat        DECIMAL(10,7) NULL,
  boarding_lng        DECIMAL(10,7) NULL,
  dropoff_name        VARCHAR(120)  NULL,
  dropoff_map_x       DECIMAL(8,4)  NULL,
  dropoff_map_y       DECIMAL(8,4)  NULL,
  dropoff_lat         DECIMAL(10,7) NULL,
  dropoff_lng         DECIMAL(10,7) NULL,
  transfer_name       VARCHAR(120)  NULL,
  transfer_map_x      DECIMAL(8,4)  NULL,
  transfer_map_y      DECIMAL(8,4)  NULL,
  FOREIGN KEY (origin_place_id)      REFERENCES places(id),
  FOREIGN KEY (destination_place_id) REFERENCES places(id),
  INDEX idx_to_od (origin_place_id, destination_place_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trip_segments (
  id             INT     AUTO_INCREMENT PRIMARY KEY,
  trip_option_id CHAR(36) NOT NULL,
  seq            INT     NOT NULL,
  route_id       CHAR(36) NOT NULL,
  from_x         DECIMAL(8,4) NOT NULL,
  from_y         DECIMAL(8,4) NOT NULL,
  to_x           DECIMAL(8,4) NOT NULL,
  to_y           DECIMAL(8,4) NOT NULL,
  km             DECIMAL(5,2) NOT NULL,
  FOREIGN KEY (trip_option_id) REFERENCES trip_options(id) ON DELETE CASCADE,
  FOREIGN KEY (route_id)       REFERENCES routes(id),
  INDEX idx_ts_option (trip_option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trip_legs (
  id             INT     AUTO_INCREMENT PRIMARY KEY,
  trip_option_id CHAR(36) NOT NULL,
  seq            INT     NOT NULL,
  kind           ENUM('walk','board','stay','alight') NOT NULL,
  title          VARCHAR(200) NOT NULL,
  detail         VARCHAR(300) NULL,
  minutes        INT     NOT NULL DEFAULT 0,
  distance_m     INT     NOT NULL DEFAULT 0,
  route_id       CHAR(36) NULL,
  point_x        DECIMAL(8,4) NULL,
  point_y        DECIMAL(8,4) NULL,
  FOREIGN KEY (trip_option_id) REFERENCES trip_options(id) ON DELETE CASCADE,
  FOREIGN KEY (route_id)       REFERENCES routes(id),
  INDEX idx_tl_option (trip_option_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- ANNOUNCEMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id          CHAR(36)     PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  date        DATE         NOT NULL,
  category    ENUM('Rerouting','Road closure','Terminal change','Loading point change','Route update') NOT NULL,
  description TEXT         NULL,
  effective   VARCHAR(120) NULL,
  status      ENUM('Active','Updated','Temporary','Expired') NOT NULL DEFAULT 'Active',
  INDEX idx_ann_status (status),
  INDEX idx_ann_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcement_details (
  id               INT    AUTO_INCREMENT PRIMARY KEY,
  announcement_id  CHAR(36) NOT NULL,
  seq              INT    NOT NULL,
  text             TEXT   NOT NULL,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcement_routes (
  announcement_id CHAR(36) NOT NULL,
  route_id        CHAR(36) NOT NULL,
  PRIMARY KEY (announcement_id, route_id),
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (route_id)        REFERENCES routes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- FARE RULES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fare_rules (
  id             INT         AUTO_INCREMENT PRIMARY KEY,
  minimum        DECIMAL(8,2) NOT NULL,
  minimum_km     DECIMAL(5,2) NOT NULL,
  per_km         DECIMAL(8,2) NOT NULL,
  discount_rate  DECIMAL(4,3) NOT NULL DEFAULT 0.200,
  effective_from DATE         NOT NULL,
  is_current     TINYINT(1)   NOT NULL DEFAULT 0,
  INDEX idx_fare_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- SEARCHES (history)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS searches (
  id               CHAR(36)     PRIMARY KEY,
  device_id        CHAR(36)     NOT NULL,
  current_location VARCHAR(200) NOT NULL,
  destination      VARCHAR(200) NOT NULL,
  route_id         CHAR(36)     NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_searches_device (device_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- SAVED TRIPS & DESTINATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_trips (
  id              CHAR(36)     PRIMARY KEY,
  device_id       CHAR(36)     NOT NULL,
  from_label      VARCHAR(200) NOT NULL,
  to_label        VARCHAR(200) NOT NULL,
  route_ids       JSON         NOT NULL,
  route_ids_hash  CHAR(64)     NOT NULL,
  trip_option_id  CHAR(36)     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  UNIQUE KEY uq_saved_trip (device_id, from_label, to_label, route_ids_hash),
  INDEX idx_st_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_destinations (
  id          CHAR(36)     PRIMARY KEY,
  device_id   CHAR(36)     NOT NULL,
  label       VARCHAR(60)  NOT NULL,
  place_name  VARCHAR(200) NOT NULL,
  icon        ENUM('home','school','work','pin') NOT NULL DEFAULT 'pin',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_sd_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- REPORTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id             CHAR(36)     PRIMARY KEY,
  reference_no   VARCHAR(20)  NOT NULL UNIQUE,
  device_id      CHAR(36)     NOT NULL,
  type           ENUM(
    'Incorrect route information',
    'Incorrect loading point',
    'Incorrect terminal',
    'Route change',
    'Other'
  ) NOT NULL,
  description    VARCHAR(500) NOT NULL,
  location_text  VARCHAR(200) NULL,
  lat            DECIMAL(10,7) NULL,
  lng            DECIMAL(10,7) NULL,
  status         ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_reports_device (device_id),
  INDEX idx_reports_ref (reference_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- COMPLETED TRIPS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS completed_trips (
  id              CHAR(36)     PRIMARY KEY,
  device_id       CHAR(36)     NOT NULL,
  trip_option_id  CHAR(36)     NULL,
  completed_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  INDEX idx_ct_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- CONTENT PAGES, HELP, FAQs
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_pages (
  slug      VARCHAR(80) PRIMARY KEY,
  title     VARCHAR(200) NOT NULL,
  sections  JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS help_topics (
  id    INT         AUTO_INCREMENT PRIMARY KEY,
  seq   INT         NOT NULL DEFAULT 0,
  title VARCHAR(200) NOT NULL,
  body  TEXT        NOT NULL,
  INDEX idx_ht_seq (seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faqs (
  id  INT         AUTO_INCREMENT PRIMARY KEY,
  seq INT         NOT NULL DEFAULT 0,
  q   VARCHAR(300) NOT NULL,
  a   TEXT        NOT NULL,
  INDEX idx_faq_seq (seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- MAP BASE GEOMETRY
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS map_base (
  id       INT         AUTO_INCREMENT PRIMARY KEY,
  type     ENUM('road','area_label','park','sea','river') NOT NULL,
  name     VARCHAR(120) NOT NULL,
  geometry JSON        NOT NULL,
  INDEX idx_mb_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────
-- OFFLINE MAP PACK
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offline_map_pack (
  id         INT         AUTO_INCREMENT PRIMARY KEY,
  version    VARCHAR(20) NOT NULL,
  name       VARCHAR(120) NOT NULL,
  size_mb    DECIMAL(6,2) NOT NULL,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
