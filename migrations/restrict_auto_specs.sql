-- تخصيص توليد المواصفات لمشروع بورتو جولف مارينا فقط
DROP TRIGGER IF EXISTS set_auto_specs_insert;
DROP TRIGGER IF EXISTS set_auto_specs_update;

-- Trigger عند الإضافة
CREATE TRIGGER set_auto_specs_insert
AFTER INSERT ON units
FOR EACH ROW
WHEN NEW.project_id = 'porto-golf-marina' -- القيد: يعمل فقط لمشروع بورتو جولف
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
      ELSE NULL
    END
  WHERE unit_id = NEW.unit_id;
END;

-- Trigger عند التحديث
CREATE TRIGGER set_auto_specs_update
AFTER UPDATE OF area, floor, project_id ON units
FOR EACH ROW
WHEN NEW.project_id = 'porto-golf-marina' -- القيد: يعمل فقط لمشروع بورتو جولف
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
      ELSE NULL
    END
  WHERE unit_id = NEW.unit_id;
END;

-- إفراغ المواصفات الأوتوماتيكية لأي مشروع آخر غير بورتو جولف (بورتو سعيد وسليبرشن)
UPDATE units 
SET auto_specs = NULL 
WHERE project_id != 'porto-golf-marina';

-- التأكد من تحديث وحدات بورتو جولف فقط بالمنطق الصحيح
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
      ELSE NULL
    END
WHERE project_id = 'porto-golf-marina';
