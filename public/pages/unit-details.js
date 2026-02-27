// --- Constants ---
const CONFIG = {
    fallbackImage: 'https://placehold.co/1200x800/f1f5f9/94a3b8?text=Image+Coming+Soon',
    mapDefault: [30.8401, 28.9247], // Porto Golf Marina (North Coast)
    currency: 'EGP'
};

const PROJECT_MASTER_PLANS = {
    'Porto Golf Marina': 'assets/images/projects/porto-golf-marina/master-plan/overview-2.jpg',
    'Porto Said': 'assets/images/projects/porto-said/master-plan/master plan porto said.webp',
    'Celebration': 'assets/images/projects/celebration/master-plan/overview-main.jpg'
};

const BUILDING_FLOOR_PLANS = {
    'B136': 'assets/images/projects/porto-golf-marina/floor-plans/رسمة الدور_1.webp'
};



// --- State ---
const state = {
    unit: null,
    images: [],
    currentImgIdx: 0,
    loading: true,
    isLightboxOpen: false,
    offers: []
};

// --- Elements ---
const dom = {
    loader: document.getElementById('loader'),
    heroImage: document.getElementById('main-hero-image'),
    thumbnailTrack: document.getElementById('thumbnail-track'),
    currentIdx: document.getElementById('current-image-idx'),
    totalImages: document.getElementById('total-images-count'),
    navTitle: document.getElementById('nav-title'),
    navPrice: document.getElementById('nav-price'),
    price: document.getElementById('unit-price'),
    mobilePrice: document.getElementById('mobile-price'),
    mobilePriceBottom: document.getElementById('mobile-price-bottom'),
    description: document.getElementById('unit-description'),
    featuresGrid: document.getElementById('key-features-grid'),
    amenitiesList: document.getElementById('amenities-list'),
    contactForm: document.getElementById('projectContactForm'),
    stickyNav: document.getElementById('sticky-nav'),
    similarContainer: document.getElementById('similar-units-container'),
    toast: document.getElementById('unit-toast'),
    toastMsg: document.getElementById('toast-msg'),
    lightbox: document.getElementById('lightbox'),
    lightboxImg: document.getElementById('lightbox-img'),
    fullAddress: document.getElementById('full-address'),
    statusBadge: document.getElementById('unit-status-badge'),
    purposeBadge: document.getElementById('unit-purpose-badge'),
    mobileIdx: document.getElementById('mobile-img-idx'),
    mobileTotal: document.getElementById('mobile-img-total'),
    pcIdx: document.getElementById('current-image-idx'),
    pcTotal: document.getElementById('total-images-count'),
};

// --- Language Management ---
let currentLang = 'en'; // Force English on refresh as requested

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('preferredLang', lang);
    const t = translations[lang];

    // Page Metadata
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.style.fontFamily = lang === 'en' ? '"Inter", sans-serif' : '"Tajawal", sans-serif';

    // Static Elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (t[key]) el.title = t[key];
    });

    // Toggle Buttons (Update all)
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.textContent = lang === 'en' ? 'AR' : 'EN';
    });

    // Dynamic Parts
    if (state.unit) renderUnit();
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Force scroll to top on refresh
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 100);

    // 0. Language Setup
    if (typeof translations !== 'undefined') setLanguage(currentLang);
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.onclick = () => setLanguage(currentLang === 'en' ? 'ar' : 'en');
    });

    // 1. Get Unit ID
    const params = new URLSearchParams(window.location.search);
    const unitId = params.get('id') || params.get('code');

    if (!unitId) {
        showToast(currentLang === 'en' ? "Unit not found." : "لم يتم العثور على الوحدة", "error");
        setTimeout(() => window.history.back(), 2000);
        return;
    }

    // 2. Firebase initialization removed (Cloudflare Migration)
    if (typeof fetchFromCloudflare === 'undefined') {
        console.error("Cloudflare Query Layer not loaded!");
    }

    // 3. Fetch Data
    await fetchUnitData(unitId);

    if (state.unit) {
        renderUnit();
        initMap();
        fetchSimilarUnits();

        // Hide Loader
        dom.loader.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => dom.loader.style.display = 'none', 500);
    } else {
        showToast("Could not load unit details.", "error");
        // Also hide loader on failure to prevent hang
        dom.loader.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => dom.loader.style.display = 'none', 500);
    }

    // 4. Listeners
    setupScrollListener();
    setupFormListener();
});

// --- Data Fetching ---
async function fetchUnitData(id) {
    try {
        console.log(`🔍 [UnitDetails] Fetching unit: ${id}`);

        // 0. CHECK INSTANT CACHE FIRST (Speed Optimization)
        try {
            const cached = localStorage.getItem('cached_unit_details');
            if (cached) {
                const u = JSON.parse(cached);
                // Normalized check
                if (u.id == id || u.code == id || (u.unit_id && u.unit_id == id)) {
                    console.log("🚀 [UnitDetails] Instant Load from Pre-Cache");
                    state.unit = normalizeUnit(u);
                    state.images = state.unit.images;
                    localStorage.removeItem('cached_unit_details');
                    return;
                }
            }
        } catch (e) { }

        // 1. Fetch via Unified Query Layer (Cloudflare D1)
        if (window.firebaseQueries && typeof window.firebaseQueries.getUnit === 'function') {
            const doc = await window.firebaseQueries.getUnit(id);
            if (doc) {
                console.log("✅ [UnitDetails] Data found in Cloudflare");
                state.unit = normalizeUnit(doc);
                state.images = state.unit.images;
            }
        }

        // 2. Fallback to Local JSON if absolutely necessary
        if (!state.unit) {
            console.warn("⚠️ Unit not found in D1, trying local baseline...");
            const res = await fetch('assets/data/inventory.json').catch(() => null);
            if (res && res.ok) {
                const localData = await res.json();
                const found = localData.find(u => u.code == id || u.unit_id == id || u.id == id);
                if (found) state.unit = normalizeUnit(found);
            }
        }

        // 3. Fetch Building Metadata & Offers
        if (state.unit && window.firebaseQueries) {
            const bId = state.unit.project || state.unit.building_id;
            if (bId) {
                const buildings = await window.firebaseQueries.getAllBuildings();
                const bData = buildings.find(b => {
                    const b1 = normalizeId(b.code || b.id || b.building_id);
                    const b2 = normalizeId(bId);
                    return b1 === b2;
                });

                if (bData && bData.offers) {
                    try {
                        const parsedOffers = typeof bData.offers === 'string' ? JSON.parse(bData.offers) : bData.offers;
                        if (Array.isArray(parsedOffers)) {
                            state.offers = parsedOffers.filter(o => o.status === 'active');
                        }
                    } catch (e) { }
                }
            }
        }
    } catch (e) {
        console.error("❌ Fatal Fetch Error:", e);
    }
}

