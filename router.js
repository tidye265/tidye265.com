// router.js - Ultra SPA Engine for tiDye265 (Fixed Script Execution)
(function() {
    'use strict';

    let injectedScripts = []; // Sungani ma script omwe alowetsedwa kuti amuchotse

    // Kuchotsa ma script akale kuti asasemphane
    function cleanupInjectedScripts() {
        injectedScripts.forEach(script => {
            if (script.parentNode) script.parentNode.removeChild(script);
        });
        injectedScripts = [];
    }

    async function loadPage(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load page');
            const htmlText = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            // 1. Yeretsani #app-content (sinthani content yokha)
            const newContent = doc.querySelector('#app-content') || doc.body;
            const currentContainer = document.querySelector('#app-content');
            if (currentContainer) {
                currentContainer.innerHTML = newContent.innerHTML;
            }

            // 2. Yeretsani ma script akale ku DOM
            cleanupInjectedScripts();

            // 3. Tenganinso ma script onse mu tsamba latsopano ndikuyika mu body kuti aimbe
            const scripts = newContent.querySelectorAll('script');
            scripts.forEach((oldScript) => {
                // Pewani kuphatikiza ma global scripts (supabase, turnstile, router)
                const src = oldScript.getAttribute('src') || '';
                const text = oldScript.textContent || '';
                if (src.includes('supabase') || src.includes('turnstile') || 
                    src.includes('router.js') || (text.includes('loadPage') && text.includes('pageCache'))) {
                    return;
                }

                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                newScript.textContent = oldScript.textContent;

                // Ikani pa body – browser iyamba kuwagwiritsa ntchito nthawi yomweyo!
                document.body.appendChild(newScript);
                injectedScripts.push(newScript);
            });

            // 4. Sinthani address bar
            window.history.pushState({}, '', url);

            // 5. Imbani pageInit yomwe ili mu page (ngati ilipo)
            if (typeof window.pageInit === 'function') {
                try { window.pageInit(); } catch (e) { console.warn('pageInit error:', e); }
            }

        } catch (error) {
            console.error('Router Error:', error);
        }
    }

    // Interceptor ya links (popstate ndi click)
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

        // Imbani pageInit pa page yoyamba
        if (typeof window.pageInit === 'function') {
            window.pageInit();
        }
    });

    window.tidyeRouter = { loadPage };
})();
