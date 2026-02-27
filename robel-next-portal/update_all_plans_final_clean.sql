-- 1. تصحيح موقع عمارات 230 و 243
UPDATE units SET location = 'Porto Golf Marina' WHERE (building_id IN ('230', 'B230', '243', 'B243') OR code LIKE '230%' OR code LIKE '243%');

-- 2. عمارة 230 و 243 (مساحات 60، 82، 90 - متكرر)
UPDATE units 
SET payment_plan = json_object(
    'name', 'خطة التقسيط القياسية', 'name_en', 'Standard Installment Plan',
    'discount', '10%', 'discount_en', '10% Off',
    'down_payment', '10%', 'down_payment_en', '10% Down Payment',
    'installment_years', 6, 'installment_years_text', '6 سنوات', 'installment_years_text_en', '6 Years',
    'finishing_note', 'خصم 10% أو بدون خصم مع التشطيب', 'finishing_note_en', '10% discount or no discount with finishing',
    'cash_discount', '35%', 'cash_discount_en', '35% Cash Discount'
)
WHERE (building_id IN ('230', 'B230', '243', 'B243') OR code LIKE '230%' OR code LIKE '243%')
  AND CAST(area AS INTEGER) > 35;

-- 3. عمارة 230 و 243 (مساحات 30 متر + الأرضي)
UPDATE units 
SET payment_plan = json_object(
    'name', 'خطة سداد الوحدات الصغيرة/الأرضي', 'name_en', 'Small Units/Ground Plan',
    'discount', '0%', 'discount_en', '0% Off',
    'down_payment', '10%', 'down_payment_en', '10% Down Payment',
    'installment_years', 6, 'installment_years_text', '6 سنوات', 'installment_years_text_en', '6 Years',
    'cash_discount', '35%', 'cash_discount_en', '35% Cash Discount'
)
WHERE (building_id IN ('230', 'B230', '243', 'B243') OR code LIKE '230%' OR code LIKE '243%')
  AND (CAST(area AS INTEGER) <= 35 OR floor IN ('0', 'Ground', 'الأرضي'));

-- 4. عمارة 136 (النظام العام)
UPDATE units 
SET payment_plan = json_object(
    'name', 'خطة التقسيط - بورتو جولف', 'name_en', 'Porto Golf Installment',
    'discount', '0%', 'discount_en', '0% Off',
    'down_payment', '5% + 5%', 'down_payment_en', '5% + 5% (1 Month)',
    'installment_years', 6, 'installment_years_text', '6 سنوات', 'installment_years_text_en', '6 Years'
)
WHERE (building_id IN ('136', 'B136') OR code LIKE '136%') AND code != '136922';

-- 5. عمارة 136 (خصم الكاش لمساحة 90 متر)
UPDATE units 
SET payment_plan = json_set(COALESCE(payment_plan, '{}'), '$.cash_discount', '40%', '$.cash_discount_en', '40% Cash Discount')
WHERE (building_id IN ('136', 'B136') OR code LIKE '136%') AND CAST(area AS INTEGER) BETWEEN 88 AND 92;

-- 6. الوحدة الخاصة 136922
UPDATE units 
SET payment_plan = json_object(
    'name', 'خطة تقسيط خاصة', 'name_en', 'Special Plan',
    'down_payment', '10%', 'down_payment_en', '10% Down',
    'installment_years', 4, 'installment_years_text', '4 سنوات', 'installment_years_text_en', '4 Years'
)
WHERE code = '136922';

-- 7. عمارة 133 (حسب المساحة)
UPDATE units 
SET payment_plan = json_object(
    'name', 'خطة 90 متر', 'name_en', '90m Plan',
    'down_payment', '10%', 'installment_years', 6, 'installment_years_text', '6 سنوات',
    'cash_discount', '40%', 'cash_discount_en', '40% Cash Discount'
)
WHERE (building_id IN ('133', 'B133') OR code LIKE '133%') AND CAST(area AS INTEGER) BETWEEN 88 AND 95;

UPDATE units 
SET payment_plan = json_object(
    'name', 'خطة 82 متر', 'name_en', '82m Plan',
    'down_payment', '10%', 'installment_years', 5, 'installment_years_text', '5 سنوات',
    'cash_discount', '40%', 'cash_discount_en', '40% Cash Discount'
)
WHERE (building_id IN ('133', 'B133') OR code LIKE '133%') AND CAST(area AS INTEGER) BETWEEN 78 AND 85;

UPDATE units 
SET payment_plan = json_object(
    'name', 'خطة 60 متر', 'name_en', '60m Plan',
    'down_payment', '10%', 'installment_years', 4, 'installment_years_text', '4 سنوات',
    'cash_discount', '40%', 'cash_discount_en', '40% Cash Discount'
)
WHERE (building_id IN ('133', 'B133') OR code LIKE '133%') AND CAST(area AS INTEGER) BETWEEN 55 AND 65;

-- 8. تأكيد خصم الكاش 40% لجميع مساحات 133
UPDATE units 
SET payment_plan = json_set(COALESCE(payment_plan, '{}'), '$.cash_discount', '40%', '$.cash_discount_en', '40% Cash Discount')
WHERE (building_id IN ('133', 'B133') OR code LIKE '133%');
