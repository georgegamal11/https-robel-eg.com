-- خطة الدفع لمبنى B136 (النظام العام)
UPDATE units 
SET payment_plan = json_object(
    'name', 'خطة التقسيط القياسية',
    'name_en', 'Standard Installment Plan',
    'discount', '0%',
    'discount_en', '0% Discount',
    'down_payment', '5% + 5%',
    'down_payment_en', '5% + 5%',
    'installment_years', 6,
    'installment_years_text', '6 سنوات',
    'installment_years_text_en', '6 Years',
    'description', 'مقدم 5% مع التعاقد + 5% بعد شهر - أقساط 6 سنوات',
    'description_en', '5% Down Payment + 5% After 1 Month - 6 Years Installments'
)
WHERE (building_id IN ('136', 'B136') OR code LIKE '136%')
  AND code != '136922';

-- خطة الدفع الخاصة للوحدة 136922
UPDATE units 
SET payment_plan = json_object(
    'name', 'خطة تقسيط خاصة',
    'name_en', 'Special Installment Plan',
    'discount', '0%',
    'discount_en', '0% Discount',
    'down_payment', '10%',
    'down_payment_en', '10% Down Payment',
    'installment_years', 4,
    'installment_years_text', '4 سنوات',
    'installment_years_text_en', '4 Years',
    'description', 'مقدم 10% - أقساط 4 سنوات',
    'description_en', '10% Down Payment - 4 Years Installments'
)
WHERE code = '136922' OR unit_id = '136922';

-- خطة الكاش للوحدات 90 متر في B136
UPDATE units 
SET payment_plan = json_set(
    COALESCE(payment_plan, '{}'),
    '$.cash_discount', '40%',
    '$.cash_discount_en', '40% Cash Discount',
    '$.cash_note', 'خصم 40% للدفع كاش',
    '$.cash_note_en', '40% discount for cash payment'
)
WHERE (building_id IN ('136', 'B136') OR code LIKE '136%')
  AND CAST(area AS INTEGER) >= 88 
  AND CAST(area AS INTEGER) <= 92;
