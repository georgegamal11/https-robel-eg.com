-- Delete ghost/phantom units with no actual data
-- Safety: Only delete units where critical fields are ALL NULL

-- First, let's see what we're dealing with
SELECT 
    'Ghost Units Summary' as description,
    COUNT(*) as total_ghost_units
FROM units
WHERE unit_id IS NULL 
   OR unit_id = 'NULL'
   OR (code IS NULL AND building_id IS NULL AND area IS NULL);

-- Show sample of ghost units before deletion
SELECT *
FROM units
WHERE unit_id IS NULL 
   OR unit_id = 'NULL'
   OR (code IS NULL AND building_id IS NULL AND area IS NULL)
LIMIT 10;

-- DELETE GHOST UNITS
-- Only delete units that have NO meaningful data
DELETE FROM units
WHERE unit_id IS NULL 
   OR unit_id = 'NULL'
   OR (
       code IS NULL 
       AND building_id IS NULL 
       AND area IS NULL
       AND price IS NULL
       AND project_id IS NULL
   );

-- Verification: Show remaining units count
SELECT 
    'After Cleanup' as description,
    COUNT(*) as total_units
FROM units;

-- Show units by building
SELECT 
    building_id,
    COUNT(*) as unit_count,
    COUNT(DISTINCT area) as unique_areas,
    MIN(area) as min_area,
    MAX(area) as max_area
FROM units
WHERE building_id IS NOT NULL
GROUP BY building_id
ORDER BY building_id;
