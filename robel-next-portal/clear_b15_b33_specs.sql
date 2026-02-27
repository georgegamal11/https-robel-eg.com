-- Clear auto_specs column for buildings B15 and B33
UPDATE units 
SET auto_specs = NULL
WHERE building_id IN ('15', 'B15', '33', 'B33')
   OR project_id IN ('15', 'B15', '33', 'B33')
   OR unit_id LIKE '15%'
   OR unit_id LIKE '33%'
   OR code LIKE '15%'
   OR code LIKE '33%';
