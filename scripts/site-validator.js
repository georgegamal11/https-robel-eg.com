const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'public');
const htmlFiles = [
    'index.html',
    'celebration.html',
    'porto-golf-marina.html',
    'porto-said.html',
    'unit-details.html',
    'units.html'
];

const results = {
    pages: {},
    errors: [],
    warnings: []
};

function getAttribute(tag, attr) {
    const regex = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
    const match = tag.match(regex);
    return match ? match[1] : null;
}

function validatePage(file) {
    console.log(`Validating ${file}...`);
    const filePath = path.join(baseDir, file);
    if (!fs.existsSync(filePath)) {
        results.errors.push(`File not found: ${file}`);
        return;
    }

    const html = fs.readFileSync(filePath, 'utf8');

    const pageReport = {
        links: 0,
        brokenLinks: [],
        images: 0,
        brokenImages: [],
        forms: 0,
        brokenScripts: [],
        brokenStyles: []
    };

    // Find links
    const aTags = html.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
    pageReport.links = aTags.length;
    aTags.forEach(tag => {
        const href = getAttribute(tag, 'href');
        if (!href || href === '#' || href.startsWith('tel:') || href.startsWith('mailto:') || href.startsWith('http') || href.startsWith('https') || href.startsWith('javascript:')) {
            return;
        }
        const cleanHref = href.split('?')[0].split('#')[0];
        if (cleanHref) {
            const linkPath = path.join(baseDir, cleanHref);
            if (!fs.existsSync(linkPath)) {
                pageReport.brokenLinks.push(href);
            }
        }
    });

    // Find images
    const imgTags = html.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi) || [];
    pageReport.images = imgTags.length;
    imgTags.forEach(tag => {
        const src = getAttribute(tag, 'src');
        if (!src || src.startsWith('http') || src.startsWith('data:')) return;
        const imgPath = path.join(baseDir, src);
        if (!fs.existsSync(imgPath)) {
            pageReport.brokenImages.push(src);
        }
    });

    // Find forms
    const formTags = html.match(/<form\s+[^>]*>/gi) || [];
    pageReport.forms = formTags.length;

    // Scripts
    const scriptTags = html.match(/<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi) || [];
    scriptTags.forEach(tag => {
        const src = getAttribute(tag, 'src');
        if (src && !src.startsWith('http')) {
            const scriptPath = path.join(baseDir, src);
            if (!fs.existsSync(scriptPath)) {
                pageReport.brokenScripts.push(src);
            }
        }
    });

    // Styles
    const linkTags = html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi) || [];
    linkTags.forEach(tag => {
        const href = getAttribute(tag, 'href');
        const rel = getAttribute(tag, 'rel');
        if (rel === 'stylesheet' && href && !href.startsWith('http')) {
            const cssPath = path.join(baseDir, href.split('?')[0]);
            if (!fs.existsSync(cssPath)) {
                pageReport.brokenStyles.push(href);
            }
        }
    });

    results.pages[file] = pageReport;
}

for (const file of htmlFiles) {
    validatePage(file);
}

const outputPath = path.join(__dirname, '..', 'validation_report.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log('Validation complete. Report saved to validation_report.json');
