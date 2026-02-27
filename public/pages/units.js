/**
 * UNITS PAGE LOGIC - FILTER SYSTEM AND UI
 * Implements "Parallel Dependent Filters" system where Project is Scope.
 */

// --- Configuration ---
const CONFIG = {
    animationStagger: 100, // ms
    currency: 'EGP',
    fallbackImage: 'https://placehold.co/600x400?text=No+Image'
};

const PROJECT_CONFIG = {
    'porto-golf-marina': {
        name: 'Porto Golf Marina',
        tKey: 'porto_golf_title',
        id: 'porto-golf-marina',
        areaSystem: 'fixed',
        areas: [30, 60, 82, 90],
        buildingPrefix: '1',      // Buildings start with 1xx (handled via API usually)
        deliveryOptions: ['All', 'Ready', 'U-Const'],
        fallbackImage: 'https://firebasestorage.googleapis.com/v0/b/real-estate-project-d85d3.appspot.com/o/projects%2Fporto-golf-marina%2Fcover.jpg?alt=media' // Using a project cover
    },
    'porto-said': {
        name: 'Porto Said',
        tKey: 'porto_said_title',
        id: 'porto-said',
        areaSystem: 'ranges',
        areaRanges: [
            { label: '30-59 m\u00B2', min: 30, max: 59 },
            { label: '60-75 m\u00B2', min: 60, max: 75 },
            { label: '76-95 m\u00B2', min: 76, max: 95 },
            { label: '96-120 m\u00B2', min: 96, max: 120 },
            { label: '121-150 m\u00B2', min: 121, max: 150 }
        ],
        buildingPrefix: 'B',       // Buildings like B15, B33
        deliveryOptions: ['All', 'Ready', 'U-Const'],
        fallbackImage: 'https://firebasestorage.googleapis.com/v0/b/real-estate-project-d85d3.appspot.com/o/projects%2Fporto-said%2Fcover.jpg?alt=media'
    },
    'celebration': {
        name: 'Celebration',
        tKey: 'Celebration',
        id: 'celebration',
        areaSystem: 'fixed',
        areas: [40, 70, 100, 130],
        buildingPrefix: '3',
        deliveryOptions: ['All', 'U-Const'],
        fallbackImage: 'https://firebasestorage.googleapis.com/v0/b/real-estate-project-d85d3.appspot.com/o/projects%2Fcelebration%2Fcover.jpg?alt=media'
    }
};

// 🚀 CRITICAL: Project Metadata for Building Images (Safe Fallback)
window.projectMetadata = window.projectMetadata || {
    // Porto Golf Marina Buildings
    "B133": { projectArea: "Porto Golf Marina", image: ["assets/images/ui/logo-main.png"] },
    "B136": { projectArea: "Porto Golf Marina", image: ["assets/images/ui/logo-main.png"] },
    "B230": { projectArea: "Porto Golf Marina", image: ["assets/images/ui/logo-main.png"] },
    "B243": { projectArea: "Porto Golf Marina", image: ["assets/images/ui/logo-main.png"] },
    "B121": { projectArea: "Porto Golf Marina", image: ["assets/images/ui/logo-main.png"] },
    "B224": { projectArea: "Porto Golf Marina", image: ["assets/images/projects/porto-golf-marina/gallery/224.webp"] },
    "B78": { projectArea: "Porto Golf Marina", image: ["assets/images/projects/porto-golf-marina/gallery/78.webp"] },
    // Porto Said Buildings
    "B15": { projectArea: "Porto Said", image: ["assets/images/face-main/porto-said-main.webp"] },
    "B16": { projectArea: "Porto Said", image: ["assets/images/face-main/porto-said-main.webp"] },
    "B17": { projectArea: "Porto Said", image: ["assets/images/face-main/porto-said-main.webp"] },
    "B33": { projectArea: "Porto Said", image: ["assets/images/face-main/porto-said-main.webp"] },
    "B9": { projectArea: "Porto Said", image: ["assets/images/face-main/porto-said-main.webp"] },
    "B10": { projectArea: "Porto Said", image: ["assets/images/face-main/porto-said-main.webp"] },
    "Celebration": { projectArea: "Celebration", image: ["assets/images/face-main/celebration-main.webp"] }
};

// --- State Management ---
const filterState = {
    // === SCOPE (Mandatory) ===
    project: null,              // 'porto-golf-marina' | 'porto-said' | 'celebration'

    // === FILTERS (Optional, Independent) ===
    building: null,             // 'B133' | 'B15' | null
    area: null,                 // 60 | '60-75' | null
    delivery: 'All',            // 'All' | 'Ready' | 'U-Const'
    status: 'Available',        // 'Available' | 'Reserved' | 'Sold' | null (if 'All' selected)

    // === BUILDING SPECIFIC FILTERS ===
    floor: null,
    view: null,
    priceSort: null,            // 'asc' | 'desc'
    purpose: null,

    // === METADATA ===
    projectAreaSystem: null,    // 'fixed' | 'ranges'
    searchText: '',             // Text search

    // === DATA ===
    allProjectUnits: [],        // Cached units for current project scope
    filteredBuildings: []       // Result set
};

const compareState = {
    selectedIds: [],
    max: 4
};

// --- Robust DOM Element Access ---
const getDom = () => ({
    projectSelection: document.getElementById('project-selection'),
    filtersPanel: document.getElementById('filtersPanel'),
    resultsSection: document.getElementById('resultsSection'),
    buildingsGrid: document.getElementById('buildingsGrid'),
    activeFilters: document.getElementById('active-filters'),
    noResults: document.getElementById('noResults'),
    resultsCount: document.getElementById('resultsCount'),

    // Standard Filters
    buildingFilter: document.getElementById('buildingFilter'),
    areaFilter: document.getElementById('areaFilter'),
    statusFilter: document.getElementById('statusFilter'),
    searchInput: document.getElementById('searchInput'),
    deliveryBtns: document.querySelectorAll('.delivery-btn'),

    // Building Specific Filters
    buildingFiltersPanel: document.getElementById('buildingFiltersPanel'),
    bFloorFilter: document.getElementById('b-floorFilter'),
    bViewFilter: document.getElementById('b-viewFilter'),
    bAreaFilter: document.getElementById('b-areaFilter'),
    bStatusFilter: document.getElementById('b-statusFilter'),
    bPriceFilter: document.getElementById('b-priceFilter'),
    bPurposeFilter: document.getElementById('b-purposeFilter'),

    // Headers
    standardHeader: document.getElementById('standard-header-content'),
    buildingHeader: document.getElementById('building-header-content'),
    buildingTitle: document.getElementById('building-title'),
    buildingBadge: document.getElementById('building-project-badge'),
    pageTitle: document.getElementById('page-title'),
    subtitle: document.getElementById('header-subtitle'),

    // Comparison
    compareBar: document.getElementById('compare-bar'),
    compareCount: document.getElementById('compare-count'),
    compareAvatars: document.getElementById('compare-avatars'),
    showCompareBtn: document.getElementById('show-compare-btn'),
    clearCompareBtn: document.getElementById('clear-compare-btn'),
    compareModal: document.getElementById('compare-modal'),
    compareContent: document.getElementById('compare-content'),
    modalCompareCount: document.getElementById('modal-compare-count'),
    closeCompareModal: document.getElementById('close-compare-modal')
});

// Legacy support for internal code
const dom = getDom();


// --- Localization ---
let currentLang = localStorage.getItem('preferredLang') || 'en';

