// router.js - Smart SPA Engine for tiDye265 (v4.0) - Fixes content & script execution
(function() {
    'use strict';

    // Cache for faster navigation
    const pageCache = new Map();
    const CACHE_SIZE = 10;
    let dynamicScripts = [];

    // Clean up old dynamic scripts to avoid duplicates
    function cleanupScripts() {
        dynamicScripts.forEach(s => {
            if (s.parentNode) s.parentNode.removeChild(s);
        });
        dynamicScripts = [];
    }

    async function loadPage(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // --- 1. Replace only the content of #app-content (not the header/footer) ---
            const newContent = doc.querySelector('#app-content');
            const currentContainer = document.querySelector('#app-content');

            if (currentContainer && newContent) {
                // Use innerHTML to get only the HTML inside <main id="app-content">
                currentContainer.innerHTML = newContent.innerHTML;
            } else {
                console.warn('No #app-content found in fetched page');
                // Fallback: replace whole body if #app-content missing
                if (currentContainer) {
                    currentContainer.innerHTML = doc.body.innerHTML;
                }
            }

            // --- 2. Clean up old dynamic scripts ---
            cleanupScripts();

            // --- 3. Extract & execute all scripts from the fetched page ---
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(oldScript => {
                // Skip router script itself and core libraries already in head
                const src = oldScript.getAttribute('src') || '';
                const text = oldScript.textContent || '';
                if (src.includes('router.js')) return;
                if (src.includes('supabase') || src.includes('turnstile')) return;
                if (text.includes('loadPage') && text.includes('pageCache')) return;

                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                newScript.textContent = oldScript.textContent;
                document.body.appendChild(newScript);
                dynamicScripts.push(newScript);
            });

            // --- 4. Update URL and active navigation ---
            window.history.pushState({}, '', url);
            updateActiveNav(url);

            // --- 5. Trigger page initialization (if defined) ---
            if (typeof window.pageInit === 'function') {
                try { await window.pageInit(); } catch (e) { console.warn('pageInit error:', e); }
            }

        } catch (error) {
            console.error('Failed to load page:', error);
        }
    }

    function updateActiveNav(url) {
        const items = document.querySelectorAll('.sub-item');
        let matched = false;
        items.forEach(item => {
            const href = item.getAttribute('href');
            if (href && url.endsWith(href)) {
                item.classList.add('active');
                matched = true;
            } else {
                item.classList.remove('active');
            }
        });
        if (!matched) {
            const path = url.split('/').pop() || '';
            const base = path.split('?')[0].replace('.html', '');
            items.forEach(item => {
                const cat = item.dataset.category;
                if (cat && base === cat) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
    }

    // --- Intercept clicks and popstate ---
    document.addEventListener('DOMContentLoaded', () => {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a[href$=".html"]');
            if (link && !link.getAttribute('target')) {
                e.preventDefault();
                loadPage(link.getAttribute('href'));
            }
        });

        window.addEventListener('popstate', () => {
            loadPage(window.location.href);
        });

        // Initial page load
        if (typeof window.pageInit === 'function') {
            window.pageInit();
        }
    });

    window.tidyeRouter = { loadPage };
})();
