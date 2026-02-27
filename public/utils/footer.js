/**
 * ============================================
 * ROBEL PROFESSIONAL FOOTER MODULE - V2.0
 * Date: February 2026
 * Designer: George Gamal Helmy
 * ============================================
 */

// Footer content in both languages
const footerContent = {
    ar: {
        // Section 1: Company Snapshot
        companyHeading: 'نبذة عن روبيل',
        companyText: '<span class="highlight">روبيل للاستثمار العقاري</span> هي شريك استشاري وتشغيلي عقاري رائد، متواجدون في أكثر من <span class="highlight">20 مبنى سكني</span> بالمشروعات الساحلية المتميزة في مصر. نقدم خدمات عقارية متكاملة تشمل الاستشارات، إدارة الأملاك، والتسويق العقاري بأعلى معايير الجودة والاحترافية.',

        // Section 2: Quick Links
        linksHeading: 'روابط سريعة',
        links: [
            { text: 'الرئيسية', href: '#home', icon: 'fas fa-chevron-left' },
            { text: 'من نحن', href: '#about', icon: 'fas fa-chevron-left' },
            { text: 'مشاريعنا', href: '#projects', icon: 'fas fa-chevron-left' },
            { text: 'الوحدات المتاحة', href: '#units', icon: 'fas fa-chevron-left' },
            { text: 'تواصل معنا', href: '#contact', icon: 'fas fa-chevron-left' }
        ],

        // Section 3: Projects
        projectsHeading: 'مشاريعنا',
        projects: [
            { text: 'بورتو جولف مارينا', href: 'porto-golf-marina.html', icon: 'fas fa-building' },
            { text: 'بورتو سعيد', href: 'porto-said.html', icon: 'fas fa-building' },
            { text: 'سيليبريشن', href: 'celebration.html', icon: 'fas fa-building' },
            { text: 'جميع المشاريع', href: '#all-projects', icon: 'fas fa-building' }
        ],

        // Section 4: Contact
        contactHeading: 'تواصل معنا',
        contactItems: [
            { icon: 'fas fa-map-marker-alt', text: 'الساحل الشمالي – مصر', href: null },
            { icon: 'fas fa-phone', text: '+20 127 060 5528', href: 'tel:+201270605528' },
            { icon: 'fas fa-envelope', text: 'info@robel-realestate.com', href: 'mailto:info@robel-realestate.com' },
            { icon: 'fab fa-whatsapp', text: 'واتساب للاستفسارات', href: 'https://wa.me/201270605528' }
        ],

        // Section 5: Designer
        designerHeading: 'مصمم الموقع',
        designerInfo: [
            { icon: 'fas fa-user', text: 'George Gamal Helmy' },
            { icon: 'fas fa-envelope', text: 'George.gamal139@gmail.com' },
            { icon: 'fas fa-phone', text: '01270605528' }
        ],
        designerActions: [
            { icon: 'fab fa-linkedin', text: 'LinkedIn', href: 'https://www.linkedin.com/in/georgegamal1/' },
            { icon: 'fas fa-globe', text: 'Portfolio', href: '#portfolio' }
        ],

        // Footer Bottom
        trustTagline: 'خبرة حقيقية – ثقة ممتدة – نتائج ملموسة',
        copyright: '© 2026 روبيل للاستثمار العقاري - روبيل للتنمية العمرانية – جميع الحقوق محفوظة',
        stats: [
            { icon: 'fas fa-users', text: 'محل ثقة أكثر من 1500 عميل' },
            { icon: 'fas fa-building', text: 'تسليم أكثر من 800 وحدة' },
            { icon: 'fas fa-handshake', text: 'شراكات مع كبار المطورين' }
        ]
    },

    en: {
        // Section 1: Company Snapshot
        companyHeading: 'About Robel',
        companyText: '<span class="highlight">Robel Real Estate Investment</span> is a leading real estate consultancy and operational partner, operating in over <span class="highlight">20 residential buildings</span> in Egypt\'s premier coastal developments. We provide comprehensive real estate services including consultancy, property management, and marketing with the highest standards of quality and professionalism.',

        // Section 2: Quick Links
        linksHeading: 'Quick Links',
        links: [
            { text: 'Home', href: '#home', icon: 'fas fa-chevron-right' },
            { text: 'About Robel', href: '#about', icon: 'fas fa-chevron-right' },
            { text: 'Our Projects', href: '#projects', icon: 'fas fa-chevron-right' },
            { text: 'Available Units', href: '#units', icon: 'fas fa-chevron-right' },
            { text: 'Contact Us', href: '#contact', icon: 'fas fa-chevron-right' }
        ],

        // Section 3: Projects
        projectsHeading: 'Our Projects',
        projects: [
            { text: 'Porto Golf Marina', href: 'porto-golf-marina.html', icon: 'fas fa-building' },
            { text: 'Porto Said', href: 'porto-said.html', icon: 'fas fa-building' },
            { text: 'Celebration', href: 'celebration.html', icon: 'fas fa-building' },
            { text: 'All Projects', href: '#all-projects', icon: 'fas fa-building' }
        ],

        // Section 4: Contact
        contactHeading: 'Contact Us',
        contactItems: [
            { icon: 'fas fa-map-marker-alt', text: 'North Coast – Egypt', href: null },
            { icon: 'fas fa-phone', text: '+20 127 060 5528', href: 'tel:+201270605528' },
            { icon: 'fas fa-envelope', text: 'info@robel-realestate.com', href: 'mailto:info@robel-realestate.com' },
            { icon: 'fab fa-whatsapp', text: 'WhatsApp Inquiries', href: 'https://wa.me/201270605528' }
        ],

        // Section 5: Designer
        designerHeading: 'Website Designer',
        designerInfo: [
            { icon: 'fas fa-user', text: 'George Gamal Helmy' },
            { icon: 'fas fa-envelope', text: 'George.gamal139@gmail.com' },
            { icon: 'fas fa-phone', text: '01270605528' }
        ],
        designerActions: [
            { icon: 'fab fa-linkedin', text: 'LinkedIn', href: 'https://www.linkedin.com/in/georgegamal1/' },
            { icon: 'fas fa-globe', text: 'Portfolio', href: '#portfolio' }
        ],

        // Footer Bottom
        trustTagline: 'Real Expertise – Extended Trust – Tangible Results',
        copyright: '© 2026 Robel Real Estate Investment - Robel Urban Development. All rights reserved.',
        stats: [
            { icon: 'fas fa-users', text: 'Trusted by 1500+ Clients' },
            { icon: 'fas fa-building', text: '800+ Units Delivered' },
            { icon: 'fas fa-handshake', text: 'Strategic Partner of Leading Developers' }
        ]
    }
};

