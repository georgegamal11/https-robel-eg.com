/**
 * Robel Real Estate - Price List Report Manager
 * Handles the display of the public report modal and PDF generation
 */

/**
 * Returns payment plan details for a given building ID
 */
function getPaymentPlanData(buildingId) {
    const id = buildingId.toString().toUpperCase().replace(/^B/, '');

    const plans = {
        '230': {
            title: 'خطة التقسيط القياسية',
            title_en: 'Standard Installment Plan',
            rows: [
                { label: 'المقدم / Down Payment', value: '10%' },
                { label: 'مدة الأقساط / Installment Period', value: '6 سنوات / 6 Years' },
                { label: '━━━━ خصم كاش - وحدات 60 / 82 / 90م (المتكررة) ━━━━', value: '' },
                { label: 'خصم بدون تشطيب / Cash Discount (No Finishing)', value: '50%' },
                { label: 'خصم بالتشطيب / Cash Discount (With Finishing)', value: '40%' },
            ],
            pdf_rows: [
                { label: 'Down Payment', value: '10%' },
                { label: 'Installment Period', value: '6 Years' },
                { label: '--- Cash Discount  (60 / 82 / 90 m2 Units) ---', value: '' },
                { label: 'Without Finishing', value: '50% Cash Discount' },
                { label: 'With Finishing', value: '40% Cash Discount' },
            ],
            note: 'خصم الكاش يسري على الوحدات المتكررة 60/82/90 م فقط',
            pdf_note: 'Cash discount applies to repeating units (60 / 82 / 90 m2) only.'
        },
        '243': {
            title: 'خطة التقسيط القياسية',
            title_en: 'Standard Installment Plan',
            rows: [
                { label: 'المقدم / Down Payment', value: '10%' },
                { label: 'مدة الأقساط / Installment Period', value: '6 سنوات / 6 Years' },
                { label: '━━━━ خصم كاش - وحدات 60 / 82 / 90م (المتكررة) ━━━━', value: '' },
                { label: 'خصم بدون تشطيب / Cash Discount (No Finishing)', value: '50%' },
                { label: 'خصم بالتشطيب / Cash Discount (With Finishing)', value: '40%' },
            ],
            pdf_rows: [
                { label: 'Down Payment', value: '10%' },
                { label: 'Installment Period', value: '6 Years' },
                { label: '--- Cash Discount  (60 / 82 / 90 m2 Units) ---', value: '' },
                { label: 'Without Finishing', value: '50% Cash Discount' },
                { label: 'With Finishing', value: '40% Cash Discount' },
            ],
            note: 'خصم الكاش يسري على الوحدات المتكررة 60/82/90 م فقط',
            pdf_note: 'Cash discount applies to repeating units (60 / 82 / 90 m2) only.'
        },
        '136': {
            title: 'خطة التقسيط القياسية',
            title_en: 'Standard Installment Plan',
            rows: [
                { label: 'Down Payment / المقدم', value: '5% on Contract + 5% After 1 Month / 5% عقد + 5% بعد شهر' },
                { label: 'Installment Period / مدة الأقساط', value: '6 Years / 6 سنوات' },
                { label: 'Cash Discount (90m²) / خصم كاش 90 متر', value: '40% Cash Discount / خصم 40% كاش' },
                { label: 'Special — Unit 136922', value: '10% Down Payment, 4 Years / مقدم 10% - 4 سنوات' },
            ],
            pdf_rows: [
                { label: 'Down Payment', value: '5% on Contract + 5% After 1 Month' },
                { label: 'Installment Period', value: '6 Years' },
                { label: 'Cash Discount (90m²)', value: '40% Cash Discount' },
                { label: 'Special — Unit 136922', value: '10% Down Payment, 4 Years' },
            ],
            note: 'Unit 136922 has a special installment plan',
            pdf_note: 'Unit 136922 has a special installment plan'
        },
        '133': {
            title: 'خطة التقسيط - حسب المساحة',
            title_en: 'Installment Plan (By Area)',
            rows: [
                { label: '90 m² — مقدم 10%', value: '10% Down Payment, 6 Years / 6 سنوات' },
                { label: '82 m² — مقدم 10%', value: '10% Down Payment, 5 Years / 5 سنوات' },
                { label: '60 m² — مقدم 10%', value: '10% Down Payment, 4 Years / 4 سنوات' },
                { label: 'Cash Discount (All Units) / خصم كاش الكل', value: '40% Cash Discount / خصم 40% كاش' },
            ],
            pdf_rows: [
                { label: '90 m²', value: '10% Down Payment, 6 Years' },
                { label: '82 m²', value: '10% Down Payment, 5 Years' },
                { label: '60 m²', value: '10% Down Payment, 4 Years' },
                { label: 'Cash Discount (All Units)', value: '40% Cash Discount' },
            ],
            note: 'Cash discount of 40% applies to all units in Building 133',
            pdf_note: 'Cash discount of 40% applies to all units in Building 133'
        }
    };

    return plans[id] || null;
}

