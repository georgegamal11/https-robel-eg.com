// lib/db.ts
// Secure Client: No API Keys. Uses Origin-based access.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export type Project = {
  id: string;
  slug: string;
  name: string;
  description: string;
  hero_image: string;
  features: string[];
  status: 'active' | 'sold_out' | 'coming_soon';
};

export type Unit = {
  id: string;
  unit_code: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms: number;
  status: 'available' | 'reserved' | 'sold';
  images: string[];
};

// Next.js -> Worker API (Origin Secured)
export async function getUnits(filters?: Record<string, string>): Promise<Unit[]> {
  try {
    const query = new URLSearchParams(filters).toString();

    // Notice: NO Authorization header.
    // The browser automatically attaches 'Origin'.
    // The Worker checks if 'Origin' matches 'robel-eg.com'.
    const res = await fetch(`${API_URL}/api/units?${query}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 } // ISR
    });

    if (!res.ok) {
      console.error('API Error:', await res.text());
      return [];
    }

    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Fetch Error:', err);
    return [];
  }
}

// Admin Actions (Require Auth) would be handled in a separate admin-api.ts
// using generic fetch that relies on HttpOnly cookies provided by login.
