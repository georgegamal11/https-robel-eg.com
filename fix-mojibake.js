const fs = require('fs');

function fixMojibake(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Mappings of mojibake to Arabic characters
    // E.g., 'Ø¨ÙˆØ±ØªÙˆ Ø³Ø¹ÙŠØ¯' -> 'بورتو سعيد'
    // I will write a custom byte-level decoder since the mojibake is just UTF-8 decoded as ISO-8859-1 strings
    let original = content;

    try {
        // Convert the broken string back to Latin1 bytes, then decode as UTF-8
        let bytes = Buffer.from(content, 'latin1');
        let fixed = bytes.toString('utf8');
        
        // Let's test if it's completely fixed: Arabic shouldn't have 'Ø' mostly.
        // Wait, what if the entire file wasn't mojibake? Then this corrupts the already-correct utf8 parts!
        // We only want to convert the broken sequences.
    } catch(e) {}

    // Safe Replace approach for known strings in porto-said.html
    const replacements = {
        'Ø¨ÙˆØ±ØªÙˆ Ø³Ø¹ÙŠØ¯': 'بورتو سعيد',
        'Ø¹Ø§Ù…Ø± Ø¬Ø±ÙˆØ¨': 'عامر جروب',
        'Ø¹Ù‚Ø§Ø±Ø§Øª Ø¨ÙˆØ±ØªØ³Ø¹ÙŠØ¯': 'عقارات بورتسعيد',
        'Ø´Ù‚Ù‚ Ù„Ù„Ø¨ÙŠØ¹ Ø¨ÙˆØ±ØªØ³Ø¹ÙŠØ¯': 'شقق للبيع بورتسعيد',
        'Ø§Ø³ØªÙƒØ´Ù  Ø¨ÙˆØ±ØªÙˆ Ø³Ø¹ÙŠØ¯ØŒ Ø£Ø±Ù‚Ù‰ Ù…Ù†ØªØ¬Ø¹ Ø³ÙƒÙ†ÙŠ Ø³ÙŠØ§Ø­ÙŠ Ù ÙŠ Ø¨ÙˆØ±ØªØ³Ø¹ÙŠØ¯': 'استكشف بورتو سعيد، أرقى منتجع سكني سياحي في بورتسعيد',
        'Ù Ù†Ø¯Ù‚ 5 Ù†Ø¬ÙˆÙ…ØŒ Ù…Ø§Ø±ÙŠÙ†Ø§ØŒ ÙˆÙ…Ø¯Ø±Ø³Ø© Ø¯ÙˆÙ„ÙŠØ©': 'فندق 5 نجوم، مارينا، ومدرسة دولية',
        'Ø£ÙˆÙ„ Ù…Ù†ØªØ¬Ø¹ Ø¹Ø§Ù„Ù…ÙŠ Ù…ØªÙƒØ§Ù…Ù„ Ù ÙŠ Ù‚Ù„Ø¨ Ù…Ø¯ÙŠÙ†Ø©': 'أول منتجع عالمي متكامل في قلب مدينة',
        'Ø¨ÙˆØ±ØªØ³Ø¹ÙŠØ¯': 'بورتسعيد',
        'Ø§Ù„Ù…ÙˆÙ‚Ø¹': 'الموقع',
        'ÙŠØ¨Ø¯Ø£': 'يبدأ',
        'Ø§Ù„Ø³Ø¹Ø± Ù…Ù†': 'السعر من',
        'Ø¬.Ù…': 'ج.م',
        'Ù†Ø¸Ø§Ù…': 'نظام',
        'Ø§Ù„ØªÙ‚Ø³ÙŠØ·': 'التقسيط',
        'Ø§Ø­Ø¬Ø² Ù…Ø¹Ø§ÙŠÙ†Ø©': 'احجز معاينة',
        'Ù…Ø¬Ø§Ù†ÙŠØ©': 'مجانية',
        'ÙˆØ§ØªØ³Ø§Ø¨': 'واتساب',
        'Ø§Ù„Ø±Ø³Ù…ÙŠ': 'الرسمي',
        'Ø§Ù„Ù…Ø³Ø§Ø­Ø©': 'المساحة',
        '90 Ù Ø¯Ø§Ù†': '90 فدان',
        'Ø§Ù„Ù Ù†Ø¯Ù‚': 'الفندق',
        '5 Ù†Ø¬ÙˆÙ…': '5 نجوم',
        'Ø§Ù„ØªØ¹Ù„ÙŠÙ…': 'التعليم',
        'Ù…Ø¯Ø±Ø³Ø© Ø¯ÙˆÙ„ÙŠØ©': 'مدرسة دولية',
        'Ø§Ù„Ù…Ø·Ø§Ø¹Ù…': 'المطاعم',
        'Ù…Ù…Ø´Ù‰ Ø³ÙŠØ§Ø­ÙŠ': 'ممشى سياحي',
        'Ø§Ù„ØªØ³ÙˆÙ‚': 'التسوق',
        'Ù…ÙˆÙ„ ØªØ¬Ø§Ø±ÙŠ': 'مول تجاري',
        'Ø§Ù„Ù…Ø®Ø·Ø· Ø§Ù„Ø¹Ø§Ù…': 'المخطط العام',
        'Ø§Ø³ØªÙƒØ´Ù ': 'استكشف',
        'Ø§Ù„ØªØµÙ…ÙŠÙ… Ø§Ù„Ù…Ø¹Ù…Ø§Ø±ÙŠ Ø§Ù„Ù Ø±ÙŠØ¯ Ù„Ù„Ù…Ø´Ø±ÙˆØ¹': 'التصميم المعماري الفريد للمشروع',
        'ØªØ®Ø·ÙŠØ· Ù…ØªÙƒØ§Ù…Ù„': 'تخطيط متكامل',
        'ÙŠØ¬Ù…Ø¹ Ø¨ÙŠÙ† Ø§Ù„Ù Ø®Ø§Ù…Ø© ÙˆØ§Ù„Ø·Ø¨ÙŠØ¹Ø©': 'يجمع بين الفخامة والطبيعة',
        'Ø§Ø¶ØºØ· Ù„Ù„ØªÙƒØ¨ÙŠØ±': 'اضغط للتكبير',
        // Porto Golf Marina Specific
        'Ø¨ÙˆØ±ØªÙˆ Ø¬ÙˆÙ„Ù  Ù…Ø§Ø±ÙŠÙ†Ø§': 'بورتو جولف مارينا',
        'Ø¹Ù‚Ø§Ø±Ø§Øª Ø§Ù„Ø¹Ù„Ù…ÙŠÙ†': 'عقارات العلمين',
        'Ø´Ù‚Ù‚ Ù ÙŠ Ù…Ø´Ø±ÙˆØ¹': 'شقق في مشروع',
        'Ø§ÙƒØªØ´Ù ': 'اكتشف',
        'Ø¹Ø§ØµÙ…Ø© Ø§Ù„ØªØ±Ù ÙŠÙ‡ ÙˆØ§Ù„Ø¬ÙˆÙ„Ù ': 'عاصمة الترفيه والجولف',
        'Ù ÙŠ Ø§Ù„Ø³Ø§Ø­Ù„ Ø§Ù„Ø´Ù…Ø§Ù„ÙŠ': 'في الساحل الشمالي',
        'ÙˆØ­Ø¯Ø§Øª Ù Ø§Ø®Ø±Ø©': 'وحدات فاخرة',
        'Ù…Ù„Ø§Ø¹Ø¨ Ø¬ÙˆÙ„Ù  Ø¹Ø§Ù„Ù…ÙŠØ©': 'ملاعب جولف عالمية',
        'ÙˆØ£ÙƒØ¨Ø± Ø£ÙƒÙˆØ§ Ø¨Ø§Ø±Ùƒ': 'وأكبر أكوا بارك',
        'Ø§Ù„Ø¹Ù„Ù…ÙŠÙ†': 'العلمين',
        'Ø£ÙƒÙˆØ§ Ø¨Ø§Ø±Ùƒ': 'أكوا بارك'
    };

    for(let k in replacements) {
        content = content.replaceAll(k, replacements[k]);
    }
    
    // Also, handle cases where there are overlapping substrings by replacing byte encoding dynamically:
    // Regex matching sequences of Mojibake characters: Ø, Ù, etc.
    let re = /([ØÙ][\x80-\xBF]{1,2})+/g;
    content = content.replace(re, (match) => {
        try {
            return Buffer.from(match, 'latin1').toString('utf8');
        } catch(e) {
            return match;
        }
    });

    if(content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed mojibake in', filePath);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (let file of files) {
        const fullPath = dir + '/' + file;
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else {
            if (fullPath.endsWith('.html') || fullPath.endsWith('.js') || fullPath.endsWith('.json')) {
                fixMojibake(fullPath);
            }
        }
    }
}

walkDir('public');
