# Robel Real Estate Portal - Enterprise Next.js + Cloudflare Stack

## 🏗 Architecture (Secure Edge-first)

This system follows a strict **Next.js → Worker API → D1 Database** pattern for maximum security and scalability.

- **Frontend**: Next.js 14+ (App Router) on Cloudflare Pages (Edge Runtime enabled).
- **API Layer**: Cloudflare Workers with Zod Validation & Rate Limiting.
- **Database**: Cloudflare D1 (Global SQL).
- **Storage**: Cloudflare R2 (Object Storage).

---

## 🚀 Quick Start (Production Ready)

1.  **Install Dependencies**:
    ```bash
    cd robel-next-portal
    npm install
    ```

2.  **Environment Setup**:
    *   Copy `.env.example` to `.env.local`:
        ```bash
        cp .env.example .env.local
        ```
    *   Set your `API_KEY` to a secure string.

3.  **Run Development**:
    *   Start the API Worker (Port 8787):
        ```bash
        npm run worker:dev
        ```
    *   Start Next.js (Port 3000):
        ```bash
        npm run dev
        ```

---

## 🔐 Security Features

1.  **Strict Layer Separation**: Next.js *never* talks to D1 directly. It must go through the Worker API.
2.  **API Key Authentication**: All mutation requests (POST/PUT/DELETE) require a `Bearer` token.
3.  **Zod Schema Validation**: All incoming requests are validated against strict Zod schemas before processing.
4.  **CORS & Headers**: Strict Access-Control implementation.

---

## 🛠 Database Setup

1.  **Initialize D1**:
    ```bash
    npx wrangler d1 create robel-db
    npx wrangler d1 execute robel-db --file=./schema.sql
    ```

2.  **Bind in `wrangler.toml`**:
    Update the `[[d1_databases]]` section with your new ID.

---

## 📂 Key Files

*   `worker/index.ts`: The central API logic (Validation, Auth, D1 Access).
*   `lib/db.ts`: Type-safe SDK for fetching data from the Worker.
*   `app/projects/[slug]/page.tsx`: Edge-rendered dynamic pages with Metadata API.
