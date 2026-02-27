
/**
 * DYNAMIC BUILDINGS LOGIC - Unified for Porto Golf Marina, Porto Said, and Celebration
 * Fetches data from Cloudflare D1 and renders building cards for the current project page.
 */

// Grey placeholder
const DEFAULT_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/v37fwAJ/gPkS+QnAAAAAElFTkSuQmCC';

// State
let localProjectMetadata = {};
let localInventory = [];
let buildingsList = ['B133', 'B136', 'B230', 'B243', 'B121', 'B224', 'B78'];

// Helper for Area Normalization
function normalizeProjectArea(area) {
    if (!area) return "Other";
    const a = area.toString().toLowerCase().trim();
    if (a.includes('porto golf') || a === 'golf' || a.includes('marina')) return "Porto Golf Marina";
    if (a.includes('porto said') || a === 'said') return "Porto Said";
    if (a.includes('celebration') || a.includes('alamein') || a.includes('new alamein')) return "Celebration";
    return area;
}

// Detection logic for multi-project support
const pageUrl = window.location.href.toLowerCase();
let CURRENT_PAGE_AREA = "Porto Golf Marina";
if (pageUrl.includes('porto-said') || pageUrl.includes('porto_said')) CURRENT_PAGE_AREA = "Porto Said";
else if (pageUrl.includes('celebration')) CURRENT_PAGE_AREA = "Celebration";
else if (pageUrl.includes('porto-golf') || pageUrl.includes('porto_golf')) CURRENT_PAGE_AREA = "Porto Golf Marina";

document.addEventListener('DOMContentLoaded', () => {
    initAvailableBuildings();

    // Filter click handlers
    const filterContainer = document.querySelector('.units-filter-bar');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;

            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            renderBuildingsInternal(filter);
        });
    }
});