function setLanguage(lang) {
    console.log(`🌍 [Units] Setting language to: ${lang}`);
    if (typeof translations === 'undefined') {
        console.error('❌ Translations not loaded!');
        return;
    }

    const t = translations[lang];
    if (!t) return;

    currentLang = lang;
    localStorage.setItem('preferredLang', lang);

    // Document Metadata
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.className = lang === 'en' ? 'font-sans' : 'font-arabic'; // Use Tailwind classes from HTML config

    // Atomic Elements Translation
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = t[key];
            } else {
                el.innerHTML = t[key];
            }
        }
    });

    // Toggle Button Refresh
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.textContent = lang === 'en' ? 'AR' : 'EN';
        // Explicitly re-attach listener in case element was replaced (not expected here but safer)
        langBtn.onclick = (e) => {
            e.preventDefault();
            setLanguage(currentLang === 'en' ? 'ar' : 'en');
        };
    }

    // Dynamic Content Refresh
    applyFilters();
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // 🚀 CACHE POLICY: Use existing cache if available, don't purge on every visit.
    console.log('♻️ System ready. Using optimized cache policy.');

    // 🚨 CRITICAL FIX: Override home.js global functions
    if (typeof window.refreshFilterOptions === 'function') {
        console.warn('⚠️ Disabling global refreshFilterOptions() for units.html');
        window.refreshFilterOptions = () => { };
    }

    // 1. Language Setup
    setLanguage(currentLang);

    // 2. Setup Event Listeners
    setupEventListeners();

    // 3. Check URL Params for Project
    try {
        const params = new URLSearchParams(window.location.search);
        const rawProject = params.get('project');
        const startBuilding = params.get('building');
        const startArea = params.get('area'); // 🚀 NEW: Parse Area
        const startDelivery = params.get('delivery'); // 🚀 NEW: Parse Delivery

        if (rawProject) {
            const pKey = resolveProjectKey(rawProject);
            if (pKey) {
                if (startBuilding) {
                    await enterBuildingMode(pKey, startBuilding);
                } else {
                    await selectProject(pKey);
                }

                // 🚀 APPLY URL FILTERS (Post-Init)
                let filtersChanged = false;
                if (startArea) {
                    // Handle comma-separated list - take first valid numeric or range
                    const parts = startArea.split(',');
                    const targetArea = parts[0]; // Take first for simplicity in strict building mode
                    console.log(`🎯 Applying Area Filter from URL: ${targetArea}`);
                    filterState.area = targetArea;
                    if (dom.bAreaFilter) dom.bAreaFilter.value = targetArea;
                    else if (dom.areaFilter) dom.areaFilter.value = targetArea; // For project mode
                    filtersChanged = true;
                }

                if (startDelivery) {
                    const delVal = startDelivery.split(',')[0];
                    filterState.delivery = delVal;
                    filtersChanged = true;
                }

                if (filtersChanged) applyFilters();

            } else {
                console.warn('Unknown project in URL:', rawProject);
                hideLoader();
            }
        } else {
            hideLoader();
        }
    } catch (err) {
        console.error('❌ Initialization Error:', err);
        hideLoader();
    } finally {
        // Ultimate fallback
        setTimeout(hideLoader, 1500);
    }
});

async function enterBuildingMode(projectId, buildingId) {
    const normBuildingId = normalizeId(buildingId);
    console.log(`🏢 Entering Building Mode: ${normBuildingId} (${projectId})`);

    // 2. Set State (Only reset if not preserving from URL/Previous state)
    filterState.project = projectId;
    filterState.building = normBuildingId;

    // We only reset these if they aren't already set (e.g. from URL params in DOMContentLoaded)
    if (filterState.area === undefined || filterState.area === null) filterState.area = null;
    if (filterState.status === undefined || filterState.status === null) filterState.status = null;
    if (filterState.delivery === undefined || filterState.delivery === 'All') filterState.delivery = 'All';
    if (filterState.floor === undefined || filterState.floor === null) filterState.floor = null;
    if (filterState.view === undefined || filterState.view === null) filterState.view = null;
    if (filterState.priceSort === undefined || filterState.priceSort === null) filterState.priceSort = null;
    if (filterState.purpose === undefined || filterState.purpose === null) filterState.purpose = null;

    // 2. Update UI Structure (Hide Project Selection, Show Building Header)
    if (dom.projectSelection) dom.projectSelection.classList.add('hidden');
    if (dom.filtersPanel) dom.filtersPanel.classList.add('hidden'); // Hide Standard Filters

    if (dom.standardHeader) dom.standardHeader.classList.add('hidden');
    if (dom.buildingHeader) {
        dom.buildingHeader.classList.remove('hidden');
        if (dom.buildingTitle) dom.buildingTitle.textContent = normBuildingId;
        if (dom.buildingBadge) {
            dom.buildingBadge.textContent = PROJECT_CONFIG[projectId]?.name || projectId;
            dom.buildingBadge.className = 'px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold';
            // Adjust badge color based on project if needed?
        }
    }

    if (dom.buildingFiltersPanel) dom.buildingFiltersPanel.classList.remove('hidden');

    // 3. Load Data
    const config = PROJECT_CONFIG[projectId];
    filterState.projectAreaSystem = config.areaSystem;

    dom.resultsSection.classList.remove('opacity-0');
    dom.buildingsGrid.innerHTML = '<div class="col-span-full py-20 text-center"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><p class="mt-2 text-gray-500">Loading Units...</p></div>';

    // 🚀 STEP 3A: Load building units from cache first, refresh in background
    console.log(`🔍 Fetching units for ${buildingId}...`);
    try {
        let buildingUnits = await window.firebaseQueries.getUnitsByBuilding(normBuildingId, false); // 🚀 Cache-first for speed
        if (!buildingUnits || buildingUnits.length === 0) {
            console.log(`  ↳ Retry without prefix: ${buildingId}`);
            buildingUnits = await window.firebaseQueries.getUnitsByBuilding(buildingId, false); // Try raw (133)
        }

        if (buildingUnits && buildingUnits.length > 0) {
            console.log(`✅ [Step 3A] Found ${buildingUnits.length} units for building ${buildingId}`);

            const ghosts = ['B16', 'B17', 'B121', 'B224', 'B78'];
            const processedUnits = buildingUnits
                .filter(u => !ghosts.includes(normalizeId(u.building_id || u.buildingId)))
                .map(u => ({
                    ...u,
                    id: String(u.id || u.unit_id || u.code),
                    code: u.code || u.unit_id || u.id,
                    area: Number(u.area) || 0,
                    building_id: normalizeId(u.building_id || u.buildingId),
                    delivery_status: u.delivery_status || u.deliveryStatus || 'U-Const',
                    status: u.status || 'Available'
                }));

            console.log(`✅ [Step 3A] Mapped ${processedUnits.length} valid units. Sample:`, processedUnits[0]);
            filterState.allProjectUnits = processedUnits;
            cacheUnits(processedUnits); // 🚀 Update Global Cache for comparison persistence

            // 🔓 UNLOCK UI: Show basic results immediately
            populateBuildingSpecificFilters();
            applyFilters();
            hideLoader(); // Hide global loader NOW
        } else {
            console.warn(`⚠️ [Step 3A] No units found for building ${buildingId} (Raw/Norm)`);
            hideLoader(); // Still hide global loader so they can see "No Results" or wait for background
        }
    } catch (err) {
        console.error('Initial building fetch failed:', err);
        hideLoader();
    }

    // 🚀 STEP 3B: Load full project data in background (silent)
    // Only overwrite if we found NO units, OR if we want to expand scope
    loadProjectData(projectId).then(() => {
        console.log('✅ Full project data loaded in background.');

        // 🛡️ RE-APPLY Building filter logic & RESTORE if lost
        if (filterState.building) {
            const hasBuildingUnits = filterState.allProjectUnits.some(u => u.building_id === filterState.building);

            if (!hasBuildingUnits) {
                console.warn(`⚠️ Project load wiped building units! Force-restoring building ${filterState.building}`);

                // If we are here, it means 'loadProjectData' wiped our units.
                // We must re-fetch strictly for this building to restore view
                // This is a fail-safe against incomplete project data
                window.firebaseQueries.getUnitsByBuilding(filterState.building, false).then(recovered => {
                    if (recovered && recovered.length > 0) {
                        console.log(`♻️ Recovered ${recovered.length} units.`);
                        // Merge clean
                        const currentIds = new Set(filterState.allProjectUnits.map(u => String(u.code || u.id)));
                        const missing = recovered.filter(u => !currentIds.has(String(u.code || u.id))).map(u => ({
                            ...u,
                            id: String(u.id || u.unit_id || u.code),
                            code: u.code || u.unit_id || u.id,
                            area: Number(u.area) || 0,
                            building_id: normalizeId(u.building_id || u.buildingId || u.building),
                            delivery_status: u.delivery_status || u.deliveryStatus || 'U-Const',
                            status: u.status || 'Available'
                        }));

                        filterState.allProjectUnits = [...filterState.allProjectUnits, ...missing];
                        populateBuildingSpecificFilters();
                        applyFilters();
                    }
                });
            }
        }

        populateBuildingSpecificFilters();
        applyFilters();
    });
}

