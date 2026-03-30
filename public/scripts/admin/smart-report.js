/**
 * Smart Report Generator for Robel Real Estate
 * Handles cascading advanced filtering and PDF/Excel exports
 */

window.SmartReport = {
    filters: {
        projects: new Set(),
        buildings: new Set(),
        floors: new Set(),
        views: new Set(),
        plans: new Set(),
        status: 'Available'
    },

    floorMapping: {
        '0': 'Ground Floor', '1': '1st Floor', '2': '2nd Floor', '3': '3rd Floor', '4': '4th Floor', '5': '5th Floor', '6': '6th Floor', '7': '7th Floor', '8': '8th Floor', '9': '9th Floor', '10': '10th Floor'
    },

    init() {
        console.log("🚀 [Smart Report] Initializing Analytics Engine...");
        this.attachListeners();
        this.populateFilters();
        this.updateStats();
    },

    attachListeners() {
        const inputs = ['report-min-area', 'report-max-area', 'report-min-price', 'report-max-price'];
        inputs.forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updateStats());
        });
        
        document.getElementById('report-status-filter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.updateStats();
        });
    },

    populateFilters() {
        const inventory = window.inventory || [];
        const containerMap = {
            'projects': 'report-projects-list',
            'buildings': 'report-buildings-list',
            'floors': 'report-floors-list',
            'views': 'report-views-list',
            'plans': 'report-plans-list'
        };

        const options = { projects: new Set(), buildings: new Set(), floors: new Set(), views: new Set(), plans: new Set() };

        inventory.forEach(u => options.projects.add(String(u.project || '').toLowerCase().trim()));

        const pUnits = inventory.filter(u => this.filters.projects.size === 0 || this.filters.projects.has(String(u.project || '').toLowerCase().trim()));
        pUnits.forEach(u => options.buildings.add(String(u.buildingId || u.building || '').trim()));

        const bUnits = pUnits.filter(u => this.filters.buildings.size === 0 || this.filters.buildings.has(String(u.buildingId || u.building || '').trim()));
        bUnits.forEach(u => options.floors.add(String(u.floor)));

        const fUnits = bUnits.filter(u => this.filters.floors.size === 0 || this.filters.floors.has(String(u.floor)));
        fUnits.forEach(u => {
            if (u.view) options.views.add(String(u.view).trim());
            let pp = u.payment_plan || u.paymentPlan || '';
            if (pp.startsWith('{')) {
                try { const parsed = JSON.parse(pp); pp = parsed.name_en || parsed.name || 'Custom Plan'; } catch(e) { pp = 'Complex Plan'; }
            }
            if (pp && pp !== '-') options.plans.add(pp);
        });

        Object.keys(containerMap).forEach(key => {
            const container = document.getElementById(containerMap[key]);
            if (!container) return;
            const sorted = Array.from(options[key]).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
            container.innerHTML = sorted.map(val => {
                const isActive = this.filters[key].has(val);
                let label = val;
                if (key === 'floors') {
                    const cleanF = String(val).replace(/[^0-9]/g, '');
                    label = this.floorMapping[cleanF] || (val.length < 3 ? val + ' Floor' : val);
                }
                const clickFn = `window.SmartReport.toggleFilter('${key}', '${val.replace(/'/g, "\\'")}')`;
                return `<div class="report-filter-tag ${isActive ? 'selected' : ''}" onclick="${clickFn}">${label.toUpperCase()}</div>`;
            }).join('') || `<div style="font-size:0.7rem; opacity:0.3; padding:10px;">Select previous criteria first</div>`;
        });
    },

    toggleFilter(type, value) {
        if (this.filters[type].has(value)) this.filters[type].delete(value);
        else this.filters[type].add(value);

        if (type === 'projects') { this.filters.buildings.clear(); this.filters.floors.clear(); this.filters.views.clear(); this.filters.plans.clear(); }
        else if (type === 'buildings') { this.filters.floors.clear(); this.filters.views.clear(); this.filters.plans.clear(); }
        else if (type === 'floors') { this.filters.views.clear(); this.filters.plans.clear(); }
        else if (type === 'views') { this.filters.plans.clear(); }

        this.populateFilters();
        this.updateStats();
    },

    selectAll(type) {
        this.populateFilters();
        this.updateStats();
    },

    getFilteredUnits() {
        const inventory = window.inventory || [];
        const minA = parseFloat(document.getElementById('report-min-area').value) || 0;
        const maxA = parseFloat(document.getElementById('report-max-area').value) || 1000000;
        const minP = parseFloat(document.getElementById('report-min-price').value) || 0;
        const maxP = parseFloat(document.getElementById('report-max-price').value) || 1000000000;

        return inventory.filter(u => {
            const projVal = String(u.project || '').toLowerCase().trim();
            const bldVal = String(u.buildingId || u.building || '').trim();
            let planVal = u.payment_plan || u.paymentPlan || '';
            if (planVal.startsWith('{')) {
                try { const parsed = JSON.parse(planVal); planVal = parsed.name_en || parsed.name || 'Custom Plan'; } catch(e) { planVal = 'Complex Plan'; }
            }
            const pMatch = this.filters.projects.size === 0 || this.filters.projects.has(projVal);
            const bMatch = this.filters.buildings.size === 0 || this.filters.buildings.has(bldVal);
            const fMatch = this.filters.floors.size === 0 || this.filters.floors.has(String(u.floor));
            const vMatch = this.filters.views.size === 0 || this.filters.views.has(String(u.view || '').trim());
            const plMatch = this.filters.plans.size === 0 || this.filters.plans.has(planVal);
            const sMatch = this.filters.status === 'all' || u.status === this.filters.status;
            const area = parseFloat(String(u.area).replace(/[^0-9.]/g, "")) || 0;
            const aMatch = area >= minA && area <= maxA;
            const price = parseFloat(String(u.price || "0").replace(/[^0-9.]/g, "")) || 0;
            const pRangeMatch = price >= minP && price <= maxP;
            return pMatch && bMatch && fMatch && vMatch && plMatch && sMatch && aMatch && pRangeMatch;
        });
    },

    updateStats() {
        const units = this.getFilteredUnits();
        const statsEl = document.getElementById('report-live-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color:white; padding:25px; border-radius:20px; text-align:center; box-shadow: 0 15px 30px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size:3.5rem; font-weight:800; line-height:1; background: linear-gradient(to bottom, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${units.length}</div>
                    <div style="font-size:0.8rem; opacity:0.7; letter-spacing:2px; margin-top:5px; text-transform:uppercase; font-weight:600;">Assets Identified</div>
                    <div style="margin-top:15px; display:flex; justify-content:center; gap:10px; font-size:0.75rem;">
                        <span style="background:rgba(16, 185, 129, 0.1); color:#10b981; padding:4px 10px; border-radius:100px; border:1px solid rgba(16, 185, 129, 0.2);">SMART READY</span>
                    </div>
                </div>
            `;
        }
        const uniqueOfferData = new Set();
        units.forEach(u => {
            let pp = u.payment_plan || u.paymentPlan || '';
            if (pp && pp !== '-') uniqueOfferData.add(pp);
        });
        const offerCountEl = document.getElementById('offer-count-display');
        const offerCoverageEl = document.getElementById('offer-coverage-display');
        if (offerCountEl) offerCountEl.textContent = uniqueOfferData.size;
        if (offerCoverageEl) offerCoverageEl.textContent = units.length;
    },

    async generate(format) {
        const units = this.getFilteredUnits();
        if (units.length === 0) { Swal.fire("Selection Empty", "Please refine your filters.", "warning"); return; }
        format === 'excel' ? this.exportExcel(units) : this.exportPDF(units);
    },

    exportExcel(units) {
        let csv = "Unit Code,Project,Building,Floor,Area (sqm),View,Payment Plan,Price (EGP),Status\n";
        units.forEach(u => {
            let pp = u.payment_plan || u.paymentPlan || '-';
            if (pp.startsWith('{')) try { pp = JSON.parse(pp).name_en || 'Custom'; } catch(e) {}
            csv += `${u.code},${u.project},${u.buildingId || u.building || ''},${u.floor},${u.area},${u.view},${pp},${u.price},${u.status}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `ROBEL_UNITS_${Date.now()}.csv`;
        link.click();
    },

    async exportPDF(units) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const logo = window.ROBEL_LOGO_BASE64 || '';
        if (logo) try { doc.addImage(logo, 'PNG', 160, 10, 35, 35); } catch(e) {}
        doc.setFillColor(15, 23, 42).rect(15, 25, 2, 8, 'F');
        doc.setFontSize(28).setTextColor(15, 23, 42).setFont("helvetica", "bold").text("REPORT", 22, 32);
        doc.setDrawColor(226, 232, 240).line(15, 45, 155, 45); 
        doc.setFontSize(9).setTextColor(100).setFont("helvetica", "normal").text("ELITE REAL ESTATE PORTFOLIO ANALYTICS", 15, 52);
        doc.setFontSize(7).setTextColor(150).text(`ID: R-${Math.floor(Math.random()*100000)} | EMITTED: ${new Date().toLocaleDateString()}`, 15, 58);
        let py = 70;
        doc.setFillColor(248, 250, 252).roundedRect(15, py, 110, 35, 2, 2, 'F');
        doc.setFontSize(9).setTextColor(15, 23, 42).setFont("helvetica", "bold").text("REPORT PARAMETERS", 20, py + 7);
        doc.setFontSize(8).setTextColor(100).setFont("helvetica", "normal");
        const projLabel = this.filters.projects.size > 0 ? Array.from(this.filters.projects).join(', ') : "All Projects";
        const bldLabel = this.filters.buildings.size > 0 ? Array.from(this.filters.buildings).join(', ') : "All Buildings";
        doc.text(`Scope: ${projLabel.toUpperCase().substring(0, 45)}`, 20, py + 14);
        doc.text(`Groups: ${bldLabel.toUpperCase().substring(0, 45)}`, 20, py + 22);
        doc.text(`Status: ${this.filters.status.toUpperCase()}`, 20, py + 30);
        doc.setFillColor(15, 23, 42).roundedRect(130, py, 65, 35, 2, 2, 'F');
        doc.setFontSize(9).setTextColor(255).setFont("helvetica", "bold").text("TOTAL UNITS", 137, py + 12);
        doc.setFontSize(26).setTextColor(255).text(`${units.length}`, 137, py + 26);
        let y = 120;
        const headers = ["ID", "PROJECT", "BLD", "FLOOR", "SQM", "VIEW", "PAYMENT PLAN", "STATUS"];
        const xPos = [15, 35, 75, 88, 105, 125, 155, 185];
        doc.setFontSize(7).setTextColor(150);
        headers.forEach((h, i) => doc.text(h, xPos[i], y));
        y += 3; doc.setDrawColor(226, 232, 240).line(15, y, 195, y); y += 6;
        units.forEach((u, i) => {
            if (y > 280) { doc.addPage(); y = 20; if (logo) doc.addImage(logo, 'PNG', 160, 10, 20, 20); }
            if (i % 2 === 0) { doc.setFillColor(248, 250, 252).rect(15, y - 4, 180, 7, 'F'); }
            doc.setFontSize(8).setTextColor(30, 41, 59).setFont("helvetica", "normal");
            doc.text(String(u.code), 15, y);
            doc.text(String(u.project).toUpperCase().substring(0, 22), 35, y);
            doc.text(String(u.buildingId || u.building || '').substring(0, 6), 75, y);
            doc.text(String(u.floor), 88, y);
            doc.text(`${u.area}`, 105, y);
            doc.text(String(u.view || '-').substring(0, 15), 125, y);
            let pp = u.payment_plan || u.paymentPlan || '-';
            if (pp.startsWith('{')) try { pp = JSON.parse(pp).name_en || 'Custom'; } catch(e) {}
            doc.text(String(pp).toUpperCase().substring(0, 15), 155, y);
            if (u.status === 'Available') doc.setTextColor(16, 185, 129);
            else if (u.status === 'Reserved') doc.setTextColor(249, 115, 22);
            else doc.setTextColor(220, 38, 38);
            doc.text(u.status, 185, y);
            y += 7;
        });
        doc.save(`ROBEL_REPORT_${Date.now()}.pdf`);
    },

    async generateOfferPDF() {
        const units = this.getFilteredUnits();
        const buildingGroups = {};
        units.forEach(u => {
            const b = String(u.buildingId || u.building || 'General Portfolio').trim().toUpperCase();
            if (!buildingGroups[b]) buildingGroups[b] = [];
            buildingGroups[b].push(u);
        });

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const logo = window.ROBEL_LOGO_BASE64 || '';
        const accentColor = [201, 162, 63];
        let y = 80;

        const drawHeader = (doc) => {
            doc.setFillColor(15, 23, 42).rect(0, 0, 210, 60, 'F');
            if (logo) try { doc.addImage(logo, 'PNG', 160, 10, 35, 35); } catch(e) {}
            doc.setTextColor(255).setFontSize(28).setFont("helvetica", "bold").text("INVESTMENT", 20, 30);
            doc.setTextColor(...accentColor).setFontSize(28).text("STRATEGIES", 20, 42);
            doc.setTextColor(255, 255, 255).setFontSize(9).setFont("helvetica", "normal");
            const projs = Array.from(this.filters.projects).join(' & ') || 'Portfolio';
            doc.text(`EXCLUSIVE FINANCIAL PROPOSAL | ${projs.toUpperCase()}`, 20, 52);
        };

        drawHeader(doc);
        doc.setTextColor(15, 23, 42).setFontSize(14).setFont("helvetica", "bold").text("Financial Strategy Breakdown", 15, y);
        y += 12;

        Object.keys(buildingGroups).sort().forEach(bName => {
            const bUnits = buildingGroups[bName];
            const seenInBuilding = new Set();
            const offers = [];

            bUnits.forEach(u => {
                let raw = u.payment_plan || u.paymentPlan || '';
                if (!raw || raw === '-' || seenInBuilding.has(raw)) return;
                seenInBuilding.add(raw);
                let offer = { name: raw, down: '-', years: '-', desc: '', discount: '' };
                if (raw.startsWith('{')) {
                    try {
                        const p = JSON.parse(raw);
                        offer.name = p.name_en || p.name || 'Strategy';
                        offer.down = p.down_payment_en || p.down_payment || '-';
                        offer.years = p.installment_years_text_en || p.installment_years_text || p.installment_years || '-';
                        offer.desc = p.description_en || p.description || '';
                        offer.discount = p.cash_discount || '';
                    } catch(e) {}
                } else {
                    const d = raw.match(/(\d+%?\s*down\s*payment)/i) || raw.match(/(\d+%\s*(contract|مقدم))/i);
                    const yr = raw.match(/(\d+\s*year)/i) || raw.match(/(\d+\s*سنوات)/i);
                    const ds = raw.match(/(discount\s*\d+%)/i) || raw.match(/(خصم\s*\d+%)/i);
                    if (d) offer.down = d[0]; if (yr) offer.years = yr[0]; if (ds) offer.discount = ds[0];
                }
                offers.push(offer);
            });

            if (offers.length === 0) return;

            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFillColor(15, 23, 42).rect(15, y, 180, 8, 'F');
            doc.setTextColor(255).setFontSize(10).setFont("helvetica", "bold").text(`BUILDING: ${bName}`, 20, y + 5.5);
            y += 15;

            offers.forEach(off => {
                if (y > 240) { doc.addPage(); y = 20; }
                doc.setFillColor(248, 250, 252).roundedRect(15, y, 180, 45, 3, 3, 'F');
                doc.setDrawColor(226, 232, 240).roundedRect(15, y, 180, 45, 3, 3, 'D');
                doc.setFillColor(...accentColor).rect(15, y + 5, 2.5, 35, 'F');
                doc.setTextColor(15, 23, 42).setFontSize(12).setFont("helvetica", "bold").text(off.name.toUpperCase(), 25, y + 10);
                doc.setFontSize(8).setTextColor(100).setFont("helvetica", "bold").text("DOWNPAYMENT", 25, y + 20);
                doc.setTextColor(15, 23, 42).setFontSize(10).text(String(off.down).toUpperCase(), 25, y + 26);
                doc.setFontSize(8).setTextColor(100).text("INSTALLMENT PERIOD", 85, y + 20);
                doc.setTextColor(15, 23, 42).setFontSize(10).text(String(off.years).toUpperCase(), 85, y + 26);
                if (off.discount) {
                    doc.setFontSize(8).setTextColor(100).text("CASH DISCOUNT", 145, y + 20);
                    doc.setTextColor(16, 185, 129).setFontSize(10).text(String(off.discount).toUpperCase(), 145, y + 26);
                }
                if (off.desc) {
                    doc.setFontSize(8).setTextColor(100).setFont("helvetica", "italic");
                    const splitDesc = doc.splitTextToSize(off.desc, 160);
                    doc.text(splitDesc, 25, y + 36);
                }
                y += 55;
            });
            y += 5;
        });

        const pc = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pc; i++) {
            doc.setPage(i);
            doc.setFillColor(15, 23, 42).rect(0, 287, 210, 10, 'F');
            doc.setTextColor(255).setFontSize(8).text(`ROBEL STRATEGY - PAGE ${i} OF ${pc}`, 105, 293, { align: 'center' });
        }
        doc.save(`ROBEL_OFFER_BY_BUILDING_${Date.now()}.pdf`);
    }
};
