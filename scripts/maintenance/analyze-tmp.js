const fs = require('fs');

try {
    // Try reading with different encodings
    let content = fs.readFileSync('tmp_units_utf8.json', 'utf8');

    // Remove BOM
    if (content.charCodeAt(0) === 0xFEFF || content.charCodeAt(0) === 0xFFFE) {
        content = content.slice(1);
    }

    // Remove any other weird characters at start
    content = content.trim();

    const data = JSON.parse(content);
    const units = data.value || data;

    console.log('✅ Total units:', units.length);

    if (units[0]) {
        const sample = units[0];
        console.log('\n📋 Sample unit:');
        console.log('  - unit_id:', sample.unit_id);
        console.log('  - code:', sample.code);
        console.log('  - project_id:', sample.project_id);
        console.log('  - price:', sample.price);
        console.log('  - area:', sample.area);
        console.log('  - has images:', sample.images ? (sample.images.length > 100 ? `YES ✅ (${sample.images.length} chars)` : 'NO ❌') : 'NO ❌');
        console.log('  - has payment_plan:', sample.payment_plan ? 'YES ✅' : 'NO ❌');

        const withImages = units.filter(u => u.images && u.images.length > 100).length;
        const withPlans = units.filter(u => u.payment_plan && u.payment_plan.length > 5).length;

        console.log('\n📊 Data Completeness:');
        console.log(`  - Units with Images: ${withImages}/${units.length}`);
        console.log(`  - Units with Payment Plans: ${withPlans}/${units.length}`);

        // Save cleaned version
        if (units.length > 0) {
            fs.writeFileSync('RECOVERED_UNITS.json', JSON.stringify(units, null, 2));
            console.log('\n💾 Saved cleaned data to: RECOVERED_UNITS.json');
        }
    }
} catch (e) {
    console.error('❌ Error:', e.message);
    console.error('Stack:', e.stack);
}