function populateBuildingSpecificFilters() {
    // Get units ONLY for this building
    const units = filterState.allProjectUnits.filter(u => u.building_id === filterState.building);

    // Floors
    const floors = [...new Set(units.map(u => u.floor))].sort((a, b) => {
        if (a === 'Ground') return -1;
        if (b === 'Ground') return 1;
        return parseInt(a) - parseInt(b);
    });
    if (dom.bFloorFilter) {
        dom.bFloorFilter.innerHTML = '<option value="">All Floors</option>';
        floors.forEach(f => {
            if (!f) return;
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            dom.bFloorFilter.appendChild(opt);
        });
        dom.bFloorFilter.value = filterState.floor || "";
    }

    // Views
    const views = [...new Set(units.map(u => u.view))].sort();
    if (dom.bViewFilter) {
        dom.bViewFilter.innerHTML = '<option value="">All Views</option>';
        views.forEach(v => {
            if (!v) return;
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            dom.bViewFilter.appendChild(opt);
        });
        dom.bViewFilter.value = filterState.view || "";
    }

    // Areas (Specific to this building's units)
    const areas = [...new Set(units.map(u => u.area))].sort((a, b) => a - b);
    if (dom.bAreaFilter) {
        dom.bAreaFilter.innerHTML = '<option value="">All Areas</option>';
        areas.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a;
            opt.textContent = `${a} m\u00B2`;
            dom.bAreaFilter.appendChild(opt);
        });
        dom.bAreaFilter.value = filterState.area || "";
    }

    // Initial Status Set
    if (dom.bStatusFilter) dom.bStatusFilter.value = filterState.status || "";
    if (dom.bPriceFilter) dom.bPriceFilter.value = filterState.priceSort || "";
    if (dom.bPurposeFilter) dom.bPurposeFilter.value = filterState.purpose || "";
}

function displayResults(buildings) {
    dom.buildingsGrid.innerHTML = '';

    // LOGIC SPLIT:
    // 1. If a specific building is selected, show UNITS directly.
    // 2. If NO building is selected, show BUILDING CARDS (grouped).

    if (filterState.building) {
        // --- SHOW UNITS MODE ---
        // Find the building group that matches
        const group = buildings.find(b => b.building_id === filterState.building);

        let unitsToShow = [];
        if (group) unitsToShow = group.units;

        if (dom.resultsCount) dom.resultsCount.textContent = unitsToShow.length;

        if (unitsToShow.length === 0) {
            dom.noResults.classList.remove('hidden');
            return;
        }
        dom.noResults.classList.add('hidden');

        unitsToShow.forEach(u => {
            const card = createUnitCard(u);
            dom.buildingsGrid.appendChild(card);
        });

    } else {
        // --- SHOW BUILDINGS SUMMARY MODE ---
        if (dom.resultsCount) dom.resultsCount.textContent = buildings.length; // Count of Buildings

        if (buildings.length === 0) {
            dom.noResults.classList.remove('hidden');
            return;
        }
        dom.noResults.classList.add('hidden');

        buildings.forEach(b => {
            const card = createBuildingCard(b);
            dom.buildingsGrid.appendChild(card);
        });
    }
}

// --- Card Creators ---

function hideLoader() {
    console.log('🏁 Hiding page loader...');
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.add('opacity-0');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 600);
    }
}

function resolveProjectKey(input) {
    if (!input) return null;
    const lower = input.toLowerCase().trim().replace(/\s+/g, '-');
    if (PROJECT_CONFIG[lower]) return lower;

    // 🚀 NEW: Smart Building ID to Project Resolver
    const buildingMap = {
        'b133': 'porto-golf-marina', 'b136': 'porto-golf-marina', 'b230': 'porto-golf-marina',
        'b243': 'porto-golf-marina', '121': 'porto-golf-marina', 'b121': 'porto-golf-marina',
        '224': 'porto-golf-marina', 'b224': 'porto-golf-marina', '78': 'porto-golf-marina', 'b78': 'porto-golf-marina',
        'b15': 'porto-said', 'b16': 'porto-said', 'b17': 'porto-said', 'b33': 'porto-said', 'b9': 'porto-said', 'b10': 'porto-said',
        'celebration': 'celebration',
        'porto-said': 'porto-said', 'porto-golf': 'porto-golf-marina', 'porto-golf-marina': 'porto-golf-marina'
    };
    if (buildingMap[lower]) return buildingMap[lower];

    // Reverse lookup by name
    for (const [key, config] of Object.entries(PROJECT_CONFIG)) {
        if (config.name.toLowerCase() === lower.replace(/-/g, ' ')) return key;
        // Handle fuzzy "Porto Golf" -> "porto-golf-marina"
        if (key.includes(lower)) return key;
    }

    // Fallback: fuzzy kebab match
    const kebab = lower;
    if (PROJECT_CONFIG[kebab]) return kebab;

    return null;
}

function setupEventListeners() {
    // Project Selection
    document.querySelectorAll('.project-card').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pid = btn.getAttribute('data-project');
            selectProject(pid);
        });
    });

    // Standard Filters
    dom.buildingFilter?.addEventListener('change', (e) => onBuildingChange(e.target.value));
    dom.areaFilter?.addEventListener('change', (e) => onAreaChange(e.target.value));
    dom.statusFilter?.addEventListener('change', (e) => onStatusChange(e.target.value));

    dom.searchInput?.addEventListener('input', (e) => {
        filterState.searchText = e.target.value.trim();
        applyFilters();
    });

    dom.deliveryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = btn.getAttribute('data-delivery');
            onDeliveryChange(val);
        });
    });

    // 🚀 NEW: Enhanced Back Button (Internal Navigation)
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            console.log('🔙 Going back home/project page...');

            // Always go back to previous project page or home
            const ref = document.referrer;
            if (ref && (ref.includes('porto') || ref.includes('celebration'))) {
                window.location.href = ref;
            } else {
                window.location.href = 'index.html';
            }
        };
    }

    // Also ensure clicking logo ALWAYS goes home safely or back to project
    document.querySelectorAll('a[href="index.html"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const ref = document.referrer;
            if (ref && (ref.includes('porto') || ref.includes('celebration'))) {
                window.location.href = ref;
            } else {
                window.location.href = 'index.html';
            }
        });
    });

    // Building Specific Filters - NEW
    dom.bFloorFilter?.addEventListener('change', (e) => {
        filterState.floor = e.target.value || null;
        applyFilters();
    });
    dom.bViewFilter?.addEventListener('change', (e) => {
        filterState.view = e.target.value || null;
        applyFilters();
    });
    dom.bAreaFilter?.addEventListener('change', (e) => {
        filterState.area = e.target.value || null;
        applyFilters();
    });
    dom.bStatusFilter?.addEventListener('change', (e) => {
        filterState.status = e.target.value || null;
        applyFilters();
    });
    dom.bPriceFilter?.addEventListener('change', (e) => {
        filterState.priceSort = e.target.value || null;
        applyFilters();
    });
    dom.bPurposeFilter?.addEventListener('change', (e) => {
        filterState.purpose = e.target.value || null;
        applyFilters();
    });

    // Comparison Events
    dom.showCompareBtn?.addEventListener('click', window.openCompareModal);
    dom.closeCompareModal?.addEventListener('click', window.closeCompareModal);
    dom.clearCompareBtn?.addEventListener('click', () => {
        compareState.selectedIds = [];
        updateCompareBar();
        document.querySelectorAll('.compare-checkbox').forEach(cb => cb.checked = false);
    });
}


