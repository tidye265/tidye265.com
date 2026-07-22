// router.js - Smart Micro SPA Engine ya tiDye265 (v3.0)
(function() {
    'use strict';

    // Kusunga ma script omwe adalowetsedwa kuti tiyeretse nthawi yotsatira
    let dynamicScripts = [];

    function cleanupScripts() {
        dynamicScripts.forEach(s => {
            if (s.parentNode) s.parentNode.removeChild(s);
        });
        dynamicScripts = [];
    }

    window.loadPage = async function(url) {
        if (window.NProgress) NProgress.start();

        try {
            const response = await fetch(url);
            const htmlText = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            // 1. Tenga Content yatsopano yoyika pa Screen
            const newContent = doc.querySelector('#app-content') || doc.body;
            const currentContainer = document.querySelector('#app-content');

            if (currentContainer) {
                currentContainer.innerHTML = newContent.innerHTML;
            }

            // 2. Sinthani Address Bar ya Browser
            window.history.pushState({}, '', url);

            // 3. Yeretsani ma script akale kuti asabwereze
            cleanupScripts();

            // 4. EXECUTE ALL SCRIPTS (Tengani ma scripts pa DOC YONSE!)
            const allScripts = doc.querySelectorAll('script');

            allScripts.forEach((oldScript) => {
                // Pewani kudzilowetsa kachiwiri mu router script yomweyo, supabase, ndi turnstile
                const src = oldScript.getAttribute('src') || '';
                if (src.includes('router.js')) return;
                if (src.includes('supabase') || src.includes('turnstile')) return;

                const newScript = document.createElement('script');

                // Copy attributes (src, type, etc.)
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });

                // Copy JS Code (Gwiritsani ntchito textContent kuti isagwe)
                newScript.textContent = oldScript.textContent;

                // Append to body kuti imvekedwe
                document.body.appendChild(newScript);
                dynamicScripts.push(newScript); // Sungani kuti mudzayeretse
            });

            // 5. Trigger page-specific init (ma page onse amagwiritsa ntchito pageInit)
            if (typeof window.pageInit === 'function') {
                try {
                    await window.pageInit();
                } catch(e) {
                    console.warn('pageInit error:', e);
                }
            }

            // 6. Sinthani active navigation (highlight current tab)
            updateActiveNav(url);

        } catch (error) {
            console.error('Failed to load page:', error);
        } finally {
            if (window.NProgress) NProgress.done();
        }
    };

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

    // Interceptor ya Links - imayimba pa load koyamba
    document.addEventListener('DOMContentLoaded', () => {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a[href$=".html"]');
            if (link && !link.getAttribute('target')) {
                e.preventDefault();
                window.loadPage(link.getAttribute('href'));
            }
        });

        window.addEventListener('popstate', () => {
            window.loadPage(window.location.href);
        });

        // Imbani pageInit pa page yoyamba
        if (typeof window.pageInit === 'function') {
            window.pageInit();
        }
    });

    // Export
    window.tidyeRouter = { loadPage: window.loadPage };
})();
