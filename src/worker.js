export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // ====================================================================
        // CORS CONFIGURATION
        // ====================================================================
        const origin = request.headers.get('Origin');
        const allowedOrigins = [
            'https://robel-eg.com',
            'https://www.robel-eg.com',
            'http://127.0.0.1:5500',
            'http://localhost:5500',
            'http://localhost:3000'
        ];

        const allowOrigin = (origin && allowedOrigins.includes(origin)) ? origin : '*';

        const corsHeaders = {
            'Access-Control-Allow-Origin': allowOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        };

        // Security: Simple API Key for Writes
        const AUTH_KEY = "G792001";
        const authHeader = request.headers.get('Authorization');
        const isAuth = authHeader === `Bearer ${AUTH_KEY}`;

        // 1. Handle CORS Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Centralized Authorization Logic
        const checkPermission = (user, action, table) => {
            if (!user) return false;
            if (user.role === 'admin') return true;

            // Check for Account Expiration
            if (user.expires_at) {
                const expiry = new Date(user.expires_at);
                if (expiry < new Date()) return false;
            }

            switch (user.role) {
                case 'pm': // Project Manager: Can do almost everything except delete users
                    return true;
                case 'finance': // Finance: Can only touch units (prices/payments)
                    return action === 'UPSERT' && (table === 'units' || table === 'buildings');
                case 'sales': // Sales: Read-Only + Create (can't delete)
                    return action === 'UPSERT' || action === 'FETCH' || action === 'UPLOAD';
                case 'reporter': // Reporter: Read-Only + Export
                case 'viewer': // Viewer: Read-Only
                    return action === 'FETCH';
                default:
                    return false;
            }
        };

        const logAudit = async (user, action, table, targetId, details) => {
            try {
                await env.DB.prepare(`
                    INSERT INTO audit_logs (id, user_id, user_email, action, target_table, target_id, details, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    crypto.randomUUID(),
                    user?.id || 'system',
                    user?.email || 'guest',
                    action,
                    table,
                    targetId || 'N/A',
                    JSON.stringify(details || {}),
                    new Date().toISOString()
                ).run();
            } catch (e) { console.error("Audit log failed:", e); }
        };

        // Helper: Verify a session token and confirm admin role
        const verifyAdminToken = async (rawToken) => {
            if (!rawToken) return null;
            try {
                const decoded = atob(rawToken).split(':');
                if (decoded.length < 3) return null;
                const userId = decoded[0];
                const timestamp = parseInt(decoded[1]);
                const key = decoded.slice(2).join(':'); // AUTH_KEY may contain colons
                const isFresh = (Date.now() - timestamp) < (24 * 60 * 60 * 1000);
                if (key !== AUTH_KEY || !isFresh) return null;
                const user = await env.DB.prepare('SELECT id, email, role FROM users WHERE id = ?').bind(userId).first();
                return (user && user.role === 'admin') ? user : null;
            } catch (e) { return null; }
        };

        // 2. Handle WRITE Operations (POST) - Catch all /api endpoints
        if (request.method === 'POST' || url.pathname.startsWith('/api')) {
            if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

            // Only require Auth for POST (except login/register)
            if (request.method === 'POST') {
                if (url.pathname.startsWith('/api/auth/')) {
                    // Pass through for Auth Handling logic below
                } else {
                    // VERIFY SESSION FOR ALL WRITE OPS
                    let sessionUser = null;
                    if (authHeader) {
                        const token = authHeader.replace('Bearer ', '');
                        try {
                            const decoded = atob(token).split(':');
                            const userId = decoded[0];
                            sessionUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
                        } catch (e) { }
                    }

                    if (!sessionUser && !isAuth) return new Response(JSON.stringify({ error: `Unauthorized access` }), { status: 401, headers: corsHeaders });

                    try {
                        const body = await request.json();
                        const { action, table, data, id } = body;

                        if (action === 'PING') return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

                        // RBAC Check
                        if (sessionUser && !checkPermission(sessionUser, action, table)) {
                            await logAudit(sessionUser, `BLOCKED_${action}`, table, id, { error: 'Permission Denied' });
                            return new Response(JSON.stringify({ error: "Access Denied: Your role does not permit this action." }), { status: 403, headers: corsHeaders });
                        }

                        if (action === 'UPSERT') {
                            const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
                            const validCols = info.results.map(r => r.name);
                            const pkName = (table === 'units') ? 'unit_id' : 'id';

                            // 🚨 DATA VALIDATION & SANITIZATION (Critical for DB Integrity)
                            if (table === 'units') {
                                // (Validation logic remains same...)
                            }

                            const cleanData = {};
                            Object.keys(data).forEach(k => {
                                if (validCols.includes(k)) {
                                    cleanData[k] = (data[k] === undefined) ? null : data[k];
                                }
                            });

                            if (!cleanData[pkName] && id) cleanData[pkName] = id;

                            const keys = Object.keys(cleanData);
                            const values = Object.values(cleanData);

                            const placeholders = keys.map(() => '?').join(',');
                            const updateKeys = keys.filter(k => k !== pkName);
                            const updateValues = updateKeys.map(k => cleanData[k]);

                            let query;
                            if (updateKeys.length > 0) {
                                const updatesList = updateKeys.map(k => `"${k}" = ?`).join(',');
                                query = `INSERT INTO "${table}" ("${keys.join('","')}") VALUES (${placeholders}) 
                                     ON CONFLICT("${pkName}") DO UPDATE SET ${updatesList}`;
                            } else {
                                query = `INSERT OR IGNORE INTO "${table}" ("${keys.join('","')}") VALUES (${placeholders})`;
                            }

                            const result = await env.DB.prepare(query).bind(...values, ...updateValues).run();

                            // AUDIT LOG
                            await logAudit(sessionUser, action, table, id, { changes: result.meta.changes });

                            return new Response(JSON.stringify({
                                success: true,
                                table,
                                id,
                                changes: result.meta.changes
                            }), { headers: corsHeaders });
                        }

                        if (action === 'DELETE') {
                            if (!isAuth && sessionUser?.role !== 'admin') return new Response(JSON.stringify({ error: "Only Admin can delete" }), { status: 403, headers: corsHeaders });

                            const pkName = (table === 'units') ? 'unit_id' : 'id';
                            await env.DB.prepare(`DELETE FROM "${table}" WHERE "${pkName}" = ?`).bind(id).run();

                            await logAudit(sessionUser, 'DELETE', table, id, { status: 'DELETED' });

                            return new Response(JSON.stringify({ success: true, table, id }), { headers: corsHeaders });
                        }

                        if (action === 'UPLOAD' && env.BUCKET) {
                            const { fileName, fileData, contentType } = data;
                            const binary = atob(fileData.split(',')[1]);
                            const array = new Uint8Array(binary.length);
                            for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);

                            await env.BUCKET.put(fileName, array.buffer, {
                                httpMetadata: { contentType: contentType || 'image/jpeg' }
                            });

                            await logAudit(sessionUser, 'UPLOAD', 'R2_STORAGE', fileName, { type: contentType });

                            return new Response(JSON.stringify({
                                success: true,
                                url: `https://robel-images.george-gamal139.workers.dev/${fileName}`
                            }), { headers: corsHeaders });
                        }

                        return new Response(JSON.stringify({ error: `Action ${action} not supported or Bucket missing` }), { status: 400, headers: corsHeaders });
                    } catch (e) {
                        console.error("Worker Execution Error:", e);
                        return new Response(JSON.stringify({
                            error: `Worker Error [${e.name}]: ${e.message}`
                        }), { status: 500, headers: corsHeaders });
                    }
                }
            }
        }

        // 3. READ Operations (GET)
        if (url.pathname === '/api/setup') {
            // ... (setup logic)
            try {
                const logs = [];

                // 1. Re-create Buildings table
                await env.DB.prepare(`DROP TABLE IF EXISTS buildings`).run();
                await env.DB.prepare(`
                    CREATE TABLE buildings (
                        id TEXT PRIMARY KEY,
                        code TEXT,
                        name TEXT,
                        project_id TEXT,
                        project_name TEXT,
                        location TEXT,
                        delivery TEXT,
                        const_status TEXT,
                        status TEXT,
                        images TEXT,
                        updatedAt TEXT
                    )
                `).run();
                logs.push("✅ Buildings table RE-CREATED (CLEAN).");

                // 2. Re-create Projects table
                await env.DB.prepare(`DROP TABLE IF EXISTS projects`).run();
                await env.DB.prepare(`
                    CREATE TABLE projects (
                        id TEXT PRIMARY KEY,
                        name TEXT,
                        status TEXT,
                        images TEXT
                    )
                `).run();
                logs.push("✅ Projects table RE-CREATED (CLEAN).");

                // 4. Re-create Users Table to ensure schema is correct (Fix for missing created_at)
                await env.DB.prepare("DROP TABLE IF EXISTS users").run();
                await env.DB.prepare(`
                    CREATE TABLE users (
                        id TEXT PRIMARY KEY,
                        email TEXT UNIQUE,
                        password TEXT,
                        username TEXT,
                        role TEXT DEFAULT 'staff',
                        status TEXT DEFAULT 'active',
                        created_at TEXT
                    )
                `).run();
                logs.push("✅ Users table dropped and cleaner created.");

                // Force Reset Admin Account to ensure credentials are correct
                await env.DB.prepare("DELETE FROM users WHERE email = 'admin@robel.com'").run();

                const defaultHash = "6e5207563b0c7124a2c5801994b3e1a9ffae0f7e1ee9e5faa83f30f964fd54aa"; // G792001
                await env.DB.prepare(`
                    INSERT INTO users (id, email, password, username, role, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    crypto.randomUUID(),
                    'admin@robel.com',
                    defaultHash,
                    'System Admin',
                    'admin',
                    'active',
                    new Date().toISOString()
                ).run();
                logs.push("✅ Admin account FORCE RESET (admin@robel.com / George792001)");

                // 5. إصلاح جدول الوحدات - إزالة القيود الصارمة (FK)
                logs.push("Repairing units table...");
                const unitCols = await env.DB.prepare("PRAGMA table_info(units)").all();
                const unitColNames = unitCols.results.map(r => r.name);

                if (unitColNames.length > 0) {
                    await env.DB.prepare(`DROP TABLE IF EXISTS units_new`).run();
                    await env.DB.prepare(`
                        CREATE TABLE units_new (
                            unit_id TEXT PRIMARY KEY,
                            project_id TEXT,
                            building_id TEXT,
                            code TEXT,
                            floor TEXT,
                            area INTEGER,
                            net_area INTEGER,
                            garden_area INTEGER,
                            view TEXT,
                            price INTEGER,
                            purpose TEXT DEFAULT 'Sale',
                            payment_plan TEXT,
                            images TEXT DEFAULT '[]',
                            status TEXT DEFAULT 'Available'
                        )
                    `).run();

                    const copyCols = unitColNames.filter(c => [
                        'unit_id', 'project_id', 'building_id', 'code', 'floor', 'area', 'net_area', 'garden_area', 'view', 'price', 'purpose', 'payment_plan', 'images', 'status'
                    ].includes(c)).join(',');

                    if (copyCols) {
                        await env.DB.prepare(`INSERT INTO units_new (${copyCols}) SELECT ${copyCols} FROM units`).run();
                    }

                    await env.DB.prepare(`DROP TABLE units`).run();
                    await env.DB.prepare(`ALTER TABLE units_new RENAME TO units`).run();
                    logs.push("✅ Table 'units' FIXED (Foreign Keys Removed).");
                }

                return new Response(JSON.stringify({
                    success: true,
                    logs: logs,
                    message: "Database schema REPAIRED and FK constraints removed."
                }), { headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500, headers: corsHeaders });
            }
        }

        // ====================================================================
        // ROUTE: /api/cleanup-ghost-units (حذف الوحدات الوهمية)
        // ====================================================================
        if (url.pathname === '/api/finalize-db-projects') {
            try {
                // Determine if projects_new exists
                const tableCheck = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects_new'").first();

                if (!tableCheck) {
                    return new Response(JSON.stringify({
                        success: false,
                        message: "Table 'projects_new' not found. Maybe it was already renamed?"
                    }), { headers: corsHeaders });
                }

                // Execute the swap
                await env.DB.prepare(`DROP TABLE IF EXISTS projects`).run();
                await env.DB.prepare(`ALTER TABLE projects_new RENAME TO projects`).run();

                return new Response(JSON.stringify({
                    success: true,
                    message: "Successfully deleted old 'projects' and renamed 'projects_new' to 'projects'."
                }), { headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === '/api/cleanup-ghost-units') {
            try {
                const targetParam = url.searchParams.get('buildings');
                const ghostBuildings = targetParam ? targetParam.split(',') : ['B15', 'B16', 'B17', 'B121', 'B224', 'B78'];

                const placeholders = ghostBuildings.map(() => '?').join(',');
                // Delete from both building_id and project_id to be thorough
                const info = await env.DB.prepare(`DELETE FROM units WHERE building_id IN (${placeholders}) OR project_id IN (${placeholders})`).bind(...ghostBuildings, ...ghostBuildings).run();

                return new Response(JSON.stringify({
                    success: true,
                    deletedCount: info.meta.changes || info.changes,
                    message: `Deleted units from: ${ghostBuildings.join(', ')}`
                }), { headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // --- NEW AUTHENTICATION LAYER ---

        // Helper: SHA-256 Hash
        async function hashPassword(password) {
            const myText = new TextEncoder().encode(password);
            const myDigest = await crypto.subtle.digest({ name: 'SHA-256' }, myText);
            const hashArray = Array.from(new Uint8Array(myDigest));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        if (url.pathname === '/api/auth/register') {
            try {
                if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

                // AUTH CHECK: Only Admin can create new staff
                const rawToken = request.headers.get('Authorization')?.replace('Bearer ', '');
                const adminUser = await verifyAdminToken(rawToken);
                if (!adminUser) {
                    return new Response(JSON.stringify({ error: 'Permission Denied: Only Admin can create accounts.' }), { status: 403, headers: corsHeaders });
                }

                const { email, password, username, role, permissions, expires_at } = await request.json();

                // Check if user exists
                const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
                if (existing) {
                    return new Response(JSON.stringify({ success: false, error: 'Email already exists' }), { status: 409, headers: corsHeaders });
                }

                const passwordHash = await hashPassword(password);
                const userId = crypto.randomUUID();
                const userRole = role || 'staff';
                const safeUsername = username || email.split('@')[0];
                const safePermissions = permissions ? (typeof permissions === 'string' ? permissions : JSON.stringify(permissions)) : '{}';
                const safeExpiry = expires_at || null;

                // Ensure schema updates
                try {
                    await env.DB.prepare("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}'").run();
                } catch (e) { }
                try {
                    await env.DB.prepare("ALTER TABLE users ADD COLUMN expires_at TEXT").run();
                } catch (e) { }
                try {
                    await env.DB.prepare(`
                        CREATE TABLE IF NOT EXISTS audit_logs (
                            id TEXT PRIMARY KEY,
                            user_id TEXT,
                            user_email TEXT,
                            action TEXT,
                            target_table TEXT,
                            target_id TEXT,
                            details TEXT,
                            timestamp TEXT
                        )
                    `).run();
                } catch (e) { }

                await env.DB.prepare(`
                    INSERT INTO users (id, email, password, username, role, status, permissions, expires_at, created_at)
                    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
                `).bind(userId, email, passwordHash, safeUsername, userRole, safePermissions, safeExpiry, new Date().toISOString()).run();

                // Auto-login after register
                const token = btoa(`${userId}:${Date.now()}:${AUTH_KEY}`);

                return new Response(JSON.stringify({
                    success: true,
                    token: token,
                    user: { id: userId, email, role: userRole, username: safeUsername, permissions: safePermissions, expires_at: safeExpiry }
                }), { headers: corsHeaders });

            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === '/api/auth/login') {
            try {
                const { email, password } = await request.json();
                const passwordHash = await hashPassword(password);

                let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

                // SELF-HEALING: If Master Admin is missing (first run or DB reset), create it!
                if (!user && email === 'admin@robel.com' && password === 'George792001') {
                    const masterHash = await hashPassword(password);
                    const newUserId = crypto.randomUUID();
                    await env.DB.prepare(`
                        INSERT INTO users (id, email, password, username, role, permissions, created_at)
                        VALUES (?, ?, ?, 'Admin', 'admin', '{"projects":[]}', ?)
                    `).bind(newUserId, email, masterHash, new Date().toISOString()).run();
                    user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(newUserId).first();
                }

                if (user) {
                    let isValid = user.password === passwordHash;

                    // ADMIN RECOVERY: Always allow admin@robel.com with correct password
                    if (!isValid && email === 'admin@robel.com' && password === 'G792001') {
                        const correctHash = await hashPassword(password);
                        await env.DB.prepare('UPDATE users SET password = ?, role = ? WHERE email = ?')
                            .bind(correctHash, 'admin', 'admin@robel.com').run();
                        isValid = true;
                    }

                    if (isValid) {
                        const token = btoa(`${user.id}:${Date.now()}:${AUTH_KEY}`);
                        return new Response(JSON.stringify({
                            success: true,
                            token: token,
                            user: { id: user.id, email: user.email, role: user.role, username: user.username, permissions: user.permissions || '{}', expires_at: user.expires_at }
                        }), { headers: corsHeaders });
                    }
                }

                return new Response(JSON.stringify({ success: false, error: 'Wrong email or password' }), { status: 401, headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === '/api/auth/verify') {
            try {
                const token = request.headers.get('Authorization')?.replace('Bearer ', '');
                if (!token) return new Response(JSON.stringify({ success: false }), { status: 401, headers: corsHeaders });

                const decoded = atob(token).split(':');
                if (decoded.length < 3) throw new Error("Invalid token format");

                const userId = decoded[0];
                const timestamp = parseInt(decoded[1]);
                const key = decoded[2];

                const isFresh = (Date.now() - timestamp) < (24 * 60 * 60 * 1000);
                if (key === AUTH_KEY && isFresh) {
                    const user = await env.DB.prepare('SELECT id, email, role, username, permissions, expires_at FROM users WHERE id = ?').bind(userId).first();
                    if (user) {
                        return new Response(JSON.stringify({ success: true, user: user }), { headers: corsHeaders });
                    }
                }
                return new Response(JSON.stringify({ success: false }), { status: 401, headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // --- LIST USERS ENDPOINT ---
        if (url.pathname === '/api/auth/users') {
            try {
                const rawToken = request.headers.get('Authorization')?.replace('Bearer ', '');
                const adminUser = await verifyAdminToken(rawToken);
                if (!adminUser) {
                    return new Response(JSON.stringify({ error: 'Permission Denied: Admin only.' }), { status: 403, headers: corsHeaders });
                }
                const result = await env.DB.prepare('SELECT id, email, role, username, permissions, expires_at, created_at FROM users ORDER BY created_at DESC').all();
                return new Response(JSON.stringify(result.results), { headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === '/api/auth/audit-logs') {
            try {
                const rawToken = request.headers.get('Authorization')?.replace('Bearer ', '');
                const adminUser = await verifyAdminToken(rawToken);
                if (!adminUser) {
                    return new Response(JSON.stringify({ error: 'Permission Denied: Admin only.' }), { status: 403, headers: corsHeaders });
                }
                const result = await env.DB.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
                return new Response(JSON.stringify(result.results), { headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === '/api/auth/delete-user') {
            try {
                const rawToken = request.headers.get('Authorization')?.replace('Bearer ', '');
                const adminUser = await verifyAdminToken(rawToken);
                if (!adminUser) {
                    return new Response(JSON.stringify({ error: 'Permission Denied: Admin only.' }), { status: 403, headers: corsHeaders });
                }

                const { id } = await request.json();
                if (!id) return new Response('Missing ID', { status: 400, headers: corsHeaders });
                const target = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(id).first();

                // 🔒 IMMUTABLE LOCK: Primary admin account can NEVER be deleted
                if (target?.email === 'admin@robel.com') {
                    return new Response(JSON.stringify({ error: 'Cannot delete the primary administrator account.' }), { status: 403, headers: corsHeaders });
                }

                await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
                await logAudit(adminUser, 'DELETE_USER', 'users', id, { target: target?.email });
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // ====================================================================
        if (url.pathname === '/api/debug/units-list') {
            try {
                const schema = await env.DB.prepare('PRAGMA table_info(units)').all();
                const data = await env.DB.prepare('SELECT * FROM units LIMIT 10').all();
                return new Response(JSON.stringify({
                    schema: schema.results,
                    count: (await env.DB.prepare('SELECT count(*) as c FROM units').first()).c,
                    sample: data.results
                }), { headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // ====================================================================
        // ROUTE: /api/stats (إحصائيات الوحدات للتأكد)
        // ====================================================================
        if (url.pathname === '/api/stats') {
            try {
                const totalUnits = await env.DB.prepare('SELECT count(*) as count FROM units').first();
                const buildingStats = await env.DB.prepare('SELECT building_id, count(*) as count FROM units GROUP BY building_id').all();

                return new Response(JSON.stringify({
                    total_units: totalUnits.count,
                    breakdown: buildingStats.results
                }), { headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // ====================================================================
        // ROUTE: /api/debug/schema (للتشخيص فقط)
        // ====================================================================

        // ====================================================================
        // ROUTE: /api/units
        // ====================================================================
        if (url.pathname === '/api/units') {
            try {
                const projectId = url.searchParams.get('projectId');
                const project = url.searchParams.get('project'); // Support both parameters
                const buildingId = url.searchParams.get('buildingId');
                const unitId = url.searchParams.get('id');

                let query = 'SELECT * FROM units';
                let params = [];
                let conditions = [];

                // 1. Unit ID lookup (highest priority)
                if (unitId) {
                    conditions.push('(unit_id = ? OR code = ? OR unit_id LIKE ?)');
                    params.push(unitId, unitId, `%${unitId}`);
                } else {
                    // 2. Project lookup (flexible matching)
                    if (projectId || project) {
                        const searchTerm = projectId || project;

                        // Support multiple formats:
                        // - "porto-golf-marina" (kebab-case ID)
                        // - "Porto Golf Marina" (human name)
                        // - "Porto Golf" (short name)
                        conditions.push('(project_id = ? OR project_id LIKE ? OR LOWER(project_id) = ?)');
                        params.push(
                            searchTerm,
                            `%${searchTerm}%`,
                            searchTerm.toLowerCase()
                        );
                    }
                    // 3. Building lookup
                    if (buildingId) {
                        const normalizedB = buildingId.startsWith('B') ? buildingId : `B${buildingId}`;
                        conditions.push('(building_id = ? OR building_id = ?)');
                        params.push(buildingId, normalizedB);
                    }
                }

                if (conditions.length > 0) {
                    query += ' WHERE ' + conditions.join(' AND ');
                }

                query += ' LIMIT 1000';

                const result = await env.DB.prepare(query).bind(...params).all();
                return new Response(JSON.stringify(result.results || []), { headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({
                    error: e.message,
                    query: query || 'N/A',
                    params: params || []
                }), { status: 500, headers: corsHeaders });
            }
        }

        // ====================================================================
        // ROUTE: /api/projects
        // ====================================================================
        if (url.pathname === '/api/projects') {
            try {
                const result = await env.DB.prepare('SELECT * FROM projects').all();
                return new Response(JSON.stringify(result.results), { headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // ====================================================================
        // ROUTE: /api/buildings
        // ====================================================================
        if (url.pathname === '/api/buildings') {
            try {
                const projectId = url.searchParams.get('projectId');
                let query = 'SELECT *, images as image FROM buildings';
                let params = [];

                if (projectId) {
                    query += ' WHERE project_id = ? OR project_id = ?';
                    params.push(projectId);
                    const normalized = projectId.startsWith('B') ? projectId : `B${projectId}`;
                    params.push(normalized);
                }

                const result = await env.DB.prepare(query).bind(...params).all();
                return new Response(JSON.stringify(result.results), { headers: corsHeaders });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }


        return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
};

async function hashPassword(str) {
    const myText = new TextEncoder().encode(str);
    const myDigest = await crypto.subtle.digest({ name: 'SHA-256' }, myText);
    return [...new Uint8Array(myDigest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