function normalizeUnit(u) {
    const images = [];
    const rawImages = u.images || u.image || [];
    const imagesArray = (typeof rawImages === 'string' && rawImages.startsWith('[')) ? JSON.parse(rawImages) : rawImages;

    if (Array.isArray(imagesArray)) {
        imagesArray.forEach(img => {
            if (typeof img === 'object' && img !== null) {
                images.push(img.data || img.url || img);
            } else if (typeof img === 'string' && img.length > 5) {
                images.push(img);
            }
        });
    } else if (typeof imagesArray === 'string' && imagesArray.length > 5) {
        images.push(imagesArray);
    }

    if (images.length === 0) images.push(CONFIG.fallbackImage);

    const areaVal = Number(u.area) || 0;
    const bKey = (u.buildingCode || u.buildingId || u.building_id || '').toUpperCase().trim();
    const pKey = (u.project || '').toLowerCase().trim();

    // 🎯 NEW SPECIFICATION RULES
    let specs = {
        bedrooms: 1,
        bathrooms: 1,
        kitchen: true
    };

    const isGolf = pKey.includes('golf') || ['B133', 'B136', 'B121', 'B230', 'B243', 'B78', 'B224', '133', '136', '121', '230', '243', '78', '224'].includes(bKey);
    const isSaidB15 = bKey === 'B15' || bKey === '15';
    const isSaidB33 = bKey === 'B33' || bKey === '33';
    const isSaidGeneric = pKey.includes('said') && !isSaidB15 && !isSaidB33;

    // 1️⃣ PORTO GOLF MARINA RULES (Fixed Areas)
    if (isGolf) {
        if (Math.abs(areaVal - 30) <= 2) {
            specs = { bedrooms: 1, bathrooms: 1, kitchen: true, type: 'Studio' };
        } else if (Math.abs(areaVal - 60) <= 2) {
            specs = { bedrooms: 1, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
        } else if (Math.abs(areaVal - 82) <= 2) {
            specs = { bedrooms: 1, bathrooms: 2, living_area: true, kitchen: true, dining_area: true, type: 'Apartment' };
        } else if (Math.abs(areaVal - 90) <= 5) {
            specs = { bedrooms: 2, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
        } else {
            // Fallback for Golf
            specs.bedrooms = areaVal > 85 ? 2 : 1;
            specs.bathrooms = areaVal > 55 ? 2 : 1;
            if (areaVal > 55) specs.living_area = true;
        }
    }
    // 2️⃣ PORTO SAID B15 RULES (Fixed Areas)
    else if (isSaidB15) {
        if ([41, 47].includes(areaVal) || (areaVal >= 40 && areaVal <= 48)) {
            specs = { bedrooms: 0, bathrooms: 1, kitchen: true, type: 'Studio' };
        } else if ([69, 72].includes(areaVal) || (areaVal >= 68 && areaVal <= 73)) {
            specs = { bedrooms: 1, bathrooms: 1, living_area: true, kitchen: true, type: 'Apartment' };
        } else if ([90, 107].includes(areaVal) || (areaVal >= 89 && areaVal <= 108)) {
            specs = { bedrooms: 2, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
        } else if (areaVal >= 160) {
            specs = { bedrooms: 3, bathrooms: 2, living_area: true, kitchen: true, type: 'Family Apartment' };
        }
    }
    // 3️⃣ PORTO SAID B33 RULES (Ranges)
    else if (isSaidB33) {
        if (areaVal >= 30 && areaVal <= 59) {
            specs = { bedrooms: 0, bathrooms: 1, kitchen: true, type: 'Studio' };
        } else if (areaVal >= 60 && areaVal <= 75) {
            specs = { bedrooms: 1, bathrooms: 1, living_area: true, kitchen: true, type: 'Junior 1 Bedroom' };
        } else if (areaVal >= 76 && areaVal <= 95) {
            specs = { bedrooms: 1, bathrooms: 1, living_area: true, kitchen: true, type: 'Apartment' };
        } else if (areaVal >= 96 && areaVal <= 120) {
            specs = { bedrooms: 2, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
        } else if (areaVal >= 121 && areaVal <= 150) {
            specs = { bedrooms: 3, bathrooms: 2, living_area: true, kitchen: true, type: 'Family Apartment' };
        }
    }
    // 4️⃣ PORTO SAID GENERIC (Fallback)
    else if (isSaidGeneric) {
        specs.bedrooms = areaVal > 110 ? 3 : (areaVal > 75 ? 2 : 1);
        specs.bathrooms = areaVal > 85 ? 2 : 1;
        if (areaVal > 60) specs.living_area = true;
    }

    const normalized = {
        ...u,
        id: u.unit_id || u.code || u.id,
        code: u.code || u.unit_id || 'N/A',
        title: u.title || `Unit ${u.code || u.unit_id}`,
        building: u.buildingCode || u.buildingId || u.building_id || u.project || 'Building',
        location: u.location || u.projectArea || u.projectName || 'Porto Golf Marina',
        price: Number(u.price) || 0,
        area: areaVal,
        bedrooms: specs.bedrooms,
        bathrooms: specs.bathrooms,
        floor: u.floor || '-',
        view: u.view || 'Standard',
        description: u.description || "Premium unit with high-quality finishes and modern design.",
        amenities: Array.isArray(u.amenities) ? u.amenities : ["24/7 Security", "Parking", "Pool Access"],
        images: images,
        lat: 30.8419,
        lng: 28.9185,
        status: u.status || 'Available',
        purpose: u.purpose || u.intent || 'Sale',
        specs: specs
    };

    // --- Dynamic Location & Location Overrides ---
    if (isGolf) {
        normalized.location = currentLang === 'ar' ? 'بورتو جولف مارينا' : 'Porto Golf Marina';
        normalized.lat = 30.8419;
        normalized.lng = 28.9185;
    } else if (pKey.includes('said') || isSaidB15 || isSaidB33) {
        normalized.location = currentLang === 'ar' ? 'بورتو سعيد' : 'Porto Said';
        normalized.lat = 31.3538;
        normalized.lng = 32.0753;
    }

    // 💡 GROUND FLOOR RULE (Private Garden)
    const rawFloor = normalized.floor.toString().toLowerCase();
    const isGround = rawFloor.includes('ground') || rawFloor.includes('0') || rawFloor === 'gf' || rawFloor === 'g';
    if (isGround) {
        normalized.specs.garden = true;
        normalized.specs.garden_desc = (currentLang === 'ar' ? "حديقة خاصة" : "Private Garden");
    }

    return normalized;
}



function renderUnit() {
    const u = state.unit;
    const t = translations[currentLang];
    if (!u) return;

    const unitLabel = currentLang === 'ar' ? 'وحدة' : 'Unit';
    const displayId = u.id.toString().replace(/^unit_/i, '');
    const displayTitle = `${u.building} - ${unitLabel} ${displayId}`;

    // Update All Title Instances
    ['unit-title', 'unit-title-mobile', 'unit-title-desktop', 'unit-title-pc', 'page-main-title', 'nav-title', 'overlay-building'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === 'nav-title') el.innerHTML = `${unitLabel} <span lang="en">${displayId}</span>`;
        else if (id === 'overlay-building') el.textContent = u.building;
        else {
            // Split title to keep "Unit" translated and ID in English span
            el.innerHTML = `${u.building} - ${unitLabel} <span lang="en">${displayId}</span>`;
        }
    });

    // Update Overlay Unit ID
    const overlayUnit = document.getElementById('overlay-unit');
    if (overlayUnit) overlayUnit.innerHTML = `<span lang="en">${displayId}</span>`;

    // Update All Location Instances
    ['unit-location', 'unit-location-mobile', 'unit-location-desktop', 'unit-location-pc', 'page-location-text', 'full-address'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = u.location;
    });

    // Update All Status/Purpose Badges
    const statusText = t[`status_${u.status.toLowerCase()}`] || u.status;
    const purposeText = t[`tab_${u.purpose.toLowerCase()}`] || u.purpose;

    ['unit-status-badge', 'mobile-unit-status', 'pc-unit-status'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = statusText;
    });
    ['unit-purpose-badge', 'mobile-unit-purpose', 'pc-unit-purpose'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = purposeText;
    });

    dom.price.innerHTML = `<span lang="en">${formatPrice(u.price)}</span>`;
    const fullPrice = formatPrice(u.price);
    if (dom.mobilePrice) dom.mobilePrice.innerHTML = `<span lang="en">${fullPrice}</span>`;
    if (dom.mobilePriceBottom) dom.mobilePriceBottom.innerHTML = `<span lang="en">${fullPrice}</span>`;
    if (dom.navPrice) dom.navPrice.innerHTML = `<span lang="en">${fullPrice}</span>`;

    const pcPrice = document.getElementById('unit-price-pc');
    if (pcPrice) pcPrice.innerHTML = `<span lang="en">${fullPrice}</span>`;


    // Payment Plan Display (Read from unit.payment_plan or Building Offers)
    let paymentPlan = null;
    if (u.payment_plan) {
        if (typeof u.payment_plan === 'object') {
            paymentPlan = u.payment_plan;
        } else {
            try {
                paymentPlan = JSON.parse(u.payment_plan);
            } catch (e) {
                // FALLBACK: Raw String Handler
                console.log('Using raw string for payment plan');
                const raw = u.payment_plan;
                const parts = raw.split('|');
                const mainText = parts[0].trim();
                const discountText = parts[1] ? parts[1].trim() : '';

                paymentPlan = {
                    name: mainText,
                    // Try to extract Down Payment (e.g. 10%)
                    down_payment: (mainText.match(/(\d+%)\s*Down/i) || [])[1] || 'See details',
                    // Try to extract Years (e.g. 6 Years)
                    installment_years: (mainText.match(/(\d+\s*Years?)/i) || [])[1] || 'Flexible',
                    // Cash discount
                    cash_discount: (discountText.match(/(\d+%)/) || [])[1]
                };
            }
        }
    } else {
        // 🔗 CONNECTION FIX: Fallback to Building-level Offers
        const bestOffer = getBestOffer(u.area);
        if (bestOffer) {
            console.log(`🔗 [Payment Link] Auto-assigning building offer: ${bestOffer.name}`);
            paymentPlan = {
                name: bestOffer.name,
                name_en: bestOffer.name_en || bestOffer.name,
                discount: bestOffer.discountValue || '0%',
                discount_en: bestOffer.discountValue || '0%',
                down_payment: bestOffer.downPayment || '10%',
                down_payment_en: bestOffer.downPayment || '10%',
                installment_years: bestOffer.installmentYears || 6,
                installment_years_text: bestOffer.installmentYearsText || `${bestOffer.installmentYears || 6} سنوات`,
                installment_years_text_en: bestOffer.installmentYearsTextEn || `${bestOffer.installmentYears || 6} Years`,
                cash_discount: bestOffer.cashDiscount || '35%',
                cash_discount_en: bestOffer.cashDiscount || '35%',
                finishing_note: bestOffer.note || '',
                finishing_note_en: bestOffer.noteEn || ''
            };
        }
    }

    // Update Sidebar Plan Options
    const planContainer = document.querySelector('.bg-navy-deep .space-y-4');
    if (planContainer && paymentPlan) {
        const planName = currentLang === 'ar' ? (paymentPlan.name || 'خطة التقسيط') : (paymentPlan.name_en || paymentPlan.name || 'Payment Plan');
        const discount = currentLang === 'ar' ? (paymentPlan.discount || '') : (paymentPlan.discount_en || paymentPlan.discount || '');
        const downPayment = currentLang === 'ar' ? (paymentPlan.down_payment || '') : (paymentPlan.down_payment_en || paymentPlan.down_payment || '');
        const installmentYears = currentLang === 'ar' ? (paymentPlan.installment_years_text || `${paymentPlan.installment_years} سنوات`) : (paymentPlan.installment_years_text_en || `${paymentPlan.installment_years} Years`);

        // Create Interactive Accordion System
        let cardsHtml = `
            <div class="space-y-4" id="payment-plans-accordion">
                <!-- Installment Plan Item -->
                <div class="payment-plan-item group" data-state="expanded">
                    <button onclick="togglePlan(this)" class="w-full text-left relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 p-6 transition-all duration-500 hover:border-primary/50 hover:bg-white/[0.05]">
                        <div class="flex items-center justify-between relative z-10">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                                    <i data-lucide="percent" class="w-6 h-6 text-primary"></i>
                                </div>
                                <div>
                                    <span class="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">${currentLang === 'ar' ? 'نظام التقسيط' : 'Installment System'}</span>
                                    <h5 class="text-sm font-bold text-white">${planName}</h5>
                                </div>
                            </div>
                            <div class="flex items-center gap-4">
                                <div class="px-4 py-2 bg-primary/20 border border-primary/30 rounded-full">
                                    <span class="text-sm font-black text-primary">${discount || '0%'}</span>
                                </div>
                                <i data-lucide="chevron-down" class="w-5 h-5 text-white/30 transform transition-transform duration-500 group-data-[state=expanded]:rotate-180"></i>
                            </div>
                        </div>
                        
                        <div class="grid grid-rows-[0fr] group-data-[state=expanded]:grid-rows-[1fr] transition-all duration-500 ease-in-out opacity-0 group-data-[state=expanded]:opacity-100 group-data-[state=expanded]:mt-6">
                            <div class="overflow-hidden">
                                <div class="pt-6 border-t border-white/10 space-y-3">
                                    <div class="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div class="flex items-center gap-3">
                                            <i data-lucide="wallet" class="w-4 h-4 text-primary/60"></i>
                                            <span class="text-xs text-white/60 font-medium">${currentLang === 'ar' ? 'المقدم' : 'Down Payment'}</span>
                                        </div>
                                        <span class="text-sm font-bold text-white">${downPayment}</span>
                                    </div>
                                    <div class="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div class="flex items-center gap-3">
                                            <i data-lucide="calendar" class="w-4 h-4 text-primary/60"></i>
                                            <span class="text-xs text-white/60 font-medium">${currentLang === 'ar' ? 'فترة السداد' : 'Period'}</span>
                                        </div>
                                        <span class="text-sm font-bold text-white">${installmentYears}</span>
                                    </div>
                                    ${paymentPlan.finishing_note ? `
                                    <div class="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                                        <i data-lucide="info" class="w-4 h-4 text-blue-400 mt-0.5"></i>
                                        <p class="text-xs text-blue-200 leading-relaxed font-medium">
                                            ${currentLang === 'ar' ? paymentPlan.finishing_note : (paymentPlan.finishing_note_en || paymentPlan.finishing_note)}
                                        </p>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
        `;

        // Add Cash Deal Plan (Conditional)
        if (paymentPlan.cash_discount || paymentPlan.cash_discount_en) {
            const cashDiscount = currentLang === 'ar' ? (paymentPlan.cash_discount || '35%') : (paymentPlan.cash_discount_en || paymentPlan.cash_discount || '35%');
            cardsHtml += `
                <div class="payment-plan-item group" data-state="collapsed">
                    <button onclick="togglePlan(this)" class="w-full text-left relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 to-transparent border border-white/10 p-6 transition-all duration-500 hover:border-amber-500/50 hover:bg-amber-500/[0.05]">
                        <div class="flex items-center justify-between relative z-10">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                                    <i data-lucide="banknote" class="w-6 h-6 text-amber-500"></i>
                                </div>
                                <div>
                                    <span class="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">${currentLang === 'ar' ? 'الدفع النقدي' : 'Cash Deal'}</span>
                                    <h5 class="text-sm font-bold text-white">${currentLang === 'ar' ? 'نظام خصم الكاش' : 'Cash Discount Plan'}</h5>
                                </div>
                            </div>
                            <div class="flex items-center gap-4">
                                <div class="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full">
                                    <span class="text-sm font-black text-amber-500">${cashDiscount}</span>
                                </div>
                                <i data-lucide="chevron-down" class="w-5 h-5 text-white/30 transform transition-transform duration-500 group-data-[state=expanded]:rotate-180"></i>
                            </div>
                        </div>
                        
                        <div class="grid grid-rows-[0fr] group-data-[state=expanded]:grid-rows-[1fr] transition-all duration-500 ease-in-out opacity-0 group-data-[state=expanded]:opacity-100 group-data-[state=expanded]:mt-6">
                            <div class="overflow-hidden">
                                <div class="pt-6 border-t border-white/10">
                                    <div class="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-4 items-center">
                                        <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                            <i data-lucide="award" class="w-5 h-5 text-amber-400"></i>
                                        </div>
                                        <p class="text-xs text-amber-100/80 leading-relaxed font-medium">
                                            ${currentLang === 'ar' ? 'احصل على أكبر خصم ممكن وأقل سعر للمتر عند الدفع بنظام الكاش الفوري.' : 'Secure the maximum possible discount and lowest price per meter with our cash payment option.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            `;
        }

        cardsHtml += '</div>'; // Close accordion container
        planContainer.innerHTML = cardsHtml;

        // Add Toggle Functionality
        window.togglePlan = function (btn) {
            const item = btn.closest('.payment-plan-item');
            const container = document.getElementById('payment-plans-accordion');
            const items = container.querySelectorAll('.payment-plan-item');
            const isExpanded = item.getAttribute('data-state') === 'expanded';
            items.forEach(i => i.setAttribute('data-state', 'collapsed'));
            if (!isExpanded) item.setAttribute('data-state', 'expanded');
        };



        // Update Header text with icon
        const planHeader = document.querySelector('.bg-navy-deep h4');
        if (planHeader) {
            planHeader.innerHTML = `
                <i data-lucide="calculator" class="w-5 h-5 inline-block mr-2"></i>
                ${currentLang === 'ar' ? 'خطة السداد' : 'Payment Plan'}
            `;
        }

        // Refresh Lucide icons
        if (window.lucide) lucide.createIcons();
    } else if (planContainer) {
        // No payment plan available - show premium empty state
        planContainer.innerHTML = `
            <div class="p-8 bg-white/5 rounded-3xl border border-white/10 text-center">
                <div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="info" class="w-8 h-8 text-white/40"></i>
                </div>
                <p class="text-sm font-bold text-white/60">${currentLang === 'ar' ? 'لا توجد خطة سداد متاحة' : 'No payment plan available'}</p>
                <p class="text-xs text-white/40 mt-2">${currentLang === 'ar' ? 'تواصل معنا للمزيد من التفاصيل' : 'Contact us for more details'}</p>
            </div>
        `;

        // Refresh Lucide icons
        if (window.lucide) lucide.createIcons();
    }


    // Features
    const bedLabel = currentLang === 'ar' ? 'غرفة' : 'Beds';
    const bathLabel = currentLang === 'ar' ? 'حمام' : 'Baths';
    const floorLabel = currentLang === 'ar' ? 'دور' : 'Floor';
    const kitchenLabel = currentLang === 'ar' ? 'مطبخ' : 'Kitchen';
    const livingLabel = currentLang === 'ar' ? 'صالة' : 'Living Area';
    const diningLabel = currentLang === 'ar' ? 'غرفة طعام' : 'Dining Area';

    const features = [
        { icon: 'bed', label: `<span lang="en">${u.bedrooms}</span> ${bedLabel}` },
        { icon: 'bath', label: `<span lang="en">${u.bathrooms}</span> ${bathLabel}` },
        { icon: 'maximize', label: `<span lang="en">${u.area}</span> m&sup2;` },
        { icon: 'building', label: (u.floor && u.floor.toLowerCase().includes('floor')) ? `<span lang="en">${u.floor}</span>` : `${floorLabel} <span lang="en">${u.floor}</span>` },
        { icon: 'eye', label: u.view },
        { icon: 'home', label: purposeText },
    ];

    // Add Auto Specs Extras
    if (u.specs) {
        if (u.specs.kitchen) features.push({ icon: 'utensils', label: kitchenLabel });
        if (u.specs.living_area) features.push({ icon: 'tv', label: livingLabel });
        if (u.specs.dining_area) features.push({ icon: 'table', label: diningLabel });
        if (u.specs.garden) features.push({ icon: 'leaf', label: u.specs.garden_desc || (currentLang === 'ar' ? 'حديقة' : 'Garden') });
    }

    dom.featuresGrid.className = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4";
    dom.featuresGrid.innerHTML = features.map(f => {
        const isArea = f.icon === 'maximize';
        return `
            <div class="bg-white p-3 rounded-xl border ${isArea ? 'border-primary/30 bg-primary/5' : 'border-gray-100'} shadow-sm flex flex-row items-center gap-3 hover:shadow-md transition-all group h-full">
                <div class="w-10 h-10 lg:w-12 lg:h-12 ${isArea ? 'bg-primary text-white' : 'bg-blue-50 text-primary'} rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <i data-lucide="${f.icon}" class="w-5 h-5 lg:w-6 lg:h-6"></i>
                </div>
                <span class="font-bold ${isArea ? 'text-primary' : 'text-gray-700'} text-xs lg:text-sm leading-snug break-words">${f.label}</span>
            </div>
        `;
    }).join('');
    lucide.createIcons();

    // Amenities List
    dom.amenitiesList.innerHTML = u.amenities.map(a => `
        <div class="flex items-center gap-3 text-gray-600">
            <div class="text-green-500 bg-green-50 rounded-full p-1"><i data-lucide="check" class="w-3 h-3"></i></div>
            <span class="text-sm font-medium">${a}</span>
        </div>
    `).join('');
    lucide.createIcons();

    // Description text
    dom.description.textContent = u.description;

    // Overlay Stats (Area & Floor)
    const overlayArea = document.getElementById('overlay-area');
    if (overlayArea) overlayArea.innerHTML = `<span lang="en">${u.area}</span> m&sup2;`;

    const overlayFloor = document.getElementById('overlay-floor');
    if (overlayFloor) overlayFloor.innerHTML = `${floorLabel} <span lang="en">${u.floor}</span>`;

    const floorIndicator = document.getElementById('floor-indicator');
    if (floorIndicator) {
        // Calculate floor silhouette height (max floor is roughly 15-20)
        const floorNum = parseInt(u.floor) || 1;
        const heightPercent = Math.min(Math.max((floorNum / 15) * 100, 10), 90);
        floorIndicator.style.height = `${heightPercent}%`;
    }

    // Master Plan Display Logic
    const masterPlanSection = document.getElementById('master-plan-section');
    const masterPlanImg = document.getElementById('master-plan-img');

    if (masterPlanSection && masterPlanImg) {
        let masterPlanPath = null;

        // Specific buildings for Porto Golf Marina as per user request
        const portoGolfBuildings = ['B133', 'B136', 'B121', 'B230', 'B243', 'B78', '133', '136', '121', '230', '243', '78'];
        const currentBuilding = (u.buildingCode || u.buildingId || u.building_id || u.building || '').toString().toUpperCase().trim();
        const currentProject = (u.project || u.projectId || u.project_id || u.location || '').toLowerCase().trim();

        // Match if building is in list OR if it's Porto Golf and building starts with known IDs
        const isTargetBuilding = portoGolfBuildings.some(b => currentBuilding.includes(b));
        const isPortoGolf = currentProject.includes('golf') || currentProject.includes('جولف');

        if (isPortoGolf && (isTargetBuilding || portoGolfBuildings.includes(currentBuilding))) {
            masterPlanPath = PROJECT_MASTER_PLANS['Porto Golf Marina'];
        } else if (currentProject.includes('said')) {
            masterPlanPath = PROJECT_MASTER_PLANS['Porto Said'];
        } else if (currentProject.includes('celebration')) {
            masterPlanPath = PROJECT_MASTER_PLANS['Celebration'];
        }

        if (masterPlanPath) {
            masterPlanImg.src = masterPlanPath;
            // Fallback for different extensions
            masterPlanImg.onerror = () => {
                if (masterPlanImg.src.endsWith('.webp')) {
                    masterPlanImg.src = masterPlanImg.src.replace('.webp', '.jpg');
                } else if (masterPlanImg.src.endsWith('.jpg')) {
                    masterPlanImg.src = masterPlanImg.src.replace('.jpg', '.png');
                }
            };
            masterPlanSection.classList.remove('hidden');
        } else {
            masterPlanSection.classList.add('hidden');
        }
    }

    // Floor Plan Display Logic
    const floorPlanSection = document.getElementById('floor-plan-section');
    const floorPlanImg = document.getElementById('floor-plan-img');

    if (floorPlanSection && floorPlanImg) {
        let floorPlanPath = null;
        let bCode = (u.building || '').toUpperCase().trim();
        // Normalize: Ensure "B" prefix (e.g. "136" -> "B136")
        if (!bCode.startsWith('B') && /^\d+$/.test(bCode)) bCode = 'B' + bCode;

        if (typeof BUILDING_FLOOR_PLANS !== 'undefined' && BUILDING_FLOOR_PLANS[bCode]) {
            floorPlanPath = BUILDING_FLOOR_PLANS[bCode];
        }

        if (floorPlanPath) {
            floorPlanImg.src = floorPlanPath;
            floorPlanSection.classList.remove('hidden');
        } else {
            floorPlanSection.classList.add('hidden');
        }
    }

    // Pre-fill Contact Form
    const unitTypeSelect = document.getElementById('unitType');
    if (unitTypeSelect && u.location) {
        const loc = u.location.toLowerCase();
        if (loc.includes('golf')) unitTypeSelect.value = 'Porto Golf';
        else if (loc.includes('said')) unitTypeSelect.value = 'Porto Said';
        else if (loc.includes('celebration')) unitTypeSelect.value = 'Celebration';
    }

    const messageArea = document.getElementById('additionalMessage');
    if (messageArea && !messageArea.value) {
        messageArea.value = currentLang === 'en'
            ? `I am interested in Unit ${u.code} at ${u.building}.`
            : `أنا مهتم بالوحدة رقم ${u.code} في عمارة ${u.building}.`;
    }

    renderGallery();
}

