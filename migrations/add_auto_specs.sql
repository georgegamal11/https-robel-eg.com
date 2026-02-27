-- 1. إضافة العمود الجديد auto_specs لتخزين المواصفات بصيغة JSON
ALTER TABLE units ADD COLUMN auto_specs TEXT;

-- 2. إنشاء Trigger لتوليد المواصفات تلقائياً عند إضافة وحدة جديدة بناءً على المساحة (area)
CREATE TRIGGER set_auto_specs_insert
AFTER INSERT ON units
FOR EACH ROW
BEGIN
  UPDATE units
  SET auto_specs = 
    CASE 
      WHEN NEW.area = 30 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false}'
      WHEN NEW.area = 60 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false}'
      WHEN NEW.area = 82 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true}'
      WHEN NEW.area = 90 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false}'
      ELSE '{"bedrooms":0,"bathrooms":0,"kitchen":false,"living_area":false,"dining_area":false}'
    END
  WHERE unit_id = NEW.unit_id;
END;

-- 3. إنشاء Trigger لتحديث المواصفات تلقائياً إذا تغيرت المساحة (area)
CREATE TRIGGER set_auto_specs_update
AFTER UPDATE OF area ON units
FOR EACH ROW
BEGIN
  UPDATE units
  SET auto_specs = 
    CASE 
      WHEN NEW.area = 30 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false}'
      WHEN NEW.area = 60 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false}'
      WHEN NEW.area = 82 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true}'
      WHEN NEW.area = 90 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false}'
      ELSE '{"bedrooms":0,"bathrooms":0,"kitchen":false,"living_area":false,"dining_area":false}'
    END
  WHERE unit_id = NEW.unit_id;
END;

-- 4. تحديث الوحدات الموجودة حالياً لملء العمود الجديد
UPDATE units
SET auto_specs = 
  CASE 
    WHEN area = 30 THEN '{"bedrooms":1,"bathrooms":1,"kitchen":true,"living_area":false,"dining_area":false}'
    WHEN area = 60 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false}'
    WHEN area = 82 THEN '{"bedrooms":1,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":true}'
    WHEN area = 90 THEN '{"bedrooms":2,"bathrooms":2,"kitchen":true,"living_area":true,"dining_area":false}'
    ELSE '{"bedrooms":0,"bathrooms":0,"kitchen":false,"living_area":false,"dining_area":false}'
  END;
