// router.js - Enterprise SPA Engine (v11.1 - Central Turnstile Manager & Instant Cache)
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

    // ── CACHES & CONTROLLERS ──
    const loadedScripts = new Map();
    const loadedStyles = new Map();
    const pageCache = new Map();
    let activeAbortController = null;
    let navigationStartTime = 0;
    let injectedScripts = [];
    let currentInitFunction = null;

    // ── TURNSTILE CENTRAL MANAGER ──
    let __turnstileResolve = null;
    let __turnstileReject = null;
    let __turnstileTimeout = null;

    // 1. Render Global Turnstile (Called by Router during navigation)
    window.renderGlobalTurnstile = function() {
        if (typeof turnstile === 'undefined') {
            console.warn('⚠️ Turnstile library not loaded');
            if (__turnstileReject) __turnstileReject('Turnstile library not loaded');
            return;
        }

        // Cleanup previous widget (if any)
        if (window.__turnstileWidgetId) {
            try { turnstile.remove(window.__turnstileWidgetId); } catch (e) {}
            window.__turnstileWidgetId = null;
            window.__turnstileToken = null;
        }

        // Reset the promise
        if (__turnstileTimeout) clearTimeout(__turnstileTimeout);

        // Ensure a hidden container exists for Turnstile
        let container = document.querySelector('.cf-turnstile, #turnstileWidget, [data-turnstile]');
        if (!container) {
            // If missing, we inject a dummy hidden container so Turnstile always works
            const hiddenContainer = document.createElement('div');
            hiddenContainer.id = 'tidye-turnstile-container';
            hiddenContainer.style.display = 'none';
            document.body.appendChild(hiddenContainer);
            container = hiddenContainer;
            console.warn('ℹ️ Turnstile container missing. Injected a hidden dummy container.');
        }

        try {
            window.__turnstileWidgetId = turnstile.render(container, {
                sitekey: '0x4AAAAAADQhPHJB5viRCO84',
                size: 'invisible',
                callback: (token) => {
                    window.__turnstileToken = token;
                    console.log('🛡️ Turnstile token received');
                    if (__turnstileResolve) {
                        __turnstileResolve(token);
                        __turnstileResolve = null;
                    }
                    if (__turnstileTimeout) {
                        clearTimeout(__turnstileTimeout);
                        __turnstileTimeout = null;
                    }
                },
                'error-callback': () => {
                    window.__turnstileToken = null;
                    console.warn('⚠️ Turnstile error');
                    if (__turnstileReject) {
                        __turnstileReject('Turnstile verification error');
                        __turnstileReject = null;
                    }
                }
            });
            console.log('🛡️ Turnstile re-rendered globally.');
        } catch (e) {
            console.warn('Turnstile render error:', e);
            if (__turnstileReject) __turnstileReject(e.message);
        }
    };

    // 2. Helper for Pages: window.getTurnstileToken()
    window.getTurnstileToken = function() {
        return new Promise((resolve, reject) => {
            // If token exists and is fresh
            if (window.__turnstileToken) {
                resolve(window.__turnstileToken);
                return;
            }

            // Store callbacks for the widget's callback
            __turnstileResolve = resolve;
            __turnstileReject = reject;

            // Timeout after 10 seconds
            __turnstileTimeout = setTimeout(() => {
                if (__turnstileResolve) {
                    reject('Turnstile verification timed out after 10s');
                    __turnstileResolve = null;
                    __turnstileReject = null;
                    __turnstileTimeout = null;
                }
            }, 10000);
        });
    };

    // ── ENHANCED CLEANUP ──
    function cleanupPage() {
        injectedScripts.forEach(script => {
            if (!loadedScripts.has(script.src)) {
                if (script.parentNode) script.parentNode.removeChild(script);
            }
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

        if (window._tidyeObservers) {
            window._tidyeObservers.forEach(observer => {
                try { observer.disconnect(); } catch (e) {}
            });
            window._tidyeObservers = [];
        }

        // Turnstile cleanup (clear widget, but keep hidden container for re-render)
        if (window.turnstile && window.__turnstileWidgetId) {
            try { turnstile.remove(window.__turnstileWidgetId); } catch (e) {}
            window.__turnstileWidgetId = null;
            window.__turnstileToken = null;
        }

        const banner = document.getElementById('spa-success-banner');
        if (banner) banner.remove();

        document.querySelectorAll('link[data-spa-css]').forEach(link => {
            if (!loadedStyles.has(link.href) && link.parentNode) {
                link.parentNode.removeChild(link);
            }
        });
    }

    function getLoaderHTML() {
        return `
        <div id="spa-loader" style="display: flex; align-items: center; justify-content: center; padding: 40px; font-family: 'Lexend', sans-serif; color: #6b7280; font-size: 14px;">
            <i class="bi bi-arrow-repeat spin-icon" style="animation: spin 1s linear infinite; display: inline-block; margin-right: 10px;"></i> 
            Loading...
            <style> @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .spin-icon { display: inline-block; } </style>
        </div>
        `;
    }

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

    function showSuccessMessage(message) {
        const container = document.querySelector('#app-content');
        if (!container) return;
        const oldBanner = document.getElementById('spa-success-banner');
        if (oldBanner) oldBanner.remove();

        const banner = document.createElement('div');
        banner.id = 'spa-success-banner';
        banner.style.cssText = `
            margin: 12px 15px; padding: 14px 18px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; color: #065f46; font-family: 'Lexend', sans-serif; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px;
        `;
        banner.innerHTML = `<i class="bi bi-check-circle-fill" style="color:#10b981;"></i> ${message}`;
        container.insertBefore(banner, container.firstChild);
        setTimeout(() => { if (banner && banner.parentNode) banner.remove(); }, 5000);
    }

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

    async function fetchWithRetry(url, options = {}, retries = 3, delay = 500) {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok) return res;
                if (res.status === 404) throw new Error(`HTTP 404 - Not Found`);
                if (i < retries - 1) await new Promise(r => setTimeout(r, delay * (i + 1)));
            } catch (err) {
                if (err.name === 'AbortError') throw err;
                if (i === retries - 1) throw new Error(`Network error: ${err.message}`);
                await new Promise(r => setTimeout(r, delay * (i + 1)));
            }
        }
        throw new Error(`Failed to fetch after ${retries} attempts`);
    }

    async function loadPage(url) {
        let html;
        if (pageCache.has(url)) {
            console.log(`📦 [HTML CACHE] Hit: ${url}`);
            html = pageCache.get(url);
        } else {
            const res = await fetchWithRetry(url, { signal: activeAbortController.signal });
            html = await res.text();
            pageCache.set(url, html);
            console.log(`✅ [HTML] Loaded & Cached: ${url}`);
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newContent = doc.querySelector('#app-content') || doc.body;

        newContent.querySelectorAll('script').forEach(s => s.remove());
        newContent.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
            });
        });

        const container = document.querySelector('#app-content');
        if (container) container.innerHTML = newContent.innerHTML;
        window.history.pushState({}, '', url);
        return url;
    }

    function injectPageScript(jsUrl) {
        if (loadedScripts.has(jsUrl)) {
            console.log(`📦 [SCRIPT CACHE] Hit: ${jsUrl}`);
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.setAttribute('data-spa-script', 'true');
            script.src = jsUrl;
            script.onload = () => {
                loadedScripts.set(jsUrl, true);
                document.body.appendChild(script);
                console.log(`✅ [SCRIPT] Loaded & Cached: ${jsUrl}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`❌ [SCRIPT 404] Failed to load ${jsUrl}`);
                resolve();
            };
            document.body.appendChild(script);
        });
    }

    function injectPageCss(cssUrl) {
        if (loadedStyles.has(cssUrl)) {
            console.log(`📦 [CSS CACHE] Hit: ${cssUrl}`);
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.setAttribute('data-spa-css', 'true');
            link.href = cssUrl;
            link.onload = () => {
                loadedStyles.set(cssUrl, true);
                document.head.appendChild(link);
                console.log(`✅ [CSS] Loaded & Cached: ${cssUrl}`);
                resolve();
            };
            link.onerror = () => {
                console.error(`❌ [CSS 404] Failed to load ${cssUrl}`);
                resolve();
            };
            document.head.appendChild(link);
        });
    }

    function prefetchPage(url) {
        const fileName = new URL(url, window.location.origin).pathname.split('/').pop() || 'index.html';
        const controller = PAGE_CONTROLLERS[fileName];
        if (!pageCache.has(url)) {
            fetch(url, { priority: 'low' }).then(res => {
                if (res.ok) res.text().then(html => pageCache.set(url, html));
            });
        }
        if (controller && !loadedScripts.has(controller.script)) {
            fetch(controller.script, { priority: 'low' });
        }
    }

    // ── NAVIGATION ENGINE ──
    async function navigate(url) {
        if (activeAbortController) {
            activeAbortController.abort('New navigation triggered');
        }
        activeAbortController = new AbortController();

        navigationStartTime = performance.now();

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

        const newController = PAGE_CONTROLLERS[fileName];
        if (!newController) {
            console.warn(`⚠️ No controller for ${fileName}`);
            showErrorMessage('Page Controller Missing', `No entry in PAGE_CONTROLLERS for <strong>${fileName}</strong>.`);
            console.groupEnd();
            return;
        }

        const container = document.querySelector('#app-content');
        const isCached = pageCache.has(targetUrl.href) && loadedScripts.has(newController.script);

        if (currentInitFunction && typeof window[currentInitFunction + '_beforeLeave'] === 'function') {
            try { await window[currentInitFunction + '_beforeLeave'](); } catch (e) {}
        }

        cleanupPage();

        // ⚡ UPGRADE: If fully cached, skip loader and fade-out delay completely
        if (!isCached && container && window.location.pathname !== targetUrl.pathname) {
            container.innerHTML = getLoaderHTML();
            container.classList.remove('spa-fade-in');
            container.classList.add('spa-fade-out');
            await new Promise(r => setTimeout(r, 150));
            container.classList.remove('spa-fade-out');
        } else if (container && window.location.pathname !== targetUrl.pathname) {
            // Instant swap for cached pages
            container.classList.remove('spa-fade-in', 'spa-fade-out');
        }

        const initFunction = newController.init;
        if (typeof window[initFunction + '_beforeEnter'] === 'function') {
            try { await window[initFunction + '_beforeEnter'](); } catch (e) {}
        }

        try {
            await loadPage(url);
        } catch (err) {
            if (err.name === 'AbortError') {
                console.warn(`⏹️ [ABORTED] Navigation to ${fileName} was cancelled.`);
                console.groupEnd();
                return;
            }
            console.error(`💥 [ROUTER CRASH]`, err);
            showErrorMessage('Router Error', err.message);
            console.groupEnd();
            return;
        }

        await injectPageScript(newController.script);
        await injectPageCss(fileName.replace('.html', '.css'));
        await new Promise(r => setTimeout(r, 0));

        // 🟢 CENTRAL TURNSTILE: Render Global Widget
        window.renderGlobalTurnstile();

        if (typeof window[initFunction] === 'function') {
            try {
                await window[initFunction]();
                console.log(`🎉 [INIT OK] ${initFunction} executed successfully`);
                showSuccessMessage(`✅ Page <strong>${fileName}</strong> initialized successfully.`);
            } catch (initErr) {
                console.error(`❌ [INIT ERROR] ${initFunction} threw an error:`, initErr);
                showErrorMessage('Initialization Error', `The function <strong>${initFunction}</strong> threw an error.<br><br><code style="background:#f1f1f1;padding:8px;display:block;border-radius:4px;">${initErr.message}</code>`);
                console.groupEnd();
                return;
            }
        } else {
            console.warn(`⚠️ [INIT MISSING] ${initFunction} not defined.`);
            showErrorMessage('Init Function Not Found', `The function <strong>${initFunction}</strong> is not defined.`);
            console.groupEnd();
            return;
        }

        if (typeof window[initFunction + '_mounted'] === 'function') {
            try { await window[initFunction + '_mounted'](); } catch (e) {}
        }
        currentInitFunction = initFunction;

        if (container) {
            container.classList.add('spa-fade-in');
        }

        const perfEnd = performance.now();
        console.log(`⏱️ [PERF] ${fileName} Total Time: ${(perfEnd - navigationStartTime).toFixed(2)}ms`);
        console.groupEnd();
        window.scrollTo(0, 0);
    }

    function injectTransitionStyles() {
        const style = document.createElement('style');
        style.id = 'spa-transition-styles';
        style.textContent = `
            #app-content { transition: opacity 0.15s ease-in-out; }
            .spa-fade-out { animation: spaFadeOut 0.15s forwards; }
            .spa-fade-in { animation: spaFadeIn 0.25s forwards; }
            @keyframes spaFadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }
            @keyframes spaFadeIn { 0% { opacity: 0; transform: translateY(4px); } 100% { opacity: 1; transform: translateY(0px); } }
        `;
        document.head.appendChild(style);
    }

    document.addEventListener('DOMContentLoaded', () => {
        injectTransitionStyles();

        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a[href$=".html"]');
            if (link && !link.getAttribute('target')) {
                e.preventDefault();
                navigate(link.getAttribute('href'));
            }
        });

        document.body.addEventListener('pointerenter', (e) => {
            const link = e.target.closest('a[href$=".html"]');
            if (link && !link.getAttribute('target')) {
                prefetchPage(link.getAttribute('href'));
            }
        });

        window.addEventListener('popstate', () => {
            navigate(window.location.href);
        });

        navigate(window.location.href);
    });

    window.tidyeRouter = { navigate };
})();
