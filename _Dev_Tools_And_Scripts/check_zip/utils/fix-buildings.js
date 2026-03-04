/**
 * Fix Missing Buildings Issue
 * 
 * This script fixes the issue where buildings disappear after refresh
 * by clearing corrupted localStorage data.
 */

(function () {
    console.log('🔍 Checking for corrupted building data...');

    const metadata = localStorage.getItem('robelProjectMetadata');

    if (metadata) {
        try {
            const parsed = JSON.parse(metadata);
            const deletedBuildings = Object.keys(parsed).filter(key => parsed[key].deleted);
            // This logic was incorrectly resetting the app when users intentionally deleted buildings.
            // We now allow deleted flags to persist in localStorage for soft-deletion.
            console.log('✅ Metadata loaded. Projects with local changes:', Object.keys(parsed).length);
        } catch (e) {
            console.error('❌ Error parsing localStorage:', e);
            // If data is corrupted, clear it
            localStorage.removeItem('robelProjectMetadata');
            localStorage.removeItem('robelInventory');
            localStorage.removeItem('robelAreaMetadata');
            window.location.reload();
        }
    } else {
        console.log('✅ No cached metadata found. Loading fresh data.');
    }
})();