function renderGallery() {
    if (!state.unit || !dom.heroImage) return;

    // Filter images for mobile if requested: skip the first image (usually floor plan)
    let displayImages = [...state.images];
    if (window.innerWidth < 1024 && displayImages.length > 1) {
        displayImages.shift(); // Remove the first image on mobile
    }

    if (displayImages.length === 0) return;

    state.imagesToDisplay = displayImages; // Store for lightbox/gallery navigation

    const img = displayImages[state.currentImgIdx] || displayImages[0];

    // Add a fade effect
    dom.heroImage.style.opacity = '0.5';
    dom.heroImage.style.transition = 'opacity 0.3s ease';

    const tempImg = new Image();
    tempImg.onload = () => {
        dom.heroImage.src = img;
        dom.heroImage.style.opacity = '1';
    };
    tempImg.onerror = () => {
        dom.heroImage.src = CONFIG.fallbackImage;
        dom.heroImage.style.opacity = '1';
    };
    tempImg.src = img;

    // Update Indices
    if (dom.mobileIdx) dom.mobileIdx.textContent = state.currentImgIdx + 1;
    if (dom.mobileTotal) dom.mobileTotal.textContent = displayImages.length;
    if (dom.pcIdx) dom.pcIdx.textContent = state.currentImgIdx + 1;
    if (dom.pcTotal) dom.pcTotal.textContent = displayImages.length;

    // Render Dots
    if (dom.thumbnailTrack) {
        if (displayImages.length <= 1) {
            dom.thumbnailTrack.style.display = 'none';
        } else {
            dom.thumbnailTrack.style.display = 'flex';
            dom.thumbnailTrack.innerHTML = displayImages.map((img, idx) => `
                <button class="w-2.5 h-2.5 rounded-full pointer-events-auto transition-all duration-500 ${idx === state.currentImgIdx ? 'bg-white w-10 shadow-lg' : 'bg-white/30 hover:bg-white/60'}"
                     onclick="setGalleryIndex(${idx})"></button>
            `).join('');
        }
    }

    // Update lightbox if open
    if (state.isLightboxOpen && dom.lightboxImg) {
        dom.lightboxImg.src = img;
    }
}

