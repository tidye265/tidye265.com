// router.js - Ultra SPA Engine for tiDye265 (Professional with PAGE_CONTROLLERS)
(function() {
    'use strict';

    // ── PAGE CONTROLLERS MAP ──
    // Izi ndi zomwe zimalumikiza HTML page ndi JS file ndi init function yake.
    const PAGE_CONTROLLERS = {
        'index.html':       { script: 'index.js',       init: 'initIndexPage' },
        'account.html':     { script: 'account.js',     init: 'initAccountPage' },
        'deposit.html':     { script: 'deposit.js',     init: 'initDepositPage' },
        'withdraw.html':    { script: 'withdraw.js',    init: 'initWithdrawPage' },
        'transactions.html':{ script: 'transactions.js',init: 'initTransactionsPage' },
        'settings.html':    { script: 'settings.js',    init: 'initSettingsPage' },
        'login.html':       { script: 'login.js',       init: 'initLoginPage' },
        'register.html':    { script: 'register.js',    init: 'initRegisterPage' },
        'live.html':        { script: 'live.js',        init: 'initLivePage' },
        'matches.html':     { script: 'matches.js',     init: 'initMatchesPage' },
        'casino.html':      { script: 'casino.js',      init: 'initCasinoPage' },
        'aviator.html':     { script: 'aviator.js',     init: 'initAviatorPage' },
        'virtual.html':     { script: 'virtual.js',     init: 'initVirtualPage' },
        'games.html':       { script: 'games.js',       init: 'initGamesPage' },
        'esports.html':     { script: 'esports.js',     init: 'initEsportsPage' },
        'faq.html':         { script: 'faq.js',         init: 'initFaqPage' },
        'terms.html':       { script: 'terms.js',       init: 'initTermsPage' },
        'privacy.html':     { script: 'privacy.js',     init: 'initPrivacyPage' }
    };

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

    // Navigate function: load HTML, then JS, then call specific init function
    async function navigate(url) {
        try {
            // 1. Load HTML
            await loadPage(url);

            // 2. Determine the page file name (e.g., "account.html")
            const fileName = url.split('/').pop().split('?')[0] || 'index.html';

            // 3. Get controller entry for this page
            const controller = PAGE_CONTROLLERS[fileName];
            if (!controller) {
                console.warn(`No controller defined for page: ${fileName}`);
                return;
            }

            // 4. Load the specific JS file
            await loadScript(controller.script);

            // 5. Call the specific init function if available
            if (typeof window[controller.init] === 'function') {
                try {
                    await window[controller.init]();
                } catch (e) {
                    console.warn(`Error in ${controller.init}:`, e);
                }
            } else {
                console.warn(`Function ${controller.init} is not defined after loading ${controller.script}`);
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
