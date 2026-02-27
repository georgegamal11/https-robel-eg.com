-- Update auto_specs for B33 units based on area ranges
-- Building B33 - Porto Said Project

-- 🟢 1️⃣ Studio Units (43m² - 50m²)
UPDATE units 
SET auto_specs = json_object(
    'type', 'ستوديو',
    'type_en', 'Studio',
    'bedrooms', 0,
    'bathrooms', 1,
    'reception', 0,
    'kitchen', 1,
    'features', json_array('غرفة مفتوحة', 'حمام واحد', 'مطبخ مفتوح'),
    'features_en', json_array('Open Room', '1 Bathroom', 'Open Kitchen'),
    'description', 'غرفة + حمام',
    'description_en', 'Room + Bathroom'
)
WHERE (building_id IN ('33', 'B33') OR code LIKE '33%')
  AND CAST(area AS INTEGER) >= 43 
  AND CAST(area AS INTEGER) <= 50;

-- 🟢 2️⃣ One Bedroom Units (60m² - 70m²)
UPDATE units 
SET auto_specs = json_object(
    'type', 'غرفة نوم واحدة',
    'type_en', '1 Bedroom',
    'bedrooms', 1,
    'bathrooms', 1,
    'reception', 1,
    'dining', 1,
    'kitchen', 1,
    'features', json_array('صالة + سفرة', 'غرفة نوم', 'حمام', 'مطبخ'),
    'features_en', json_array('Living + Dining', '1 Bedroom', '1 Bathroom', 'Kitchen'),
    'description', 'ريسبشن + سفرة + غرفة + حمام',
    'description_en', 'Reception + Dining + Bedroom + Bathroom'
)
WHERE (building_id IN ('33', 'B33') OR code LIKE '33%')
  AND CAST(area AS INTEGER) >= 60 
  AND CAST(area AS INTEGER) <= 70;

-- 🟢 3️⃣ Two Bedrooms Units (75m² - 90m²)
UPDATE units 
SET auto_specs = json_object(
    'type', 'غرفتين نوم',
    'type_en', '2 Bedrooms',
    'bedrooms', 2,
    'bathrooms', 1,
    'reception', 1,
    'kitchen', 1,
    'features', json_array('صالة', '2 غرفة نوم', 'حمام', 'مطبخ'),
    'features_en', json_array('Living Room', '2 Bedrooms', '1-2 Bathrooms', 'Kitchen'),
    'description', 'صالة + 2 غرفة + حمام + مطبخ',
    'description_en', 'Living + 2 Bedrooms + Bathroom + Kitchen'
)
WHERE (building_id IN ('33', 'B33') OR code LIKE '33%')
  AND CAST(area AS INTEGER) >= 75 
  AND CAST(area AS INTEGER) <= 90;

-- 🟢 4️⃣ Two Bedrooms Premium Units (100m² - 120m²)
UPDATE units 
SET auto_specs = json_object(
    'type', 'غرفتين نوم بريميوم',
    'type_en', '2 Bedrooms Premium',
    'bedrooms', 2,
    'bathrooms', 2,
    'reception', 1,
    'dining', 1,
    'kitchen', 1,
    'features', json_array('صالة كبيرة + سفرة', '2 غرفة نوم', '2 حمام', 'مطبخ منفصل'),
    'features_en', json_array('Large Living + Dining', '2 Bedrooms', '2 Bathrooms', 'Separate Kitchen'),
    'description', 'صالة كبيرة + سفرة + 2 غرفة + 2 حمام + مطبخ',
    'description_en', 'Large Living + Dining + 2 Bedrooms + 2 Bathrooms + Kitchen'
)
WHERE (building_id IN ('33', 'B33') OR code LIKE '33%')
  AND CAST(area AS INTEGER) >= 100 
  AND CAST(area AS INTEGER) <= 120;

-- 🏡 Special handling for ground floor units with gardens
-- Update garden flag for ground floor units (floor = 0 or 'Ground Floor')
UPDATE units 
SET auto_specs = json_set(
    COALESCE(auto_specs, '{}'),
    '$.garden', 1,
    '$.garden_desc', 'حديقة خاصة',
    '$.garden_desc_en', 'Private Garden'
)
WHERE (building_id IN ('33', 'B33') OR code LIKE '33%')
  AND (floor = '0' OR floor = 'Ground Floor' OR floor LIKE '%Ground%' OR floor LIKE '%أرضي%');
