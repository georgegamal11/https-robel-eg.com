-- التأكد من مطابقة جميع المواصفات في قاعدة البيانات للقواعد النهائية المحددة
DROP TRIGGER IF EXISTS set_auto_specs_insert;
DROP TRIGGER IF EXISTS set_auto_specs_update;

-- 1. Trigger لإضافة وحدة جديدة (يغطي جميع الحالات بدقة)
CREATE TRIGGER set_auto_specs_insert
AFTER INSERT ON units
FOR EACH ROW
BEGIN
  UPDATE units
  SET auto_specs = 
    CASE 
      -- ✅ بورتو جولف مارينا (نظام المساحات الثابتة بمرونة بسيطة للتقريب)
      WHEN NEW.project_id = 'porto-golf-marina' THEN
        CASE 
          WHEN NEW.area BETWEEN 28 AND 35 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false,"type":"Studio"}'
          WHEN NEW.area BETWEEN 55 AND 65 THEN 
            CASE WHEN NEW.floor LIKE 'Ground%' OR NEW.floor = '0' OR NEW.floor LIKE 'Ardi%' 
              THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":true,"garden_desc":"Private Garden","type":"Small Apartment"}'
              ELSE '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":false,"type":"Small Apartment"}'
            END
          WHEN NEW.area BETWEEN 78 AND 85 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true,"type":"Apartment"}'
          WHEN NEW.area BETWEEN 86 AND 100 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Apartment"}'
          ELSE NULL
        END
      
      -- ✅ بورتو سعيد - مبنى B15 (مواصفات ثابتة مخصصة)
      WHEN NEW.project_id = 'porto-said' AND (NEW.building_id = 'B15' OR NEW.building_id = '15') THEN
        CASE 
          WHEN NEW.area BETWEEN 40 AND 55 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
          WHEN NEW.area BETWEEN 56 AND 75 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
          WHEN NEW.area BETWEEN 85 AND 115 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
          WHEN NEW.area >= 116 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Family Apartment"}'
          ELSE NULL
        END

      -- ✅ بورتو سعيد - باقي المباني (B33, B16 و غيرها - نظام النطاقات المرن)
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
          WHEN NEW.area BETWEEN 121 AND 160 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Family Apartment"}'
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
      WHEN NEW.project_id = 'porto-golf-marina' THEN
        CASE 
          WHEN NEW.area BETWEEN 28 AND 35 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false,"type":"Studio"}'
          WHEN NEW.area BETWEEN 55 AND 65 THEN 
            CASE WHEN NEW.floor LIKE 'Ground%' OR NEW.floor = '0' OR NEW.floor LIKE 'Ardi%' 
              THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":true,"garden_desc":"Private Garden","type":"Small Apartment"}'
              ELSE '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":false,"type":"Small Apartment"}'
            END
          WHEN NEW.area BETWEEN 78 AND 85 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true,"type":"Apartment"}'
          WHEN NEW.area BETWEEN 86 AND 100 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Apartment"}'
          ELSE NULL
        END
      WHEN NEW.project_id = 'porto-said' AND (NEW.building_id = 'B15' OR NEW.building_id = '15') THEN
        CASE 
          WHEN NEW.area BETWEEN 40 AND 55 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
          WHEN NEW.area BETWEEN 56 AND 75 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
          WHEN NEW.area BETWEEN 85 AND 115 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
          WHEN NEW.area >= 116 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Family Apartment"}'
          ELSE NULL
        END
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
          WHEN NEW.area BETWEEN 121 AND 160 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Family Apartment"}'
          ELSE NULL
        END
      ELSE auto_specs
    END
  WHERE unit_id = NEW.unit_id;
END;

-- 3. تحديث شامل ونهائي للبيانات الحالية لضمان مطابقة الـ 187 وحدة
-- تحديث بورتو جولف
UPDATE units SET auto_specs = 
CASE 
  WHEN area BETWEEN 28 AND 35 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false,"type":"Studio"}'
  WHEN area BETWEEN 55 AND 65 THEN 
    CASE WHEN floor LIKE 'Ground%' OR floor = '0' OR floor LIKE 'Ardi%' 
      THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":true,"garden_desc":"Private Garden","type":"Small Apartment"}'
      ELSE '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":false,"type":"Small Apartment"}'
    END
  WHEN area BETWEEN 78 AND 85 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true,"type":"Apartment"}'
  WHEN area BETWEEN 86 AND 100 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Apartment"}'
  ELSE NULL
END WHERE project_id = 'porto-golf-marina';

-- تحديث بورتو سعيد - مبنى B15
UPDATE units SET auto_specs = 
CASE 
  WHEN area BETWEEN 40 AND 55 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
  WHEN area BETWEEN 56 AND 75 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
  WHEN area BETWEEN 85 AND 115 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
  WHEN area >= 116 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Family Apartment"}'
  ELSE NULL
END WHERE project_id = 'porto-said' AND (building_id = 'B15' OR building_id = '15');

-- تحديث بورتو سعيد - باقي المباني (بما فيها B16 و B33)
UPDATE units SET auto_specs = 
CASE 
  WHEN area BETWEEN 30 AND 59 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
  WHEN area BETWEEN 60 AND 75 THEN 
    CASE WHEN floor LIKE 'Ground%' OR floor = '0' OR floor LIKE 'Ardi%' 
      THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":true,"type":"Junior 1 Bedroom","garden":true,"garden_desc":"Private Garden"}'
      ELSE '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":true,"type":"Junior 1 Bedroom","garden":false}'
    END
  WHEN area BETWEEN 76 AND 95 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom"}'
  WHEN area BETWEEN 96 AND 120 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
  WHEN area BETWEEN 121 AND 160 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Family Apartment"}'
  ELSE NULL
END WHERE project_id = 'porto-said' AND (building_id != 'B15' AND building_id != '15');
