// router.js - Full Diagnostic SPA Engine (v10)
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

    // ── TRACK INJECTED SCRIPTS ──
    let injectedScripts = [];

    // ── CLEANUP OLD PAGE STATE ──
    function cleanupPage() {
        injectedScripts.forEach(script => {
            if (script.parentNode) script.parentNode.removeChild(script);
        });
        injectedScripts = [];

        if (window._tidyeIntervals) {
            window._tidyeIntervals.forEach(id => clearInterval(id));
            window._tidyeIntervals = [];
        }
        if (window._tidyeTimeouts) {
            window._tidyeTimeouts.forEach(id => clearTimeout(id));
            window._tidyeTimeouts = [];
        }

        if (window.turnstile && window._turnstileWidgetId) {
            try {
                turnstile.remove(window._turnstileWidgetId);
            } catch (e) {}
            window._turnstileWidgetId = null;
        }
    }

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
        let raw = localStorage.getItem('tidye_session_token');
        if (!raw || raw === 'null' || raw === 'undefined') return null;
        try {
            let p = JSON.parse(raw);
            if (p?.access_token) return p.access_token;
            if (typeof p === 'string') return p;
        } catch (e) {}
        return raw.replace(/^["']|["']$/g, '').trim();
    }

    // ── FETCH WITH RETRY ──
    async function fetchWithRetry(url, options = {}, retries = 3, delay = 500) {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok) return res;
                if (res.status === 404) throw new Error(`HTTP 404 - Not Found`);
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
        const res = await fetchWithRetry(url);
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newContent = doc.querySelector('#app-content') || doc.body;
        const container = document.querySelector('#app-content');
        if (container) {
            container.innerHTML = newContent.innerHTML;
        }
        window.history.pushState({}, '', url);
        console.log(`✅ [HTML] Loaded ${url}`);
    }

    // ── INJECT SCRIPT ──
    function injectPageScript(jsUrl) {
        return new Promise((resolve) => {
            const old = document.querySelector('script[data-spa-script]');
            if (old) old.remove();

            const script = document.createElement('script');
            script.setAttribute('data-spa-script', 'true');
            script.src = jsUrl + '?v=' + Date.now();
            script.onload = () => {
                injectedScripts.push(script);
                console.log(`✅ [SCRIPT] Loaded ${jsUrl}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`❌ [SCRIPT 404] Failed to load ${jsUrl}`);
                resolve(); // continue, but init will fail
            };
            document.body.appendChild(script);
        });
    }

    // ── TURNSTILE RE‑RENDER ──
    function reRenderTurnstile() {
        if (typeof turnstile === 'undefined') {
            console.warn('⚠️ Turnstile not loaded');
            return;
        }
        if (window._turnstileWidgetId) {
            try {
                turnstile.remove(window._turnstileWidgetId);
            } catch (e) {}
            window._turnstileWidgetId = null;
        }
        const container = document.querySelector('.cf-turnstile, #turnstileWidget, [data-turnstile]');
        if (!container) {
            console.warn('⚠️ Turnstile container not found');
            return;
        }
        try {
            window._turnstileWidgetId = turnstile.render(container, {
                sitekey: '0x4AAAAAADQhPHJB5viRCO84',
                size: 'invisible',
                callback: (token) => {
                    window._turnstileToken = token;
                    console.log('🛡️ Turnstile token received');
                },
                'error-callback': () => {
                    window._turnstileToken = null;
                    console.warn('⚠️ Turnstile error');
                }
            });
            console.log('🛡️ Turnstile re-rendered');
        } catch (e) {
            console.warn('Turnstile render error:', e);
        }
    }

    // ── NAVIGATE ──
    async function navigate(url) {
        const targetUrl = new URL(url, window.location.origin);
        let fileName = targetUrl.pathname.split('/').pop() || 'index.html';
        if (!fileName.endsWith('.html')) fileName += '.html';

        const publicPages = ['index.html', 'login.html', 'register.html', 'faq.html', 'terms.html', 'privacy.html'];
        if (!publicPages.includes(fileName)) {
            if (!getCleanSessionToken()) {
                console.warn(`🔐 No session. Redirecting to login.html from ${fileName}`);
                window.location.replace('login.html');
                return;
            }
        }

        console.group(`🚀 Navigating to: ${fileName}`);

        cleanupPage();

        const container = document.querySelector('#app-content');
        const currentPath = window.location.pathname;
        if (currentPath !== targetUrl.pathname && container) {
            container.innerHTML = getLoaderHTML();
        }

        try {
            await loadPage(url);

            const controller = PAGE_CONTROLLERS[fileName];
            if (!controller) {
                console.warn(`⚠️ No controller for ${fileName}`);
                showErrorMessage('Page Controller Missing', `No entry in PAGE_CONTROLLERS for <strong>${fileName}</strong>.`);
                console.groupEnd();
                return;
            }

            const scriptFile = controller.script;
            const initFunction = controller.init;

            console.log(`🔍 Looking for script: ${scriptFile}`);

            await injectPageScript(scriptFile);

            await new Promise(r => setTimeout(r, 0));

            reRenderTurnstile();

            if (typeof window[initFunction] === 'function') {
                try {
                    await window[initFunction]();
                    console.log(`🎉 [INIT OK] ${initFunction} executed successfully`);
                } catch (initErr) {
                    console.error(`❌ [INIT ERROR] ${initFunction} threw an error:`, initErr);
                    showErrorMessage('Initialization Error', `The function <strong>${initFunction}</strong> threw an error.<br><br><code style="background:#f1f1f1;padding:8px;display:block;border-radius:4px;">${initErr.message}</code>`);
                    console.groupEnd();
                    return;
                }
            } else {
                console.warn(`⚠️ [INIT MISSING] ${initFunction} not defined after loading ${scriptFile}`);
                showErrorMessage('Init Function Not Found', `The function <strong>${initFunction}</strong> is not defined after loading <strong>${scriptFile}</strong>.`);
                console.groupEnd();
                return;
            }

            const errDiv = container?.querySelector('#spa-loader, [style*="background: #fef2f2"]');
            if (errDiv) errDiv.remove();

        } catch (err) {
            console.error(`💥 [ROUTER CRASH]`, err);
            showErrorMessage('Router Error', err.message);
        } finally {
            console.groupEnd();
            window.scrollTo(0, 0);
        }
    }

    // ── INTERCEPTORS ──
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

        navigate(window.location.href);
    });

    window.tidyeRouter = { navigate };
})();
