-- إضافة قواعد المواصفات الأوتوماتيكية لمبنى B15 في بورتو سعيد
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
      
      -- قواعد مشروع بورتو سعيد - مبنى B15
      WHEN NEW.project_id = 'porto-said' AND (NEW.building_id = 'B15' OR NEW.building_id = '15') THEN
        CASE 
          WHEN NEW.area = 41 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
          WHEN NEW.area = 47 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
          WHEN NEW.area = 69 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
          WHEN NEW.area = 72 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
          WHEN NEW.area = 90 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
          WHEN NEW.area = 107 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
          WHEN NEW.area = 165 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"3 Bedroom"}'
          ELSE NULL
        END

      -- قواعد مشروع بورتو سعيد - مبنى B33
      WHEN NEW.project_id = 'porto-said' AND (NEW.building_id = 'B33' OR NEW.building_id = '33') THEN
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
AFTER UPDATE OF area, floor, project_id, building_id ON units
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
      
      -- قواعد مشروع بورتو سعيد - مبنى B15
      WHEN NEW.project_id = 'porto-said' AND (NEW.building_id = 'B15' OR NEW.building_id = '15') THEN
        CASE 
          WHEN NEW.area = 41 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
          WHEN NEW.area = 47 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
          WHEN NEW.area = 69 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
          WHEN NEW.area = 72 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
          WHEN NEW.area = 90 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
          WHEN NEW.area = 107 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
          WHEN NEW.area = 165 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"3 Bedroom"}'
          ELSE NULL
        END

      -- قواعد مشروع بورتو سعيد - مبنى B33
      WHEN NEW.project_id = 'porto-said' AND (NEW.building_id = 'B33' OR NEW.building_id = '33') THEN
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

-- 3. تحديث البيانات الحالية لمبنى B15
UPDATE units
SET auto_specs = 
    CASE 
      WHEN area = 41 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
      WHEN area = 47 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
      WHEN area = 69 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
      WHEN area = 72 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
      WHEN area = 90 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
      WHEN area = 107 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
      WHEN area = 165 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"3 Bedroom"}'
      ELSE NULL
    END
WHERE project_id = 'porto-said' AND (building_id = 'B15' OR building_id = '15');
