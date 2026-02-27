-- Count first
SELECT COUNT(unit_id) FROM units WHERE unit_id BETWEEN 193 AND 350;
-- Delete based on the observed empty fields in the screenshot
DELETE FROM units WHERE unit_id BETWEEN 193 AND 350 AND project_id = 'porto-golf-marina' AND code IS NULL;
-- Another attempt just in case they are strings
DELETE FROM units WHERE unit_id BETWEEN 193 AND 350 AND project_id = 'porto-golf-marina' AND (code = 'NULL' OR code = '');
