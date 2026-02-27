(async ()=>{
  const WORKER_URL = 'https://robel-api.george-gamal139.workers.dev/api/units';
  const AUTH_KEY = 'ROBEL_SECURE_SYNC_2025';
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
      body: JSON.stringify({ action: 'WIPE_UNITS', table: 'units' })
    });
    const txt = await res.text();
    console.log('status', res.status, 'body:', txt);
  } catch (e) {
    console.error('error', e.message);
    process.exit(1);
  }
})();
