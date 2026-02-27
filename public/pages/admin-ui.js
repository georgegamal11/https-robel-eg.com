/**
 * ADMIN UI CONTROLLER
 * ====================
 * Checkpoint between UI and Firebase Admin Logic
 */

var AdminUI = {
    // State
    state: {
        currentDeleteId: null,
        currentDeleteType: null, // 'unit', 'project', 'area'
        isSubmitting: false
    },

    // Initialization
    init: function () {
        // SECURITY: Only initialize for logged in admins or reporters
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const isReporter = localStorage.getItem('isReporter') === 'true';
        if (!isAdmin && !isReporter) return;

        // console.log('🏗️ AdminUI: Initializing modals and listeners...');
        try {
            this.renderToastContainer();
            this.renderModals(); // Inject modals into DOM
            this.setupGlobalListeners();

            // Restricted view for reporters
            if (isReporter) {
                this.applyReporterRestrictions();
            }
            // console.log('✅ Admin UI Controller Initialized');
        } catch (e) {
            // console.error('❌ AdminUI Initialization failed:', e);
        }

        // Auto-create reports user
        setTimeout(async () => {
            if (localStorage.getItem('reports_created_v1')) return;
            const token = localStorage.getItem('cf_auth_token');
            if (!token) return;

            try {
                const resp = await fetch('https://robel-api.george-gamal139.workers.dev/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        email: "reports@robel-eg.com",
                        password: "RobelReports2026!",
                        role: "reporter",
                        username: "ReportsUser",
                        permissions: JSON.stringify({ projects: [] })
                    })
                });
                const data = await resp.json();
                if (data.success || data.message === "User already exists") {
                    localStorage.setItem('reports_created_v1', 'true');
                    alert("Created Account: reports@robel-eg.com\nPass: RobelReports2026!");
                }
            } catch (e) { console.error(e); }
        }, 2000);
    },

    // ============================================================================
    // MODAL MANAGEMENT
    // ============================================================================
    renderModals: function () {
        // Delete Modal
        if (!document.getElementById('delete-modal')) {
            const deleteModal = document.createElement('div');
            deleteModal.setAttribute('id', 'delete-modal');
            deleteModal.className = 'modal-overlay';
            deleteModal.style.zIndex = "100000"; // Ensure it's above everything
            deleteModal.innerHTML = `
                <div class="modal-card" style="text-align: center; max-width: 400px;">
                    <button class="modal-close" onclick="window.AdminUI.closeModal('delete-modal')">
                        <i class="fas fa-times"></i>
                    </button>
                    <div style="margin-bottom: 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; background: #fee2e2; padding: 20px; border-radius: 50%;"></i>
                    </div>
                    <h3 style="font-size: 24px; margin-bottom: 10px;">Are you sure?</h3>
                    <p style="color: #64748b; margin-bottom: 30px;">This action cannot be undone. This will permanently delete the selected item.</p>
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.AdminUI.closeModal('delete-modal')" class="btn" style="background: #f1f5f9; color: #64748b; padding: 12px 20px; border-radius: 12px;">
                            Cancel
                        </button>
                        <button id="confirm-delete-btn" onclick="window.AdminUI.confirmDelete()" class="btn btn-primary" style="background: #ef4444; color: white; padding: 12px 20px; border-radius: 12px;">
                            Yes, Delete
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(deleteModal);
        }

        // Add more modals here if needed (e.g. Unit Modal)
    },

    openModal: function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('active');
        } else {
            console.error(`Modal with id ${id} not found`);
        }
    },

    closeModal: function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
        }
    },

    // ============================================================================
    // TOAST NOTIFICATIONS
    // ============================================================================
    renderToastContainer: function () {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 100001; display: flex; flex-direction: column; gap: 10px;';
            document.body.appendChild(container);
        }
    },

    showToast: function (message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) {
            alert(message);
            return;
        }

        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#10b981' : '#ef4444';
        toast.style.cssText = `background: ${bgColor}; color: white; padding: 12px 24px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); transform: translateX(100%); transition: 0.3s; font-weight: 600;`;
        toast.innerHTML = message;

        container.appendChild(toast);
        setTimeout(() => toast.style.transform = 'translateX(0)', 10);
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // ============================================================================
    // DELETE OPERATIONS
    // ============================================================================
    promptDelete: function (id, type) {
        // Extra security check
        if (localStorage.getItem('isAdmin') !== 'true') {
            this.showToast('You do not have permission to delete.', 'error');
            return;
        }
        console.log(`🗑️ Prompting delete for ${type}: ${id}`);
        this.state.currentDeleteId = id;
        this.state.currentDeleteType = type;
        this.openModal('delete-modal');
    },

    confirmDelete: async function () {
        if (!this.state.currentDeleteId) return;

        const btn = document.getElementById('confirm-delete-btn');
        const startText = btn ? btn.textContent : 'Yes, Delete';
        if (btn) {
            btn.textContent = 'Deleting...';
            btn.disabled = true;
        }

        try {
            const pass = prompt("Enter Master Password to confirm deletion:");
            if (pass !== '792001') {
                alert("Incorrect password. Operation cancelled.");
                if (btn) {
                    btn.textContent = startText;
                    btn.disabled = false;
                }
                return;
            }

            const id = this.state.currentDeleteId;
            const type = this.state.currentDeleteType;

            console.log(`🔥 Executing delete for type: ${type}, ID: ${id}`);

            if (type === 'unit') {
                if (!window.robelAdminAPI) throw new Error("Admin system not fully loaded. Please refresh.");

                // --- ROBUST ID SELECTION ---
                // We try to pass the full unit_id (PK) if possible, fallback to the code.
                let targetId = id;
                if (window.inventory) {
                    const unit = window.inventory.find(u => u.unit_id === id || u.code === id || u.id === id);
                    if (unit) targetId = unit.unit_id || unit.id || unit.code;
                }

                await window.robelAdminAPI.deleteUnit(targetId);
                this.showToast('Unit deleted successfully');

                if (window.inventory) {
                    const filtered = window.inventory.filter(u => u.unit_id != targetId && u.code != id);
                    window.inventory.splice(0, window.inventory.length, ...filtered);
                    if (typeof window.saveCurrentInventory === 'function') window.saveCurrentInventory();
                }

                this.refreshGlobalLists();
            }
            else if (type === 'project' || type === 'building') {
                let realId = id;
                if (window.projectMetadata && window.projectMetadata[id] && window.projectMetadata[id].id) {
                    realId = window.projectMetadata[id].id;
                }

                if (!window.robelAdminAPI) throw new Error("Admin system not fully loaded. Please refresh.");
                await window.robelAdminAPI.deleteProject(realId, type === 'building');

                if (window.projectMetadata) {
                    window.projectMetadata[id] = { deleted: true, id: id };
                    if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('robelProjectMetadata', window.projectMetadata);
                    else localStorage.setItem('robelProjectMetadata', JSON.stringify(window.projectMetadata));
                }

                if (window.projectNames) {
                    const filtered = window.projectNames.filter(n => n !== id);
                    window.projectNames.splice(0, window.projectNames.length, ...filtered);
                }
                if (window.inventory) {
                    const filtered = window.inventory.filter(u => u.project !== id && u.projectId !== id && u.buildingId !== id);
                    window.inventory.splice(0, window.inventory.length, ...filtered);
                    if (typeof window.saveCurrentInventory === 'function') window.saveCurrentInventory();
                }

                this.showToast('Building/Project deleted successfully');
                this.refreshGlobalLists();
            }
            else if (type === 'area') {
                const areaName = id;
                const hasNames = (typeof window.projectNames !== 'undefined' && window.projectNames !== null);
                const hasMeta = (typeof window.projectMetadata !== 'undefined' && window.projectMetadata !== null);
                const hasAdmin = (typeof window.robelAdminAPI !== 'undefined' && window.robelAdminAPI !== null);

                if (hasNames && hasMeta && hasAdmin) {
                    const buildingsToDelete = window.projectNames.filter(pName => {
                        const meta = window.projectMetadata[pName];
                        return meta && !meta.deleted && (meta.projectArea === areaName || (!meta.projectArea && areaName === 'Other'));
                    });

                    // 1. Delete all buildings in this area
                    for (const pName of buildingsToDelete) {
                        let bRealId = window.projectMetadata[pName]?.id || pName;
                        await window.robelAdminAPI.deleteProject(bRealId, true); // true = buildings table
                        if (window.projectMetadata) window.projectMetadata[pName] = { deleted: true, id: bRealId };
                    }

                    // 2. Delete the Project record itself (Area entry)
                    // Normalize ID: "Porto Golf" -> "porto-golf"
                    let aRealId = areaName.toLowerCase().replace(/\s+/g, '-');
                    if (window.projectMetadata[areaName] && window.projectMetadata[areaName].id) {
                        aRealId = window.projectMetadata[areaName].id;
                    }

                    try {
                        console.log(`🗑️ Attempting to delete Project record: ${aRealId}`);
                        await window.robelAdminAPI.deleteProject(aRealId, false); // false = projects table
                    } catch (e) {
                        console.warn(`Could not delete project entry for ${aRealId}, might not exist in and-api.`, e);
                    }

                    // 3. Update Local State
                    if (window.projectMetadata[areaName]) {
                        window.projectMetadata[areaName] = { deleted: true, id: aRealId };
                    }

                    // Remove from projectAreas array (the list of folders)
                    if (window.projectAreas) {
                        const idx = window.projectAreas.indexOf(areaName);
                        if (idx > -1) window.projectAreas.splice(idx, 1);

                        // Also try to remove from the local variable if it exists in scope (usually it's a ref to window)
                        if (typeof projectAreas !== 'undefined') {
                            const pIdx = projectAreas.indexOf(areaName);
                            if (pIdx > -1) projectAreas.splice(pIdx, 1);
                        }
                    }

                    if (window.projectMetadata) {
                        if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('robelProjectMetadata', window.projectMetadata);
                        else localStorage.setItem('robelProjectMetadata', JSON.stringify(window.projectMetadata));
                    }
                    if (typeof window.saveCurrentInventory === 'function') window.saveCurrentInventory();

                    if (window.projectNames) {
                        const deletedSet = new Set(buildingsToDelete);
                        deletedSet.add(areaName);
                        const filtered = window.projectNames.filter(n => !deletedSet.has(n));
                        window.projectNames.splice(0, window.projectNames.length, ...filtered);
                    }

                    this.showToast(`Area "${areaName}" and contents deleted`);
                    this.refreshGlobalLists();
                } else {
                    let missing = [];
                    if (!hasNames) missing.push("ProjectNames");
                    if (!hasMeta) missing.push("ProjectMetadata");
                    if (!hasAdmin) missing.push("AdminAPI");
                    throw new Error(`System components are not ready: ${missing.join(', ')}`);
                }
            }

            this.closeModal('delete-modal');
        } catch (error) {
            console.error('Delete failed', error);

            // SPECIAL HANDLING FOR PERMISSION OR OFFLINE ERRORS (Fallback to Local Soft Delete)
            const isOffline = error.message.includes('offline') || error.code === 'unavailable';
            const isPermission = error.message.includes('permission') || error.code === 'permission-denied';

            if (isPermission || isOffline) {
                const errorType = isOffline ? "Offline Mode" : "Permission Denied";
                console.warn(`⚠️ ${errorType}: Performing local soft delete only.`);

                const id = this.state.currentDeleteId;
                const type = this.state.currentDeleteType;

                // Mark as deleted locally so it hides immediately
                if (window.projectMetadata && (type === 'project' || type === 'building' || type === 'area')) {
                    window.projectMetadata[id] = { ...window.projectMetadata[id], deleted: true };
                    if (typeof window.safeLocalStorageSet === 'function') window.safeLocalStorageSet('robelProjectMetadata', window.projectMetadata);
                    else localStorage.setItem('robelProjectMetadata', JSON.stringify(window.projectMetadata));

                    if (window.projectNames) {
                        const filtered = window.projectNames.filter(n => n !== id);
                        window.projectNames.splice(0, window.projectNames.length, ...filtered);
                    }
                }

                if (window.inventory && type === 'unit') {
                    const filtered = window.inventory.filter(u => u.code != id);
                    window.inventory.splice(0, window.inventory.length, ...filtered);
                    if (typeof window.saveCurrentInventory === 'function') window.saveCurrentInventory();
                }

                // Sync window lists by mutating existing arrays to keep references alive
                if (window.projectMetadata) {
                    const newNames = Object.keys(window.projectMetadata).filter(k => !window.projectMetadata[k].deleted);
                    const newAreas = [...new Set(Object.values(window.projectMetadata)
                        .filter(m => !m.deleted)
                        .map(m => m.projectArea || "Other"))];

                    if (window.projectNames) window.projectNames.splice(0, window.projectNames.length, ...newNames);
                    if (window.projectAreas) window.projectAreas.splice(0, window.projectAreas.length, ...newAreas);
                }

                const msg = isOffline ?
                    'Local Delete applied. (Offline Mode - Change will sync when online)' :
                    'Local Delete applied. (Permissions Error - Please check your Admin account)';

                this.showToast(msg, 'info');
                this.refreshGlobalLists();
                this.closeModal('delete-modal');
            } else {
                this.showToast('Failed to delete: ' + error.message, 'error');
            }
        } finally {
            if (btn) {
                btn.textContent = startText;
                btn.disabled = false;
            }
        }
    },

    refreshGlobalLists: async function () {
        console.log('🔄 AdminUI: Refreshing UI after changes...');
        try {
            if (typeof window.loadData === 'function') {
                await window.loadData();
            }
            if (typeof window.renderSettingsProjectList === 'function') {
                window.renderSettingsProjectList();
            }
            // Trigger UI update for project selects if they exist
            if (typeof window.populateProjectSelects === 'function') {
                window.populateProjectSelects();
            }
            if (typeof window.renderProjectCards === 'function') {
                window.renderProjectCards();
            }
            if (typeof window.renderAdminUnits === 'function' && window.selectedBuildingId) {
                window.renderAdminUnits(window.selectedBuildingId);
            }
            if (typeof window.updateGlobalUnitStats === 'function') {
                window.updateGlobalUnitStats();
            }

            // Re-apply translations to refresh dynamic text like port_title
            if (typeof window.setLanguage === 'function' && typeof window.currentLang !== 'undefined') {
                window.setLanguage(window.currentLang);
            }
        } catch (error) {
            console.error('Failed to refresh list:', error);
        }
    },

    // ============================================================================
    // EVENT LISTENERS
    // ============================================================================
    setupGlobalListeners: function () {
        // Event Delegation for Table Actions
        document.addEventListener('click', (e) => {
            // Unit Delete Button
            if (e.target.closest('.btn-delete')) {
                const btn = e.target.closest('.btn-delete');
                const unitId = btn.dataset.id;
                if (unitId) this.promptDelete(unitId, 'unit');
            }
            // Unit Edit Button
            if (e.target.closest('.btn-edit')) {
                const btn = e.target.closest('.btn-edit');
                const unitId = btn.dataset.id;
                // Hook into existing edit function if available
                if (unitId && typeof window.openEditUnitModal === 'function') {
                    window.openEditUnitModal(unitId);
                }
            }
        });
    },

    // ============================================================================
    // CLOUDFLARE SYNC & CLEANUP
    // ============================================================================
    cleanupCloudflareDuplicates: async function () {
        if (!confirm("This will find and remove duplicate units from Cloudflare. This is safe and helps sync counts. Proceed?")) return;

        this.showToast("Fetching Cloudflare data...", "info");
        try {
            // 1. Fetch all units from Cloudflare
            const resp = await fetch('https://robel-api.george-gamal139.workers.dev/api/units');
            if (!resp.ok) throw new Error("Cloudflare fetch failed");
            const cloudUnits = await resp.json();

            this.showToast(`Analyzing ${cloudUnits.length} units...`, "info");

            // 2. Identify duplicates by code
            const normalizeId = (id) => {
                if (!id) return id;
                id = id.toString().trim();
                if (/^\d+$/.test(id)) return 'B' + id;
                return id;
            };

            const codeMap = {};
            const toDeleteIds = [];

            cloudUnits.forEach(u => {
                const normalized = normalizeId(u.code || u.unit_id);
                if (!codeMap[normalized]) {
                    codeMap[normalized] = u;
                } else {
                    const existing = codeMap[normalized];
                    const isExistingOld = /^\d+$/.test(existing.unit_id);
                    const isNewBFormat = u.unit_id.startsWith('B');

                    if (isNewBFormat && isExistingOld) {
                        toDeleteIds.push(existing.unit_id);
                        codeMap[normalized] = u;
                    } else {
                        toDeleteIds.push(u.unit_id);
                    }
                }
            });

            if (toDeleteIds.length === 0) {
                this.showToast("✨ Cloudflare is already clean!", "success");
                return;
            }

            this.showToast(`Cleaning ${toDeleteIds.length} duplicates...`, "info");

            for (const id of toDeleteIds) {
                try {
                    // Use standard sync function if available, otherwise direct fetch with Auth
                    if (window.robelAdminAPI && window.robelAdminAPI.syncToCloudflare) {
                        await window.robelAdminAPI.syncToCloudflare('units', 'DELETE', id);
                    } else {
                        // Fallback manual POST
                        await fetch('https://robel-api.george-gamal139.workers.dev/api', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer G792001' },
                            body: JSON.stringify({ action: 'DELETE', table: 'units', id })
                        });
                    }
                } catch (e) { console.warn(`Failed to delete ${id}`, e); }
            }

            this.showToast(`✅ Cloudflare Cleanup Complete!`, "success");
            if (typeof window.updateGlobalUnitStats === 'function') window.updateGlobalUnitStats();

        } catch (e) {
            console.error(e);
            this.showToast("Cleanup failed: " + e.message, "error");
        }
    },

    applyReporterRestrictions: function () {
        // Hide destructive or management elements
        const managementElements = [
            '#admin-settings-btn',
            '#save-inventory-btn',
            '#show-add-project-form',
            '#show-add-unit-form',
            '#repair-specs-btn',
            '.btn-delete',
            '.btn-edit',
            '#add-new-area-btn',
            '#settings-add-building-trigger',
            '#delete-area-btn-trigger',
            '#delete-building-btn-trigger',
            '#settings-permissions-trigger'
        ];

        managementElements.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
            });
        });

        // Add global style for dynamic elements
        if (!document.getElementById('reporter-styles')) {
            const style = document.createElement('style');
            style.id = 'reporter-styles';
            style.innerHTML = `
                .btn-delete, .btn-edit, .action-card, #admin-settings-btn, #save-inventory-btn, #show-add-unit-form { display: none !important; }
                /* But ALLOW the permissions card to show if we want, or hide it */
                #admin-settings-view > .settings-grid { display: none !important; }
                #admin-settings-view > h3 { display: none !important; }
            `;
            document.head.appendChild(style);
        }
    },

    switchToPermissions: function () {
        // 🔐 SECURITY GATE: Only admin can access this panel
        if (window.currentUserRole !== 'admin' && !window.isAdmin) {
            this.showToast('Access Denied: Only the system administrator can manage permissions.', 'error');
            return;
        }
        document.getElementById('admin-settings-view').style.display = 'none';
        document.getElementById('admin-permissions-view').style.display = 'block';
        this.fetchUsers();
        this.populateProjectsInPermissions();
    },

    populateProjectsInPermissions: async function () {
        const list = document.getElementById('new-user-projects-list');
        if (!list) return;

        try {
            const resp = await fetch('https://robel-api.george-gamal139.workers.dev/api/projects');
            const projects = await resp.json();

            if (projects && projects.length > 0) {
                list.innerHTML = projects.map(p => `
                    <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:0.9rem;">
                        <input type="checkbox" name="user-project" value="${p.id}" class="project-checkbox">
                        <span>${p.name}</span>
                    </label>
                `).join('');
            } else {
                list.innerHTML = `<p style="font-size:0.75rem; opacity:0.5; text-align:center;">No projects found.</p>`;
            }
        } catch (e) {
            list.innerHTML = `<p style="font-size:0.75rem; color:#ef4444; text-align:center;">Failed to load projects.</p>`;
        }
    },

    fetchUsers: async function () {
        const container = document.getElementById('users-list-container');
        if (!container) return;

        const token = localStorage.getItem('cf_auth_token');
        console.log('🔑 Token present:', !!token, '| Token value:', token);

        try {
            const resp = await fetch('https://robel-api.george-gamal139.workers.dev/api/auth/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('📡 /api/auth/users status:', resp.status);

            if (resp.ok) {
                const users = await resp.json();
                this.renderUsersList(users);
            } else {
                const errData = await resp.json().catch(() => ({ error: resp.statusText }));
                console.error('❌ Server error:', errData);
                container.innerHTML = `<p style="text-align:center; padding:20px; color:#ef4444;">Error ${resp.status}: ${errData.error || 'Permission Denied'}</p>`;
            }
        } catch (e) {
            console.error("Fetch users error:", e);
            container.innerHTML = `<p style="text-align:center; padding:20px; color:#ef4444;">Error: ${e.message}</p>`;
        }
    },

    renderUsersList: function (users) {
        const container = document.getElementById('users-list-container');
        if (!container) return;

        if (!users || users.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; opacity:0.4;">
                    <i class="fas fa-user-secret" style="font-size:2rem; margin-bottom:15px;"></i>
                    <p>No staff accounts found.</p>
                </div>`;
            return;
        }

        container.innerHTML = users.map(user => {
            const dateStr = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown Date';
            const expiryStr = user.expires_at ? new Date(user.expires_at).toLocaleDateString() : 'Never';
            const isExpired = user.expires_at && new Date(user.expires_at) < new Date();

            let perms = 'All Projects';
            try {
                const pObj = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
                if (!['admin', 'pm'].includes(user.role) && pObj && Array.isArray(pObj.projects) && pObj.projects.length > 0) {
                    perms = pObj.projects.join(', ');
                }
            } catch (e) { }

            return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary); padding:18px; border-radius:12px; border: 1px solid ${isExpired ? '#ef4444' : 'var(--border-light)'}; transition: transform 0.2s hover; margin-bottom:10px;">
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:700; color:var(--navy-deep);">${user.email}</span>
                        <span style="font-size:0.65rem; background: ${this.getRoleColor(user.role).bg}; color:${this.getRoleColor(user.role).text}; padding:2px 8px; border-radius:10px; font-weight:800; text-transform:uppercase;">${user.role}</span>
                        ${isExpired ? '<span style="font-size:0.6rem; color:#ef4444; font-weight:700;">[EXPIRED]</span>' : ''}
                    </div>
                    <div style="font-size:0.75rem; opacity:0.7; margin-top:8px;">
                        <span style="font-weight:600; color:var(--gold-main);">Controls:</span> ${perms}
                    </div>
                    <div style="font-size:0.65rem; opacity:0.4; margin-top:4px;">
                        Expires: ${expiryStr} | Joined: ${dateStr}
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <button onclick="window.AdminUI.deleteUser('${user.id}', '${user.email}')" class="btn-icon" style="color:#ef4444; opacity:0.5; hover:opacity:1; background:transparent; border:none; cursor:pointer;">
                        <i class="fas fa-user-minus"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
    },

    getRoleColor: function (role) {
        const roles = {
            admin: { bg: '#fee2e2', text: '#ef4444' },
            pm: { bg: '#dcfce7', text: '#16a34a' },
            finance: { bg: '#fef9c3', text: '#ca8a04' },
            sales: { bg: '#dbeafe', text: '#2563eb' },
            reporter: { bg: '#f3e8ff', text: '#9333ea' },
            viewer: { bg: '#f1f5f9', text: '#475569' }
        };
        return roles[role] || { bg: '#f3e8ff', text: '#9333ea' };
    },

    switchPermissionTab: function (tab) {
        document.querySelectorAll('.perm-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.perm-tab-content').forEach(view => view.style.display = 'none');

        document.getElementById(`tab-btn-${tab}`).classList.add('active');
        document.getElementById(`perm-view-${tab}`).style.display = 'block';

        if (tab === 'audit') this.fetchAuditLogs();
        if (tab === 'management') this.fetchUsers();
    },

    fetchAuditLogs: async function () {
        const container = document.getElementById('audit-logs-container');
        if (!container) return;

        try {
            const resp = await fetch('https://robel-api.george-gamal139.workers.dev/api/auth/audit-logs', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('cf_auth_token')}` }
            });
            const logs = await resp.json();
            this.renderAuditLogs(logs);
        } catch (e) {
            container.innerHTML = `<p style="padding:20px; color:#ef4444;">Failed to load logs.</p>`;
        }
    },

    renderAuditLogs: function (logs) {
        const container = document.getElementById('audit-logs-container');
        if (!container) return;

        if (!logs || logs.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:40px; opacity:0.4;">No activity recorded yet.</p>`;
            return;
        }

        container.innerHTML = logs.map(log => {
            const date = new Date(log.timestamp).toLocaleString();
            let actionColor = '#475569';
            if (log.action.includes('DELETE')) actionColor = '#ef4444';
            if (log.action.includes('UPSERT')) actionColor = '#16a34a';
            if (log.action.includes('BLOCKED')) actionColor = '#f59e0b';

            return `
            <div style="display:grid; grid-template-columns: 180px 100px 1fr 150px; gap:10px; padding:12px; border-bottom:1px solid var(--border-light); font-size:0.75rem; align-items:center;">
                <span style="font-weight:600; opacity:0.8;">${date}</span>
                <span style="color:${actionColor}; font-weight:800; text-transform:uppercase;">${log.action}</span>
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-weight:700;">${log.user_email}</span>
                    <span style="opacity:0.5;">Target: ${log.target_table} (${log.target_id})</span>
                </div>
                <div style="text-align:right; font-size:0.65rem; opacity:0.4;">
                    ${log.id.substring(0, 8)}...
                </div>
            </div>`;
        }).join('');
    },

    deleteUser: async function (id, email) {
        if (email === 'admin@robel.com') {
            this.showToast("Cannot delete primary administrator account.", "error");
            return;
        }

        if (!confirm(`Are you sure you want to remove access for ${email}?`)) return;

        try {
            const resp = await fetch('https://robel-api.george-gamal139.workers.dev/api/auth/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (resp.ok) {
                this.showToast(`Access removed for ${email}`);
                this.fetchUsers();
            } else {
                throw new Error("Failed to delete user");
            }
        } catch (e) {
            this.showToast(e.message, 'error');
        }
    },

    handleAddUser: async function () {
        const email = document.getElementById('new-user-email').value;
        const password = document.getElementById('new-user-password').value;
        const role = document.getElementById('new-user-role').value;
        const expires_at = document.getElementById('new-user-expiry').value;
        const btn = document.getElementById('add-user-submit-btn');

        // Collect permissions
        const selectedProjects = [];
        document.querySelectorAll('.project-checkbox:checked').forEach(cb => {
            selectedProjects.push(cb.value);
        });

        if (!email || !password || !role) {
            this.showToast("Please fill all required fields", "warning");
            return;
        }

        const originalText = btn.textContent;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
        btn.disabled = true;

        try {
            const resp = await fetch('https://robel-api.george-gamal139.workers.dev/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    role,
                    username: email.split('@')[0],
                    permissions: JSON.stringify({ projects: selectedProjects }),
                    expires_at: expires_at || null
                })
            });

            const result = await resp.json();
            if (resp.ok && result.success) {
                this.showToast(`Account created successfully for ${email}`);
                document.getElementById('addUserForm').reset();
                this.fetchUsers();
            } else {
                throw new Error(result.error || result.message || "Failed to create account");
            }
        } catch (e) {
            this.showToast(e.message, 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    },
};

// Expose globally
window.AdminUI = AdminUI;

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    AdminUI.init();
});
