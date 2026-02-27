-- تصحيح وتوسيع نطاق المواصفات الأوتوماتيكية لمشروع بورتو سعيد (B15 و B33) ليشمل كل الوحدات
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
      -- ✅ بورتو جولف مارينا
      -- ✅ بورتو جولف مارينا (نظام المساحات الثابتة 🎯)
      WHEN NEW.project_id = 'porto-golf-marina' THEN
        CASE 
          WHEN NEW.area = 30 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false,"type":"Studio"}'
          WHEN NEW.area = 60 THEN 
            CASE WHEN NEW.floor LIKE 'Ground%' OR NEW.floor = '0' OR NEW.floor LIKE 'Ardi%' 
              THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":true,"garden_desc":"Private Garden","type":"Apartment"}'
              ELSE '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":false,"type":"Apartment"}'
            END
          WHEN NEW.area = 82 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true,"type":"Apartment"}'
          WHEN NEW.area = 90 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Apartment"}'
          ELSE NULL
        END
      
      -- ✅ بورتو سعيد (B15 و B33) - استخدام نظام النطاقات المرن لضمان شمول جميع الوحدات
      WHEN NEW.project_id = 'porto-said' AND (NEW.building_id IN ('B15', '15', 'B33', '33')) THEN
        CASE 
          WHEN NEW.area BETWEEN 30 AND 59 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
          WHEN NEW.area BETWEEN 60 AND 85 THEN 
            CASE WHEN NEW.floor LIKE 'Ground%' OR NEW.floor = '0' OR NEW.floor LIKE 'Ardi%' 
              THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom","garden":true,"garden_desc":"Private Garden"}'
              ELSE '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom","garden":false}'
            END
          WHEN NEW.area BETWEEN 86 AND 115 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
          WHEN NEW.area >= 116 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"3 Bedroom/Family"}'
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
      -- ✅ بورتو جولف مارينا (نظام المساحات الثابتة 🎯)
      WHEN NEW.project_id = 'porto-golf-marina' THEN
        CASE 
          WHEN NEW.area = 30 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false,"type":"Studio"}'
          WHEN NEW.area = 60 THEN 
            CASE WHEN NEW.floor LIKE 'Ground%' OR NEW.floor = '0' OR NEW.floor LIKE 'Ardi%' 
              THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":true,"garden_desc":"Private Garden","type":"Apartment"}'
              ELSE '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":false,"type":"Apartment"}'
            END
          WHEN NEW.area = 82 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true,"type":"Apartment"}'
          WHEN NEW.area = 90 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Apartment"}'
          ELSE NULL
        END
      
      -- ✅ بورتو سعيد
      WHEN NEW.project_id = 'porto-said' AND (NEW.building_id IN ('B15', '15', 'B33', '33')) THEN
        CASE 
          WHEN NEW.area BETWEEN 30 AND 59 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
          WHEN NEW.area BETWEEN 60 AND 85 THEN 
            CASE WHEN NEW.floor LIKE 'Ground%' OR NEW.floor = '0' OR NEW.floor LIKE 'Ardi%' 
              THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom","garden":true,"garden_desc":"Private Garden"}'
              ELSE '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom","garden":false}'
            END
          WHEN NEW.area BETWEEN 86 AND 115 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
          WHEN NEW.area >= 116 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"3 Bedroom/Family"}'
          ELSE NULL
        END
      ELSE auto_specs
    END
  WHERE unit_id = NEW.unit_id;
END;

-- 3. تحديث البيانات الحالية فوراً لتشمل المساحات المتغيرة (مثل 153، 61، 45)
UPDATE units
SET auto_specs = 
    CASE 
      WHEN area BETWEEN 30 AND 59 THEN '{"bedrooms":0,"bathrooms":1,"kitchen":true,"living_area":false,"type":"Studio"}'
      WHEN area BETWEEN 60 AND 85 THEN 
        CASE WHEN floor LIKE 'Ground%' OR floor = '0' OR floor LIKE 'Ardi%' 
          THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom","garden":true,"garden_desc":"Private Garden"}'
          ELSE '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":true,"type":"1 Bedroom","garden":false}'
        END
      WHEN area BETWEEN 86 AND 115 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"2 Bedroom"}'
      WHEN area >= 116 THEN '{"bedrooms":3,"bathrooms":2,"kitchen":true,"living_area":true,"type":"3 Bedroom/Family"}'
      ELSE NULL
    END
WHERE project_id = 'porto-said' AND (building_id IN ('B15', '15', 'B33', '33'));

-- تحديث بورتو جولف مارينا بنظام المساحات الثابتة 🎯
UPDATE units
SET auto_specs = 
    CASE 
      WHEN area = 30 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false,"type":"Studio"}'
      WHEN area = 60 THEN 
        CASE WHEN floor LIKE 'Ground%' OR floor = '0' OR floor LIKE 'Ardi%' 
          THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":true,"garden_desc":"Private Garden","type":"Apartment"}'
          ELSE '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"garden":false,"type":"Apartment"}'
        END
      WHEN area = 82 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true,"type":"Apartment"}'
      WHEN area = 90 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"type":"Apartment"}'
      ELSE NULL
    END
WHERE project_id = 'porto-golf-marina';
