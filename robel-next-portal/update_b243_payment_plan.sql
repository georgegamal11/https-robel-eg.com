UPDATE units 
SET payment_plan = json_object(
    'name', 'خطة التقسيط القياسية',
    'name_en', 'Standard Installment Plan',
    'discount', '10%',
    'discount_en', '10% Off',
    'down_payment', '10%',
    'down_payment_en', '10% Down Payment',
    'installment_years', 6,
    'installment_years_text', '6 سنوات',
    'installment_years_text_en', '6 Years',
    'finishing', 'اختياري',
    'finishing_en', 'Optional',
    'finishing_note', 'خصم 10% أو بدون خصم مع التشطيب',
    'finishing_note_en', '10% discount or no discount with finishing',
    'description', 'مقدم 10% - أقساط 6 سنوات - خصم 10%',
    'description_en', '10% Down - 6 Years Installments - 10% Discount'
)
WHERE building_id IN ('243', 'B243') OR code LIKE '243%';