// --- Core Logic: Project Scope ---

async function selectProject(projectId, preserveFilters = false) {
    if (filterState.project === projectId && !preserveFilters) return; // No-op if same project and not preserving

    console.log('🎯 Setting project scope:', projectId);

    // ===================================
    // STEP 1: CLEAR EVERYTHING (Unless Preserving)
    // ===================================
    filterState.project = projectId;
    if (!preserveFilters) {
        filterState.building = null;
        filterState.area = null;
        filterState.delivery = 'All';
        filterState.status = 'Available';
        filterState.searchText = '';
        filterState.allProjectUnits = [];
    }

    // Get project config
    const config = PROJECT_CONFIG[projectId];
    if (!config) { console.error('Invalid Project ID'); return; }

    filterState.projectAreaSystem = config.areaSystem;

    // ===================================
    // STEP 2: UPDATE UI STATE (Standard Mode)
    // ===================================
    // Ensure Standard UI is visible
    if (dom.projectSelection) dom.projectSelection.classList.remove('hidden');
    if (dom.filtersPanel) dom.filtersPanel.classList.remove('hidden');
    if (dom.buildingFiltersPanel) dom.buildingFiltersPanel.classList.add('hidden');

    // Switch Headers
    if (dom.standardHeader) dom.standardHeader.classList.remove('hidden');
    if (dom.buildingHeader) dom.buildingHeader.classList.add('hidden');

    // Highlight Card
    document.querySelectorAll('.project-card').forEach(card => {
        const isSelected = card.getAttribute('data-project') === projectId;
        card.classList.toggle('border-primary', isSelected);
        card.classList.toggle('bg-blue-50', isSelected);
        card.classList.toggle('text-primary', isSelected);
        // Reset others
        if (!isSelected) {
            card.classList.remove('border-primary', 'bg-blue-50', 'text-primary');
        }
    });

    // Show Panels
    dom.filtersPanel.classList.remove('hidden'); // Redundant but safe
    dom.resultsSection.classList.remove('opacity-0');

    // Update Title with Translation
    const t = translations[currentLang];
    if (dom.pageTitle) {
        if (config.tKey && t[config.tKey]) {
            dom.pageTitle.textContent = t[config.tKey];
        } else {
            dom.pageTitle.textContent = config.name;
        }
    }
    if (dom.subtitle) {
        dom.subtitle.textContent = (currentLang === 'ar') ? `تصفح ${t[config.tKey] || config.name}` : `Browsing ${config.name}`;
    }

    // Reset Inputs
    if (dom.buildingFilter) dom.buildingFilter.value = "";
    if (dom.areaFilter) {
        dom.areaFilter.value = "";
        // 🚨 CRITICAL: Clear ALL old options to prevent mixing projects
        dom.areaFilter.innerHTML = '<option value="">All Areas</option>';
    }
    if (dom.statusFilter) dom.statusFilter.value = "Available";
    if (dom.searchInput) dom.searchInput.value = "";

    // Reset Delivery Buttons
    updateDeliveryButtons();

    // Show Loading State (only if no data)
    const hasData = filterState.allProjectUnits && filterState.allProjectUnits.length > 0;
    if (!hasData) {
        dom.buildingsGrid.innerHTML = '<div class="col-span-full py-20 text-center"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div><p class="mt-2 text-gray-500">Loading Project Data...</p></div>';
        await loadProjectData(projectId);
    } else {
        // Just refresh the filters and display
        populateBuildingsFilter(filterState.allProjectUnits);
        applyFilters();
    }

    hideLoader();
}

