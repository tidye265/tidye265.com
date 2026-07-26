// router.js - Ultra SPA Engine for tiDye265 (Professional v3 - No Skeleton)
(function() {
    'use strict';

    // ── PAGE CONTROLLERS MAP ──
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

    let injectedScripts = [];

    function cleanupInjectedScripts() {
        injectedScripts.forEach(script => {
            if (script.parentNode) script.parentNode.removeChild(script);
        });
        injectedScripts = [];
    }

    // ── LOADER HTML (Simple text-based loader) ──
    function getLoaderHTML() {
        return `
        <div id="spa-loader" style="display: flex; align-items: center; justify-content: center; padding: 40px; font-family: 'Lexend', sans-serif; color: #6b7280; font-size: 14px;">
            <i class="bi bi-arrow-repeat spin-icon" style="animation: spin 1s linear infinite; display: inline-block; margin-right: 10px;"></i> 
            Loading...
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .spin-icon { display: inline-block; }
            </style>
        </div>
        `;
    }

    async function loadPage(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load page');
            const htmlText = await response.text();

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            const newContent = doc.querySelector('#app-content') || doc.body;
            const currentContainer = document.querySelector('#app-content');
            if (currentContainer) {
                currentContainer.innerHTML = newContent.innerHTML;
            }

            window.history.pushState({}, '', url);

        } catch (error) {
            console.error('Router Error (loadPage):', error);
        }
    }

    function loadScript(jsUrl) {
        return new Promise((resolve, reject) => {
            cleanupInjectedScripts();

            const newScript = document.createElement('script');
            newScript.src = jsUrl;
            newScript.onload = () => {
                injectedScripts.push(newScript);
                resolve();
            };
            newScript.onerror = () => {
                console.error(`Failed to load script: ${jsUrl}`);
                reject(new Error(`Failed to load script: ${jsUrl}`));
            };
            document.body.appendChild(newScript);
        });
    }

    async function navigate(url) {
        const currentContainer = document.querySelector('#app-content');
        const currentUrl = window.location.pathname;
        const targetPath = new URL(url, window.location.origin).pathname;

        // Only show loader if navigating to a different page
        if (currentUrl !== targetPath && currentContainer) {
            currentContainer.innerHTML = getLoaderHTML();
        }

        try {
            await loadPage(url);

            const fileName = url.split('/').pop().split('?')[0] || 'index.html';
            const controller = PAGE_CONTROLLERS[fileName];
            if (!controller) {
                console.warn(`No controller defined for page: ${fileName}`);
                return;
            }

            await loadScript(controller.script);

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

    // ── INTERCEPTOR ──
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

        await navigate(window.location.href);
    });

    window.tidyeRouter = { navigate };
})();
