// router.js - Ultra SPA Engine for tiDye265 (Professional v2)
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

    // Load HTML content into #app-content
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

            // 2. Sinthani address bar
            window.history.pushState({}, '', url);

        } catch (error) {
            console.error('Router Error (loadPage):', error);
        }
    }

    // Load JavaScript file dynamically and wait for it to load
    function loadScript(jsUrl) {
        return new Promise((resolve, reject) => {
            // Yeretsani ma script akale musanalowetse watsopano
            cleanupInjectedScripts();

            // Kuyeretsa window.init kuti tipewe kusokonezeka ndi page yakale
            window.init = null;

            const newScript = document.createElement('script');
            newScript.src = jsUrl;
            newScript.onload = () => {
                injectedScripts.push(newScript);
                resolve();
            };
            newScript.onerror = () => reject(new Error(`Failed to load script: ${jsUrl}`));
            document.body.appendChild(newScript);
        });
    }

    // Navigate function: load HTML, then JS, then init
    async function navigate(url) {
        try {
            // 1. Load HTML
            await loadPage(url);

            // 2. Determine JS file from URL (e.g., deposit.html -> deposit.js)
            const path = url.split('/').pop().split('?')[0]; // get file name with extension
            const baseName = path.replace('.html', '');
            const jsUrl = baseName + '.js';

            // 3. Load JavaScript and wait for it to complete
            await loadScript(jsUrl);

            // 4. Call window.init if available (wait for it to finish)
            if (typeof window.init === 'function') {
                try {
                    await window.init();
                } catch (e) {
                    console.warn('init error:', e);
                }
            } else {
                console.warn('window.init is not a function after loading', jsUrl);
            }

        } catch (error) {
            console.error('Router Error (navigate):', error);
        }
    }

    // Interceptor ya links (popstate ndi click)
    document.addEventListener('DOMContentLoaded', async () => {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a[href$=".html"]');
            if (link && !link.getAttribute('target')) {
                e.preventDefault();
                navigate(link.getAttribute('href'));
            }
        });

        window.addEventListener('popstate', () => {
            navigate(window.location.href);
        });

        // Imbani navigate pa page yoyamba
        await navigate(window.location.href);
    });

    window.tidyeRouter = { navigate };
})();