async function loadProjectData(projectId) {
    const config = PROJECT_CONFIG[projectId];

    // Fetch Units - Robust Strategy
    let units = [];

    // Strategy 1: Try by Config ID (kebab-case) - Most likely matches DB
    console.log(`[1] Fetching units for ID: ${config.id}...`);
    units = await window.firebaseQueries.getUnitsByProject(config.id);

    // Strategy 2: If empty, try by Name (Human Readable)
    if (!units || units.length === 0) {
        console.log(`[2] Fallback: Fetching units for Name: ${config.name}...`);
        units = await window.firebaseQueries.getUnitsByProject(config.name);
    }

    // Strategy 3: If still empty, try "Porto Golf" fuzzy URL if applicable
    if ((!units || units.length === 0) && projectId.includes('golf')) {
        console.log(`[3] Fallback: Fetching units for legacy 'Porto Golf'...`);
        units = await window.firebaseQueries.getUnitsByProject('Porto Golf');
    }

    if ((!units || units.length === 0) && projectId.includes('said')) {
        console.log(`[3b] Fallback: Fetching units for 'Porto Said'...`);
        units = await window.firebaseQueries.getUnitsByProject('Porto Said');
    }

    // Strategy 4: Nuclear Option - Fetch ALL and filter client-side
    // Only do this if we are desperate and it's not a huge dataset (or if API is failing specific filters)
    if (!units || units.length === 0) {
        console.log(`[4] Fallback: Fetching ALL units to filter client-side...`);
        const allUnits = await window.firebaseQueries.getAllUnits();
        if (allUnits) {
            units = allUnits.filter(u => {
                const p = (u.project_id || u.projectId || u.project || '').toLowerCase().trim();
                return p === config.id || p === config.name.toLowerCase() || (projectId === 'porto-golf-marina' && p.includes('golf'));
            });
        }
    }

    console.log(`✅ Final Unit Count for ${projectId}:`, units ? units.length : 0);

    if (!units || units.length === 0) {
        dom.buildingsGrid.innerHTML = `
            <div class="col-span-full py-12 text-center">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4">
                    <i data-lucide="alert-triangle" class="w-8 h-8 text-yellow-600"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-900">Project Data Unavailable</h3>
                <p class="text-gray-500 mt-2 max-w-md mx-auto">We couldn't load units for ${config.name}. This might be a connection issue or the project is fully sold out.</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm">Retry Connection</button>
            </div>
        `;
        // Initialize icons
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // Normalize & Map
    const ghosts = ['B16', 'B17', 'B121', 'B224', 'B78'];
    const processedUnits = units
        .filter(u => !ghosts.includes(normalizeId(u.building_id || u.buildingId)))
        .map(u => ({
            ...u,
            id: String(u.id || u.unit_id || u.code),
            code: u.code || u.unit_id || u.id,
            area: Number(u.area) || 0,
            building_id: normalizeId(u.building_id || u.buildingId || u.building),
            delivery_status: u.delivery_status || u.deliveryStatus || 'U-Const',
            status: u.status || 'Available'
        }));

    // 🚀 MERGE LOGIC: Prevent background Project-load from overwriting specific Building-load
    if (filterState.allProjectUnits && filterState.allProjectUnits.length > 0) {
        const existingCodes = new Set(filterState.allProjectUnits.map(u => String(u.code)));
        const newOnes = processedUnits.filter(u => !existingCodes.has(String(u.code)));
        if (newOnes.length > 0) {
            console.log(`♻️ Merging ${newOnes.length} new units from project load...`);
            filterState.allProjectUnits = [...filterState.allProjectUnits, ...newOnes];
            cacheUnits(newOnes); // 🚀 Cache new units
        }
    } else {
        console.log(`📦 Storing ${processedUnits.length} units in filterState...`);
        filterState.allProjectUnits = processedUnits;
        cacheUnits(processedUnits); // 🚀 Initial cache
    }

    // Populate Filters (synchronously to ensure UI is ready)
    populateBuildingsFilter(filterState.allProjectUnits);

    console.log(`🎯 Project: ${projectId}, Area System: ${config.areaSystem}`);
    if (config.areaSystem === 'fixed') {
        console.log(`   → Using FIXED areas:`, config.areas);
        populateAreasFixed(config.areas);
    } else {
        console.log(`   → Using RANGES:`, config.areaRanges);
        populateAreasRanges(config.areaRanges);
    }

    // Set Delivery Options - Now dynamic based on actual unit data
    populateDeliveryButtons(filterState.allProjectUnits);

    // Apply Default Filters
    if (filterState.building && dom.buildingFilter) {
        // Ensure the UI matches the state if it was preserved
        dom.buildingFilter.value = filterState.building;
    }

    // 🚀 CRITICAL FIX: Small delay ensures DOM rendering completes before filtering
    console.log(`⏳ Waiting for DOM to stabilize before applying filters...`);

    await new Promise(resolve => setTimeout(resolve, 150));

    console.log(`🔍 Now applying filters to ${filterState.allProjectUnits?.length || 0} loaded units...`);
    applyFilters();
}

function populateDeliveryButtons(units) {
    // Get unique delivery statuses from the actual units
    const deliveryStatuses = [...new Set(units.map(u => u.delivery_status || u.deliveryStatus).filter(Boolean))];

    console.log('📅 Available delivery options:', deliveryStatuses);

    // Always show "All" button
    const allOptions = ['All', ...deliveryStatuses];

    dom.deliveryBtns.forEach(btn => {
        const val = btn.getAttribute('data-delivery');

        // Show button if it's in our options OR if it's a standard keyword
        const shouldShow = allOptions.includes(val) ||
            val === 'Ready' ||
            val === 'U-Const' ||
            val === 'All';

        if (shouldShow) {
            btn.style.display = 'inline-block';
            btn.classList.remove('hidden');
        } else {
            btn.style.display = 'none';
            btn.classList.add('hidden');
        }
    });

    // Reset selection if current selection is not available
    const currentDelivery = filterState.delivery;
    const isCurrentValid = allOptions.includes(currentDelivery) || currentDelivery === 'All';

    if (!isCurrentValid) {
        filterState.delivery = 'All';
        updateDeliveryButtons();
    }
}


// --- Core Logic: Filters ---

// --- Core Logic: Filters ---

function onBuildingChange(val) {
    filterState.building = val || null;

    // 🚀 SMART AUTO-DELIVERY: Map buildings to their specific delivery dates
    if (val) {
        const bId = val.toUpperCase().trim();
        let autoDelivery = null;

        const deliveryMap = {
            // Porto Golf Marina
            'B133': '12/2026', '133': '12/2026',
            'B136': '12/2026', '136': '12/2026',
            'B230': '12/2027', '230': '12/2027',
            'B243': '12/2027', '243': '12/2027',
            'B121': 'Ready', '121': 'Ready',
            'B224': 'Ready', '224': 'Ready',
            'B78': 'Ready', '78': 'Ready',

            // Porto Said
            'B15': '12/2026', '15': '12/2026',
            'B16': '12/2026', '16': '12/2026',
            'B17': '12/2026', '17': '12/2026',
            'B33': '12/2026', '33': '12/2026',
            'B9': '12/2026', '9': '12/2026',
            'B10': '12/2026', '10': '12/2026',

            // Celebration
            'CELEBRATION': '1/1/2028'
        };

        autoDelivery = deliveryMap[bId];

        if (autoDelivery) {
            console.log(`✨ Building ${bId} selected, automatically setting delivery to ${autoDelivery}`);
            filterState.delivery = autoDelivery;
            updateDeliveryButtons();
        }
    }

    applyFilters();
}


function onAreaChange(val) {
    filterState.area = val || null;

    // 🚀 SMART UPDATE: Refresh buildings list based on new area selection
    if (filterState.allProjectUnits && filterState.allProjectUnits.length > 0) {
        populateBuildingsFilter(filterState.allProjectUnits);
    }

    applyFilters();
}

function onDeliveryChange(val) {
    filterState.delivery = val;
    updateDeliveryButtons();
    applyFilters();
}

function updateDeliveryButtons() {
    dom.deliveryBtns.forEach(btn => {
        const isSelected = btn.getAttribute('data-delivery') === filterState.delivery;
        btn.classList.toggle('active', isSelected);
        btn.classList.toggle('bg-white', !isSelected);
        btn.classList.toggle('bg-primary', isSelected); // Assuming active style
        btn.classList.toggle('text-white', isSelected);

        // Use simpler class manipulation if CSS relies on .active
        if (isSelected) {
            btn.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
            btn.classList.remove('text-gray-600', 'hover:bg-white');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
            btn.classList.add('text-gray-600', 'hover:bg-white');
        }
    });
}

function onStatusChange(val) {
    // If val is empty string, it means 'All' provided <option value="">All</option>
    filterState.status = val || null;
    applyFilters();
}

// --- Independent Filter Selection Helper ---
function populateBuildingsFilter(units) {
    // Get unique buildings from units
    let buildings = [...new Set(units.map(u => u.building_id))].filter(Boolean).sort();

    // 🚀 SMART FILTER: If area is selected, only show buildings that have units with that area
    if (filterState.area) {
        console.log(`🏗️ Filtering buildings by area: ${filterState.area}`);

        buildings = buildings.filter(buildingId => {
            const buildingUnits = units.filter(u => u.building_id === buildingId);

            // Check if this building has units with the selected area
            const hasMatchingArea = buildingUnits.some(u => {
                if (filterState.projectAreaSystem === 'fixed' || filterState.building) {
                    const val = Number(filterState.area);
                    return u.area === val;
                } else {
                    const [min, max] = filterState.area.split('-').map(Number);
                    return u.area >= min && u.area <= max;
                }
            });

            if (hasMatchingArea) {
                console.log(`  ✅ ${buildingId}: Has units with ${filterState.area}m\u00B2`);
            } else {
                console.log(`  ❌ ${buildingId}: No units with ${filterState.area}m\u00B2`);
            }

            return hasMatchingArea;
        });

        console.log(`📊 Buildings with area ${filterState.area}: ${buildings.join(', ')}`);
    }

    dom.buildingFilter.innerHTML = '<option value="">All Buildings</option>';
    buildings.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        dom.buildingFilter.appendChild(opt);
    });

    // 🚀 AUTO-CLEAR: If current building is not in the filtered list, clear selection
    // 🚨 FIX: Don't clear if we are in "Building Mode" (header visible)
    const isBuildingMode = dom.buildingHeader && !dom.buildingHeader.classList.contains('hidden');
    if (filterState.building && !buildings.includes(filterState.building) && !isBuildingMode) {
        console.warn(`⚠️ Building ${filterState.building} doesn't have matching units, clearing selection`);
        filterState.building = null;
        if (dom.buildingFilter) dom.buildingFilter.value = "";
    }
}

function populateAreasFixed(areas) {
    console.log('📐 populateAreasFixed called with:', areas);
    console.log('📐 Area filter element:', dom.areaFilter);

    if (!dom.areaFilter) {
        console.error('❌ Area filter dropdown not found in DOM!');
        return;
    }

    dom.areaFilter.innerHTML = '<option value="">All Areas</option>';
    areas.forEach(area => {
        const opt = document.createElement('option');
        opt.value = area;
        opt.textContent = `${area} m\u00B2`;
        dom.areaFilter.appendChild(opt);
        console.log(`  ✅ Added area option: ${area}m²`);
    });

    console.log(`📐 Total area options: ${dom.areaFilter.options.length}`);
}

function populateAreasRanges(ranges) {
    console.log('📏 populateAreasRanges called with:', ranges);
    console.log('📏 Area filter element:', dom.areaFilter);

    if (!dom.areaFilter) {
        console.error('❌ Area filter dropdown not found in DOM!');
        return;
    }

    dom.areaFilter.innerHTML = '<option value="">All Areas</option>';
    ranges.forEach(range => {
        const opt = document.createElement('option');
        opt.value = `${range.min}-${range.max}`;
        opt.textContent = range.label;
        dom.areaFilter.appendChild(opt);
        console.log(`  ✅ Added area range: ${range.label} (${range.min}-${range.max})`);
    });

    console.log(`📏 Total area options: ${dom.areaFilter.options.length}`);
}


// --- Core Logic: Engine ---

