/**
 * ðŸ—ï¸ نظام ذكي احترافي لتحليل أكواد الوحدات العقارية
 * متخصص في المشروعات السياحية المصرية: Porto Golf Marina, Porto Said, Porto Sokhna.
 */

const UnitParser = {
    // Project Definitions
    PROJECTS: {
        SAID: { name: "Porto Said", range: [1, 99], type: "Said", buildings: [9, 10, 15, 16, 17, 33] },
        GOLF: { name: "Porto Golf Marina", range: [100, 299], type: "Golf", buildings: [51, 52, 78, 121, 133, 136, 223, 224, 225, 226, 230, 243] },
        SOKHNA: { name: "Porto Sokhna", range: [300, 999], type: "Sokhna", buildings: [] }
    },

    // Numeric conversion maps
    NUMERAL_MAP: {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
        '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
        '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
    },

    FLOOR_NAMES_AR: {
        '0': 'الأرضي', '00': 'الأرضي', '01': 'الأول', '1': 'الأول',
        '02': 'الثاني', '2': 'الثاني', '03': 'الثالث', '3': 'الثالث',
        '04': 'الرابع', '4': 'الرابع', '05': 'الخامس', '5': 'الخامس',
        '06': 'السادس', '6': 'السادس', '07': 'السابع', '7': 'السابع',
        '08': 'الثامن', '8': 'الثامن', '09': 'التاسع', '9': 'التاسع',
        '10': 'العاشر', '11': 'الحادي عشر', '12': 'الثاني عشر', '13': 'الثالث عشر',
        '14': 'الرابع عشر', '15': 'الخامس عشر', '16': 'السادس عشر', '17': 'السابع عشر',
        '18': 'الثامن عشر', '19': 'التاسع عشر', '20': 'العشرون', '21': 'الحادي والعشرون',
        '22': 'الثاني والعشرون', '23': 'الثالث والعشرون', '24': 'الرابع والعشرون', '25': 'الخامس والعشرون',
        '26': 'السادس والعشرون', '27': 'السابع والعشرون', '28': 'الثامن والعشرون', '29': 'التاسع والعشرون',
        '30': 'الثلاثون', '31': 'الحادي والثلاثون', '32': 'الثاني والثلاثون', '33': 'الثالث والثلاثون',
        '34': 'الرابع والثلاثون', '35': 'الخامس والثلاثون', '36': 'السادس والثلاثون', '37': 'السابع والثلاثون',
        '38': 'الثامن والثلاثون', '39': 'التاسع والثلاثون', '40': 'الأربعون', '41': 'الحادي والأربعون',
        '42': 'الثاني والأربعون', '43': 'الثالث والأربعون', '44': 'الرابع والأربعون', '45': 'الخامس والأربعون',
        '46': 'السادس والأربعون', '47': 'السابع والأربعون', '48': 'الثامن والأربعون', '49': 'التاسع والأربعون',
        '50': 'الخمسون'
    },

    /**
     * Main Parse Function
     * @param {string} input - Any unit code format
     * @returns {Object} Analysis result
     */
    parse: function (input) {
        if (!input) return this.error("يرجى إدخال كود الوحدة");

        // 1. Pre-process input
        let raw = input.toString().trim();

        // Convert Hindi numerals to Western
        raw = raw.replace(/[٠-٩0-9]/g, d => this.NUMERAL_MAP[d] || d);

        // 2. Extract components using various methods
        let results = [];

        // ðŸš€ Porto Said Model Logic: Check for trailing A, B, or C
        const suffixMatch = raw.match(/[ABCabc]$/);
        const suffix = suffixMatch ? suffixMatch[0].toUpperCase() : "";
        const cleanRaw = suffix ? raw.slice(0, -1) : raw;

        // ðŸš€ Method A: Shop Pattern (e.g. "B9S10", "B10S3B")
        const shopMatch = raw.match(/^B?(\d+)S(\d+)([ABCabc])?$/i);
        if (shopMatch) {
            results.push(this.enrich({
                b: shopMatch[1],
                f: "0", // Shops are always Ground
                u: shopMatch[2],
                suffix: shopMatch[3] ? shopMatch[3].toUpperCase() : "",
                isShop: true,
                confidence: 1.0
            }));
        } else {
            // Method B: Explicit Text/Dashes (e.g. "133-4-24" or "مبنى 133 دور 4 وحدة 24")
            const explicitMatch = this.extractExplicit(cleanRaw);
            if (explicitMatch) {
                results.push(this.enrich({ ...explicitMatch, suffix }));
            } else {
                // Method C: Compact Code (e.g. "B133424", "150101")
                const digits = cleanRaw.replace(/\D/g, '');
                if (digits.length > 0) {
                    const possibilities = this.getPossibilities(digits);
                    possibilities.forEach(p => results.push(this.enrich({ ...p, suffix })));
                }
            }
        }

        // Filter and Sort results
        // Prefer complete codes, then by building range relevance
        results = results.filter((v, i, a) => a.findIndex(t => t.shortCode === v.shortCode) === i);

        if (results.length === 0) {
            return this.error("âš ï¸ خطأ - تنسيق الكود غير مدعوم أو رقم المبنى غير موجود في النظام");
        }

        // 3. Final Output Generation
        const primary = results[0];

        return {
            success: true,
            count: results.length,
            primary: primary,
            all: results,
            outputs: {
                table: this.generateTable(primary),
                text: this.generateArabicText(primary),
                short: primary.shortCode,
                suggestions: this.getSuggestions(primary)
            }
        };
    },

    /**
     * Extracts components from explicit formats
     */
    extractExplicit: function (raw) {
        // Look for 3 separate numeric groups
        const numbers = raw.match(/\d+/g);
        if (numbers && numbers.length >= 3) {
            // Check if it's dashed or has keywords
            const hasKeywords = /مبنى|دور|وحدة|building|floor|unit|apartment/i.test(raw);
            const hasDashes = raw.includes('-');

            if (hasKeywords || hasDashes) {
                return {
                    b: numbers[0],
                    f: numbers[1],
                    u: numbers[2],
                    confidence: 0.9
                };
            }
        }

        // Match specific keywords (Arabic/English)
        const bMatch = raw.match(/(?:مبنى|building|b)\s*(\d+)/i);
        const fMatch = raw.match(/(?:دور|floor|f)\s*(\d+)/i);
        const uMatch = raw.match(/(?:وحدة|شقة|unit|apt|u)\s*(\d+)/i);
        const sMatch = raw.match(/(?:محل|shop|s)\s*(\d+)/i);

        if (sMatch) {
            return {
                b: bMatch ? bMatch[1] : "",
                f: "0", // Ground floor for shops
                u: sMatch[1],
                isShop: true,
                confidence: 0.95
            };
        }

        if (bMatch || fMatch || uMatch) {
            return {
                b: bMatch ? bMatch[1] : "",
                f: fMatch ? fMatch[1] : "",
                u: uMatch ? uMatch[1] : "",
                confidence: 0.8
            };
        }

        return null;
    },

    /**
     * Logic for ambiguous compact codes
     */
    getPossibilities: function (digits) {
        const p = [];
        const L = digits.length;

        // Confidence helper: Boost if building is in known list
        const getConfidence = (b, base) => {
            const bInt = parseInt(b);
            const isKnown = Object.values(this.PROJECTS).some(proj => proj.buildings.includes(bInt));
            return isKnown ? Math.min(1.0, base + 0.3) : base;
        };

        // Rule: Unit (u) is usually the last 2 digits
        if (L < 3) {
            p.push({ b: digits, f: "", u: "", confidence: 0.5 });
            return p;
        }

        // Try interpretation 1: 3-digit building (Golf/Sokhna)
        if (L >= 3) {
            const b3 = digits.substring(0, 3);
            const bVal = parseInt(b3);
            if (bVal >= 100) {
                const rem = digits.substring(3);
                if (rem.length >= 2) {
                    p.push({
                        b: b3,
                        f: rem.slice(0, -2),
                        u: rem.slice(-2),
                        confidence: getConfidence(b3, 0.65)
                    });
                } else {
                    p.push({ b: b3, f: rem, u: "", confidence: getConfidence(b3, 0.4) });
                }
            }
        }

        // Try interpretation 2: 2-digit building (Said)
        if (L >= 4) {
            const b2 = digits.substring(0, 2);
            const bVal = parseInt(b2);
            if (bVal < 100 && bVal > 0) {
                const rem = digits.substring(2);
                if (rem.length >= 2) {
                    p.push({
                        b: b2,
                        f: rem.slice(0, -2),
                        u: rem.slice(-2),
                        confidence: getConfidence(b2, bVal <= 99 ? 0.6 : 0.2)
                    });
                }
            }
        }

        // Try interpretation 3: 1-digit building (Said)
        if (L >= 3) {
            const b1 = digits.substring(0, 1);
            const bVal = parseInt(b1);
            if (bVal > 0) {
                const rem = digits.substring(1);
                if (rem.length >= 2) {
                    p.push({
                        b: b1,
                        f: rem.slice(0, -2),
                        u: rem.slice(-2),
                        confidence: getConfidence(b1, 0.4)
                    });
                }
            }
        }

        // Sort by confidence
        return p.sort((a, b) => b.confidence - a.confidence);
    },

    /**
     * Enriches a basic {b, f, u} object
     */
    enrich: function (obj) {
        const bInt = parseInt(obj.b);
        let project = this.PROJECTS.SOKHNA; // Default

        if (obj.b === "SHOPS" || obj.isShop) project = this.PROJECTS.SAID;
        else if (!isNaN(bInt)) {
            if (bInt >= 1 && bInt <= 99) project = this.PROJECTS.SAID;
            else if (bInt >= 100 && bInt <= 299) project = this.PROJECTS.GOLF;
            else if (bInt >= 300) project = this.PROJECTS.SOKHNA;
        }

        // Model Suffix logic (Porto Said only)
        const suffix = (project.type === "Said" && obj.suffix) ? obj.suffix.toUpperCase() : "";

        const fName = this.FLOOR_NAMES_AR[obj.f] || (obj.f ? `الدور ${obj.f}` : "");
        const mid = obj.isShop ? 'S' : obj.f;
        const shortCode = `B${obj.b}${mid}${obj.u}${suffix}`;
        const isComplete = !!(obj.b && obj.u && (obj.f !== undefined || obj.isShop));

        return {
            ...obj,
            isShop: !!obj.isShop,
            suffix: suffix,
            project: project.name,
            projectNameAr: this.getProjectNameAr(project.name),
            floorName: fName,
            shortCode: shortCode,
            isComplete: isComplete
        };
    },

    getProjectNameAr: function (name) {
        if (name === "Porto Said") return "بورتو سعيد";
        if (name === "Porto Golf Marina") return "بورتو جولف مارينا الساحل الشمالى";
        if (name === "Porto Sokhna") return "بورتو السخنة";
        return name;
    },

    getSuggestions: function (item) {
        if (item.isComplete) return null;

        // Mocking available units based on building
        const units = ["01", "08", "12", "15", "24"];
        const floors = ["1", "2", "3", "4"];

        return {
            message: `ðŸ’¡ وحدات مقترحة في مبنى ${item.b}:`,
            list: units.map(u => `B${item.b}${floors[Math.floor(Math.random() * floors.length)]}${u}`)
        };
    },

    generateTable: function (item) {
        const pName = item.project;
        const b = item.b || "?";
        const f = item.f || "?";
        const u = item.u || "?";
        const suffix = item.suffix ? ` (نموذج ${item.suffix})` : "";
        const fName = item.floorName || "غير محدد";
        const fVal = item.f || (item.isShop ? "0" : "?");
        const code = item.shortCode || "B???";
        const unitLabel = item.isShop ? "المحل  " : "الوحدة ";

        // Precise padding for the ASCII box
        const pad = (str, len) => str.toString() + " ".repeat(Math.max(0, len - str.toString().length));

        return `
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘      ðŸ¢ ${item.isShop ? "بيانات المحل التجاري" : "بيانات الوحدة العقارية"}          â•‘
â• â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•£
â•‘ ðŸ“ المشروع: ${pad(pName, 26)} â•‘
â•‘ ðŸ—ï¸ المبنى: ${pad(b, 28)} â•‘
â•‘ ðŸªœ الدور: ${pad(fName + " (" + fVal + ")", 25)} â•‘
â•‘ ðŸšª ${unitLabel}: ${pad(u + suffix, 27)} â•‘
â•‘                                          â•‘
â•‘ ðŸ”‘ الكود المختصر: ${pad(code, 24)} â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•`.trim();
    },

    generateArabicText: function (item) {
        if (!item.f && !item.u && !item.isShop) return `مبنى ${item.b} بمشروع ${item.projectNameAr}\n(يرجى تحديد الدور والوحدة)`;
        if (!item.u) return `مبنى ${item.b} - ${item.floorName} - بمشروع ${item.projectNameAr}\n(يرجى تحديد رقم الوحدة)`;

        const modelText = item.suffix ? ` نموذج ${item.suffix}` : "";
        if (item.isShop) {
            return `محل رقم ${item.u}${modelText} بالدور الأرضي في مبنى ${item.b}\nبمشروع ${item.projectNameAr}`;
        }
        return `وحدة رقم ${parseInt(item.u)}${modelText} بالدور ${item.floorName} في مبنى ${item.b}\nبمشروع ${item.projectNameAr}`;
    },

    error: function (msg) {
        return { success: false, message: msg };
    }
};

// Export for browser
if (typeof window !== 'undefined') {
    window.UnitParser = UnitParser;
}