// Remove old updateMainImage function if it exists
if (typeof updateMainImage === 'function') {
    delete window.updateMainImage;
}

window.setGalleryIndex = (idx) => {
    state.currentImgIdx = idx;
    renderGallery();
};

window.moveGallery = (step) => {
    let newIdx = state.currentImgIdx + step;
    if (newIdx < 0) newIdx = state.imagesToDisplay.length - 1;
    if (newIdx >= state.imagesToDisplay.length) newIdx = 0;
    setGalleryIndex(newIdx);
};

// --- Lightbox Logic ---
window.openLightbox = (type = 'gallery') => {
    state.isLightboxOpen = true;
    dom.lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    setTimeout(() => {
        dom.lightbox.classList.add('opacity-100');
        // Refresh icons and translations in lightbox
        if (window.lucide) lucide.createIcons();
        if (typeof setLanguage === 'function') {
            const t = translations[currentLang];
            dom.lightbox.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (t[key]) el.textContent = t[key];
            });
        }
    }, 10);

    if (type === 'floorplan') {
        const floorImg = document.getElementById('floor-plan-img');
        if (floorImg) dom.lightboxImg.src = floorImg.src;
    } else if (type === 'masterplan') {
        const masterImg = document.getElementById('master-plan-img');
        if (masterImg) dom.lightboxImg.src = masterImg.src;
    } else {
        dom.lightboxImg.src = state.imagesToDisplay[state.currentImgIdx];
    }
};

