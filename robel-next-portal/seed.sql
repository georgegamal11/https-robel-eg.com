-- Seed Data for Robel Portal (Corrected for Schema)

-- 1. Projects
INSERT INTO projects (id, slug, name_en, name_ar, description_en, status) VALUES 
('proj-1', 'porto-golf-marina', 'Porto Golf Marina', 'بورتو جولف مارينا', 'Luxury golf resort in North Coast', 'active'),
('proj-2', 'porto-said', 'Porto Said', 'بورتو سعيد', 'Premium beachfront living in Port Said', 'active');

-- 2. Buildings
INSERT INTO buildings (id, project_id, name, status) VALUES 
('bxc-133', 'proj-1', 'Building 133', 'under_construction'),
('bxc-224', 'proj-1', 'Building 224', 'ready_to_move'),
('px-09', 'proj-2', 'Tower 9', 'under_construction');

-- 3. Units
INSERT INTO units (id, building_id, unit_code, price, area_sqm, bedrooms, bathrooms, status, floor_number, view_type) VALUES 
('u-101', 'bxc-133', '133-101', 5200000, 120, 2, 2, 'available', 1, 'Pool View'),
('u-202', 'bxc-133', '133-202', 4800000, 95, 2, 1, 'available', 2, 'Garden View'),
('u-ph', 'bxc-224', '224-PH', 12000000, 250, 4, 3, 'available', 6, 'Sea View'),
('u-505', 'px-09', 'P9-505', 3500000, 110, 2, 2, 'reserved', 5, 'City View');
