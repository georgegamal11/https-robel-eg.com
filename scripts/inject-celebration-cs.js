const fs = require('fs');
const p = 'c:/Users/georg/OneDrive/Desktop/httpsrobel-eg.com2-23-2026/public/celebration.html';
let html = fs.readFileSync(p, 'utf8');

// Find the closing </head> tag
const headEnd = html.indexOf('</head>');
if (headEnd === -1) { console.error('</head> not found!'); process.exit(1); }

const csScript = `
    <!-- Celebration Coming Soon Overlay -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var isAr = navigator.language.startsWith('ar') || localStorage.getItem('preferredLang') === 'ar';
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f172a 0%,#1a2744 100%);';
            overlay.innerHTML = '<style>@keyframes floatUp{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}@keyframes fadeInCS{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}@keyframes pulseDot{0%,100%{opacity:1}50%{opacity:0.3}}#cs-main-box{animation:fadeInCS 0.6s cubic-bezier(0.22,1,0.36,1)}#cs-emoji-box{animation:floatUp 3s ease-in-out infinite;display:inline-block}.csdot{animation:pulseDot 1.5s infinite}.csdot:nth-child(2){animation-delay:0.3s}.csdot:nth-child(3){animation-delay:0.6s}</style><div id="cs-main-box" style="max-width:520px;width:90%;text-align:center;padding:60px 40px;"><div style="display:inline-flex;gap:5px;margin-bottom:30px;"><span class="csdot" style="width:8px;height:8px;background:#c9a23f;border-radius:50%;display:inline-block;"></span><span class="csdot" style="width:8px;height:8px;background:#c9a23f;border-radius:50%;display:inline-block;"></span><span class="csdot" style="width:8px;height:8px;background:#c9a23f;border-radius:50%;display:inline-block;"></span></div><div id="cs-emoji-box" style="font-size:5rem;margin-bottom:24px;">🏖️</div><div style="display:inline-block;background:rgba(201,162,63,0.12);border:1px solid rgba(201,162,63,0.4);color:#c9a23f;font-size:0.75rem;font-weight:800;padding:6px 20px;border-radius:50px;letter-spacing:3px;margin-bottom:28px;">' + (isAr ? 'قريباً جداً' : 'COMING SOON') + '</div><h1 style="color:#f1f5f9;font-size:2.4rem;font-weight:900;margin:0 0 12px;font-family:Tajawal,sans-serif;line-height:1.2;">' + (isAr ? 'سيليبريشن ويست بيتش' : 'Celebration West Beach') + '</h1><div style="width:70px;height:3px;background:linear-gradient(90deg,#c9a23f,#e8c56a);border-radius:2px;margin:0 auto 24px;"></div><p style="color:#94a3b8;font-size:1rem;line-height:1.8;margin:0 0 36px;font-family:Tajawal,sans-serif;">' + (isAr ? 'صفحة مشروع سيليبريشن تحت الإعداد حالياً وستكون متاحة قريباً جداً بكل التفاصيل والوحدات المتاحة.' : 'The Celebration project page is currently being prepared and will be available very soon with all unit details.') + '</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;"><a href="index.html" style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#e2e8f0;text-decoration:none;padding:13px 26px;border-radius:50px;font-size:0.9rem;font-weight:600;">' + (isAr ? '← الرئيسية' : '← Back Home') + '</a><a href="https://wa.me/201200666530" target="_blank" style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#c9a23f,#b8912e);color:white;text-decoration:none;padding:13px 26px;border-radius:50px;font-size:0.9rem;font-weight:700;box-shadow:0 8px 24px rgba(201,162,63,0.3);">' + (isAr ? '📱 تواصل معنا' : '📱 Contact Us') + '</a></div></div>';
            document.body.style.overflow = 'hidden';
            document.body.insertBefore(overlay, document.body.firstChild);
        });
    <\/script>
`;

html = html.substring(0, headEnd) + csScript + html.substring(headEnd);
fs.writeFileSync(p, html);
console.log('SUCCESS: Coming Soon overlay injected into celebration.html');
