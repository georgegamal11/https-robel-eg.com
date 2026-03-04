const fs = require('fs');
const filePath = 'c:/Users/georg/OneDrive/Desktop/httpsrobel-eg.com2-23-2026/public/pages/home.js';
let content = fs.readFileSync(filePath, 'utf8');

if (content.includes('showCelebrationComingSoon')) {
    console.log('Already injected!');
    process.exit(0);
}

const comingSoonFn = `
// Celebration Coming Soon Modal
window.showCelebrationComingSoon = function() {
    const existing = document.getElementById('celebration-coming-soon-modal');
    if (existing) { existing.style.display = 'flex'; return; }
    const isAr = (window.currentLang || localStorage.getItem('preferredLang') || 'en') === 'ar';
    const modal = document.createElement('div');
    modal.id = 'celebration-coming-soon-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);animation:fadeInModal 0.35s ease;';
    modal.innerHTML = \`
        <style>
            @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUpCard { from { opacity: 0; transform: translateY(40px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes pulseBadge { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
            #cs-inner-card { animation: slideUpCard 0.45s cubic-bezier(0.22,1,0.36,1); }
            #cs-inner-badge { animation: pulseBadge 2s infinite; }
        </style>
        <div id="cs-inner-card" style="background:linear-gradient(145deg,#0f172a 0%,#1e2d4a 100%);border:1px solid rgba(201,162,63,0.35);border-radius:28px;padding:50px 40px 40px;max-width:480px;width:90%;text-align:center;position:relative;box-shadow:0 40px 100px rgba(0,0,0,0.6);">
            <button onclick="document.getElementById('celebration-coming-soon-modal').style.display='none';" style="position:absolute;top:18px;right:22px;background:rgba(255,255,255,0.08);border:none;color:#94a3b8;font-size:1.3rem;cursor:pointer;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;">&times;</button>
            <div id="cs-inner-badge" style="display:inline-flex;align-items:center;gap:8px;background:rgba(201,162,63,0.12);border:1px solid rgba(201,162,63,0.35);color:#c9a23f;font-size:0.8rem;font-weight:700;padding:6px 16px;border-radius:50px;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;">
                <span style="width:7px;height:7px;background:#c9a23f;border-radius:50%;display:inline-block;"></span>
                \${isAr ? 'قريباً' : 'COMING SOON'}
            </div>
            <div style="font-size:3.5rem;margin-bottom:16px;">🏖️</div>
            <h2 style="color:#f1f5f9;font-size:1.9rem;font-weight:800;margin:0 0 10px;font-family:'Tajawal',sans-serif;">\${isAr ? 'سيليبريشن' : 'Celebration'}</h2>
            <div style="width:60px;height:3px;background:linear-gradient(90deg,#c9a23f,#e8c56a);border-radius:2px;margin:0 auto 20px;"></div>
            <p style="color:#94a3b8;font-size:1rem;line-height:1.7;margin:0 0 28px;font-family:'Tajawal',sans-serif;">
                \${isAr ? 'مشروع سيليبريشن تحت التطوير حالياً. سيكون متاحاً قريباً بكل تفاصيله الرائعة.' : 'The Celebration project page is currently under development and will be available very soon with full details.'}
            </p>
            <a href="https://wa.me/201200666530" target="_blank" style="display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#c9a23f,#b8912e);color:white;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:0.95rem;font-weight:700;font-family:'Tajawal',sans-serif;box-shadow:0 8px 24px rgba(201,162,63,0.25);">
                <i class="fab fa-whatsapp"></i>
                \${isAr ? 'تواصل معنا الآن' : 'Contact Us Now'}
            </a>
        </div>
    \`;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    document.body.appendChild(modal);
};
`;

// Insert after the projectDetailPages closing brace (after line ~120)
const insertTarget = '// "Celebration" is disabled (Coming Soon)\r\n};';
if (content.includes(insertTarget)) {
    content = content.replace(insertTarget, insertTarget + '\r\n' + comingSoonFn);
    fs.writeFileSync(filePath, content);
    console.log('SUCCESS: injected showCelebrationComingSoon');
} else {
    // Try alternate ending
    const alt = '// "Celebration" is disabled (Coming Soon)\n};';
    if (content.includes(alt)) {
        content = content.replace(alt, alt + '\n' + comingSoonFn);
        fs.writeFileSync(filePath, content);
        console.log('SUCCESS (alt): injected showCelebrationComingSoon');
    } else {
        console.log('Could not find insertion point, searching...');
        const idx = content.indexOf('"Celebration" is disabled');
        console.log('Disabled text at index:', idx);
        console.log('Content around:', content.substring(idx - 5, idx + 100));
    }
}