function applyFilters() {
    if (!filterState.project) return;

    let filtered = filterState.allProjectUnits;

    console.log(`🔍 Starting filter with ${filtered.length} total units`);
    console.log(`📋 Current filters:`, {
        building: filterState.building,
        area: filterState.area,
        delivery: filterState.delivery,
        status: filterState.status,
        searchText: filterState.searchText
    });

    // 1. Building
    if (filterState.building) {
        const countBefore = filtered.length;
        filtered = filtered.filter(u => u.building_id === filterState.building);
        console.log(`[Filter] Building ${filterState.building}: ${countBefore} -> ${filtered.length}`);
    }

    // 2. Area
    if (filterState.area) {
        const countBefore = filtered.length;
        if (filterState.projectAreaSystem === 'fixed' || filterState.building) {
            const val = Number(filterState.area);
            console.log(`[Filter] Area (fixed): Looking for exact ${val}m²`);
            filtered = filtered.filter(u => {
                const match = u.area === val;
                if (!match) console.log(`  ❌ Unit ${u.code}: ${u.area}m² != ${val}m²`);
                return match;
            });
        } else {
            const [min, max] = filterState.area.split('-').map(Number);
            console.log(`[Filter] Area (range): ${min}-${max}m\u00B2`);
            filtered = filtered.filter(u => {
                const match = u.area >= min && u.area <= max;
                if (!match) console.log(`  ❌ Unit ${u.code}: ${u.area}m\u00B2 not in ${min}-${max}`);
                return match;
            });
        }
        console.log(`[Filter] Area: ${countBefore} -> ${filtered.length}`);
    }

    // 3. Delivery - FIXED TO HANDLE DATES
    if (filterState.delivery !== 'All') {
        const countBefore = filtered.length;
        filtered = filtered.filter(u => {
            const s = (u.delivery_status || u.deliveryStatus || '').trim();
            const d = filterState.delivery.trim();

            // Exact match (case insensitive and trimmed)
            if (s.toLowerCase() === d.toLowerCase()) return true;

            // Flexible matching for keywords
            const sLower = s.toLowerCase();
            const dLower = d.toLowerCase();

            if (dLower === 'ready' && sLower.includes('ready')) return true;
            if (dLower === 'u-const' && (sLower.includes('const') || sLower.includes('under'))) return true;

            // Date matching: Check if the delivery status contains the date (e.g., "12/2026")
            if (s.includes(d)) return true;

            // Reverse: Check if selected contains delivery status (handles partial matches)
            if (d.includes(s) && s.length > 0) return true;

            return false;
        });
        console.log(`[Filter] Delivery "${filterState.delivery}": ${countBefore} -> ${filtered.length} units`);
        if (filtered.length === 0 && countBefore > 0) {
            console.warn(`⚠️ All units were filtered out by delivery filter!`);
            console.log(`Available delivery statuses in remaining units before delivery filter:`);
            filterState.allProjectUnits
                .filter(u => filterState.building ? u.building_id === filterState.building : true)
                .filter(u => {
                    if (!filterState.area) return true;
                    if (filterState.projectAreaSystem === 'fixed' || filterState.building) {
                        return u.area === Number(filterState.area);
                    } else {
                        const [min, max] = filterState.area.split('-').map(Number);
                        return u.area >= min && u.area <= max;
                    }
                })
                .forEach(u => console.log(`  - ${u.code}: "${u.delivery_status || u.deliveryStatus}"`));
        }
    }


    // 4. Status
    if (filterState.status) {
        const countBefore = filtered.length;
        filtered = filtered.filter(u => u.status === filterState.status);
        console.log(`[Filter] Status ${filterState.status}: ${countBefore} -> ${filtered.length}`);
    }

    // 5. Search
    if (filterState.searchText) {
        const q = filterState.searchText.toLowerCase();
        filtered = filtered.filter(u =>
            (u.code || '').toLowerCase().includes(q) ||
            (u.view || '').toLowerCase().includes(q) ||
            (u.building_id || '').toLowerCase().includes(q)
        );
    }

    // 6. NEW FILTERS for Building Mode
    if (filterState.floor) {
        filtered = filtered.filter(u => u.floor == filterState.floor);
    }
    if (filterState.view) {
        filtered = filtered.filter(u => u.view === filterState.view);
    }
    if (filterState.purpose) {
        filtered = filtered.filter(u => (u.purpose || 'Sale') === filterState.purpose);
    }

    console.log(`✅ Final filtered count: ${filtered.length} units`);


    // Sort logic (Price)
    if (filterState.priceSort) {
        filtered.sort((a, b) => {
            const pa = Number(a.price) || 0;
            const pb = Number(b.price) || 0;
            return filterState.priceSort === 'asc' ? pa - pb : pb - pa;
        });
    }

    // Display flat units directly (Removes Building Summary List as requested)
    displayResults(filtered);
    updateActiveFiltersDisplay();
}



// --- UI: Rendering ---

function displayResults(units) {
    dom.buildingsGrid.innerHTML = '';

    if (dom.resultsCount) dom.resultsCount.innerHTML = `<span lang="en">${units.length}</span>`;

    if (units.length === 0) {
        dom.noResults.classList.remove('hidden');
        return;
    }
    dom.noResults.classList.add('hidden');

    units.forEach(u => {
        const card = createUnitCard(u);
        dom.buildingsGrid.appendChild(card);
    });
}


