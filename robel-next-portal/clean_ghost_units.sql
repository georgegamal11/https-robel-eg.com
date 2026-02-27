-- Clean up ghost units (empty rows created by error)
-- This will remove rows that have no Unit Code or where both Price and Area are missing.

DELETE FROM units 
WHERE (code IS NULL OR code = '') 
   OR (
       (price IS NULL OR price = 0) 
       AND (area IS NULL OR area = 0)
   );
