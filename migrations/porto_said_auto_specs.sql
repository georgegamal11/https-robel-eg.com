-- تطوير منظومة المواصفات الأوتوماتيكية لتشمل مشروع بورتو سعيد مع قواعده الخاصة
DROP TRIGGER IF EXISTS set_auto_specs_insert;
DROP TRIGGER IF EXISTS set_auto_specs_update;

-- 1. Trigger لإضافة وحدة جديدة
CREATE TRIGGER set_auto_specs_insert
AFTER INSERT ON units
FOR EACH ROW
BEGIN
  UPDATE units
  SET auto_specs = 
    CASE 
      -- قواعد مشروع بورتو جولف مارينا
      WHEN NEW.project_id = 'porto-golf-marina' THEN
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
      
      -- قواعد مشروع بورتو سعيد (المنطق الجديد)
      WHEN NEW.project_id = 'porto-said' THEN
        CASE 
          WHEN NEW.area BETWEEN 30 AND 59 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
          WHEN NEW.area BETWEEN 60 AND 75 THEN 
            CASE WHEN NEW.floor LIKE 'Ground%' OR NEW.floor = '0' OR NEW.floor LIKE 'Ardi%' 
              THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":true,"type":"Junior 1 Bedroom","garden":true,"garden_desc":"Private Garden"}'
              ELSE '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":true,"type":"Junior 1 Bedroom","garden":false}'
            END
          WHEN NEW.area BETWEEN 76 AND 95 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
          WHEN NEW.area BETWEEN 96 AND 120 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
          WHEN NEW.area BETWEEN 121 AND 150 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Family Apartment"}'
          ELSE NULL
        END
      ELSE NULL
    END
  WHERE unit_id = NEW.unit_id;
END;

-- 2. Trigger لتحديث وحدة موجودة
CREATE TRIGGER set_auto_specs_update
AFTER UPDATE OF area, floor, project_id ON units
FOR EACH ROW
BEGIN
  UPDATE units
  SET auto_specs = 
    CASE 
      -- قواعد مشروع بورتو جولف مارينا
      WHEN NEW.project_id = 'porto-golf-marina' THEN
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
      
      -- قواعد مشروع بورتو سعيد
      WHEN NEW.project_id = 'porto-said' THEN
        CASE 
          WHEN NEW.area BETWEEN 30 AND 59 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
          WHEN NEW.area BETWEEN 60 AND 75 THEN 
            CASE WHEN NEW.floor LIKE 'Ground%' OR NEW.floor = '0' OR NEW.floor LIKE 'Ardi%' 
              THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":true,"type":"Junior 1 Bedroom","garden":true,"garden_desc":"Private Garden"}'
              ELSE '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":true,"type":"Junior 1 Bedroom","garden":false}'
            END
          WHEN NEW.area BETWEEN 76 AND 95 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
          WHEN NEW.area BETWEEN 96 AND 120 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
          WHEN NEW.area BETWEEN 121 AND 150 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Family Apartment"}'
          ELSE NULL
        END
      ELSE auto_specs
    END
  WHERE unit_id = NEW.unit_id;
END;

-- 3. تحديث جميع الوحدات الحالية في بورتو سعيد لتطبيق المنطق الجديد
UPDATE units
SET auto_specs = 
    CASE 
      WHEN area BETWEEN 30 AND 59 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
      WHEN area BETWEEN 60 AND 75 THEN 
        CASE WHEN floor LIKE 'Ground%' OR floor = '0' OR floor LIKE 'Ardi%' 
          THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":true,"type":"Junior 1 Bedroom","garden":true,"garden_desc":"Private Garden"}'
          ELSE '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":true,"type":"Junior 1 Bedroom","garden":false}'
        END
      WHEN area BETWEEN 76 AND 95 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
      WHEN area BETWEEN 96 AND 120 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
      WHEN area BETWEEN 121 AND 150 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Family Apartment"}'
      ELSE NULL
    END
WHERE project_id = 'porto-said';
