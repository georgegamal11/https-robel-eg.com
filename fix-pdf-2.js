const fs = require('fs');
const file = 'public/scripts/admin/admin-export.js';
let content = fs.readFileSync(file, 'utf8');

const tStr = '    const uniquePlans = new Set();';
const targetIndex = content.indexOf(tStr);

if (targetIndex === -1) {
    console.error("Could not find uniquePlans");
    process.exit(1);
}

// Find 'async function exportToPDF' but that was deleted!
// Look for '/**\r\n        const domLogo'
const startIdx = content.indexOf("/**\r\n        const domLogo");
const fallbackIdx = content.indexOf("/**\n        const domLogo");

const actualStart = startIdx > -1 ? startIdx : fallbackIdx;

if (actualStart === -1) {
    console.error("Could not find start boundary");
    process.exit(1);
}

const beforeBlock = content.substring(0, actualStart);
const afterBlock = content.substring(targetIndex);

const newBlock = `/**
 * PDF Export Implementation
 */
async function exportToPDF(projectName, meta, units) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error("jsPDF library not loaded. Check internet connection.");
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const date = new Date().toLocaleDateString('en-GB');

    // 1. Branding Header & Title (Side-by-Side)
    let logoSource = null;

    try {
        const domLogo = document.getElementById('logo-for-export') || document.querySelector('.logo img') || document.querySelector('.loader-logo');
        if (domLogo && domLogo.complete && domLogo.naturalWidth > 0) {
            doc.addImage(domLogo, 'PNG', 15, 12, 35, 28);
            logoSource = true;
        } else {
            const manualLogo = await new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = 'images/ui/logo-main.png';
            });
            if (manualLogo) {
                doc.addImage(manualLogo, 'PNG', 15, 12, 35, 28);
                logoSource = true;
            }
        }
    } catch (e) {
        console.warn("[PDF] Image insertion error:", e);
    }

    if (!logoSource) {
        doc.setFillColor(201, 162, 63);
        doc.rect(15, 20, 5, 15, 'F');
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text("ROBEL", 25, 32);
    }

    doc.setFontSize(20);
    doc.setTextColor(201, 162, 63);
    doc.text(\`Building Units Report - \${projectName}\`, 55, 30);

    // 2. Summary Box
    doc.setFillColor(248, 250, 253);
    doc.rect(15, 40, 180, 40, 'F');
    doc.setDrawColor(201, 162, 63);
    doc.line(15, 40, 195, 40);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(\`Project Area: \${meta?.projectArea || 'N/A'}\`, 20, 50);
    doc.text(\`Delivery Date: \${meta?.delivery || 'N/A'}\`, 20, 57);
    doc.text(\`Generated on: \${date}\`, 20, 64);

    const available = units.filter(u => u.status === 'Available').length;

    doc.setTextColor(15, 23, 42);
    doc.text(\`Total Units: \${units.length}\`, 115, 50);
    doc.text(\`Available: \${available}\`, 115, 57);

    const filterText = meta?.activeFiltersText || (window.currentLang === 'ar' ? 'الكل' : 'All Units');
    doc.setFontSize(8);
    doc.setTextColor(201, 162, 63);
    doc.text(window.currentLang === 'ar' ? 'الفلاتر:' : 'Selected Filters:', 115, 62);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    const splitFilters = doc.splitTextToSize(filterText, 70);
    doc.text(splitFilters, 115, 67);

`;

fs.writeFileSync(file, beforeBlock + newBlock + afterBlock, 'utf8');
console.log("Fixed successfully!");
