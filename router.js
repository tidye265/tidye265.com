// router.js - Ultra SPA Engine for tiDye265 (Professional with Skeleton Loader)
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

    // ── SKELETON LOADER HTML ──
    function getSkeletonHTML() {
        return `
        <div id="skeleton-loader" style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
            <style>
                @keyframes skeleton-loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .skel-anim {
                    background: linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%);
                    background-size: 200% 100%;
                    animation: skeleton-loading 1.5s infinite;
                    border-radius: 8px;
                }
                .skel-circle {
                    border-radius: 50%;
                }
            </style>
            <!-- Avatar Skeleton -->
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="skel-anim skel-circle" style="width: 50px; height: 50px;"></div>
                <div style="flex: 1;">
                    <div class="skel-anim" style="height: 16px; width: 60%; margin-bottom: 8px;"></div>
                    <div class="skel-anim" style="height: 12px; width: 40%;"></div>
                </div>
            </div>
            <!-- Balance Card Skeleton -->
            <div class="skel-anim" style="height: 80px; width: 100%;"></div>
            <!-- Action Buttons Skeleton -->
            <div style="display: flex; gap: 12px;">
                <div class="skel-anim" style="flex: 1; height: 48px;"></div>
                <div class="skel-anim" style="flex: 1; height: 48px;"></div>
            </div>
            <!-- Settings List Skeleton -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div class="skel-anim" style="height: 20px; width: 100%;"></div>
                <div class="skel-anim" style="height: 20px; width: 100%;"></div>
                <div class="skel-anim" style="height: 20px; width: 100%;"></div>
                <div class="skel-anim" style="height: 20px; width: 100%;"></div>
            </div>
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
            newScript.onerror = () => reject(new Error(`Failed to load script: ${jsUrl}`));
            document.body.appendChild(newScript);
        });
    }

    async function navigate(url) {
        const currentContainer = document.querySelector('#app-content');
        const currentUrl = window.location.pathname;
        const targetPath = new URL(url, window.location.origin).pathname;

        // Only show skeleton if navigating to a different page
        if (currentUrl !== targetPath && currentContainer) {
            currentContainer.innerHTML = getSkeletonHTML();
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
