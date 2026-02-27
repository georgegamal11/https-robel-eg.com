import { SignJWT, jwtVerify } from 'jose';
import { Env } from './index';

const ALG = 'HS256';

export async function createSession(userId: string, role: string, env: Env): Promise<string> {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    return await new SignJWT({ sub: userId, role })
        .setProtectedHeader({ alg: ALG })
        .setIssuedAt()
        .setExpirationTime('24h') // Session lasts 24 hours
        .sign(secret);
}

export async function verifySession(token: string, env: Env) {
    try {
        const secret = new TextEncoder().encode(env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        return payload; // Returns { sub: userId, role: 'admin' }
    } catch (err) {
        return null;
    }
}

export function getCookie(request: Request, name: string): string | null {
    const cookieString = request.headers.get('Cookie');
    if (!cookieString) return null;
    const cookies = cookieString.split(';');
    for (const cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) return value;
    }
    return null;
}
