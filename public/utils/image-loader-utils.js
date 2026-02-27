/**
 * IMAGE LOADER & OPTIMIZER
 * 
 * Implements the "Complete Solution" for image handling:
 * 1. Lazy loading by default
 * 2. Blur-up effect (progressive loading)
 * 3. Fallback error handling
 * 4. Firebase Storage helper
 */

const ImageOptimizer = {
    // Configuration
    config: {
        fallback: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // Transparent placeholder instead of logo
        placeholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // Transparent 1x1
        loadingClass: 'img-loading-blur',
        loadedClass: 'img-loaded-clear',
        errorClass: 'img-error'
    },

    // Initialize the optimizer for all images on the page
    init: function () {
        console.log('🖼️ Image Optimizer Initializing...');
        this.processImages(document.querySelectorAll('img'));

        // Watch for new images added to the DOM (for dynamic content)
        this.observeMutations();
    },

    // Process a list of image elements
    processImages: function (images) {
        images.forEach(img => {
            // Skip images already processed
            if (img.dataset.optimized === 'true') return;

            this.optimizeImage(img);
        });
    },

    // Apply optimizations to a single image
    optimizeImage: function (img) {
        // 1. Enforce Lazy Loading
        if (!img.getAttribute('loading')) {
            img.setAttribute('loading', 'lazy');
        }

        // 2. Add Blur Effect Logic (ONLY if not already loaded)
        if (img.complete && img.naturalWidth > 0) {
            // Already loaded, just mark as clear
            this.handleLoad(img);
        } else {
            // Add blur and wait for load
            img.classList.add('transition-all', 'duration-500', this.config.loadingClass);
            img.addEventListener('load', () => this.handleLoad(img), { once: true });
        }

        // 3. Handle Error Event
        img.addEventListener('error', () => this.handleError(img), { once: true });

        // Mark as processed
        img.dataset.optimized = 'true';
    },

    handleLoad: function (img) {
        img.classList.remove(this.config.loadingClass);
        img.classList.add(this.config.loadedClass);
    },

    handleError: function (img) {
        console.warn(`❌ Image failed to load: ${img.src}`);
        img.classList.remove(this.config.loadingClass);
        img.classList.add(this.config.errorClass);

        // Avoid infinite loop if fallback fails
        if (!img.dataset.hasFallback) {
            img.dataset.hasFallback = 'true';
            img.src = this.config.fallback;
            // Optional: Set object-fit to contain for fallback (often a logo)
            img.style.objectFit = 'contain';
            img.style.padding = '20px';
            img.style.backgroundColor = '#f8f9fa';
        }
    },

    // Observer for dynamic content (like loading projects via JS)
    observeMutations: function () {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.tagName === 'IMG') {
                            this.optimizeImage(node);
                        } else {
                            // Find images inside the new node
                            const nestedImages = node.querySelectorAll('img');
                            this.processImages(nestedImages);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },

    // Firebase storage helper removed as part of Cloudflare migration.


    // Global Scroll Reveal Observer
    initScrollReveal: function () {
        if (!window.revealObserver && typeof IntersectionObserver !== 'undefined') {
            window.revealObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible', 'reveal-visible');
                        window.revealObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
        }

        // Auto-observe standard reveal elements
        document.querySelectorAll('.reveal, .reveal-up, .section-header, .feature-card, .billboard-section').forEach(el => {
            if (window.revealObserver) window.revealObserver.observe(el);
            else el.classList.add('reveal-visible');
        });
    }
};

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ImageOptimizer.init();
    ImageOptimizer.initScrollReveal();
});

// Expose globally
window.ImageOptimizer = ImageOptimizer;