window.closeLightbox = () => {
    state.isLightboxOpen = false;
    dom.lightbox.classList.remove('opacity-100');
    document.body.style.overflow = ''; // Restore scroll
    setTimeout(() => dom.lightbox.classList.add('hidden'), 300);
    resetZoom();
};

// Listen for Escape key to close lightbox
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.isLightboxOpen) {
        closeLightbox();
    }
});

window.moveLightbox = (step) => {
    moveGallery(step);
};

// Zoom Logic
let zoomScale = 1;
window.zoomImage = (delta) => {
    zoomScale = Math.max(0.5, Math.min(3, zoomScale + delta));
    dom.lightboxImg.style.transform = `scale(${zoomScale})`;
};

window.resetZoom = () => {
    zoomScale = 1;
    dom.lightboxImg.style.transform = `scale(1) translate(0, 0)`;
};

// Simple Drag Logic
let isDragging = false;
let startX, startY;

window.startDrag = (e) => {
    if (zoomScale <= 1) return;
    isDragging = true;
    startX = e.pageX - dom.lightboxImg.offsetLeft;
    startY = e.pageY - dom.lightboxImg.offsetTop;
    dom.lightboxImg.style.cursor = 'grabbing';
};

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const x = e.pageX - startX;
    const y = e.pageY - startY;
    dom.lightboxImg.style.transform = `scale(${zoomScale}) translate(${x / zoomScale}px, ${y / zoomScale}px)`;
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    if (dom.lightboxImg) dom.lightboxImg.style.cursor = zoomScale > 1 ? 'grab' : 'default';
});

