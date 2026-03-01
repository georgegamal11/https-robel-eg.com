# 🚨 Troubleshooting Guide - Common Issues & Solutions

## Quick Navigation
- [Connection Issues](#connection-issues)
- [Data Issues](#data-issues)
- [Deployment Issues](#deployment-issues)
- [Browser Issues](#browser-issues)
- [Authentication Issues](#authentication-issues)

---

## Connection Issues

### ❌ Error: "Failed to fetch" or "Network request failed"

**Symptoms:**
- `GET /api/projects 0` in console
- No data showing on website
- API test page shows ❌

**Solutions:**
```bash
# 1. Check if Worker is deployed
npm run deploy

# 2. Wait 2-3 minutes for Cloudflare to propagate

# 3. Test direct connection
curl https://robel-api.george-gamal139.workers.dev/api/projects

# 4. If still failing, check:
# - Internet connection
# - Firewall/VPN blocking
# - Worker account status
```

**More Help:**
- Is your wrangler authenticated? Run `wrangler login`
- Did deployment complete? Look for "SUCCESS" message
- Try opening the Worker URL in new incognito tab

---

### ❌ Error: "CORS policy blocked"

**Symptoms:**
- Error includes "Access-Control-Allow-Origin"
- Works on some browsers but not others
- Mobile version doesn't work

**Solutions:**
```bash
# 1. The Worker already has CORS headers, but verify:
# In src/worker.js, check this exists:
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
};

# 2. Clear browser cache
# Press Ctrl+Shift+Delete

# 3. Try different browser

# 4. Check if it's a proxy/VPN issue
```

---

### ❌ Error: "Timeout"

**Symptoms:**
- Request takes 30+ seconds then fails
- Sometimes works, sometimes doesn't
- Happens to some users but not others

**Solutions:**
```bash
# 1. Check database isn't empty
npm run seed-database

# 2. Check api/stats for data volume
curl https://robel-api.george-gamal139.workers.dev/api/stats

# 3. If database is huge, queries might timeout
# Contact Cloudflare support for D1 optimization

# 4. Try clearing browser cache
```

---

## Data Issues

### ❌ Problem: "Website shows 0 projects/buildings/units"

**Symptoms:**
- Website loads but is empty
- test-connection.html shows no data
- API endpoints return empty arrays

**Solutions:**
```bash
# 1. Load the initial data
npm run seed-database

# 2. Verify data was loaded
curl https://robel-api.george-gamal139.workers.dev/api/stats

# 3. Clear browser storage
# Open DevTools (F12)
# Go to Application → Storage → Local Storage
# Click "Clear Site Data"

# 4. Hard refresh browser
# Press Ctrl+Shift+R (hard refresh)

# 5. If still empty, check seed_data.sql exists
# File: seed_data.sql (in root directory)
```

---

### ❌ Problem: "Only some projects show"

**Symptoms:**
- Maybe 1-2 projects show but not all 3
- Some buildings missing
- Some units missing completely

**Solutions:**
```bash
# 1. Re-seed the database
npm run seed-database

# 2. Check for conflicts in the data
curl https://robel-api.george-gamal139.workers.dev/api/stats

# 3. Clear and reload everything
# A. Backup your custom data (if any)
# B. npm run seed-database
# C. Clear browser cache (Ctrl+Shift+Delete)
# D. Hard refresh (Ctrl+Shift+R)
```

---

### ❌ Problem: "Data loaded but images don't show"

**Symptoms:**
- Text appears but images are broken
- Image paths show 404 errors
- Some images work, some don't

**Solutions:**
```bash
# 1. Check image paths are correct
# Images should be in: public/assets/images/
# Check paths in seed_data.sql match

# 2. Verify image files exist
cd public/assets/images
ls -la  # (Mac/Linux) or dir (Windows)

# 3. Check for special characters in filenames
# Arabic filenames might cause issues

# 4. Try serving from https instead of http
# if images don't load on HTTPS

# 5. Check browser console (F12)
# Look for 404 errors for image paths
```

---

## Deployment Issues

### ❌ Error: "wrangler not found" or "npm: command not found"

**Symptoms:**
- `npm: command not found`
- `wrangler: command not found`
- Commands don't run at all

**Solutions:**
```bash
# 1. Install Node.js if not installed
# Download from https://nodejs.org/
# Install latest LTS version

# 2. Verify installation
node --version
npm --version

# 3. Install Wrangler globally
npm install -g wrangler

# 4. Now try commands again
npm run deploy
```

---

### ❌ Error: "Authentication failed" during `npm run deploy`

**Symptoms:**
- Error message mentions "401" or "unauthorized"
- "Invalid token" or "not authenticated"
- Deployment fails immediately

**Solutions:**
```bash
# 1. Login to Cloudflare
wrangler login

# 2. Follow the browser login flow
# Browser window will open, complete login

# 3. Return to terminal and try again
wrangler deploy

# 4. If still issues, logout and login again
wrangler logout
wrangler login

# 5. Check account is active on Cloudflare.com
```

---

### ❌ Error: "Database binding not found"

**Symptoms:**
- Error mentions "DB is not defined"
- "Binding for 'DB' not found"
- Worker won't start

**Solutions:**
```bash
# 1. Check wrangler.toml has correct config
# Should contain:
[[d1_databases]]
binding = "DB"
database_name = "robel"
database_id = "b09c934f-5980-425f-bcdf-201f0157939a"

# 2. Check file syntax (no typos)
# Verify exact capitalization: "DB" not "db"

# 3. Redeploy Worker
npm run deploy

# 4. If still failing, check Cloudflare dashboard
# https://dash.cloudflare.com/
# D1 → robel database → verify binding
```

---

## Browser Issues

### ❌ Problem: "Data only shows on first visit, then disappears"

**Symptoms:**
- Works great first time
- Refresh page = empty
- Service worker/cache issue

**Solutions:**
```bash
# 1. Clear all browser storage
# Press Ctrl+Shift+Delete
# Check "Cookies and other site data"
# Check "Cached images and files"

# 2. Disable Service Worker (temporary)
# Chrome DevTools:
# Application → Service Workers → Unregister

# 3. Clear Service Worker cache
# Chrome DevTools:
# Application → Cache Storage → Delete all

# 4. Use Incognito/Private mode to test
# Fresh browser session without cache
```

---

### ❌ Problem: "Works on Chrome but not Firefox/Safari"

**Symptoms:**
- Different browsers different results
- Specific browser always fails
- Inconsistent behavior

**Solutions:**
```bash
# 1. Check for console errors (F12)
# Each browser has different error details

# 2. Clear that browser's cache
# Chrome: Settings → Privacy → Clear Data
# Firefox: Preferences → Privacy → Clear Data
# Safari: Develop → Empty Caches

# 3. Disable browser extensions
# Some ad-blockers block API calls
# Try Incognito mode

# 4. Check JavaScript is enabled
# Some browsers have JS disabled per-site

# 5. Test API directly in that browser
# https://robel-api.george-gamal139.workers.dev/api/projects
# Should return JSON
```

---

### ❌ Problem: "Mobile website shows no data"

**Symptoms:**
- Desktop works fine
- Mobile completely empty
- Responsive design broken

**Solutions:**
```bash
# 1. Check mobile viewport
# Add to <head> in index.html:
<meta name="viewport" content="width=device-width, initial-scale=1.0">
# (Should already be there)

# 2. Clear mobile browser cache
# Chrome Mobile: Settings → Privacy → Delete Data
# Safari iOS: Settings → Safari → Clear History

# 3. Test on mobile with DevTools emulation
# Chrome: F12 → Device Toolbar (Ctrl+Shift+M)

# 4. Check for mobile-specific storage
# localStorage might have old data
# Use test-connection.html on mobile

# 5. Test on mobile hotspot
# Not WiFi - to rule out network issues
```

---

## Authentication Issues

### ❌ Error: "Auth failed" when posting data

**Symptoms:**
- Error 401 when adding data
- "Authorization failed"
- Admin features don't work

**Solutions:**
```bash
# 1. Verify AUTH_KEY is correct
# Should be: "ROBEL_SECURE_SYNC_2025"
# Check in:
# - public/firebase/firebase-queries.js
# - src/worker.js
# - Match exactly (case-sensitive)

# 2. Check Bearer token format
# Should be: "Bearer ROBEL_SECURE_SYNC_2025"
# Not: "ROBEL_SECURE_SYNC_2025" (missing "Bearer ")

# 3. Verify header is being sent
# Open DevTools (F12) → Network
# Click the failed request
# Check "Request Headers"
# Should see: Authorization: Bearer ROBEL_SECURE_SYNC_2025

# 4. Check for whitespace
# Sometimes copy-paste adds extra spaces
# AUTH_KEY = "ROBEL_SECURE_SYNC_2025" (no spaces)
```

---

### ❌ Error: "Token expired"

**Symptoms:**
- Sometimes works, then fails
- Error mentions "token" or "session"
- Happens after 24 hours

**Solutions:**
```bash
# 1. Clear authentication storage
# localStorage.removeItem('userToken')
# Run in browser console (F12)

# 2. Log out and log back in
# Admin dashboard: Click logout
# Log in again

# 3. Close and reopen browser
# Session tokens are temporary

# 4. Note: Tokens expire after 24 hours
# This is normal and expected
# New login generates new token
```

---

## Debug Checklist

Use this when nothing works:

- [ ] Open DevTools (F12)
- [ ] Go to Console tab
- [ ] Look for red error messages
- [ ] Check Network tab for failed requests
- [ ] Open test-connection.html
- [ ] Run each test and note results
- [ ] Try different browser
- [ ] Clear cache (Ctrl+Shift+Delete)
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Check internet connection
- [ ] Run `npm run seed-database` again
- [ ] Run `npm run deploy` again

---

## Advanced Troubleshooting

### Database is corrupted

```bash
# 1. Backup current data
# (If you have custom data, save it)

# 2. Wipe database
curl -X POST "https://robel-api.george-gamal139.workers.dev/api/wipe-units" \
  -H "Authorization: Bearer ROBEL_SECURE_SYNC_2025" \
  -H "Content-Type: application/json"

# 3. Reload initial data
npm run seed-database

# 4. Verify
curl https://robel-api.george-gamal139.workers.dev/api/stats
```

### Worker is slow/timing out

```bash
# 1. Check database size
curl https://robel-api.george-gamal139.workers.dev/api/stats

# 2. Optimize queries in worker.js
# Add LIMIT clauses
# Use indexes on frequently queried columns

# 3. Enable caching in firebase-queries.js
# Already implemented (2 hour TTL)

# 4. Contact Cloudflare support
# For D1 performance optimization
```

### Some endpoints return 404

```bash
# 1. Check Worker was deployed
npm run deploy

# 2. Verify endpoint name is correct
# /api/projects (not /projects)
# /api/buildings (not /buildings)

# 3. Check wrangler.toml has correct main file
main = "src/worker.js"

# 4. Redeploy everything
npm run deploy
```

---

## Getting More Help

If you still can't find the solution:

1. **Check error message carefully**
   - Screenshot it
   - Google the exact error message
   - Check Cloudflare docs

2. **Use test-connection.html**
   - Shows exactly what's failing
   - Test each component separately

3. **Check logs**
   - Browser Console (F12)
   - Network tab (what's being sent/received)
   - Cloudflare Dashboard logs

4. **Atomic testing**
   - Test each part independently
   - Does API respond?
   - Does Worker deploy?
   - Does database have data?

5. **Documentation**
   - [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
   - [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
   - This repository docs (SOLUTION_GUIDE_AR.md, etc.)

---

## Tips & Tricks

### See exactly what's being sent/received
```bash
# In worker.js, add logging:
console.log("Received request:", request.url);
console.log("Query:", query);
console.log("Response:", result);

# Run `npm run deploy` and check Cloudflare dashboard logs
```

### Test API without browser
```bash
# Get projects
curl https://robel-api.george-gamal139.workers.dev/api/projects | json_pp

# Get buildings
curl "https://robel-api.george-gamal139.workers.dev/api/buildings?projectId=porto-golf-marina" | json_pp

# Test auth
curl -X POST https://robel-api.george-gamal139.workers.dev/api \
  -H "Authorization: Bearer ROBEL_SECURE_SYNC_2025" \
  -H "Content-Type: application/json" \
  -d '{"action":"PING"}'
```

### Test locally before deploying
```bash
# Use wrangler dev to test locally
wrangler dev

# Website will run on http://localhost:8787
# Any changes auto-reload
```

---

## Common Mistakes to Avoid

❌ **Don't:**
- Change CLOUDFLARE_WORKER_URL to random address
- Delete seed_data.sql
- Change AUTH_KEY without updating everywhere
- Commit database credentials to GitHub
- Don't use `const` for shared variables (use `window.`)

✅ **Do:**
- Use test-connection.html to diagnose
- Clear cache between tests
- Check exact error messages
- Verify file paths
- Test with curl first

---

**Still stuck? Check the detailed guides:**
- 🇸🇦 Arabic: `SOLUTION_GUIDE_AR.md`
- 🇬🇧 English: `README_FIXES.md`
- ⚡ Quick: `QUICK_START.md`

---

**Last Updated:** February 9, 2025
