    UPDATE units 
    SET payment_plan = json_object(
        'name', 'خطة التقسيط - 90 متر',
        'name_en', '90m² Installment Plan',
        'discount', '0%',
        'discount_en', '0% Discount',
        'down_payment', '10%',
        'down_payment_en', '10% Down Payment',
        'installment_years', 6,
        'installment_years_text', '6 سنوات',
        'installment_years_text_en', '6 Years',
        'description', 'مقدم 10% - أقساط 6 سنوات',
        'description_en', '10% Down Payment - 6 Years Installments'
    )
    WHERE (building_id IN ('133', 'B133') OR code LIKE '133%')
    AND CAST(area AS INTEGER) >= 88 
    AND CAST(area AS INTEGER) <= 92;

    UPDATE units 
    SET payment_plan = json_object(
        'name', 'خطة التقسيط - 82 متر',
        'name_en', '82m² Installment Plan',
        'discount', '0%',
        'discount_en', '0% Discount',
        'down_payment', '10%',
        'down_payment_en', '10% Down Payment',
        'installment_years', 5,
        'installment_years_text', '5 سنوات',
        'installment_years_text_en', '5 Years',
        'description', 'مقدم 10% - أقساط 5 سنوات',
        'description_en', '10% Down Payment - 5 Years Installments'
    )
    WHERE (building_id IN ('133', 'B133') OR code LIKE '133%')
    AND CAST(area AS INTEGER) >= 80 
    AND CAST(area AS INTEGER) <= 84;

    UPDATE units 
    SET payment_plan = json_object(
        'name', 'خطة التقسيط - 60 متر',
        'name_en', '60m² Installment Plan',
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
    WHERE (building_id IN ('133', 'B133') OR code LIKE '133%')
    AND CAST(area AS INTEGER) >= 58 
    AND CAST(area AS INTEGER) <= 62;

    UPDATE units 
    SET payment_plan = json_set(
        COALESCE(payment_plan, '{}'),
        '$.cash_discount', '40%',
        '$.cash_discount_en', '40% Cash Discount',
        '$.cash_note', 'خصم 40% للدفع كاش',
        '$.cash_note_en', '40% discount for cash payment'
    )
    WHERE (building_id IN ('133', 'B133') OR code LIKE '133%');