document.addEventListener('DOMContentLoaded', () => {
    // Event listener for download-price-list-btn moved to index.html for on-demand loading

    const modalDownloadBtn = document.getElementById('download-report-pdf-btn');
    if (modalDownloadBtn) {
        modalDownloadBtn.onclick = async () => {
            await generatePriceListPDF(true); // true = Available units only
        };
    }
});

/**
 * Shows the Price List Report Modal with Available Units
 */
async function showPriceListReport() {
    const modal = document.getElementById('price-list-report-modal');
    const container = document.getElementById('report-modal-body');
    if (!modal || !container) return;

    modal.style.display = 'flex';
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 15px; color: #64748b;">
            <i class="fas fa-circle-notch fa-spin fa-3x"></i>
            <p>Gathering latest available units...</p>
        </div>
    `;

    // Ensure inventory is loaded
    if (!window.inventory || window.inventory.length === 0) {
        // Try to wait or trigger a load if needed, but home.js usually handles this
        // For now, if empty, show a small message
        setTimeout(() => {
            if (!window.inventory || window.inventory.length === 0) {
                container.innerHTML = '<p style="text-align:center; padding: 50px;">No units found in inventory. Please refresh the page.</p>';
            } else {
                renderReportHTML();
            }
        }, 1000);
    } else {
        renderReportHTML();
    }
}

function renderReportHTML() {
    const container = document.getElementById('report-modal-body');
    const inventory = window.inventory || [];

    // DYNAMIC ORDER DEFINITION (Project -> Building -> Units)
    const projectStructure = buildDynamicStructure();

    let html = `
        <div class="report-content" style="max-width: 900px; margin: 0 auto; font-family: 'Inter', sans-serif;">
            <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
                <h1 style="color: #0f172a; margin-bottom: 10px; font-weight: 800;">Available Units Price List</h1>
                <p style="color: #64748b;">Direct investment opportunities from Robel Real Estate</p>
            </div>
    `;

    let hasData = false;

    projectStructure.forEach(proj => {
        let projHtml = '';
        let projHasUnits = false;

        proj.buildings.forEach(bId => {
            // Use the robust utility from home.js if available
            const bUnits = inventory.filter(u => {
                const matches = typeof isUnitInTarget === 'function' ? isUnitInTarget(u, bId) : (u.building === bId || u.buildingName === bId || (u.id && u.id.startsWith(bId + "-")));
                return matches && (u.status && u.status.toLowerCase() === 'available');
            });

            if (bUnits.length > 0) {
                projHasUnits = true;
                hasData = true;

                // Sort units by code
                bUnits.sort((a, b) => (a.code || a.unitCode || '').toString().localeCompare((b.code || b.unitCode || '').toString()));

                // Build payment plan HTML table
                const plan = getPaymentPlanData(bId);
                let planHtml = '';
                if (plan) {
                    planHtml = `
                        <div style="margin-top: 12px; margin-bottom: 6px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 13px;">💳</span>
                                    <span style="font-weight: 700; font-size: 13px; color: #0f172a;">${plan.title_en} / ${plan.title}</span>
                                </div>
                                <span style="font-size: 10px; color: #94a3b8; font-style: italic;">Updated February 2026</span>
                            </div>
                            <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 10px; overflow: hidden;">
                                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                    <thead>
                                        <tr style="background: #f59e0b;">
                                            <th style="padding: 9px 16px; font-size: 11px; font-weight: 700; color: #fff; width: 50%; text-transform: uppercase;">Payment Term</th>
                                            <th style="padding: 9px 16px; font-size: 11px; font-weight: 700; color: #fff; text-transform: uppercase;">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${plan.rows.map((row, i) => `
                                        <tr style="background: ${i % 2 === 0 ? '#fffbeb' : '#fff8e1'}; border-bottom: 1px solid #fde68a;">
                                            <td style="padding: 8px 16px; font-size: 12px; font-weight: 600; color: #92400e;">${row.label}</td>
                                            <td style="padding: 8px 16px; font-size: 12px; font-weight: 700; color: #b45309;">${row.value}</td>
                                        </tr>`).join('')}
                                    </tbody>
                                </table>
                                ${plan.note ? `<div style="padding: 7px 16px; background: #fef3c7; border-top: 1px solid #fde68a; font-size: 11px; color: #92400e;">📌 ${plan.note}</div>` : ''}
                            </div>
                        </div>
                    `;
                }

                projHtml += `
                    <div style="margin-bottom: 35px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <span style="background: #c9a23f; color: white; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 14px;">Building ${bId}</span>
                        </div>
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                                <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                    <tr>
                                        <th style="padding: 12px 20px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Unit Code</th>
                                        <th style="padding: 12px 20px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Floor</th>
                                        <th style="padding: 12px 20px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Area</th>
                                        <th style="padding: 12px 20px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">View</th>
                                        <th style="padding: 12px 20px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Price (EGP)</th>
                                    </tr>
                                </thead>
                                <tbody style="divide-y divide-gray-100;">
                `;

                bUnits.forEach(u => {
                    const priceFormatted = u.price ? Number(u.price.toString().replace(/[^0-9.]/g, '')).toLocaleString() : 'Request Price';
                    projHtml += `
                        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#fcfcfc'" onmouseout="this.style.background='transparent'">
                            <td style="padding: 15px 20px; font-weight: 700; color: #0f172a;">${u.code || u.unitCode || u.id || '-'}</td>
                            <td style="padding: 15px 20px; color: #475569;">${u.floor || '-'}</td>
                            <td style="padding: 15px 20px; color: #475569;">${u.area || 0} m&sup2;</td>
                            <td style="padding: 15px 20px; color: #475569;">${u.view || '-'}</td>
                            <td style="padding: 15px 20px; font-weight: 800; color: #c9a23f; text-align: right;">${priceFormatted}</td>
                        </tr>
                    `;
                });

                projHtml += `
                                </tbody>
                            </table>
                        </div>
                        ${planHtml}
                    </div>
                `;
            }
        });

        if (projHasUnits) {
            html += `
                <div style="margin-bottom: 50px;">
                    <h2 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 25px; display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-city" style="color: #c9a23f;"></i> ${proj.name}
                    </h2>
                    ${projHtml}
                </div>
            `;
        }
    });

    if (!hasData) {
        html += `
            <div style="text-align: center; padding: 100px 20px; color: #64748b;">
                <i class="fas fa-search fa-3x" style="margin-bottom: 20px; opacity: 0.2;"></i>
                <h3>No units currently available for sale.</h3>
                <p>Please contact our sales team for upcoming opportunities.</p>
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}

