-- تحسين الـ Trigger ليشمل نطاقات المساحة (Ranges) ودعم ميزة "الحديقة" للدور الأرضي
DROP TRIGGER IF EXISTS set_auto_specs_insert;
DROP TRIGGER IF EXISTS set_auto_specs_update;

CREATE TRIGGER set_auto_specs_insert
AFTER INSERT ON units
FOR EACH ROW
BEGIN
  UPDATE units
  SET auto_specs = 
    CASE 
      WHEN NEW.area BETWEEN 20 AND 45 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false}'
      WHEN NEW.area BETWEEN 46 AND 75 THEN 
        CASE WHEN NEW.floor LIKE 'Ground%' OR NEW.floor = '0' OR NEW.floor LIKE 'Ardi%' 
          THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false,"garden":true,"garden_desc":"Private Garden"}'
          ELSE '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false,"garden":false}'
        END
      WHEN NEW.area BETWEEN 76 AND 86 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true}'
      WHEN NEW.area BETWEEN 87 AND 110 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false}'
      WHEN NEW.area >= 111 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true}'
      ELSE '{"bedrooms":0,"bathrooms":0,"kitchen":false,"living_area":false,"dining_area":false}'
    END
  WHERE unit_id = NEW.unit_id;
END;

CREATE TRIGGER set_auto_specs_update
AFTER UPDATE OF area, floor ON units
FOR EACH ROW
BEGIN
  UPDATE units
  SET auto_specs = 
    CASE 
      WHEN NEW.area BETWEEN 20 AND 45 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false}'
      WHEN NEW.area BETWEEN 46 AND 75 THEN 
        CASE WHEN NEW.floor LIKE 'Ground%' OR NEW.floor = '0' OR NEW.floor LIKE 'Ardi%' 
          THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false,"garden":true,"garden_desc":"Private Garden"}'
          ELSE '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false,"garden":false}'
        END
      WHEN NEW.area BETWEEN 76 AND 86 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true}'
      WHEN NEW.area BETWEEN 87 AND 110 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false}'
      WHEN NEW.area >= 111 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true}'
      ELSE '{"bedrooms":0,"bathrooms":0,"kitchen":false,"living_area":false,"dining_area":false}'
    END
  WHERE unit_id = NEW.unit_id;
END;

-- تحديث البيانات الحالية مرة أخرى بالمنطق المحسن
UPDATE units
SET auto_specs = 
    CASE 
      WHEN area BETWEEN 20 AND 45 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false}'
      WHEN area BETWEEN 46 AND 75 THEN 
        CASE WHEN floor LIKE 'Ground%' OR floor = '0' OR floor LIKE 'Ardi%' 
          THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false,"garden":true,"garden_desc":"Private Garden"}'
          ELSE '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false,"garden":false}'
        END
      WHEN area BETWEEN 76 AND 86 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true}'
      WHEN area BETWEEN 87 AND 110 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false}'
      WHEN area >= 111 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true}'
      ELSE '{"bedrooms":0,"bathrooms":0,"kitchen":false,"living_area":false,"dining_area":false}'
    END;