function updateActiveFiltersDisplay() {
    const container = dom.activeFilters;
    container.innerHTML = '';
    const t = translations[currentLang] || {};

    const addTag = (text, type) => {
        const tag = document.createElement('span');
        tag.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100';
        tag.innerHTML = `${text} <i data-lucide="x" class="ml-1.5 w-3 h-3 cursor-pointer opacity-60 hover:opacity-100"></i>`;
        tag.querySelector('i').onclick = () => clearSpecificFilter(type);
        container.appendChild(tag);
    };

    if (filterState.building) addTag(`${t.building_B133?.split(' ')[0] || 'Building'}: ${filterState.building}`, 'building');
    if (filterState.area) addTag(`${t.area || 'Area'}: ${filterState.area}`, 'area');
    if (filterState.delivery !== 'All') addTag(`${t.compare_delivery || 'Delivery'}: ${filterState.delivery}`, 'delivery');
    if (filterState.status && filterState.status !== 'Available') addTag(`${t.pd_status || 'Status'}: ${filterState.status}`, 'status');
    if (filterState.searchText) addTag(`${t.units_search?.split(' ')[0] || 'Search'}: ${filterState.searchText}`, 'search');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function clearSpecificFilter(type) {
    if (type === 'building') {
        filterState.building = null;
        dom.buildingFilter.value = "";
    }
    if (type === 'area') {
        filterState.area = null;
        dom.areaFilter.value = "";
        // 🚀 Refresh buildings list to show all buildings again
        if (filterState.allProjectUnits && filterState.allProjectUnits.length > 0) {
            populateBuildingsFilter(filterState.allProjectUnits);
        }
    }
    if (type === 'delivery') {
        filterState.delivery = 'All';
        updateDeliveryButtons();
    }
    if (type === 'status') {
        filterState.status = null;
        dom.statusFilter.value = "";
    }
    if (type === 'search') {
        filterState.searchText = '';
        dom.searchInput.value = "";
    }

    applyFilters();
}

// --- Navigation ---
function openBuildingDetails(buildingData) {
    console.log('🚀 Intercepted building click: Transitioning without reload');

    // 1. Update URL without refreshing
    const url = new URL(window.location);
    url.searchParams.set('project', filterState.project);
    url.searchParams.set('building', buildingData.building_id);
    window.history.pushState({}, '', url);

    // 2. Direct Transition
    enterBuildingMode(filterState.project, buildingData.building_id);
}

function normalizeId(id) {
    if (!id) return id;
    if (typeof id === 'number') id = id.toString();
    id = id.trim().toUpperCase(); // 🚨 CRITICAL: Trim spaces & Uppercase
    if (/^\d+$/.test(id)) return 'B' + id;
    return id;
}

function createUnitCard(u) {
    const card = document.createElement('div');
    // MATCHING SCREENSHOT: Compact Mobile Card style
    card.className = 'group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col';
    card.setAttribute('data-unit-id', u.id || u.code);

    // --- STRICT AREA-BASED LOGIC (MATCHING UNIT DETAILS) ---
    const areaVal = parseInt(u.area) || 0;
    const bKey = (u.building_id || '').toUpperCase().trim();
    const pKey = (filterState.project || u.project_id || u.projectId || u.project || '').toLowerCase().trim();

    let beds = null;
    let baths = null;
    let featIcons = [];

    // Force Calculation for Known Projects
    if (pKey.includes('golf') || ['B133', 'B136', 'B121', 'B230', 'B243', 'B78', '133', '136', '121', '230', '243', '78'].includes(bKey)) {
        if (areaVal <= 45) { beds = 1; baths = 1; featIcons = ['utensils']; }
        else if (areaVal >= 55 && areaVal <= 75) { beds = 1; baths = 2; featIcons = ['utensils', 'tv']; }
        else if (areaVal >= 76 && areaVal <= 88) { beds = 1; baths = 2; featIcons = ['utensils', 'layout', 'tv']; }
        else if (areaVal >= 89) { beds = 2; baths = 2; featIcons = ['utensils', 'layout', 'tv']; }
        else { beds = 1; baths = 1; }
    } else if (bKey === 'B15' || bKey === '15') {
        if (areaVal <= 50) { beds = 0; baths = 1; }
        else if (areaVal <= 75) { beds = 1; baths = 1; }
        else if (areaVal <= 110) { beds = 2; baths = 2; }
        else { beds = 3; baths = 2; }
    } else if (bKey === 'B33' || bKey === '33') {
        if (areaVal <= 59) { beds = 0; baths = 1; }
        else if (areaVal <= 95) { beds = 1; baths = 1; }
        else if (areaVal <= 120) { beds = 2; baths = 2; }
        else { beds = 3; baths = 2; }
    }

    // Fallback logic
    if (beds === null || baths === null) {
        if (u.auto_specs) {
            try {
                const s = typeof u.auto_specs === 'string' ? JSON.parse(u.auto_specs) : u.auto_specs;
                beds = s.bedrooms; baths = s.bathrooms;
            } catch (e) { }
        }
        if (beds === null) beds = u.bedrooms;
        if (baths === null) baths = u.bathrooms;
    }

    // ERROR CORRECTION
    if ((pKey.includes('golf')) && areaVal >= 55 && areaVal <= 88 && beds === 2 && baths === 1) {
        beds = 1; baths = 2;
    }

    // Last Resort
    if (beds === null || beds === undefined) beds = 1;
    if (baths === null || baths === undefined) baths = 1;

    // Image logic
    const FALLBACK_MAP = {
        'porto-golf-marina': 'https://firebasestorage.googleapis.com/v0/b/real-estate-project-d85d3.appspot.com/o/projects%2Fporto-golf-marina%2Fcover.jpg?alt=media',
        'porto-said': 'https://firebasestorage.googleapis.com/v0/b/real-estate-project-d85d3.appspot.com/o/projects%2Fporto-said%2Fcover.jpg?alt=media',
    };

    // 🚀 NEW: Intelligent Building-Level Fallback
    const bMeta = window.projectMetadata ? window.projectMetadata[bKey] : null;
    const buildingImg = (bMeta && bMeta.image && bMeta.image.length > 0) ? bMeta.image[0] : null;

    const PLACEHOLDER = buildingImg || FALLBACK_MAP[pKey] || 'https://placehold.co/600x400?text=No+Image';
    let img = PLACEHOLDER;
    try {
        let rawImages = u.images || u.image;
        if (typeof rawImages === 'string' && rawImages.startsWith('[')) {
            try { rawImages = JSON.parse(rawImages); } catch (e) { }
        }
        if (Array.isArray(rawImages) && rawImages.length > 0) {
            const first = rawImages[0];
            const candidate = typeof first === 'string' ? first : (first.url || first.data);
            if (candidate && typeof candidate === 'string' && candidate.length > 10) {
                img = candidate;
            } else {
                img = PLACEHOLDER;
            }
        } else if (typeof rawImages === 'string' && rawImages.length > 5) {
            img = rawImages;
        }
    } catch (e) { }

    const t = (typeof translations !== 'undefined' && translations[currentLang]) ? translations[currentLang] : {};
    const priceDisplay = u.price ? u.price.toLocaleString('en-US') + ' EGP' : (t.unit_price_call || 'Call');

    const pConfig = PROJECT_CONFIG[pKey];
    const projectName = (pConfig && t[pConfig.tKey]) ? t[pConfig.tKey] : (pConfig?.name || u.project || 'Unit');
    const unitStatus = t[u.status?.toLowerCase()] || u.status || 'Available';

    let featIconsHTML = featIcons.map(icon => `<i data-lucide="${icon}" class="w-2.5 h-2.5 text-gray-300"></i>`).join('');

    const fallbackSrc = buildingImg || FALLBACK_MAP[pKey] || CONFIG.fallbackImage || 'https://placehold.co/600x400?text=No+Image';

    card.innerHTML = `
        <div class="relative aspect-square sm:aspect-video overflow-hidden bg-gray-50 border-b border-gray-50">
            <!-- Compare Checkbox -->
            <div class="absolute top-2 left-2 z-10">
                <input type="checkbox" class="compare-checkbox w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary h-[18px] w-[18px]" 
                    ${compareState.selectedIds.includes(String(u.code || u.id)) ? 'checked' : ''}
                    onclick="event.stopPropagation(); window.toggleCompare('${u.code || u.id}')">
            </div>
            
            <img 
                src="${img}" 
                alt="Unit ${u.code}" 
                data-optimized="true"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer" 
                onclick="window.location.href='unit-details.html?id=${u.code}'"
            >
            
            <!-- Status Badge -->
            <div class="absolute top-2 right-2 bg-emerald-50 text-emerald-600 text-[8px] sm:text-[10px] font-black px-2 py-0.5 rounded shadow-sm border border-emerald-100">
                ${unitStatus.toUpperCase()}
            </div>
        </div>
        
        <div class="p-3 sm:p-4 flex-grow flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-1">
                    <h3 class="font-black text-gray-900 text-sm sm:text-base">${t.unit_label || 'Unit'} <span lang="en">${u.code}</span></h3>
                    <div class="bg-gray-100 text-gray-900 px-2 py-0.5 rounded text-[10px] sm:text-xs font-black border border-gray-200 shadow-sm"><span lang="en">${areaVal}</span> m&sup2;</div>
                </div>
                <p class="text-[10px] sm:text-xs text-gray-400 mb-3 flex items-center gap-1">
                    <i data-lucide="map-pin" class="w-3 h-3"></i>
                    ${projectName}
                </p>
                
                <div class="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 font-bold">
                     <div class="flex items-center gap-1.5">
                        <i data-lucide="bed" class="w-3.5 h-3.5 text-gray-400"></i>
                        <span><span lang="en">${beds}</span></span>
                     </div>
                     <div class="flex items-center gap-1.5">
                        <i data-lucide="bath" class="w-3.5 h-3.5 text-gray-400"></i>
                        <span><span lang="en">${baths}</span></span>
                     </div>
                     <div class="flex gap-1" dir="ltr"> <!-- Keep icons ltr for alignment -->
                        ${featIconsHTML}
                     </div>
                </div>
            </div>

            <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                <span class="text-base sm:text-xl font-black text-primary"><span lang="en">${priceDisplay}</span></span>
                <a href="unit-details.html?id=${u.code}" class="text-gray-300 hover:text-primary transition-colors">
                    <i data-lucide="${currentLang === 'en' ? 'chevron-right' : 'chevron-left'}" class="w-5 h-5"></i>
                </a>
            </div>
        </div>
    `;

    // Re-init icons
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 0);

    return card;
}

// --- Global Reference Cache for Comparison ---
// Since filterState.allProjectUnits might change when switching buildings, 
// we keep a reference to EVERY unit ever fetched here.
const globalUnitCache = new Map();

function cacheUnits(units) {
    if (!units) return;
    units.forEach(u => {
        const id = String(u.id || u.code);
        globalUnitCache.set(id, u);
    });
}

