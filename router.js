// router.js - Professional SPA Engine for tiDye265 (Clean Architecture v7)
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

    // ── LOADER HTML ──
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

    // ── ERROR DISPLAY ──
    function showErrorMessage(title, details = '') {
        const container = document.querySelector('#app-content');
        if (!container) return;
        container.innerHTML = `
        <div style="padding: 30px; text-align: center; font-family: 'Lexend', sans-serif; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; margin: 20px;">
            <h3 style="color: #dc2626; font-weight: 700;">${title}</h3>
            ${details ? `<p style="color: #991b1b; font-size: 14px; margin-top: 8px;">${details}</p>` : ''}
            <p style="color: #6b7280; font-size: 13px; margin-top: 12px;">Check the browser console (F12) for more details.</p>
        </div>
        `;
    }

    // ── SESSION CHECK ──
    function getCleanSessionToken() {
        let rawToken = localStorage.getItem('tidye_session_token');
        if (!rawToken || rawToken === 'null' || rawToken === 'undefined') return null;
        try {
            let parsed = JSON.parse(rawToken);
            if (parsed?.access_token) return parsed.access_token;
            if (typeof parsed === 'string') return parsed;
        } catch (e) {}
        return rawToken.replace(/^["']|["']$/g, '').trim();
    }

    // ── FETCH WITH RETRY ──
    async function fetchWithRetry(url, options = {}, retries = 3, delay = 500) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) return response;
                if (response.status === 404) throw new Error(`HTTP 404 - Not Found`);
                if (i < retries - 1) await new Promise(r => setTimeout(r, delay * (i + 1)));
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(r => setTimeout(r, delay * (i + 1)));
            }
        }
        throw new Error(`Failed to fetch after ${retries} attempts`);
    }

    // ── LOAD HTML ──
    async function loadPage(url) {
        const response = await fetchWithRetry(url);
        const htmlText = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const newContent = doc.querySelector('#app-content') || doc.body;
        const currentContainer = document.querySelector('#app-content');
        if (currentContainer) {
            currentContainer.innerHTML = newContent.innerHTML;
        }

        window.history.pushState({}, '', url);
    }

    // ── LOAD SCRIPT WITH ONLOAD (Recommended) ──
    function loadScript(scriptUrl) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptUrl + '?v=' + Date.now();
            script.onload = () => {
                // Remove script tag after execution to keep DOM clean
                setTimeout(() => {
                    if (script.parentNode) script.parentNode.removeChild(script);
                }, 0);
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load script: ${scriptUrl}`));
            document.body.appendChild(script);
        });
    }

    // ── CHECK SUPABASE CLIENT ──
    function checkSupabase() {
        if (typeof window.supabase === 'undefined') {
            console.warn('⚠️ Supabase client not found. Make sure supabase.js is loaded.');
            return false;
        }
        return true;
    }

    // ── NAVIGATE WITH DIAGNOSTICS ──
    async function navigate(url) {
        const targetUrl = new URL(url, window.location.origin);
        let fileName = targetUrl.pathname.split('/').pop() || 'index.html';
        if (!fileName.endsWith('.html')) fileName += '.html';

        // ── SESSION CHECK (skip public pages) ──
        const publicPages = ['index.html', 'login.html', 'register.html', 'faq.html', 'terms.html', 'privacy.html'];
        if (!publicPages.includes(fileName)) {
            const token = getCleanSessionToken();
            if (!token) {
                console.warn(`🔐 No session token. Redirecting to login.html from ${fileName}`);
                window.location.replace('login.html');
                return;
            }
        }

        console.group(`🚀 [tiDye265 SPA Engine] Navigating to: ${fileName}`);

        // Show loader if different page
        const currentContainer = document.querySelector('#app-content');
        const currentPath = window.location.pathname;
        if (currentPath !== targetUrl.pathname && currentContainer) {
            currentContainer.innerHTML = getLoaderHTML();
        }

        try {
            // 1. FETCH HTML
            await loadPage(url);
            console.log(`✅ [HTML LOADED] Content inside #app-content updated successfully.`);

            // 2. Get controller
            const controller = PAGE_CONTROLLERS[fileName];
            if (!controller) {
                console.warn(`⚠️ No controller defined for page: ${fileName}. Skipping JS load.`);
                console.groupEnd();
                return;
            }

            const scriptFile = controller.script;
            const initFunction = controller.init;

            console.log(`🔍 [JS DIAGNOSTIC] Inspecting script file: '${scriptFile}'...`);

            // 3. FETCH JS FILE (with retry)
            try {
                const jsRes = await fetchWithRetry(`${scriptFile}?v=${Date.now()}`);
                const jsCode = await jsRes.text();

                if (!jsCode.trim()) {
                    console.warn(`⚠️ [JS WARNING] File '${scriptFile}' was found, but it is completely EMPTY!`);
                    showErrorMessage('JavaScript File is Empty', `The file <strong>${scriptFile}</strong> exists but contains no code.`);
                    console.groupEnd();
                    return;
                }

                // ── 4. LOAD SCRIPT USING SRC (Clean, browser‑managed execution) ──
                await loadScript(scriptFile);

                // ── 5. Check Supabase client before calling init ──
                if (!checkSupabase()) {
                    console.warn('⚠️ Supabase client missing. Data fetching may fail.');
                }

                // ── 6. Call page-specific init function with a small delay to allow DOM to settle ──
                if (typeof window[initFunction] === 'function') {
                    try {
                        // Give the DOM a moment to fully render
                        await new Promise(resolve => setTimeout(resolve, 0));
                        await window[initFunction]();
                        console.log(`🎉 [JS EXECUTED] ${scriptFile} loaded and executed with 0 errors!`);
                        console.log(`✅ [INIT CALLED] ${initFunction}() executed successfully.`);
                    } catch (initError) {
                        console.error(`❌ [INIT ERROR] Error in ${initFunction}:`, initError);
                        showErrorMessage(
                            'Initialization Error',
                            `The function <strong>${initFunction}</strong> threw an error.<br><br><code style="background: #f1f1f1; padding: 8px; display: block; border-radius: 4px;">${initError.message}</code>`
                        );
                        console.groupEnd();
                        return;
                    }
                } else {
                    console.warn(`⚠️ Function ${initFunction} is not defined after loading ${scriptFile}.`);
                }

                // Remove any error message if previously displayed
                const errorDiv = currentContainer?.querySelector('#spa-loader, [style*="background: #fef2f2"]');
                if (errorDiv) errorDiv.remove();

            } catch (jsFetchError) {
                console.error(`❌ [JS FETCH ERROR] Could not load '${scriptFile}' after retries:`, jsFetchError);
                showErrorMessage(
                    'JavaScript File Not Found',
                    `The file <strong>${scriptFile}</strong> could not be loaded. Please check that it exists and try again.`
                );
                console.groupEnd();
                return;
            }

        } catch (error) {
            console.error(`💥 [ROUTER CRASH] Critical Router Error:`, error);
            showErrorMessage('Router Error', `Something went wrong with the router: ${error.message}`);
        } finally {
            console.groupEnd();
            window.scrollTo(0, 0);
        }
    }

    // ── INTERCEPTOR ──
    document.addEventListener('DOMContentLoaded', () => {
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

        // Initial navigation
        navigate(window.location.href);
    });

    window.tidyeRouter = { navigate };
})();
