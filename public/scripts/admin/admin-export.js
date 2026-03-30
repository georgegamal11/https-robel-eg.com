/**
* Admin Export Logic - Robel Real Estate
* Handles PDF, Excel, and Print Preview for building reports.
*/

document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('export-report-btn');
    const exportMenu = document.getElementById('export-menu');

    if (exportBtn && exportMenu) {
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = exportMenu.style.display === 'block';
            exportMenu.style.display = isVisible ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!exportBtn.contains(e.target)) {
                exportMenu.style.display = 'none';
            }
        });

        // Handle checkbox logic
        const toggleAll = document.getElementById('export-all');
        const toggleAvailable = document.getElementById('export-available');
        const toggleReserved = document.getElementById('export-reserved');
        const toggleSold = document.getElementById('export-sold');

        if (toggleAll) {
            toggleAll.addEventListener('change', () => {
                if (toggleAll.checked) {
                    if (toggleAvailable) toggleAvailable.checked = false;
                    if (toggleReserved) toggleReserved.checked = false;
                    if (toggleSold) toggleSold.checked = false;
                }
            });
        }

        [toggleAvailable, toggleReserved, toggleSold].forEach(checkbox => {
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked && toggleAll) {
                        toggleAll.checked = false;
                    }
                    // Auto-select "All" if everything is unchecked? 
                    // Let's NOT do that automatically to avoid confusion, 
                    // let the user explicitly click "All" if they want to reset.
                });
            }
        });
    }
});

/**
 * Main handle for all export types
 * @param {string} type - 'pdf' | 'excel' | 'print'
 */
