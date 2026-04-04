/**
 * AVAILABLE UNITS - BUILDINGS GRID
 * Unified logic for Porto Golf Marina, Porto Said, Celebration pages.
 * Clean rewrite - no hacks, no intervals, no complex path logic.
 */

// ─── STATE ───────────────────────────────────────────────────────────────────
let localProjectMetadata = {};
let localInventory = [];
let buildingsList = ['B133', 'B136', 'B230', 'B243', 'B121', 'B224', 'B78'];

// ─── PAGE DETECTION ──────────────────────────────────────────────────────────
const _pageUrl = window.location.href.toLowerCase();
let CURRENT_PAGE_AREA = "Porto Golf Marina";
if (_pageUrl.includes('porto-said') || _pageUrl.includes('porto_said')) CURRENT_PAGE_AREA = "Porto Said";
else if (_pageUrl.includes('celebration')) CURRENT_PAGE_AREA = "Celebration";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function normalizeId(id) {
    if (!id) return "";
    let clean = id.toString().trim().toUpperCase();
    if (/^\d+$/.test(clean)) return 'B' + clean;
    if (clean.startsWith('B')) return clean;
    return clean;
}
window.normalizeId = normalizeId;

function normalizeProjectArea(area) {
    if (!area) return "Other";
    const a = area.toString().toLowerCase().trim();
    if (a.includes('porto golf') || a === 'golf' || a.includes('marina')) return "Porto Golf Marina";
    if (a.includes('porto said') || a === 'said') return "Porto Said";
    if (a.includes('celebration') || a.includes('alamein')) return "Celebration";
    return area;
}

// ─── IMAGE MAPPING ───────────────────────────────────────────────────────────
// Uses relative paths from the /projects/ subfolder → goes up one level to /images/
const BUILDING_IMAGES = {
    '121': '../images/projects/porto-golf-marina/hero/hero-1.webp',
    '224': '../images/projects/porto-golf-marina/hero/hero-1.webp',
    '78':  '../images/projects/porto-golf-marina/hero/hero-2.webp',
    '243': '../images/projects/porto-golf-marina/hero/hero-2.webp',
    '230': '../images/projects/porto-golf-marina/hero/hero-2.webp',
    '136': '../images/projects/porto-golf-marina/hero/hero-1.webp',
    '133': '../images/projects/porto-golf-marina/hero/hero-3.webp',
    '15':  '../images/projects/porto-said/hero/hero-1.webp',
    '33':  '../images/projects/porto-said/hero/hero-2.webp',
    'SHOPS': '../images/projects/porto-said/hero/hero-1.webp'
};

const FALLBACK_IMAGE = '../images/projects/porto-golf-marina/hero/hero-1.webp';

