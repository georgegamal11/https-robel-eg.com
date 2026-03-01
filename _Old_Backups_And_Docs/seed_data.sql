-- Projects
INSERT OR IGNORE INTO projects (id, name, status, images) VALUES 
('porto-golf-marina', 'Porto Golf Marina', 'buy', '["assets/images/projects/porto-golf-marina/buildings/B133.webp"]'),
('porto-said', 'Porto Said', 'buy', '["assets/images/face-main/porto-said-main.webp"]'),
('celebration', 'Celebration', 'buy', '["assets/images/face-main/celebration-main.webp"]');

-- Buildings
-- Porto Golf Marina
INSERT OR IGNORE INTO buildings (id, code, name, project_id, project_name, location, delivery, const_status, status, images, updatedAt) VALUES
('B133', 'B133', 'Building B133', 'porto-golf-marina', 'Porto Golf Marina', 'Porto Golf Marina', '12/2026', 'Under Construction', 'buy', '["assets/images/projects/porto-golf-marina/buildings/B133.webp"]', datetime('now')),
('B136', 'B136', 'Building B136', 'porto-golf-marina', 'Porto Golf Marina', 'Porto Golf Marina', '12/2026', 'Under Construction', 'buy', '["assets/images/projects/porto-golf-marina/buildings/B136.webp"]', datetime('now')),
('B230', 'B230', 'Building B230', 'porto-golf-marina', 'Porto Golf Marina', 'Porto Golf Marina', '12/2027', 'Under Construction', 'buy', '["assets/images/projects/porto-golf-marina/buildings/B230.webp"]', datetime('now')),
('B243', 'B243', 'Building B243', 'porto-golf-marina', 'Porto Golf Marina', 'Porto Golf Marina', '12/2027', 'Under Construction', 'buy', '["assets/images/projects/porto-golf-marina/buildings/243.webp"]', datetime('now')),
('B121', 'B121', 'Building B121', 'porto-golf-marina', 'Porto Golf Marina', 'Porto Golf Marina', 'Ready', 'Ready', 'buy', '["assets/images/projects/porto-golf-marina/buildings/121.webp"]', datetime('now')),
('B224', 'B224', 'Building B224', 'porto-golf-marina', 'Porto Golf Marina', 'Porto Golf Marina', 'Ready', 'Ready', 'buy', '["assets/images/projects/porto-golf-marina/gallery/224.webp"]', datetime('now')),
('B78', 'B78', 'Building B78', 'porto-golf-marina', 'Porto Golf Marina', 'Porto Golf Marina', 'Ready', 'Ready', 'buy', '["assets/images/projects/porto-golf-marina/gallery/78.webp"]', datetime('now'));

-- Porto Said
INSERT OR IGNORE INTO buildings (id, code, name, project_id, project_name, location, delivery, const_status, status, images, updatedAt) VALUES
('B15', 'B15', 'Building B15', 'porto-said', 'Porto Said', 'Porto Said', '12/2026', 'Under Construction', 'buy', '["assets/images/face-main/porto-said-main.webp"]', datetime('now')),
('B16', 'B16', 'Building B16', 'porto-said', 'Porto Said', 'Porto Said', '12/2026', 'Under Construction', 'buy', '["assets/images/face-main/porto-said-main.webp"]', datetime('now')),
('B33', 'B33', 'Building B33', 'porto-said', 'Porto Said', 'Porto Said', '12/2026', 'Under Construction', 'buy', '["assets/images/face-main/porto-said-main.webp"]', datetime('now'));

-- Celebration
INSERT OR IGNORE INTO buildings (id, code, name, project_id, project_name, location, delivery, const_status, status, images, updatedAt) VALUES
('Celebration', 'Celebration', 'Celebration', 'celebration', 'Celebration', 'Celebration', '1/1/2028', 'Under Construction', 'buy', '["assets/images/face-main/celebration-main.webp"]', datetime('now'));