window.handleExport = async function (type) {
    // 1. Dependency Check
    if (type === 'pdf' && (!window.jspdf || !window.jspdf.jsPDF)) {
        alert("Fetching PDF library... Please try again in 3 seconds.");
        return;
    }

    // 2. Project Name Extraction
    const domName = document.getElementById('mgr-project-name');
    let currentProjectName = domName ? domName.textContent.trim() : null;

    if (!currentProjectName || currentProjectName === 'Select Building' || currentProjectName === '') {
        alert(currentLang === 'ar' ? 'ÙŠØ±Ø¬Ù‰ Ø§Ø®ØªÙŠØ§Ø± Ù…Ø¨Ù†Ù‰ Ø£ÙˆÙ„Ø§Ù‹.' : 'Please select a building / project first.');
        return;
    }

    try {
        let meta = null;
        let units = [];

        // 0. CHECK FOR UI FILTERS (User Requested)
        const domFilteredOnly = document.getElementById('export-filtered-only');
        if (domFilteredOnly && domFilteredOnly.checked && window.lastAdminFilteredUnits) {
            console.log("ðŸ“Š Exporting ONLY currently filtered UI results...");
            units = window.lastAdminFilteredUnits;
            // Try to find metadata from local store
            if (typeof projectMetadata !== 'undefined') {
                const key = Object.keys(projectMetadata).find(k => k.includes(currentProjectName) || currentProjectName.includes(k));
                if (key) meta = { ...projectMetadata[key] }; // Clone to avoid mutation
            }

            // Extract active UI filters labels for the report header
            let filterLabels = [];
            const fFloor = document.getElementById('admin-unit-filter-floor')?.value;
            const fView = document.getElementById('admin-unit-filter-view')?.value;
            const fArea = document.getElementById('admin-unit-filter-area')?.value;
            const fSearch = document.getElementById('admin-unit-search')?.value;

            if (fFloor) filterLabels.push(`${currentLang === 'ar' ? 'Ø§Ù„Ø¯ÙˆØ±' : 'Floor'}: ${fFloor}`);
            if (fView) filterLabels.push(`${currentLang === 'ar' ? 'Ø§Ù„Ø¥Ø·Ù„Ø§Ù„Ø©' : 'View'}: ${fView}`);
            if (fArea) filterLabels.push(`${currentLang === 'ar' ? 'Ø§Ù„Ù…Ø³Ø§Ø­Ø©' : 'Area'}: ${fArea} mÂ²`);
            if (fSearch) filterLabels.push(`${currentLang === 'ar' ? 'Ø¨Ø­Ø«' : 'Search'}: ${fSearch}`);

            if (meta) {
                meta.activeFiltersText = filterLabels.join(' | ');
            }
        } else {
            // 3. API Fetching (Cloudflare Layer)
            // Helps if we are in "Admin Mode" and data isn't fully loaded in inventory
            const _getBuilding = window.firebaseQueries?.getBuilding || (typeof getBuilding === 'function' ? getBuilding : null);
            const _getUnitsByBuilding = window.firebaseQueries?.getUnitsByBuilding || (typeof getUnitsByBuilding === 'function' ? getUnitsByBuilding : null);

            let apiSuccess = false;

            if (_getBuilding && _getUnitsByBuilding) {
                // Attempt smart ID normalization
                const potentialId = currentProjectName.replace(/[^a-zA-Z0-9]/g, '');
                const idCandidates = [
                    currentProjectName,
                    potentialId,
                    potentialId.startsWith('B') ? potentialId : 'B' + potentialId
                ];

                for (const testId of idCandidates) {
                    if (apiSuccess) break;
                    try {
                        const bData = await _getBuilding(testId);
                        if (bData) {
                            meta = {
                                projectArea: bData.project_area || bData.projectArea || bData.projectName,
                                delivery: bData.delivery,
                                constStatus: bData.status || bData.constStatus,
                                status: bData.status
                            };

                            const bUnits = await _getUnitsByBuilding(testId);
                            if (bUnits && Array.isArray(bUnits) && bUnits.length > 0) {
                                units = bUnits.map(u => ({
                                    code: u.code || u.unit_id || u.id,
                                    floor: u.floor,
                                    area: u.area,
                                    view: u.view,
                                    intent: u.purpose || u.intent || 'Sale',
                                    payment_plan: u.payment_plan || u.paymentPlan || '-',
                                    status: u.status,
                                    price: u.price,
                                    project: currentProjectName
                                }));
                                apiSuccess = true;
                            }
                        }
                    } catch (e) {
                        // console.warn("API candidate failed:", testId);
                    }
                }
            }

            // 4. Fallback to Local Inventory (Robust)
            // If API extraction failed or returned no units, use what's on screen (inventory)
            if (units.length === 0 && typeof inventory !== 'undefined') {
                const matcher = (typeof isUnitInTarget === 'function')
                    ? (u) => isUnitInTarget(u, currentProjectName)
                    : (u) => {
                        const t = currentProjectName.toLowerCase();
                        return (u.project || '').toLowerCase() === t ||
                            (u.buildingId || '').toString().toLowerCase() === t ||
                            (u.building || '').toString().toLowerCase() === t ||
                            (u.id || '').toString().startsWith(t);
                    };

                units = inventory.filter(matcher);

                // Try to find metadata from local store
                if (!meta && typeof projectMetadata !== 'undefined') {
                    // Try loose matching for metadata
                    const key = Object.keys(projectMetadata).find(k => k.includes(currentProjectName) || currentProjectName.includes(k));
                    if (key) meta = projectMetadata[key];
                }
            }
        }

        // 5. Validation
        if (!units || units.length === 0) {
            const msg = currentLang === 'ar' ?
                `Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù€ "${currentProjectName}". ØªØ£ÙƒØ¯ Ù…Ù† ÙˆØ¬ÙˆØ¯ ÙˆØ­Ø¯Ø§Øª Ù…Ø³Ø¬Ù„Ø©.` :
                `No units found for "${currentProjectName}". Please verify data exists.`;
            alert(msg);
            return;
        }

        // --- APPLY STATUS FILTERS ---
        const domAll = document.getElementById('export-all');
        const domAvailable = document.getElementById('export-available');
        const domReserved = document.getElementById('export-reserved');
        const domSold = document.getElementById('export-sold');

        const statusKeywords = [];
        if (domAvailable?.checked) statusKeywords.push('available');
        if (domReserved?.checked) statusKeywords.push('reserved');
        if (domSold?.checked) statusKeywords.push('sold');

        let filteredUnits = units;

        // Apply status filtering ONLY if 'All Units' is not checked and we have specific status filters
        if ((!domAll || !domAll.checked) && statusKeywords.length > 0) {
            filteredUnits = units.filter(u => {
                const s = (u.status || '').toString().trim().toLowerCase();
                return statusKeywords.some(f => s.includes(f));
            });
        }

        // Prepare breadcrumbs for the confirmation message
        const activeFilters = [];
        if (domFilteredOnly?.checked) activeFilters.push(currentLang === 'ar' ? 'Ø§Ù„ÙÙ„Ø§ØªØ± Ø§Ù„Ù†Ø´Ø·Ø©' : 'UI Filters');
        if (statusKeywords.length > 0 && !domAll?.checked) {
            statusKeywords.forEach(k => activeFilters.push(k));
        } else {
            activeFilters.push('All Statuses');
        }

        // --- CONFIRMATION ---
        const isFiltered = domFilteredOnly && domFilteredOnly.checked;
        const filterTypeStr = isFiltered ? (currentLang === 'ar' ? "(Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø§Ù„ÙÙ„ØªØ±Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©)" : "(Based on UI Filters)") : "";

        const confirmMsg = currentLang === 'ar'
            ? `ØªØ£ÙƒÙŠØ¯ ØªØµØ¯ÙŠØ± ØªÙ‚Ø±ÙŠØ± ${filterTypeStr}: ${currentProjectName}\n\n` +
            `Ø§Ù„ÙˆØ­Ø¯Ø§Øª: ${filteredUnits.length} (Ù…Ù† Ø¥Ø¬Ù…Ø§Ù„ÙŠ ${units.length})\n` +
            `Ø§Ù„ÙÙ„Ø§ØªØ±: ${activeFilters.join(', ')}\n\n` +
            `Ù‡Ù„ ØªÙˆØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©ØŸ`
            : `Confirm Export Report ${filterTypeStr}: ${currentProjectName}\n\n` +
            `Matching Units: ${filteredUnits.length} (Total: ${units.length})\n` +
            `Filters: ${activeFilters.join(', ')}\n\n` +
            `Proceed?`;

        if (filteredUnits.length === 0) {
            alert(currentLang === 'ar' ? "Ù„Ø§ ØªÙˆØ¬Ø¯ ÙˆØ­Ø¯Ø§Øª ØªØ·Ø§Ø¨Ù‚ Ø§Ù„ÙÙ„Ø§ØªØ± Ø§Ù„Ù…Ø®ØªØ§Ø±Ø©." : "No units match the selected filters.");
            return;
        }

        if (!confirm(confirmMsg)) return;

        // 6. Execution
        if (type === 'pdf') {
            await exportToPDF(currentProjectName, meta || {}, filteredUnits);
        } else if (type === 'excel') {
            exportToExcel(currentProjectName, meta || {}, filteredUnits);
        } else if (type === 'print') {
            await printPreview(currentProjectName, meta || {}, filteredUnits);
        }

    } catch (err) {
        console.error(`[Export Error] ${type} failed:`, err);
        alert(`Export Failed: ${err.message || 'Unknown error'}`);
    }
};