function getBuildingImage(bId) {
    // Strip 'B' prefix for lookup
    const clean = bId.toString().toUpperCase().replace(/^B/, '');
    
    // 1. Check DB metadata (from Admin Dashboard) (Highest Priority)
    const meta = localProjectMetadata[normalizeId(bId)] || localProjectMetadata[bId] || {};
    if (meta.image) {
        let raw = meta.image;
        if (typeof raw === 'string' && raw.trim().startsWith('[')) {
            try { raw = JSON.parse(raw); } catch (e) {}
        }
        let src = Array.isArray(raw) ? ((typeof raw[0] === 'object' && raw[0].data) ? raw[0].data : raw[0]) : raw;
        if (typeof src === 'string' && src.length > 5) {
            // Absolute URL (Cloudflare, CDN) - use as-is
            if (src.startsWith('http') || src.startsWith('data:')) return src;
            // Relative path - prefix with ../ and clean 'assets/' if present
            return '../' + src.replace(/^\//, '').replace(/^assets\//, '').replace(/^\.\.\//, '');
        }
    }

    // 2. Extract image from a Unit in this building (Matches index.html logic)
    if (window.inventory && window.inventory.length > 0) {
        const bIdClean = normalizeId(bId);
        const bUnits = window.inventory.filter(u => normalizeId(u.building_id || u.buildingId || u.building) === bIdClean);
        
        const unitWithImg = bUnits.sort((a, b) => {
            const aHas = (a.images && a.images.length > 0) || a.floorPlan;
            const bHas = (b.images && b.images.length > 0) || b.floorPlan;
            if (aHas && !bHas) return -1;
            if (!aHas && bHas) return 1;
            return 0;
        }).find(u => (u.images && u.images.length > 0) || u.floorPlan);

        if (unitWithImg) {
            let uImgData = null;
            if (unitWithImg.images && unitWithImg.images.length > 0) uImgData = unitWithImg.images[0];
            else if (unitWithImg.floorPlan) uImgData = unitWithImg.floorPlan;
            
            if (uImgData) {
                let url = (typeof uImgData === 'object' && uImgData.data) ? uImgData.data : uImgData;
                if (typeof url === 'string') {
                    if (url.startsWith('http') || url.startsWith('data:')) return url;
                    return '../' + url.replace(/^\//, '').replace(/^assets\//, '').replace(/^\.\.\//, '');
                }
            }
        }
    }

    // 3. Check hardcoded map (fallback)
    if (BUILDING_IMAGES[clean]) return BUILDING_IMAGES[clean];
    if (BUILDING_IMAGES[bId]) return BUILDING_IMAGES[bId];

    // 4. Fallback
    return FALLBACK_IMAGE;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Filter click handlers
    const filterContainer = document.querySelector('.units-filter-bar');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderBuildings(btn.dataset.filter);
        });
    }

    initBuildings();
});