// Social media links (same for both languages)
const socialLinks = [
    { platform: 'Facebook', icon: 'fab fa-facebook-f', href: 'https://www.facebook.com/robel-realestate' },
    { platform: 'Instagram', icon: 'fab fa-instagram', href: 'https://www.instagram.com/robel-realestate' },
    { platform: 'LinkedIn', icon: 'fab fa-linkedin-in', href: 'https://www.linkedin.com/company/robel-realestate' },
    { platform: 'YouTube', icon: 'fab fa-youtube', href: 'https://www.youtube.com/@robel-realestate' }
];

/**
 * Generate footer HTML based on current language
 * @param {string} lang - Language code ('ar' or 'en')
 * @returns {string} - Complete footer HTML
 */
function generateFooterHTML(lang = 'ar') {
    const content = footerContent[lang];
    const dir = lang === 'ar' ? 'rtl' : 'ltr';

    return `
    <footer class="robel-footer" dir="${dir}">
        <div class="footer-container">
            <!-- Main Footer Grid -->
            <div class="footer-grid">
                
                <!-- Section 1: Company Snapshot -->
                <div class="footer-section footer-company">
                    <h3>${content.companyHeading}</h3>
                    <p>${content.companyText}</p>
                </div>
                
                <!-- Section 2: Quick Links -->
                <div class="footer-section footer-links">
                    <h3>${content.linksHeading}</h3>
                    <ul>
                        ${content.links.map(link => `
                            <li>
                                <a href="${link.href}">
                                    <i class="${link.icon}"></i>
                                    <span>${link.text}</span>
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <!-- Section 3: Our Projects -->
                <div class="footer-section footer-projects">
                    <h3>${content.projectsHeading}</h3>
                    <ul>
                        ${content.projects.map(project => `
                            <li>
                                <a href="${project.href}">
                                    <i class="${project.icon}"></i>
                                    <span>${project.text}</span>
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <!-- Section 4: Contact Information -->
                <div class="footer-section footer-contact">
                    <h3>${content.contactHeading}</h3>
                    ${content.contactItems.map(item => `
                        <div class="contact-item">
                            <i class="${item.icon}"></i>
                            ${item.href ?
            `<a href="${item.href}">${item.text}</a>` :
            `<span>${item.text}</span>`
        }
                        </div>
                    `).join('')}
                    
                    <!-- Social Media Links -->
                    <div class="social-links">
                        ${socialLinks.map(social => `
                            <a href="${social.href}" 
                               aria-label="${social.platform}" 
                               target="_blank" 
                               rel="noopener noreferrer">
                                <i class="${social.icon}"></i>
                            </a>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Section 5: Designer Information -->
                <div class="footer-section footer-designer">
                    <h3>${content.designerHeading}</h3>
                    <div class="designer-info">
                        ${content.designerInfo.map(info => `
                            <div class="contact-item">
                                <i class="${info.icon}"></i>
                                <span>${info.text}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="designer-actions">
                        ${content.designerActions.map(action => `
                            <a href="${action.href}" target="_blank" rel="noopener noreferrer">
                                <i class="${action.icon}"></i>
                                <span>${action.text}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
                
            </div>
            
            <!-- Footer Bottom Section -->
            <div class="footer-bottom">
                <!-- Trust Tagline -->
                <div class="trust-tagline">
                    ${content.trustTagline}
                </div>
                
                <!-- Copyright Notice -->
                <div class="copyright">
                    ${content.copyright}
                </div>
                
                <!-- Statistics Bar -->
                <div class="stats-bar">
                    ${content.stats.map(stat => `
                        <div class="stat-item">
                            <i class="${stat.icon}"></i>
                            <span>${stat.text}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
        </div>
    </footer>
    `;
}

/**
 * Initialize footer on page load
 * Automatically detects language from document or localStorage
 */
function initializeFooter() {
    // Detect current language
    const htmlLang = document.documentElement.getAttribute('lang');
    const storedLang = localStorage.getItem('language');
    const currentLang = htmlLang || storedLang || 'ar';

    // Generate and inject footer
    const footerHTML = generateFooterHTML(currentLang === 'en' ? 'en' : 'ar');

    // Find the footer container or append to body
    let footerContainer = document.getElementById('footer-container');

    if (!footerContainer) {
        // If no container exists, append to body
        document.body.insertAdjacentHTML('beforeend', footerHTML);
    } else {
        footerContainer.innerHTML = footerHTML;
    }

    // Setup smooth scroll for anchor links
    setupSmoothScroll();
}

/**
 * Update footer language dynamically
 * @param {string} newLang - New language code ('ar' or 'en')
 */
function updateFooterLanguage(newLang) {
    const footer = document.querySelector('.robel-footer');
    if (footer) {
        const newFooterHTML = generateFooterHTML(newLang);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newFooterHTML;
        footer.replaceWith(tempDiv.firstElementChild);
        setupSmoothScroll();
    }
}

/**
 * Setup smooth scrolling for internal anchor links
 */
function setupSmoothScroll() {
    const anchorLinks = document.querySelectorAll('.robel-footer a[href^="#"]');

    anchorLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Skip if href is just '#'
            if (href === '#' || href === '#all-projects' || href === '#portfolio') {
                e.preventDefault();
                return;
            }

            const target = document.querySelector(href);

            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Listen for language changes
 * This function should be called when language toggle is clicked
 */
function listenForLanguageChanges() {
    // Listen for custom language change event
    document.addEventListener('languageChanged', function (e) {
        updateFooterLanguage(e.detail.language);
    });

    // Also check localStorage periodically (fallback)
    let lastLang = localStorage.getItem('language') || 'ar';
    setInterval(() => {
        const currentLang = localStorage.getItem('language') || 'ar';
        if (currentLang !== lastLang) {
            lastLang = currentLang;
            updateFooterLanguage(currentLang);
        }
    }, 1000);
}

// Initialize footer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFooter);
    document.addEventListener('DOMContentLoaded', listenForLanguageChanges);
} else {
    initializeFooter();
    listenForLanguageChanges();
}

// Export functions for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateFooterHTML,
        initializeFooter,
        updateFooterLanguage
    };
}
