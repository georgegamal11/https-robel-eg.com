const https = require('https');
https.get('https://api.robel-eg.com/units/all', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const units = JSON.parse(data);
        console.log('Total units:', units.length);
        const b133 = units.filter(u => JSON.stringify(u).toLowerCase().includes('133'));
        console.log('B133 units:', b133.length);
        if(b133.length > 0) console.log(b133[0]);
    });
});