/**
 * HELPER: Convert Image or URL to Base64 for jsPDF
 */
async function getImageBase64(source) {
    if (!source) return null;
    return new Promise((resolve) => {
        const isImgEl = source instanceof HTMLImageElement;
        const img = isImgEl ? source : new Image();

        const process = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || 100;
                canvas.height = img.naturalHeight || 40;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const data = canvas.toDataURL('image/png');
                resolve(data.length > 100 ? data : null);
            } catch (e) {
                console.warn("Base64 conversion failed", e);
                resolve(null);
            }
        };

        if (isImgEl && img.complete && img.naturalWidth > 0) {
            process();
        } else {
            img.onload = process;
            img.onerror = () => resolve(null);
            if (!isImgEl) {
                // If it's a URL, handle potential relative path issues
                const url = source.startsWith('http') ? source : (window.location.origin + '/' + source.replace(/^\//, ''));
                img.crossOrigin = "anonymous";
                img.src = url;
            }
        }

        // Timeout protection
        setTimeout(() => resolve(null), 2500);
    });
}

/**
 * PDF Export Implementation
 */
async function exportToPDF(projectName, meta, units) {
    if (typeof generatePriceListPDF === 'function') {
        // The units array is already filtered by Admin Panel.
        // We pass false for availableOnly so it doesn't filter again, 
        // and we pass the custom list and the project name to match the "Price List" format.
        await generatePriceListPDF(false, units, projectName);
        return;
    }

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
    doc.text(`Building Units Report - ${projectName}`, 55, 30);

    // 2. Summary Box
    doc.setFillColor(248, 250, 253);
    doc.rect(15, 40, 180, 40, 'F');
    doc.setDrawColor(201, 162, 63);
    doc.line(15, 40, 195, 40);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Project Area: ${meta?.projectArea || 'N/A'}`, 20, 50);
    doc.text(`Delivery Date: ${meta?.delivery || 'N/A'}`, 20, 57);
    doc.text(`Generated on: ${date}`, 20, 64);

    const available = units.filter(u => u.status === 'Available').length;

    doc.setTextColor(15, 23, 42);
    doc.text(`Total Units: ${units.length}`, 115, 50);
    doc.text(`Available: ${available}`, 115, 57);

    const filterText = meta?.activeFiltersText || (window.currentLang === 'ar' ? 'الكل' : 'All Units');
    doc.setFontSize(8);
    doc.setTextColor(201, 162, 63);
    doc.text(window.currentLang === 'ar' ? 'الفلاتر:' : 'Selected Filters:', 115, 62);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    const splitFilters = doc.splitTextToSize(filterText, 70);
    doc.text(splitFilters, 115, 67);

    const uniquePlans = new Set();

    // 3. Units Table
    const tableData = units.map(u => {
        let ppText = '-';
        let descText = '';
        if (typeof u.payment_plan === 'string' && u.payment_plan.startsWith('{')) {
            try {
                const pp = JSON.parse(u.payment_plan);
                let down = pp.down_payment_en || pp.down_payment || '';
                let yrs = pp.installment_years_text_en || pp.installment_years_text || pp.installment_years || '';
                descText = pp.description_en || pp.description || '';
                if (down && yrs) {
                    ppText = `${down} - ${yrs}`;
                } else {
                    ppText = pp.name_en || pp.name || '-';
                }
            } catch(e) {
                ppText = 'Custom Plan';
            }
        } else if (u.payment_plan) {
            ppText = u.payment_plan;
        }
        
        // Strip Arabic characters to prevent jsPDF garbling
        ppText = ppText.replace(/[\u0600-\u06FF]/g, '').trim();
        descText = descText.replace(/[\u0600-\u06FF]/g, '').trim();
        if (!ppText || ppText === '-') ppText = 'Cash / Standard';

        let planSummaryText = ppText;
        if (descText) planSummaryText += ` (${descText})`;
        uniquePlans.add(planSummaryText);

        return [
            `#${u.code}`,
            (u.floor || '').replace(/[\u0600-\u06FF]/g, '').trim() || '-',
            `${u.area} mÂ²`,
            (u.view || '').replace(/[\u0600-\u06FF]/g, '').trim() || '-',
            (u.intent || 'Buy').toUpperCase(),
            (u.status || '').toUpperCase(),
            `${u.price ? Number(u.price.toString().replace(/[^0-9.]/g, '')).toLocaleString('en-US') : '0'} EGP`
        ];
    });

    doc.autoTable({
        startY: 85,
        head: [['Unit #', 'Floor', 'Area', 'View', 'Purpose', 'Status', 'Price']],
        body: tableData,
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            6: { halign: 'right', fontStyle: 'bold' },
            5: { fontStyle: 'bold' }
        },
        didParseCell: function (data) {
            if (data.section === 'body' && data.column.index === 5) {
                const status = data.cell.raw;
                if (status === 'SOLD') data.cell.styles.textColor = [239, 68, 68];
                if (status === 'RESERVED') data.cell.styles.textColor = [249, 115, 22];
                if (status === 'AVAILABLE') data.cell.styles.textColor = [16, 185, 129];
            }
        }
    });

    // --- Payment Plans Summary Area ---
    let finalY = (doc.lastAutoTable || doc.autoTable.previous).finalY + 15;
    if (finalY > 260) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(201, 162, 63);
    doc.text("Payment Plans Overview", 15, finalY);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    let py = finalY + 8;
    
    if (uniquePlans.size === 0) {
        doc.text("• Standard / Cash payment terms apply for these units.", 15, py);
    } else {
        Array.from(uniquePlans).forEach(plan => {
            const splitPlan = doc.splitTextToSize(`• ${plan}`, 180);
            doc.text(splitPlan, 15, py);
            py += (splitPlan.length * 5) + 2;
        });
    }

    // 4. Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Robel Real Estate Investment - Confidential Report - Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }

    doc.save(`${projectName}_Report_${date.replace(/\//g, '-')}.pdf`);
}

