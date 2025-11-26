// @version 2.1.340
/**
 * TooLoo.ai Dynamic Version Synchronizer
 * Fetches the active system version from the API and updates the UI.
 */
(async function syncVersion() {
    try {
        const API_BASE = window.location.origin;
        const res = await fetch(`${API_BASE}/api/v1/system/status`);
        const payload = await res.json();
        
        // Handle StandardResponse wrapper
        const version = payload.version || (payload.data && payload.data.version) || 'Unknown';
        
        // Update all elements with class 'system-version'
        document.querySelectorAll('.system-version').forEach(el => {
            el.textContent = `v${version}`;
        });

        // Update specific ID if exists
        const idEl = document.getElementById('systemVersion');
        if (idEl) idEl.textContent = `v${version}`;

        console.log(`[System] Version synchronized: ${version}`);
    } catch (e) {
        console.warn('[System] Failed to sync version:', e);
    }
})();