async function initAvailableBuildings() {
    const grid = document.getElementById('units-grid');
    if (!grid) return;

    try {
        console.log(`🚀 [AvailableUnits] Syncing ${CURRENT_PAGE_AREA}...`);

        // Use unified Cloudflare Layer if available
        if (window.firebaseQueries) {
            let [cfUnits, cfBuildings] = await Promise.all([
                window.firebaseQueries.getAllUnits(),
                window.firebaseQueries.getAllBuildings()
            ]);

            // RETRY LOGIC: If initial sync fails or returns 0 units, try force refresh once.
            if (!cfUnits || cfUnits.length === 0) {
                console.warn("⚠️ Initial sync returned 0 units. Retrying with FORCE REFRESH...");
                [cfUnits, cfBuildings] = await Promise.all([
                    window.firebaseQueries.getAllUnits(true),
                    window.firebaseQueries.getAllBuildings(true)
                ]);

                if (cfUnits && cfUnits.length > 0) {
                    localInventory = cfUnits;
                    window.inventory = localInventory;
                    console.log(`✅ [AvailableUnits] Retry succesful: ${localInventory.length} units synced.`);
                } else if (localInventory && localInventory.length > 0) {
                    console.warn("❌ Retry failed but local cache exists. Keeping existing data.");
                } else {
                    console.error("❌ Retry failed. Still 0 units and no local data.");

                    // Show user-friendly toast/alert
                    const existingToast = document.querySelector('.connection-error-toast');
                    if (!existingToast) {
                        const toast = document.createElement('div');
                        toast.className = 'connection-error-toast';
                        toast.style.zIndex = "10000";
                        toast.innerHTML = `
                            <div style="background: #0f172a; color: white; padding: 16px 24px; border-radius: 12px; position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 9999; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 15px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); width: max-content; max-width: 90vw;">
                                <div style="background: #ef4444; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <i class="fas fa-wifi-slash" style="color: white;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px;">Connection Issue Detected</div>
                                    <div style="font-size: 12px; color: #94a3b8;">Unable to sync with database. Showing last known status.</div>
                                </div>
                                <button onclick="location.reload()" style="background: #c9a23f; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; transition: all 0.2s;">Retry Now</button>
                            </div>
                        `;
                        document.body.appendChild(toast);
                    }
                }
            } else {
                localInventory = cfUnits;
                window.inventory = localInventory;
                console.log(`✅ [AvailableUnits] Synced ${localInventory.length} units from Layer.`);
            }

            // 4. Process Buildings & Metadata
            const discovery = new Set(['B133', 'B136', 'B230', 'B243', 'B121', 'B224', 'B78', 'B15', 'B16', 'B17', 'B9', 'B10', 'B33', 'SHOPS']);

            // Consolidate with Global Normalizer
            const normalizeId = window.normalizeId;

            // Add buildings from units
            localInventory.forEach(u => {
                const bId = normalizeId(u.buildingId || u.building_id || u.project);
                if (bId) discovery.add(bId);
            });

            // Add buildings from metadata
            if (cfBuildings) {
                cfBuildings.forEach(b => {
                    const bId = normalizeId(b.code || b.id || b.building_id);
                    if (bId) discovery.add(bId);
                });
            }

            buildingsList = Array.from(discovery);

            buildingsList.forEach(bId => {
                const d1Meta = cfBuildings ? cfBuildings.find(b => {
                    const b1 = (b.id || b.code || '').toString().toLowerCase().replace(/^b/i, '');
                    const b2 = bId.toString().toLowerCase().replace(/^b/i, '');
                    return b1 === b2;
                }) : null;

                // Calculate Available Count - Robust multi-field matching
                const target = window.normalizeId(bId);
                const realCount = localInventory.filter(u => {
                    // Centralized normalization for comparison
                    const uB = u.buildingId || window.normalizeId(u.buildingId || u.building_id || u.buildingCode || u.building);
                    const isMatch = (uB === target);

                    // Robust availability check (handles English, Arabic, and truthy values)
                    const rawStatus = (u.status || 'Available').toLowerCase().trim();
                    const availableKeywords = ['available', 'متاح', 'موجود', 'ready', 'جاهز', 'yes', '1', 'true'];
                    const isAvailable = availableKeywords.some(key => rawStatus.includes(key));

                    return isMatch && isAvailable;
                }).length;

                // 🚀 Fallback Project Area Mapping
                const getFallbackArea = (id) => {
                    const clean = id.toString().toLowerCase().trim().replace(/^b/i, '');
                    if (['133', '136', '230', '243', '121', '224', '78'].includes(clean)) return "Porto Golf Marina";
                    if (['15', '16', '17', '33', 'shops'].includes(clean)) return "Porto Said";
                    if (['9', '10', 'celebration', 'alamein'].includes(clean)) return "Celebration";
                    return "Other";
                };

                if (d1Meta || !localProjectMetadata[bId]) {
                    const dbArea = d1Meta ? (d1Meta.project_name || d1Meta.projectName || d1Meta.projectArea) : null;
                    localProjectMetadata[bId] = {
                        ...(localProjectMetadata[bId] || {}),
                        ...(d1Meta ? {
                            constStatus: d1Meta.status || d1Meta.const_status,
                            delivery: d1Meta.delivery,
                            image: d1Meta.images || d1Meta.image,
                        } : {}),
                        projectArea: dbArea || getFallbackArea(bId),
                        adminCount: realCount,
                        isDynamic: true
                    };
                } else {
                    localProjectMetadata[bId].adminCount = realCount;
                    if (!localProjectMetadata[bId].projectArea) {
                        localProjectMetadata[bId].projectArea = getFallbackArea(bId);
                    }
                }
            });
        }

        console.log(`✅ [AvailableUnits] D1 Sync Complete. Rendering ${CURRENT_PAGE_AREA}...`);
        renderBuildingsInternal('all');

    } catch (err) {
        console.error('Error init buildings:', err);
        renderBuildingsInternal('all');
    }
}