/**
 * Excel Export Implementation using SheetJS
 */
function exportToExcel(projectName, meta, units) {
    if (!window.XLSX) {
        alert("Excel Library not loaded");
        return;
    }
    const wb = window.XLSX.utils.book_new();
    const date = new Date().toLocaleDateString();

    const summaryData = [
        ["BUILDING REPORT SUMMARY"],
        [""],
        ["Building", projectName],
        ["Applied Filters", meta?.activeFiltersText || (currentLang === 'ar' ? 'Ø§Ù„ÙƒÙ„' : 'All Units')],
        ["Project Area", meta?.projectArea || 'N/A'],
        ["Delivery Date", meta?.delivery || 'N/A'],
        ["Report Date", date],
        ["Status", meta?.constStatus || 'N/A'],
        [""],
        ["STATISTICS"],
        ["Total Units", units.length],
        ["Available", units.filter(u => u.status === 'Available').length],
        ["Reserved", units.filter(u => u.status === 'Reserved').length],
        ["Sold", units.filter(u => u.status === 'Sold').length],
        ["Total Area (m\u00B2)", units.reduce((sum, u) => sum + (parseInt(u.area) || 0), 0)]
    ];
    const wsSummary = window.XLSX.utils.aoa_to_sheet(summaryData);
    window.XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    const unitHeaders = ["Unit Code", "Floor", "Area (m\u00B2)", "View", "Purpose", "Payment Plan", "Status", "Price (EGP)"];
    const unitRows = units.map(u => {
        let ppText = '-';
        if (typeof u.payment_plan === 'string' && u.payment_plan.startsWith('{')) {
            try {
                const pp = JSON.parse(u.payment_plan);
                let down = pp.down_payment || pp.down_payment_en || '';
                let yrs = pp.installment_years_text || pp.installment_years_text_en || '';
                if (down && yrs) {
                    ppText = `${down} - ${yrs}`;
                } else {
                    ppText = pp.name || pp.name_en || '-';
                }
            } catch(e) {
                ppText = 'Custom Plan';
            }
        } else if (u.payment_plan) {
            ppText = u.payment_plan;
        }

        return [
            u.code,
            u.floor,
            u.area,
            u.view,
            (u.intent || 'Buy').toUpperCase(),
            ppText,
            u.status,
            u.price
        ];
    });

    const wsUnits = window.XLSX.utils.aoa_to_sheet([unitHeaders, ...unitRows]);
    window.XLSX.utils.book_append_sheet(wb, wsUnits, "Units Details");

    window.XLSX.writeFile(wb, `${projectName}_Units_${date.replace(/\//g, '-')}.xlsx`);
}

