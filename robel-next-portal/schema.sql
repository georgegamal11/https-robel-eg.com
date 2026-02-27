-- Database Schema for Robel Real Estate Portal (Cloudflare D1)

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- 1. Users Table (Role-based Access Control)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- UUID
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'agent', 'user')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects Table (Main Listings)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, -- e.g., 'porto-golf-marina'
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  location_lat REAL,
  location_lng REAL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold_out', 'coming_soon')),
  hero_image_url TEXT, -- R2 URL
  gallery_urls TEXT, -- JSON array of strings
  features_json TEXT, -- JSON array of amenities
  meta_title_en TEXT,
  meta_description_en TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Buildings Table
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL, -- e.g., 'Building 133'
  status TEXT DEFAULT 'under_construction',
  delivery_date DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 4. Units Table (The core inventory)
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL,
  unit_code TEXT NOT NULL, -- e.g., '133-101'
  floor_number INTEGER NOT NULL,
  area_sqm REAL NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  view_type TEXT, -- e.g., 'Pool View', 'Sea View'
  images_json TEXT, -- JSON array of R2 URLs
  floor_plan_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
);

-- 5. Favorites Table (User engagement)
CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, unit_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_units_price ON units(price);
CREATE INDEX IF NOT EXISTS idx_units_area ON units(area_sqm);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
