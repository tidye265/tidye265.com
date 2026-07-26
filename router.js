// router.js - Master SPA Lifecycle & Verification Engine (Fixed)
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
    }

    // ── INJECT SCRIPT HELPER ──
    function injectPageScript(jsUrl) {
        return new Promise((resolve) => {
            const oldScript = document.querySelector('script[data-spa-script]');
            if (oldScript) oldScript.remove();

            const script = document.createElement('script');
            script.setAttribute('data-spa-script', 'true');
            script.src = jsUrl + '?v=' + Date.now();
            script.onload = () => resolve();
            script.onerror = () => resolve(); // Don't crash if no JS file
            try {
                document.body.appendChild(script);
            } catch (e) {
                console.error("Router appendChild error (script):", e);
                resolve();
            }
        });
    }

    // ── NAVIGATE ──
    async function navigate(url) {
        const targetUrl = new URL(url, window.location.origin);
        let fileName = targetUrl.pathname.split('/').pop() || 'index.html';
        if (!fileName.endsWith('.html')) fileName += '.html';

        // Session check
        const publicPages = ['index.html', 'login.html', 'register.html', 'faq.html', 'terms.html', 'privacy.html'];
        if (!publicPages.includes(fileName)) {
            if (!getCleanSessionToken()) {
                console.warn(`🔐 No session. Redirecting to login.html from ${fileName}`);
                window.location.replace('login.html');
                return;
            }
        }

        console.group(`🚀 Navigating to: ${fileName}`);

        const container = document.querySelector('#app-content');
        const currentPath = window.location.pathname;
        if (currentPath !== targetUrl.pathname && container) {
            container.innerHTML = getLoaderHTML();
        }

        try {
            await loadPage(url);
            console.log(`✅ HTML loaded`);

            const controller = PAGE_CONTROLLERS[fileName];
            if (!controller) {
                console.warn(`⚠️ No controller for ${fileName}`);
                console.groupEnd();
                return;
            }

            const scriptFile = controller.script;

            console.log(`🔍 Loading script: ${scriptFile}`);

            await injectPageScript(scriptFile);

            await new Promise(r => setTimeout(r, 0));

            // AUTO RE-RENDER CLOUDFLARE TURNSTILE
            if (window.turnstile) {
                const turnstileContainer = document.querySelector('.cf-turnstile');
                if (turnstileContainer) {
                    try {
                        turnstile.reset();
                        turnstile.render(turnstileContainer);
                        console.log("🛡️ [TURNSTILE] Re-rendered successfully!");
                    } catch (tErr) {
                        console.warn("Turnstile auto-render note:", tErr);
                    }
                }
            }

            // BROADCAST WAKE-UP EVENT
            const pageLoadedEvent = new CustomEvent('spa:pageLoaded', {
                detail: { page: fileName, url: url }
            });
            window.dispatchEvent(pageLoadedEvent);
            console.log(`📣 Dispatched spa:pageLoaded for ${fileName}`);

            const errDiv = container?.querySelector('#spa-loader, [style*="background: #fef2f2"]');
            if (errDiv) errDiv.remove();

        } catch (err) {
            console.error(`💥 Router error:`, err);
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