// --- Initialization Enhancements ---
function initMap() {
    if (typeof L === 'undefined' || !document.getElementById('map')) return;

    // Clean up existing map if any
    const mapContainer = document.getElementById('map');
    if (mapContainer._leaflet_id) return;

    // Default: Porto Golf
    let lat = 27.3797;
    let lng = 33.6792;
    let zoom = 15;

    const bCode = (state.unit.building || '').toUpperCase().trim();
    const pName = (state.unit.location || '').toLowerCase();

    // Check if Porto Said
    const bNum = parseInt(bCode.replace(/\D/g, ''));
    if ((bNum > 0 && bNum < 100) || pName.includes('said') || ['B15', 'B16', 'B17', 'B33', '15', '16', '17', '33'].includes(bCode)) {
        lat = 31.3538;
        lng = 32.0753;
        zoom = 15;
    } else if (state.unit.lat && state.unit.lng) {
        lat = state.unit.lat;
        lng = state.unit.lng;
    }

    const map = L.map('map', { scrollWheelZoom: false }).setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #c9a23f; width: 8px; height: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4]
    });

    L.marker([lat, lng], { icon: customIcon }).addTo(map);
}

async function fetchSimilarUnits() {
    if (!state.unit || !dom.similarContainer) return;

    try {
        let allUnits = [];
        if (window.firebaseQueries && typeof window.firebaseQueries.getAllUnits === 'function') {
            allUnits = await window.firebaseQueries.getAllUnits();
        }

        if (allUnits.length === 0) {
            const res = await fetch('assets/data/inventory.json').catch(() => null);
            if (res && res.ok) allUnits = await res.json();
        }

        // Match by project and similar area
        let similar = allUnits.filter(u => {
            const uId = u.unit_id || u.code || u.id;
            const myId = state.unit.unit_id || state.unit.code || state.unit.id;
            return uId != myId &&
                (u.status || '').toLowerCase() === 'available' &&
                Math.abs((Number(u.area) || 0) - state.unit.area) < 40
        });

        if (similar.length === 0) {
            dom.similarContainer.innerHTML = `
                <div class="w-full text-center py-12 px-6 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center gap-4">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                        <i data-lucide="info" class="w-8 h-8"></i>
                    </div>
                    <div>
                        <p class="text-gray-900 font-bold" data-i18n="no_similar">No similar units found</p>
                        <p class="text-xs text-gray-400 mt-1">Check back later or contact us for more options</p>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            // Re-translate for new content
            const tKey = 'no_similar';
            const el = dom.similarContainer.querySelector('[data-i18n="no_similar"]');
            if (el && window.translations && window.translations[window.currentLang]) {
                el.textContent = window.translations[window.currentLang][tKey];
            }
            return;
        }

        dom.similarContainer.innerHTML = similar.slice(0, 4).map(u => renderSimilarCard(u)).join('');
        if (window.lucide) lucide.createIcons();

    } catch (e) {
        console.error("Similar Units Error:", e);
    }
}

function renderSimilarCard(u) {
    const formattedPrice = formatMoney(u.price);
    const displayImg = (u.images && u.images.length > 0) ? (u.images[0].data || u.images[0]) : CONFIG.fallbackImage;

    return `
        <div class="flex-none w-72 snap-start group cursor-pointer" onclick="window.location.href='unit-details.html?id=${u.code}'">
            <div class="relative aspect-video rounded-xl overflow-hidden mb-3">
                <img src="${displayImg}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                <div class="absolute top-2 right-2">
                    <span class="px-2 py-0.5 bg-white/90 backdrop-blur rounded text-[10px] font-bold text-gray-900 shadow-sm">${u.project}</span>
                </div>
            </div>
            <h4 class="font-bold text-gray-900 text-sm mb-1">${u.building || 'Unit'} ${u.code}</h4>
            <p class="text-primary font-bold text-sm">${formattedPrice}</p>
        </div>
    `;
}

function setupScrollListener() {
    window.addEventListener('scroll', () => {
        if (window.innerWidth < 1024) {
            // On mobile, header is fixed via CSS and always visible
            return;
        }

        const threshold = 400;
        if (window.scrollY > threshold) {
            dom.stickyNav.classList.remove('-translate-y-full');
        } else {
            dom.stickyNav.classList.add('-translate-y-full');
        }
    });
}

function setupFormListener() {
    if (dom.contactForm) {
        dom.contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = dom.contactForm.querySelector('button[type="submit"]');
            const originalContent = btn ? btn.innerHTML : '';

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = currentLang === 'en' ? '<i class="fas fa-spinner fa-spin mr-2"></i> Sending...' : '<i class="fas fa-spinner fa-spin mr-2"></i> جاري الإرسال...';
            }

            try {
                if (typeof EmailService === 'undefined') {
                    throw new Error("Email Service not ready");
                }

                const result = await EmailService.sendForm(dom.contactForm);
                if (result.success) {
                    showToast(currentLang === 'en' ? "Inquiry Sent Successfully!" : "تم إرسال طلبك بنجاح");
                    dom.contactForm.reset();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error("Form error:", error);
                showToast(currentLang === 'en' ? "Error: " + error.message : "خطأ: " + error.message, "error");
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalContent;
                }
            }
        });
    }
}

function formatPrice(val) { return val ? val.toLocaleString('en-US') + ' EGP' : 'Price on Request'; }

function formatMoney(n) {
    if (!n) return '---';
    return n.toLocaleString('en-US') + ' EGP';
}

function getBestOffer(area) {
    if (!state.offers || state.offers.length === 0) return null;

    // 1. Try Exact Area Match
    const areaVal = Number(area);
    const matches = state.offers.filter(o => Number(o.linkedArea) === areaVal);

    if (matches.length > 0) {
        return matches.sort((a, b) => (a.priority || 99) - (b.priority || 99))[0];
    }

    // 2. Fallback: Generic active offer (linkedArea matching nothing or 0)
    const generic = state.offers.filter(o => !o.linkedArea || Number(o.linkedArea) === 0);
    if (generic.length > 0) {
        return generic.sort((a, b) => (a.priority || 99) - (b.priority || 99))[0];
    }

    // 3. Last Resort: Any active offer
    return state.offers[0];
}

function showToast(msg) {
    if (!dom.toastMsg) return;
    dom.toastMsg.innerText = msg;
    dom.toast.classList.remove('translate-x-10', 'opacity-0');
    dom.toast.classList.add('translate-x-0', 'opacity-100');
    setTimeout(() => {
        dom.toast.classList.remove('translate-x-0', 'opacity-100');
        dom.toast.classList.add('translate-x-10', 'opacity-0');
    }, 3000);
}

window.scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.shareUnit = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast(currentLang === 'en' ? "Link Copied!" : "تم نسخ الرابط");
};

window.toggleFavorite = (btn) => {
    const icon = btn.querySelector('i');
    btn.classList.toggle('text-red-500');
    if (icon) {
        if (btn.classList.contains('text-red-500')) {
            icon.setAttribute('data-lucide', 'heart-off');
            showToast(currentLang === 'en' ? "Saved to favorites!" : "تم الحفظ في المفضلة");
        } else {
            icon.setAttribute('data-lucide', 'heart');
        }
        lucide.createIcons();
    }
};
