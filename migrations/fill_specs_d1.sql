-- Fill bedrooms and bathrooms based on area rules
-- Porto Golf Marina: B133, B136, B230, B243, B121, B78

-- 30m² units: 1 bed, 1 bath
UPDATE units
SET 
    bedrooms = 1,
    bathrooms = 1,
    specifications = json_object(
        'bedrooms', 1,
        'bathrooms', 1,
        'kitchen', 1,
        'living', 1
    )
WHERE building_id IN ('B133', 'B136', 'B230', 'B243', 'B121', 'B78')
AND CAST(area AS INTEGER) <= 38
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- 60m² units: 1 bed, 2 baths
UPDATE units
SET 
    bedrooms = 1,
    bathrooms = 2,
    specifications = json_object(
        'bedrooms', 1,
        'bathrooms', 2,
        'kitchen', 1,
        'living', 1
    )
WHERE building_id IN ('B133', 'B136', 'B230', 'B243', 'B121', 'B78')
AND CAST(area AS INTEGER) >= 50 
AND CAST(area AS INTEGER) <= 70
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- 82m² units: 1 bed, 2 baths
UPDATE units
SET 
    bedrooms = 1,
    bathrooms = 2,
    specifications = json_object(
        'bedrooms', 1,
        'bathrooms', 2,
        'kitchen', 1,
        'living', 1,
        'dining', 1
    )
WHERE building_id IN ('B133', 'B136', 'B230', 'B243', 'B121', 'B78')
AND CAST(area AS INTEGER) >= 78 
AND CAST(area AS INTEGER) <= 88
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- 90m²+ units: 2 beds, 2 baths
UPDATE units
SET 
    bedrooms = 2,
    bathrooms = 2,
    specifications = json_object(
        'bedrooms', 2,
        'bathrooms', 2,
        'kitchen', 1,
        'living', 1
    )
WHERE building_id IN ('B133', 'B136', 'B230', 'B243', 'B121', 'B78')
AND CAST(area AS INTEGER) >= 89
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- Porto Said B15
-- Studio (41, 47): 0 beds, 1 bath
UPDATE units
SET 
    bedrooms = 0,
    bathrooms = 1,
    specifications = json_object(
        'bedrooms', 0,
        'bathrooms', 1,
        'kitchen', 1
    )
WHERE building_id = 'B15'
AND CAST(area AS INTEGER) <= 50
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- 1 bedroom (69, 72): 1 bed, 1 bath
UPDATE units
SET 
    bedrooms = 1,
    bathrooms = 1,
    specifications = json_object(
        'bedrooms', 1,
        'bathrooms', 1,
        'kitchen', 1,
        'living', 1
    )
WHERE building_id = 'B15'
AND CAST(area AS INTEGER) > 50 
AND CAST(area AS INTEGER) <= 75
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- 2 bedrooms (90, 107): 2 beds, 2 baths
UPDATE units
SET 
    bedrooms = 2,
    bathrooms = 2,
    specifications = json_object(
        'bedrooms', 2,
        'bathrooms', 2,
        'kitchen', 1,
        'living', 1
    )
WHERE building_id = 'B15'
AND CAST(area AS INTEGER) > 75 
AND CAST(area AS INTEGER) <= 110
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- 3 bedrooms (165): 3 beds, 2 baths
UPDATE units
SET 
    bedrooms = 3,
    bathrooms = 2,
    specifications = json_object(
        'bedrooms', 3,
        'bathrooms', 2,
        'kitchen', 1,
        'living', 1
    )
WHERE building_id = 'B15'
AND CAST(area AS INTEGER) > 110
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- Porto Said B33 and others (Range Logic)
-- Studio (<60): 0 beds, 1 bath
UPDATE units
SET 
    bedrooms = 0,
    bathrooms = 1,
    specifications = json_object(
        'bedrooms', 0,
        'bathrooms', 1,
        'kitchen', 1
    )
WHERE building_id IN ('B33')
AND CAST(area AS INTEGER) <= 59
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- Junior 1BR (60-75): 1 bed, 1 bath
UPDATE units
SET 
    bedrooms = 1,
    bathrooms = 1,
    specifications = json_object(
        'bedrooms', 1,
        'bathrooms', 1,
        'kitchen', 1,
        'living', 1
    )
WHERE building_id IN ('B33')
AND CAST(area AS INTEGER) >= 60 
AND CAST(area AS INTEGER) <= 76
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- 1 Bedroom (76-95): 1 bed, 1 bath
UPDATE units
SET 
    bedrooms = 1,
    bathrooms = 1,
    specifications = json_object(
        'bedrooms', 1,
        'bathrooms', 1,
        'kitchen', 1,
        'living', 1
    )
WHERE building_id IN ('B33')
AND CAST(area AS INTEGER) > 76 
AND CAST(area AS INTEGER) <= 95
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- 2 Bedrooms (96-120): 2 beds, 2 baths
UPDATE units
SET 
    bedrooms = 2,
    bathrooms = 2,
    specifications = json_object(
        'bedrooms', 2,
        'bathrooms', 2,
        'kitchen', 1,
        'living', 1
    )
WHERE building_id IN ('B33')
AND CAST(area AS INTEGER) > 95 
AND CAST(area AS INTEGER) <= 120
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- Family 3BR (>120): 3 beds, 2 baths
UPDATE units
SET 
    bedrooms = 3,
    bathrooms = 2,
    specifications = json_object(
        'bedrooms', 3,
        'bathrooms', 2,
        'kitchen', 1,
        'living', 1
    )
WHERE building_id IN ('B33')
AND CAST(area AS INTEGER) > 120
AND (bedrooms IS NULL OR bathrooms IS NULL);

-- Verification query
SELECT 
    building_id,
    area,
    bedrooms,
    bathrooms,
    COUNT(*) as count
FROM units
WHERE building_id IN ('B133', 'B136', 'B230', 'B243', 'B121', 'B78', 'B15', 'B33')
GROUP BY building_id, area, bedrooms, bathrooms
ORDER BY building_id, area;