async function initBuildings() {
    const grid = document.getElementById('units-grid');
    if (!grid) return;

    // Show initial render immediately with known buildings (no waiting for DB)
    renderBuildings('all');

    // Then try to enrich data from DB
    try {
        if (!window.firebaseQueries) {
            console.warn('[AvailableUnits] firebaseQueries not ready, showing static data.');
            return;
        }

        console.log(`🚀 [AvailableUnits] Syncing ${CURRENT_PAGE_AREA}...`);

        const [cfUnits, cfBuildings] = await Promise.all([
            window.firebaseQueries.getAllUnits().catch(() => []),
            window.firebaseQueries.getAllBuildings().catch(() => [])
        ]);

        if (cfUnits && cfUnits.length > 0) {
            localInventory = cfUnits;
            window.inventory = localInventory;
        } else {
            // Try force refresh once
            const retried = await window.firebaseQueries.getAllUnits(true).catch(() => []);
            if (retried && retried.length > 0) {
                localInventory = retried;
                window.inventory = localInventory;
            }
        }

        // Build fallback area map
        const getFallbackArea = (id) => {
            const c = id.toString().toLowerCase().replace(/^b/i, '');
            if (['133', '136', '230', '243', '121', '224', '78'].includes(c)) return "Porto Golf Marina";
            if (['15', '33', 'shops'].includes(c)) return "Porto Said";
            return "hidden";
        };

        // Merge database metadata
        if (cfBuildings && cfBuildings.length > 0) {
            cfBuildings.forEach(dbB => {
                const bId = normalizeId(dbB.code || dbB.id || dbB.building_id);
                if (!bId) return;

                let rawImg = dbB.cover_image || dbB.cover_photo || dbB.image || dbB.img || dbB.imageUrl;
                if (typeof rawImg === 'string' && rawImg.trim().startsWith('[')) {
                    try { rawImg = JSON.parse(rawImg); } catch (e) {}
                }

                localProjectMetadata[bId] = {
                    ...(localProjectMetadata[bId] || {}),
                    constStatus: dbB.status || dbB.const_status || dbB.construction_status,
                    delivery: dbB.delivery_date || dbB.delivery || localProjectMetadata[bId]?.delivery,
                    image: rawImg || localProjectMetadata[bId]?.image,
                    projectArea: dbB.project_name || dbB.projectName || dbB.projectArea || getFallbackArea(bId),
                    isDynamic: true
                };
            });
        }

        // Add discovered buildings from units
        const discovery = new Set(['B133', 'B136', 'B230', 'B243', 'B121', 'B224', 'B78', 'SHOPS']);
        localInventory.forEach(u => {
            const bId = normalizeId(u.buildingId || u.building_id || u.project);
            if (bId) discovery.add(bId);
        });
        buildingsList = Array.from(discovery);

        // Re-render immediately to show database metadata and dynamically found images
        renderBuildings('all');

        // Calculate available unit counts
        buildingsList.forEach(bId => {
            const count = localInventory.filter(u => {
                const uB = normalizeId(u.buildingId || u.building_id || u.buildingCode || u.building || u.project);
                const rawStatus = (u.status || 'Available').toLowerCase().trim();
                const isAvailable = ['available', 'متاح', 'موجود', 'ready', 'جاهز', 'yes', '1', 'true'].some(k => rawStatus.includes(k));
                return uB === bId && isAvailable;
            }).length;

            if (!localProjectMetadata[bId]) {
                localProjectMetadata[bId] = { projectArea: getFallbackArea(bId) };
            }
            localProjectMetadata[bId].adminCount = count;
            if (!localProjectMetadata[bId].projectArea) {
                localProjectMetadata[bId].projectArea = getFallbackArea(bId);
            }
        });

        console.log(`✅ [AvailableUnits] Sync complete. Re-rendering...`);
        renderBuildings('all');

    } catch (err) {
        console.error('[AvailableUnits] Init error:', err);
        renderBuildings('all');
    }
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
function renderBuildings(filter = 'all') {
    const grid = document.getElementById('units-grid');
    if (!grid) return;

    const lang = window.currentLang || localStorage.getItem('preferredLang') || 'en';
    const t = {
        avail_units: lang === 'ar' ? 'وحدة متاحة' : 'Units Available',
        view_units:  lang === 'ar' ? 'عرض الوحدات' : 'VIEW UNITS',
        delivery:    lang === 'ar' ? 'التسليم' : 'Delivery',
        ...((window.translations && window.translations[lang]) ? window.translations[lang] : {})
    };

    // Porto Golf building IDs (hardcoded for fallback)
    const GOLF_IDS = ['133', '136', '230', '243', '121', '224', '78'];
    const SAID_IDS = ['15', '33', 'shops'];

    // Filter buildings for current page
    let filtered = buildingsList.filter(id => {
        const cleanId = id.toString().toLowerCase().replace(/^b/i, '');
        const meta = localProjectMetadata[id];

        // Hardcoded fallback for known IDs when no meta available
        if (!meta || !meta.projectArea) {
            if (CURRENT_PAGE_AREA === "Porto Golf Marina" && GOLF_IDS.includes(cleanId)) return true;
            if (CURRENT_PAGE_AREA === "Porto Said" && SAID_IDS.includes(cleanId)) return true;
            return false;
        }

        const area = normalizeProjectArea(meta.projectArea);
        // Always include hardcoded IDs even if meta area is wrong
        if (CURRENT_PAGE_AREA === "Porto Golf Marina") {
            return area === "Porto Golf Marina" || GOLF_IDS.includes(cleanId);
        }
        if (CURRENT_PAGE_AREA === "Porto Said") {
            return area === "Porto Said" || SAID_IDS.includes(cleanId);
        }
        return area === CURRENT_PAGE_AREA;
    });

    // Filter by construction status
    if (filter !== 'all') {
        const DELIVERED_IDS = ['121', '224', '78'];
        filtered = filtered.filter(id => {
            const cleanId = id.toString().toLowerCase().replace(/^b/i, '');
            const meta = localProjectMetadata[id] || {};
            const rawStatus = (meta.constStatus || meta.construction_status || '').toLowerCase();
            const rawDelivery = (meta.delivery || '').toLowerCase();
            const readyKeywords = ['ready', 'جاهز', 'delivered', 'move', 'استلام', 'available', 'فوري'];
            let isReady = readyKeywords.some(k => rawStatus.includes(k) || rawDelivery.includes(k));
            if (DELIVERED_IDS.includes(cleanId)) isReady = true;

            return filter === 'ready' ? isReady : !isReady;
        });
    }

    // Sort by unit count descending
    filtered.sort((a, b) => (localProjectMetadata[b]?.adminCount || 0) - (localProjectMetadata[a]?.adminCount || 0));

    grid.innerHTML = '';

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#94a3b8;">
            <p>${lang === 'ar' ? 'لا توجد مباني متاحة لهذا الفلتر.' : 'No buildings available for this filter.'}</p>
        </div>`;
        return;
    }

    const areaLabel = CURRENT_PAGE_AREA === "Porto Golf Marina"
        ? (window.translations?.[lang]?.nav_porto_golf || 'Porto Golf Marina')
        : (window.translations?.[lang]?.nav_porto_said || CURRENT_PAGE_AREA);

    filtered.forEach((id, index) => {
        const meta = localProjectMetadata[id] || {};
        const count = meta.adminCount || 0;
        const imageSrc = getBuildingImage(id);
        const delivery = meta.delivery || meta.delivery_date || '2026';
        const unitsUrl = `../units.html?project=${encodeURIComponent(CURRENT_PAGE_AREA)}&building=${encodeURIComponent(id)}`;

        const card = document.createElement('div');
        card.className = 'project-card';
        card.setAttribute('data-aos', 'fade-up');
        card.setAttribute('data-aos-delay', (index * 50).toString());
        card.onclick = (e) => { if (!e.target.closest('button')) window.location.href = unitsUrl; };

        card.innerHTML = `
            <div class="project-img-container" style="background:#e8e8e8;position:relative;overflow:hidden;height:180px;">
                <label class="tag-project-badge" style="position:absolute;top:10px;left:10px;z-index:2;">${areaLabel}</label>
                <img 
                    src="${imageSrc}"
                    alt="Building ${id}"
                    loading="eager"
                    fetchpriority="high"
                    style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;"
                    onerror="this.style.display='none';"
                >
            </div>
            <div class="project-content">
                <h2 class="project-card-title">${id}</h2>
                <p class="project-card-units">${count} ${t.avail_units}</p>
                <p class="project-card-delivery">
                    <i class="far fa-calendar-alt"></i> ${t.delivery}: ${delivery}
                </p>
                <button class="project-view-cta view-project-btn" onclick="window.location.href='${unitsUrl}'">
                    ${t.view_units}
                </button>
            </div>
        `;

        grid.appendChild(card);
    });

    refreshSidebars(filtered);

    if (window.AOS) setTimeout(() => window.AOS.refresh(), 300);
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function refreshSidebars(buildingIds) {
    if (!buildingIds || buildingIds.length === 0) return;
    document.querySelectorAll('.sidebar-dropdown-wrapper').forEach(wrapper => {
        if (wrapper.querySelector('span[data-i18n="nav_projects"]')) {
            const list = wrapper.querySelector('.sidebar-dropdown-list');
            if (list) {
                const sorted = [...buildingIds].sort((a, b) => {
                    const na = parseInt(a.replace(/\D/g, '')) || 0;
                    const nb = parseInt(b.replace(/\D/g, '')) || 0;
                    return na !== nb ? na - nb : a.localeCompare(b);
                });
                list.innerHTML = sorted.map(id =>
                    `<li><a href="../units.html?project=${encodeURIComponent(CURRENT_PAGE_AREA)}&building=${encodeURIComponent(id)}" onclick="window.toggleSidebar&&window.toggleSidebar(false)">${id}</a></li>`
                ).join('');
            }
        }
    });
}

// ─── NAV HELPER ──────────────────────────────────────────────────────────────
window.openProject = function(pName) {
    const isSaid = window.location.pathname.includes('porto-said');
    const slug = isSaid ? 'porto-said' : 'porto-golf-marina';
    let url = `../units.html?project=${slug}`;
    if (pName) url += `&building=${encodeURIComponent(pName)}`;
    window.location.href = url;
};