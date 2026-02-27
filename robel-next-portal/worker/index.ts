import { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { z } from 'zod';

export interface Env {
    DB: D1Database;
    R2: R2Bucket;
    ALLOWED_ORIGIN: string; // e.g., "https://robel-eg.com"
    JWT_SECRET: string;     // For verifying admin sessions
}

// Validation Schema for Filters
const FilterSchema = z.object({
    min_price: z.string().optional().transform((val) => val ? Number(val) : undefined),
    bedrooms: z.string().optional().transform((val) => val ? Number(val) : undefined),
    limit: z.string().optional().default('50').transform(Number),
});

// Helper: Standardized API Response
const jsonResponse = (data: any, status = 200, headers: HeadersInit = {}) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
    });
};

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin');

        // 0. Environment Check (Fallback for Dev)
        // In production, ALLOWED_ORIGIN must be set.
        const allowedOrigin = env.ALLOWED_ORIGIN || 'http://localhost:3000';
        const isAllowedOrigin = origin === allowedOrigin || origin === 'http://localhost:3000';

        // 1. Strict CORS & Origin Enforcement
        // If we have an origin (browser request) and it's not allowed, BLOCK IT.
        if (origin && !isAllowedOrigin) {
            return new Response('Forbidden: Invalid Origin', { status: 403 });
        }

        // CORS Headers Helper
        const corsHeaders = {
            'Access-Control-Allow-Origin': isAllowedOrigin && origin ? origin : '',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Cookie',
            'Access-Control-Allow-Credentials': 'true',
        };

        // 2. CORS Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // 3. Security Middleware
        // Public routes: GET /api/units (Listings), GET /api/projects (Details)
        // Protected routes: POST /api/upload, POST /api/units (Create)
        const isPublicRead = request.method === 'GET' && (url.pathname.startsWith('/api/units') || url.pathname.startsWith('/api/projects'));

        // 4. Auth: Login (POST /api/login)
        // Generates HttpOnly Cookie for subsequent requests
        if (url.pathname === '/api/login' && request.method === 'POST') {
            try {
                const body = await request.json() as { email?: string; password?: string };
                if (!body.email || !body.password) {
                    return jsonResponse({ error: 'Missing credentials' }, 400, corsHeaders);
                }

                // TODO: In Production, replace with real D1 query:
                // const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(body.email).first();
                // if (!user || !verifyPassword(body.password, user.password_hash)) ...

                // Mock Admin Check
                if (body.email === 'admin@robel-eg.com' && body.password === 'admin123') {
                    const { createSession } = await import('./auth');
                    const token = await createSession('admin-user-id', 'admin', env);

                    const headers = new Headers(corsHeaders);
                    headers.append('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`);

                    return jsonResponse({ success: true, role: 'admin' }, 200, headers);
                }

                return jsonResponse({ error: 'Invalid credentials' }, 401, corsHeaders);
            } catch (err) {
                return jsonResponse({ error: 'Login failed' }, 500, corsHeaders);
            }
        }

        // 5. Protected Admin Routes (Mutations)
        // All POST/PUT/DELETE requests fall here if not handled above (like login/upload)
        const isMutation = ['POST', 'PUT', 'DELETE'].includes(request.method);
        if (isMutation && !isPublicRead) { // Only apply to non-public reads
            const { verifySession, getCookie } = await import('./auth');
            const token = getCookie(request, 'auth_token');

            if (!token) {
                return jsonResponse({ error: 'Unauthorized: No Session' }, 401, corsHeaders);
            }

            const session = await verifySession(token, env);
            if (!session || session.role !== 'admin') {
                // Invalid or Expired Token
                return jsonResponse({ error: 'Forbidden: Admin Role Required' }, 403, corsHeaders);
            }
        }

        // 6. Route: GET /api/units - Public Listing Endpoint
        if (url.pathname === '/api/units' && request.method === 'GET') {
            try {
                const params = Object.fromEntries(url.searchParams);
                const filters = FilterSchema.parse(params);

                let query = 'SELECT * FROM units WHERE status = ?';
                const queryParams: any[] = ['available'];

                if (filters.min_price !== undefined) {
                    query += ' AND price >= ?';
                    queryParams.push(filters.min_price);
                }
                if (filters.bedrooms !== undefined) {
                    query += ' AND bedrooms >= ?';
                    queryParams.push(filters.bedrooms);
                }

                query += ' ORDER BY created_at DESC LIMIT ?';
                queryParams.push(filters.limit);

                const { results } = await env.DB.prepare(query).bind(...queryParams).all();

                return jsonResponse({
                    success: true,
                    data: results,
                    count: results.length
                }, 200, corsHeaders);

            } catch (err) {
                if (err instanceof z.ZodError) {
                    return jsonResponse({ error: 'Validation Error', details: err.errors }, 400, corsHeaders);
                }
                console.error('Worker Error:', err);
                return jsonResponse({ error: 'Internal Server Error' }, 500, corsHeaders);
            }
        }

        // 5. Route: POST /api/upload - Secure Upload Endpoint (Protected by check above)
        if (url.pathname === '/api/upload' && request.method === 'POST') {
            try {
                const formData = await request.formData();
                const file = formData.get('file') as File;

                if (!file) return jsonResponse({ error: 'No file provided' }, 400, corsHeaders);

                const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
                const key = `uploads/${Date.now()}-${safeName}`;

                await env.R2.put(key, file.stream(), {
                    httpMetadata: { contentType: file.type },
                });

                return jsonResponse({
                    success: true,
                    url: `https://r2.robel-eg.com/${key}`,
                    key: key
                }, 200, corsHeaders);

            } catch (err) {
                console.error('Upload Error:', err);
                return jsonResponse({ error: 'Upload Failed' }, 500, corsHeaders);
            }
        }

        return jsonResponse({ error: 'Endpoint Not Found' }, 404, corsHeaders);
    },
};
