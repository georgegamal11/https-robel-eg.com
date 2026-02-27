SELECT COUNT(unit_id) FROM units WHERE unit_id BETWEEN 193 AND 350 AND (code IS NULL OR code = '');
DELETE FROM units WHERE unit_id BETWEEN 193 AND 350 AND (code IS NULL OR code = '');