function getBuildingMetadataImage(pName) {
    const meta = localProjectMetadata[pName];
    if (meta && meta.image) {
        const imgData = meta.image;
        if (Array.isArray(imgData) && imgData.length > 0) {
            const img = imgData[0];
            return (typeof img === 'object' && img.data) ? img.data : img;
        } else if (typeof imgData === 'string' && imgData.length > 5) {
            return imgData;
        }
    }

    // Default Mapping fallback
    const mapping = {
        '121': 'assets/images/ui/logo-main.png',
        '243': 'assets/images/ui/logo-main.png',
        'B133': 'assets/images/ui/logo-main.png',
        'B136': 'assets/images/ui/logo-main.png',
        'B230': 'assets/images/ui/logo-main.png',
        '224': 'assets/images/projects/porto-golf-marina/buildings/224.webp',
        '78': 'assets/images/projects/porto-golf-marina/buildings/78.webp',
        'SHOPS': 'assets/images/projects/porto-said/hero/hero-1.webp'
    };
    return mapping[pName] || 'assets/images/projects/porto-golf-marina/main.jpg';
}

function renderBuildingsInternal(filter = 'all') {
    const grid = document.getElementById('units-grid');
    if (!grid) return;

    const lang = window.currentLang || localStorage.getItem('preferredLang') || 'en';
    const t = {
        avail_units: lang === 'en' ? 'Units Available' : 'وحدة متاحة',
        view_units: lang === 'en' ? 'VIEW UNITS' : 'عرض الوحدات',
        delivery: lang === 'en' ? 'Delivery' : 'التسليم',
        ...((window.translations && window.translations[lang]) ? window.translations[lang] : {})
    };

    grid.innerHTML = '';

    // 1. Filter by Current Area
    let filtered = buildingsList.filter(id => {
        const meta = localProjectMetadata[id];
        const cleanId = id.toString().toLowerCase().replace(/^b/i, '');
        const golfIds = ['133', '136', '230', '243', '121', '224', '78'];

        console.log(`[AvailableUnits] Checking building ${id} (clean: ${cleanId}) for ${CURRENT_PAGE_AREA}...`);

        if (!meta) {
            // If it's a known Porto Golf ID, keep it
            if (CURRENT_PAGE_AREA === "Porto Golf Marina" && golfIds.includes(cleanId)) {
                console.log(`✅ [AvailableUnits] ${id} included (fallback match - no meta)`);
                return true;
            }
            console.log(`❌ [AvailableUnits] ${id} excluded (no meta)`);
            return false;
        }

        const normalizedMetaArea = normalizeProjectArea(meta.projectArea);
        const matches = normalizedMetaArea === CURRENT_PAGE_AREA;

        // Final fallback: if metadata exists but area is wrong, still check if it's a hardcoded ID for this page
        if (!matches && CURRENT_PAGE_AREA === "Porto Golf Marina" && golfIds.includes(cleanId)) {
            console.log(`✅ [AvailableUnits] ${id} included (meta mismatch but fallback match)`);
            return true;
        }

        if (matches) console.log(`✅ [AvailableUnits] ${id} included (meta match: ${normalizedMetaArea})`);
        else console.log(`❌ [AvailableUnits] ${id} excluded (area mismatch: ${normalizedMetaArea} vs ${CURRENT_PAGE_AREA})`);

        return matches;
    });

    console.log(`🚀 [AvailableUnits] Final filtered list for ${CURRENT_PAGE_AREA}:`, filtered);

    // 2. Filter by Construction Status if applicable
    if (filter !== 'all') {
        filtered = filtered.filter(id => {
            const meta = localProjectMetadata[id] || {};
            const rawStatus = (meta.constStatus || '').toLowerCase();
            const rawDelivery = (meta.delivery || '').toLowerCase();
            const readyKeywords = ['ready', 'جاهز', 'delivered', 'move', 'تم الاستلام', 'available', 'استلام', 'فوري'];
            let isReady = readyKeywords.some(key => rawStatus.includes(key) || rawDelivery.includes(key));

            // 🚀 Fallback Status by ID
            const cleanId = id.toString().toLowerCase().replace(/^b/i, '');
            const deliveredIds = ['121', '224', '78', '15', '16', '17', '33'];
            if (deliveredIds.includes(cleanId)) isReady = true;

            if (filter === 'ready') return isReady;
            if (filter === 'construction' || filter === 'under_construction') return !isReady;
            return true;
        });
    }

    if (filtered.length === 0) {
        console.warn(`⚠️ [AvailableUnits] No buildings found after filtering for ${CURRENT_PAGE_AREA}.`);
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #94a3b8;">
            <p>${lang === 'en' ? 'No buildings available for this filter.' : 'لا توجد مباني متاحة لهذا الفلتر.'}</p>
        </div>`;
        return;
    }

    // Sort by Count
    filtered.sort((a, b) => (localProjectMetadata[b]?.adminCount || 0) - (localProjectMetadata[a]?.adminCount || 0));

    filtered.forEach((id, index) => {
        const meta = localProjectMetadata[id] || {};
        const count = meta.adminCount || 0;
        const imageSrc = getBuildingMetadataImage(id);
        const delivery = meta.delivery || '2026';

        const card = document.createElement('div');
        card.className = 'project-card';
        card.setAttribute('data-aos', 'fade-up');
        card.setAttribute('data-aos-delay', (index * 50).toString());

        card.onclick = (e) => {
            if (e.target.closest('button')) return;
            window.location.href = `units.html?project=${encodeURIComponent(CURRENT_PAGE_AREA)}&building=${encodeURIComponent(id)}`;
        };

        const areaLabel = (window.translations && window.translations[lang] && window.translations[lang].nav_porto_golf && CURRENT_PAGE_AREA === "Porto Golf Marina")
            ? window.translations[lang].nav_porto_golf
            : ((window.translations && window.translations[lang] && window.translations[lang].nav_porto_said && CURRENT_PAGE_AREA === "Porto Said") ? window.translations[lang].nav_porto_said : CURRENT_PAGE_AREA);

        card.innerHTML = `
            <div class="project-img-container">
                <label class="tag-project-badge">${areaLabel}</label>
                <div class="project-slides-wrapper">
                    <img src="${imageSrc}" alt="${id}" class="project-slide-img active" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
            </div>
            <div class="project-content">
                <h2 class="project-card-title">${id}</h2>
                <p class="project-card-units">${count} ${t.avail_units}</p>
                <p class="project-card-delivery">
                    <i class="far fa-calendar-alt"></i> ${t.delivery}: ${delivery}
                </p>
                <button class="project-view-cta view-project-btn" onclick="window.location.href='units.html?project=${encodeURIComponent(CURRENT_PAGE_AREA)}&building=${encodeURIComponent(id)}'">
                    ${t.view_units}
                </button>
            </div>
        `;

        grid.appendChild(card);
    });

    // 🚀 Update Sidebar Dropdowns Dynamically
    refreshSidebars(filtered);

    // 🚀 Refresh AOS to pick up new elements
    if (window.AOS) {
        setTimeout(() => {
            window.AOS.refresh();
        }, 300);
    }
}

/**
 * Dynamically populates any sidebar dropdown list with the provided building IDs.
 * @param {string[]} buildingIds - List of building IDs to display.
 */
function refreshSidebars(buildingIds) {
    if (!buildingIds || buildingIds.length === 0) return;

    // Find all sidebar dropdowns that are labeled "Buildings"
    const dropdownWrappers = document.querySelectorAll('.sidebar-dropdown-wrapper');
    dropdownWrappers.forEach(wrapper => {
        const titleSpan = wrapper.querySelector('span[data-i18n="nav_projects"]');
        if (titleSpan) {
            const list = wrapper.querySelector('.sidebar-dropdown-list');
            if (list) {
                // Sort building IDs numerically/alphabetically for better UX
                const sortedIds = [...buildingIds].sort((a, b) => {
                    const valA = parseInt(a.replace(/\D/g, '')) || 0;
                    const valB = parseInt(b.replace(/\D/g, '')) || 0;
                    if (valA !== valB) return valA - valB;
                    return a.localeCompare(b);
                });

                // Keep the list clean and sync with discovery
                list.innerHTML = sortedIds.map(id => `
                    <li><a href="units.html?project=${encodeURIComponent(CURRENT_PAGE_AREA)}&building=${encodeURIComponent(id)}" onclick="window.toggleSidebar(false)">${id}</a></li>
                `).join('');
                console.log(`[refreshSidebars] Populated ${sortedIds.length} items.`);
            }
        }
    });
}