/**
 * Print Preview Implementation
 */
async function printPreview(projectName, meta, units) {
    const date = new Date().toLocaleDateString();
    const available = units.filter(u => u.status === 'Available').length;
    const reserved = units.filter(u => u.status === 'Reserved').length;
    const sold = units.filter(u => u.status === 'Sold').length;
    const totalArea = units.reduce((sum, u) => sum + (parseInt(u.area) || 0), 0);

    // 1. Branding - PRIORITIZE CLOUD LOGO
    let logoHTML = `<h1 class="logo-text">ROBEL<span>.</span></h1>`;

    if (window.corporateBranding?.logoBase64) {
        logoHTML = `<img src="${window.corporateBranding.logoBase64}" class="logo-img" alt="ROBEL">`;
    } else {
        // Try multiple paths for robustness
        logoHTML = `
            <div style="position: relative;">
                <img src="images/ui/logo-report.png" class="logo-img" alt="ROBEL" onerror="this.src='images/ui/logo-main.png'; this.onerror=() => { this.style.display='none'; document.getElementById('logo-text-fallback').style.display='block'; }">
                <h1 id="logo-text-fallback" class="logo-text" style="display:none; margin:0; font-size: 32px; color: #c9a23f;">ROBEL<span>.</span></h1>
            </div>`;
    }


    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Report - ${projectName}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                .header { border-bottom: 2px solid #c9a23f; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                .logo-img { height: 120px; width: auto; object-fit: contain; }
                .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 40px; }
                .summary-item b { color: #64748b; font-size: 12px; text-transform: uppercase; display: block; margin-bottom: 4px; }
                .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .table th { background: #0f172a; color: white; text-align: left; padding: 12px; font-size: 13px; }
                .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
                .table tr:nth-child(even) { background: #fdfdfd; }
                .status { font-weight: 700; }
                .status-Available { color: #16a34a; }
                .status-Reserved { color: #f97316; }
                .status-Sold { color: #dc2626; }
                .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>${logoHTML}</div>
                <div style="text-align: right;">
                    <h2 style="margin:0; color: #c9a23f;">Building Report: ${projectName}</h2>
                    <p style="margin:0; font-size: 14px;">Date: ${date}</p>
                </div>
            </div>

            <div class="summary-box">
                <div class="summary-item"><b>Project Area</b> ${meta?.projectArea || 'N/A'}</div>
                <div class="summary-item"><b>Total Units</b> ${units.length}</div>
                <div class="summary-item"><b>Delivery Date</b> ${meta?.delivery || 'N/A'}</div>
                <div class="summary-item"><b>Available Units</b> ${available}</div>
                <div class="summary-item"><b>Status</b> ${meta?.constStatus || 'N/A'}</div>
                <div class="summary-item"><b>Applied Filters</b> ${meta?.activeFiltersText || (currentLang === 'ar' ? 'Ø§Ù„ÙƒÙ„' : 'All Units')}</div>
                <div class="summary-item"><b>Generated on</b> ${date}</div>
                <div class="summary-item"><b>Reserved/Sold</b> ${reserved + sold}</div>
            </div>

            <table class="table">
                <thead>
                    <tr>
                        <th>Unit #</th>
                        <th>Floor</th>
                        <th>Area</th>
                        <th>View</th>
                        <th>Purpose</th>
                        <th>Status</th>
                        <th>Price (EGP)</th>
                    </tr>
                </thead>
                <tbody>
                    ${units.map(u => `
                        <tr>
                            <td>#${u.code}</td>
                            <td>${u.floor}</td>
                            <td>${u.area} mÂ²</td>
                            <td>${u.view}</td>
                            <td>${(u.intent || 'Buy').toUpperCase()}</td>
                            <td class="status status-${u.status}">${u.status}</td>
                            <td style="text-align: right; font-weight:bold;">${(u.price || 0).toLocaleString('en-US')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer">
                <p>This document is a computer-generated report for Robel Real Estate Investment Inventory.</p>
                <p>&copy; 2026 Robel Real Estate. All rights reserved.</p>
            </div>

            <script>
                window.onload = function() { 
                    setTimeout(() => { window.print(); }, 800); 
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}