async function generatePriceListPDF(availableOnly = true) {
    console.log('📄 Starting PDF Generation...', { availableOnly });

    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert('مكتبة PDF غير محملة. يرجى المحاولة مرة أخرى.\nPDF Library not loaded. Please try again.');
        return;
    }

    const doc = new jsPDF();
    const inventory = window.inventory || [];

    console.log('📊 Inventory Check:', {
        total: inventory.length,
        sample: inventory[0],
        availableCount: inventory.filter(u => (u.status || '').toLowerCase() === 'available').length
    });

    if (inventory.length === 0) {
        alert('لا توجد وحدات في قاعدة البيانات\nNo units found in inventory');
        return;
    }

    const projectStructure = buildDynamicStructure();

    // Header logic
    const imgData = await getLogoBase64();
    if (imgData) {
        doc.addImage(imgData, 'PNG', 15, 10, 25, 25);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(201, 162, 63);
    doc.text("Robel Real Estate Investment", 50, 20);

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    const titleText = availableOnly ? "Available Units Price List" : "Complete Units Inventory Report";
    doc.text(titleText, 50, 30);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 50, 38);

    doc.setDrawColor(201, 162, 63);
    doc.setLineWidth(1);
    doc.line(15, 45, 195, 45);

    let startY = 55;
    let totalUnitsInReport = 0;

    projectStructure.forEach(proj => {
        const buildingsToPrint = [];

        proj.buildings.forEach(bId => {
            const target = bId.toLowerCase();
            let bUnits = inventory.filter(u => {
                return (typeof isUnitInTarget === 'function') ? isUnitInTarget(u, bId) :
                    ((u.project || '').toLowerCase() === target ||
                        (u.buildingId || '').toString().toLowerCase() === target ||
                        (u.building_id || '').toString().toLowerCase() === target ||
                        (u.building || '').toLowerCase() === target ||
                        (u.buildingName || '').toLowerCase() === target ||
                        (u.id || '').toString().toLowerCase().startsWith(target + "-"));
            });

            console.log(`🏢 Building ${bId}:`, {
                foundUnits: bUnits.length,
                availableOnly
            });

            // Apply availability filter only if requested
            if (availableOnly) {
                bUnits = bUnits.filter(u => {
                    const status = (u.status || '').toLowerCase();
                    return status === 'available' || status === 'متاح'; // Support Arabic status too
                });
                console.log(`   ✅ After filtering (Available only):`, bUnits.length);
            }

            if (bUnits.length > 0) {
                totalUnitsInReport += bUnits.length;
                // Sort by status first (Available, Reserved, Sold), then by unit code
                bUnits.sort((a, b) => {
                    const statusOrder = { 'available': 1, 'reserved': 2, 'sold': 3 };
                    const statusA = (a.status || 'available').toLowerCase();
                    const statusB = (b.status || 'available').toLowerCase();

                    const orderA = statusOrder[statusA] || 4;
                    const orderB = statusOrder[statusB] || 4;

                    if (orderA !== orderB) return orderA - orderB;
                    return (a.code || a.unitCode || '').toString().localeCompare((b.code || b.unitCode || '').toString());
                });
                buildingsToPrint.push({ name: bId, units: bUnits });
            }
        });

        if (buildingsToPrint.length === 0) return;

        if (startY > 270) { doc.addPage(); startY = 20; }

        doc.setFillColor(15, 23, 42);
        doc.rect(15, startY - 8, 180, 12, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text(`Project: ${proj.name}`, 20, startY);
        startY += 15;

        buildingsToPrint.forEach(bData => {
            const { name, units } = bData;

            if (startY > 260) { doc.addPage(); startY = 20; }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(201, 162, 63);
            doc.text(`Building: ${name} (${units.length} units)`, 20, startY);
            startY += 5;

            const tableData = units.map(u => {
                const statusText = u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : 'Available';
                return [
                    u.code || u.unitCode || u.id || '-',
                    u.floor || '-',
                    u.view || '-',
                    `${u.area || 0} m\u00B2`,
                    u.price ? Number(u.price.toString().replace(/[^0-9.]/g, '')).toLocaleString() + ' EGP' : 'Call',
                    statusText
                ];
            });

            doc.autoTable({
                head: [['Code', 'Floor', 'View', 'Area', 'Price', 'Status']],
                body: tableData,
                startY: startY,
                theme: 'grid',
                headStyles: { fillColor: [201, 162, 63], textColor: 255, fontSize: 9, fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
                columnStyles: {
                    0: { fontStyle: 'bold', halign: 'left', cellWidth: 25 },
                    1: { cellWidth: 15 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 20 },
                    4: { halign: 'right', fontStyle: 'bold', textColor: [201, 162, 63], cellWidth: 35 },
                    5: { fontStyle: 'bold', cellWidth: 25 }
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 5) {
                        const status = (data.cell.raw || '').toLowerCase();
                        if (status === 'sold') {
                            data.cell.styles.textColor = [220, 38, 38]; // Red
                            data.cell.styles.fillColor = [254, 242, 242]; // Light red bg
                        } else if (status === 'reserved') {
                            data.cell.styles.textColor = [217, 119, 6]; // Orange
                            data.cell.styles.fillColor = [255, 247, 237]; // Light orange bg
                        } else {
                            data.cell.styles.textColor = [21, 128, 61]; // Green
                            data.cell.styles.fillColor = [240, 253, 244]; // Light green bg
                        }
                    }
                },
                margin: { left: 20, right: 20 }
            });

            startY = doc.lastAutoTable.finalY + 6;

            // --- Payment Plan Table for this building ---
            const plan = getPaymentPlanData(name);
            if (plan) {
                if (startY > 255) { doc.addPage(); startY = 20; }

                // Section header: Payment Plan
                doc.setFillColor(245, 158, 11); // amber-500
                doc.rect(20, startY, 170, 7, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                doc.text(`Payment Plan: ${plan.title_en}`, 23, startY + 5);

                // Updated date on the right
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(7);
                doc.setTextColor(255, 255, 255);
                doc.text('Updated February 2026', 188, startY + 5, { align: 'right' });

                startY += 7;

                // Plan rows table - use pdf_rows (English only, no Arabic)
                const planTableData = (plan.pdf_rows || plan.rows).map(r => [r.label, r.value]);

                doc.autoTable({
                    head: [['Payment Term', 'Details']],
                    body: planTableData,
                    startY: startY,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [251, 191, 36],  // amber-400
                        textColor: [120, 53, 15],   // amber-900
                        fontSize: 8,
                        fontStyle: 'bold'
                    },
                    styles: {
                        fontSize: 8,
                        cellPadding: 2.5,
                        fillColor: [255, 251, 235],  // amber-50
                        textColor: [146, 64, 14]     // amber-800
                    },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 85 },
                        1: { fontStyle: 'bold', cellWidth: 85 }
                    },
                    alternateRowStyles: { fillColor: [255, 248, 220] },
                    margin: { left: 20, right: 20 }
                });

                startY = doc.lastAutoTable.finalY;

                // Note if exists (use pdf_note - English only)
                const pdfNote = plan.pdf_note || plan.note;
                if (pdfNote) {
                    doc.setFillColor(254, 243, 199); // amber-100
                    doc.rect(20, startY, 170, 7, 'F');
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(7);
                    doc.setTextColor(146, 64, 14);
                    doc.text(`* ${pdfNote}`, 23, startY + 5);
                    startY += 7;
                }

                startY += 8;
            }
        });

        startY += 5;
    });

    // ─── Payment Plans Summary Table ───────────────────────────────────
    doc.addPage();
    startY = 20;

    // Section title bar
    doc.setFillColor(15, 23, 42);
    doc.rect(15, startY, 180, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(201, 162, 63);
    doc.text('Payment Plans Summary  -  All Buildings', 105, startY + 8, { align: 'center' });
    startY += 15;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Updated February 2026  |  Robel Real Estate Investment', 105, startY + 4, { align: 'center' });
    startY += 10;

    const summaryData = [
        [
            'B230',
            '10%',
            '6 Years',
            '---',
            '50% (No Finishing)\n40% (With Finishing)',
            'Repeating units only\n(60 / 82 / 90 m2)'
        ],
        [
            'B243',
            '10%',
            '6 Years',
            '---',
            '50% (No Finishing)\n40% (With Finishing)',
            'Repeating units only\n(60 / 82 / 90 m2)'
        ],
        [
            'B136',
            '5% + 5%',
            '6 Years',
            '---',
            '40%',
            '90 m2 units only\nUnit 136922: 10% / 4 Yrs'
        ],
        [
            'B133',
            '10%',
            '4 - 6 Years',
            '---',
            '40%',
            'All units\n(Area-based installments)'
        ],
    ];

    doc.autoTable({
        head: [['Building', 'Down Payment', 'Installment', 'Discount', 'Cash Discount', 'Notes']],
        body: summaryData,
        startY: startY,
        theme: 'grid',
        headStyles: {
            fillColor: [201, 162, 63],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 8,
            cellPadding: 4,
            valign: 'middle',
            halign: 'center'
        },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 20 },
            1: { cellWidth: 28 },
            2: { cellWidth: 25 },
            3: { cellWidth: 20, textColor: [150, 150, 150] },
            4: { fontStyle: 'bold', textColor: [21, 128, 61], cellWidth: 40 },
            5: { fontStyle: 'italic', textColor: [100, 100, 100], cellWidth: 47, halign: 'left' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: function (data) {
            if (data.section === 'body' && data.column.index === 0) {
                data.cell.styles.fillColor = [15, 23, 42];
                data.cell.styles.textColor = [201, 162, 63];
                data.cell.styles.fontSize = 10;
            }
        },
        margin: { left: 15, right: 15 }
    });

    startY = doc.lastAutoTable.finalY + 8;

    // Units count bar
    if (totalUnitsInReport > 0) {
        doc.setFillColor(240, 253, 244);
        doc.rect(15, startY, 180, 12, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(21, 128, 61);
        doc.text(`Total Available Units in Report: ${totalUnitsInReport}`, 105, startY + 8, { align: 'center' });
    } else {
        doc.setFillColor(254, 242, 242);
        doc.rect(15, startY, 180, 12, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(220, 38, 38);
        doc.text('No available units found in database.', 105, startY + 8, { align: 'center' });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: 'right' });
        doc.text("Robel Real Estate - Complete Inventory Report", 15, 290);
    }

    const reportType = availableOnly ? 'Available_Only' : 'Complete';
    doc.save(`Robel_Price_List_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function getLogoBase64() {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = 'assets/images/ui/logo-main.png';
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
    });
}

/**
 * Builds a dynamic hierarchy of Project -> Buildings
 * to ensure all inventory items are represented properly.
 */
function buildDynamicStructure() {
    const areas = window.projectAreas || ["Porto Golf Marina", "Porto Said", "Celebration"];
    const meta = window.projectMetadata || {};
    const names = window.projectNames || [];

    // Help normalize area names for consistent grouping
    const normalize = (area) => {
        if (!area) return "Other";
        const a = area.toString().toLowerCase().trim();
        if (a.includes('porto golf')) return "Porto Golf Marina";
        if (a.includes('porto said')) return "Porto Said";
        if (a.includes('celebration') || a.includes('new alamein')) return "Celebration";
        return area;
    };

    return areas.map(area => {
        // Find all buildings assigned to this project area in metadata
        const buildingsFound = names.filter(bName => {
            const bMeta = meta[bName] || meta[bName.replace(/^B/i, '')];
            if (bMeta) {
                return normalize(bMeta.projectArea) === normalize(area);
            }
            return false;
        });

        // Add any missing buildings that exist in inventory but not in names list
        const inventoryBuildingsRaw = [...new Set((window.inventory || []).filter(u => {
            const bMeta = (typeof getUnitMetadata === 'function') ? getUnitMetadata(u) : null;
            return bMeta && normalize(bMeta.projectArea) === normalize(area);
        }).map(u => u.building || u.buildingName))].filter(b => b);

        const normalizedNames = names.map(n => n.toString().toLowerCase().replace(/^b/i, ''));
        const inventoryBuildings = inventoryBuildingsRaw.filter(b => {
            const cleanB = b.toString().toLowerCase().replace(/^b/i, '');
            return !normalizedNames.includes(cleanB);
        });

        const allBuildings = [...new Set([...buildingsFound, ...inventoryBuildings])];

        // Sort buildings naturally (B1, B2, B10...)
        allBuildings.sort((a, b) => {
            const numA = parseInt(a.toString().replace(/\D/g, '')) || 0;
            const numB = parseInt(b.toString().replace(/\D/g, '')) || 0;
            if (numA !== numB) return numA - numB;
            return a.toString().localeCompare(b.toString());
        });

        return {
            name: area,
            buildings: allBuildings
        };
    });
}
