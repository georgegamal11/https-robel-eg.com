# Database Connection & "0 Units" Fix

We have implemented a robust fix for the issue where the website sometimes shows "0 Units" or fails to connect to the database on certain devices.

## The Fix Details

1.  **Smart Retry Logic**: 
    - The website now attempts to connect to the database as usual.
    - If it detects "0 units" or a connection failure, it **automatically retries** the connection with a "Force Refresh" command.
    - This bypasses any stale or broken cache that might be stored on the user's device.

2.  **Cache Busting**:
    - We added a unique timestamp to the retried requests (e.g., `?_t=123456789`) to ensure the browser and network do not serve old, empty data.

3.  **Visible Error Message**:
    - If, after retrying, the connection still fails (e.g., due to no internet), a **visible red toast message** will appear at the bottom right of the screen.
    - This message includes a "Retry" button so the user can try again easily.

4.  **Admin Priority**:
    - Admin users always bypass the cache to ensure they see the latest data.

## How to Verify

1.  **Clear Cache**: On the device that was showing "0 units", try clearing the browser cache or opening the site in Incognito/Private mode.
2.  **Check Console**: If you are technical, open the browser console (F12). You should see logs like:
    - `⚠️ Initial sync returned 0 units. Retrying with FORCE REFRESH...` (if the first attempt fails)
    - `✅ [AvailableUnits] Retry succesful...` (if the second attempt works)
3.  **Test Network**: Try turning off your WiFi and refreshing the page to see the new error message toast.

## Deployment

You need to redeploy the frontend to Cloudflare Pages for these changes to take effect.
Run your deployment script (e.g., `deploy_frontend.bat` or `npm run deploy`).