// --- Comparison Logic ---
window.toggleCompare = function (unitId) {
    const idStr = String(unitId);
    const idx = compareState.selectedIds.indexOf(idStr);

    if (idx > -1) {
        compareState.selectedIds.splice(idx, 1);
    } else {
        if (compareState.selectedIds.length >= compareState.max) {
            const t = translations[currentLang] || {};
            alert(`${t.compare_limit_msg || 'You can compare up to'} ${compareState.max} ${t.nav_menu_project || 'units'}.`);

            // Sync checkbox
            const cb = document.querySelector(`[data-unit-id="${unitId}"] .compare-checkbox`);
            if (cb) cb.checked = false;
            return;
        }
        compareState.selectedIds.push(idStr);
    }
    updateCompareBar();
};

function updateCompareBar() {
    const d = getDom();
    const count = compareState.selectedIds.length;
    if (!d.compareBar) return;

    if (count > 0) {
        d.compareBar.classList.remove('translate-y-full', 'opacity-0');
        d.compareBar.classList.add('translate-y-0', 'opacity-100');
    } else {
        d.compareBar.classList.add('translate-y-full', 'opacity-0');
        d.compareBar.classList.remove('translate-y-0', 'opacity-100');
    }

    if (d.compareCount) d.compareCount.textContent = count;
    if (d.modalCompareCount) d.modalCompareCount.textContent = count;

    // Render Avatars
    if (d.compareAvatars) {
        d.compareAvatars.innerHTML = '';
        compareState.selectedIds.forEach(id => {
            const unit = filterState.allProjectUnits.find(u => String(u.id || u.code) === id) || globalUnitCache.get(id);
            if (!unit) return;

            let img = 'https://placehold.co/100x100?text=Unit';
            try {
                let raw = unit.images || unit.image;
                if (typeof raw === 'string' && raw.startsWith('[')) raw = JSON.parse(raw);
                if (Array.isArray(raw) && raw.length > 0) img = typeof raw[0] === 'string' ? raw[0] : (raw[0].url || raw[0].data);
                else if (typeof raw === 'string' && raw.length > 5) img = raw;
            } catch (e) { }

            const avatar = document.createElement('div');
            avatar.className = 'w-9 h-9 sm:w-10 sm:h-10 rounded-lg border-2 border-white shadow-sm overflow-hidden bg-gray-100 flex-shrink-0 -ml-2 first:ml-0';
            avatar.innerHTML = `<img src="${img}" class="w-full h-full object-cover">`;
            d.compareAvatars.appendChild(avatar);
        });
    }
}

window.openCompareModal = function () {
    console.log('🚀 Attempting to open comparison modal...');
    const d = getDom();

    if (!d.compareModal || !d.compareBar) {
        console.error('❌ Critical elements missing!');
        return;
    }

    // 1. Identify Selected Units
    console.log('Compare IDs:', compareState.selectedIds);
    console.log('Global Cache Size:', globalUnitCache.size);

    const selectedUnits = (compareState.selectedIds || [])
        .map(id => {
            // Try explicit String matching on code, then id, then fallback to cache
            let found = filterState.allProjectUnits.find(u => String(u.code) === String(id)) ||
                filterState.allProjectUnits.find(u => String(u.id) === String(id));

            if (!found) {
                found = globalUnitCache.get(String(id));
            }
            if (!found) {
                // Last ditch: iterate cache values
                for (const u of globalUnitCache.values()) {
                    if (String(u.code) === String(id) || String(u.id) === String(id)) {
                        found = u;
                        break;
                    }
                }
            }
            return found;
        })
        .filter(u => !!u);

    console.log(`📊 Matched ${selectedUnits.length} units.`);

    if (selectedUnits.length === 0) {
        const t = (translations && translations[currentLang]) || {};
        // DEBUG ALERT to help user
        console.warn('DEBUG: No units matched. Cache keys:', [...globalUnitCache.keys()]);
        alert(t.compare_no_units || 'Please select units to compare.');
        return;
    }

    // 2. Build Content
    const t = (translations && translations[currentLang]) || {};
    let html = `
        <div class="overflow-x-auto pb-6 scrollbar-thin">
            <table class="w-full border-separate border-spacing-0">
                <thead>
                    <tr>
                        <th class="sticky left-0 z-20 p-4 bg-gray-50 border-b border-gray-100 min-w-[100px] text-gray-400 uppercase text-[9px] sm:text-[10px] font-black text-left backdrop-blur-sm">Feature</th>
                        ${selectedUnits.map(u => `
                            <th class="p-3 bg-white border-b border-gray-100 min-w-[160px] sm:min-w-[200px]">
                                <div class="flex flex-col gap-2 items-center">
                                    <span class="text-xs font-black text-gray-900">${t.unit_label || 'Unit'} <span lang="en">${u.code || u.unit_id}</span></span>
                                    <button onclick="window.toggleCompare('${u.id || u.code}'); setTimeout(window.openCompareModal, 100);" class="text-[9px] text-red-500 hover:text-red-600 font-bold uppercase tracking-widest">Remove</button>
                                </div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody class="text-xs sm:text-sm">
                    <tr>
                        <td class="sticky left-0 z-10 p-4 border-b border-gray-50 font-bold text-gray-500 bg-gray-50/80 backdrop-blur-sm">Price</td>
                        ${selectedUnits.map(u => `<td class="p-4 border-b border-gray-50 font-black text-primary text-center"><span lang="en">${u.price ? u.price.toLocaleString('en-US') + ' EGP' : 'Call'}</span></td>`).join('')}
                    </tr>
                    <tr>
                        <td class="sticky left-0 z-10 p-4 border-b border-gray-50 font-bold text-gray-500 bg-gray-50/80 backdrop-blur-sm">Area</td>
                        ${selectedUnits.map(u => `<td class="p-4 border-b border-gray-50 font-medium text-center"><span lang="en">${u.area || '--'}</span> m&sup2;</td>`).join('')}
                    </tr>
                    <tr>
                        <td class="sticky left-0 z-10 p-4 border-b border-gray-50 font-bold text-gray-500 bg-gray-50/80 backdrop-blur-sm">Floor</td>
                        ${selectedUnits.map(u => `<td class="p-4 border-b border-gray-50 text-center"><span lang="en">${u.floor || '--'}</span></td>`).join('')}
                    </tr>
                    <tr>
                        <td class="sticky left-0 z-10 p-4 border-b border-gray-50 font-bold text-gray-500 bg-gray-50/80 backdrop-blur-sm">View</td>
                        ${selectedUnits.map(u => `<td class="p-4 border-b border-gray-50 text-center">${u.view || '--'}</td>`).join('')}
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    if (d.compareContent) d.compareContent.innerHTML = html;

    // 3. Reveal Modal with Force
    d.compareModal.classList.remove('hidden');
    d.compareModal.style.display = 'block';

    setTimeout(() => {
        const panel = document.getElementById('compare-panel');
        const backdrop = document.getElementById('compare-backdrop');
        if (panel) {
            panel.style.opacity = '1';
            // Mobile: Slide DOWN from Top (0). Desktop: Centered.
            panel.style.transform = window.innerWidth < 640 ? 'translateY(0)' : 'translate(-50%, -50%) scale(1)';
        }
        if (backdrop) backdrop.style.opacity = '1';
    }, 50);

    document.body.style.overflow = 'hidden';
};

window.closeCompareModal = function () {
    const d = getDom();
    const panel = document.getElementById('compare-panel');
    const backdrop = document.getElementById('compare-backdrop');

    if (panel) {
        panel.style.opacity = '0';
        // Mobile: Slide UP to hide (-100%). Desktop: Scale Down.
        panel.style.transform = window.innerWidth < 640 ? 'translateY(-100%)' : 'translate(-50%, -50%) scale(0.95)';
    }
    if (backdrop) backdrop.style.opacity = '0';

    setTimeout(() => {
        if (d.compareModal) {
            d.compareModal.classList.add('hidden');
            d.compareModal.style.display = 'none';
        }
        document.body.style.overflow = '';
    }, 300);
};
