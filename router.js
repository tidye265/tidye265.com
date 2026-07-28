// router.js - Enterprise SPA Engine (v12.1 - Instant & Silent)
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

    // ── GLOBAL READY HELPERS ──
    window.readySupabase = new Promise((resolve) => {
        const checkSupabase = () => {
            if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
                resolve(true);
                return;
            }
            setTimeout(checkSupabase, 50);
        };
        checkSupabase();
        document.addEventListener('supabase:ready', () => resolve(true));
    });

    // ── Turnstile Singleton (unchanged) ──
    (function bootstrapTurnstile() {
        if (window.__turnstileBootstrapped) return;
        window.__turnstileBootstrapped = true;
        window.__turnstileReady = false;

        const initWidget = () => {
            const container = document.createElement('div');
            container.id = '__turnstile_container';
            container.style.cssText = 'position:absolute;top:-9999px;left:-9999px;';
            document.body.appendChild(container);

            window.__turnstileWidgetId = turnstile.render(container, {
                sitekey: '0x4AAAAAADQhPHJB5viRCO84',
                size: 'invisible',
                callback: (token) => {
                    window.__turnstileLastToken = token;
                    window.__turnstileReady = true;
                    if (window.__turnstileResolve) {
                        window.__turnstileResolve(token);
                        window.__turnstileResolve = null;
                    }
                },
                'error-callback': () => {
                    window.__turnstileReady = true;
                    if (window.__turnstileReject) {
                        window.__turnstileReject('Turnstile init error');
                        window.__turnstileReject = null;
                    }
                }
            });
        };

        if (typeof turnstile === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__onTurnstileLoad';
            document.head.appendChild(script);
            window.__onTurnstileLoad = initWidget;
        } else {
            initWidget();
        }
    })();

    window.getFreshTurnstileToken = function() {
        return new Promise((resolve, reject) => {
            if (!window.__turnstileReady) {
                let attempts = 0;
                const iv = setInterval(() => {
                    attempts++;
                    if (window.__turnstileReady) {
                        clearInterval(iv);
                        executeTurnstile(resolve, reject);
                    } else if (attempts > 40) {
                        clearInterval(iv);
                        reject('Turnstile initialization timeout.');
                    }
                }, 100);
                return;
            }
            executeTurnstile(resolve, reject);
        });
    };

    function executeTurnstile(resolve, reject) {
        window.__turnstileLastToken = null;
        window.__turnstileResolve = resolve;
        window.__turnstileReject = reject;
        turnstile.execute(window.__turnstileWidgetId);
    }

    // ── CLEANUP (unchanged) ──
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

        if (window.turnstile && window.__turnstileWidgetId) {
            try { turnstile.remove(window.__turnstileWidgetId); } catch (e) {}
            window.__turnstileWidgetId = null;
            window.__turnstileLastToken = null;
        }

        const banner = document.getElementById('spa-success-banner');
        if (banner) banner.remove();

        document.querySelectorAll('link[data-spa-css]').forEach(link => {
            if (!loadedStyles.has(link.href) && link.parentNode) {
                link.parentNode.removeChild(link);
            }
        });
    }

    // ── ERROR DISPLAY (kept for safety, but no success messages) ──
    function showErrorMessage(title, details = '') {
        const container = document.querySelector('#app-content');
        if (!container) return;
        container.innerHTML = `
        <div style="padding: 30px; text-align: center; font-family: 'Lexend', sans-serif; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; margin: 20px;">
            <h3 style="color: #dc2626; font-weight: 700;">${title}</h3>
            ${details ? `<p style="color: #991b1b; font-size: 14px; margin-top: 8px;">${details}</p>` : ''}
            <p style="color: #6b7280; font-size: 13px; margin-top: 12px;">Check the browser console for more details.</p>
        </div>
        `;
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
            html = pageCache.get(url);
        } else {
            const res = await fetchWithRetry(url, { signal: activeAbortController.signal });
            html = await res.text();
            pageCache.set(url, html);
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
        if (loadedScripts.has(jsUrl)) return Promise.resolve();
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.setAttribute('data-spa-script', 'true');
            script.src = jsUrl;
            script.onload = () => {
                loadedScripts.set(jsUrl, true);
                document.body.appendChild(script);
                resolve();
            };
            script.onerror = () => {
                resolve();
            };
            document.body.appendChild(script);
        });
    }

    function injectPageCss(cssUrl) {
        if (loadedStyles.has(cssUrl)) return Promise.resolve();
        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.setAttribute('data-spa-css', 'true');
            link.href = cssUrl;
            link.onload = () => {
                loadedStyles.set(cssUrl, true);
                document.head.appendChild(link);
                resolve();
            };
            link.onerror = () => {
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

    // ── NAVIGATION ENGINE (Instant, no loader, no banner, no fade) ──
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
                window.location.replace('login.html');
                return;
            }
        }

        const newController = PAGE_CONTROLLERS[fileName];
        if (!newController) {
            showErrorMessage('Page Controller Missing', `No entry in PAGE_CONTROLLERS for <strong>${fileName}</strong>.`);
            return;
        }

        if (currentInitFunction && typeof window[currentInitFunction + '_beforeLeave'] === 'function') {
            try { await window[currentInitFunction + '_beforeLeave'](); } catch (e) {}
        }

        cleanupPage();

        const initFunction = newController.init;
        if (typeof window[initFunction + '_beforeEnter'] === 'function') {
            try { await window[initFunction + '_beforeEnter'](); } catch (e) {}
        }

        try {
            await loadPage(targetUrl.href);
        } catch (err) {
            if (err.name === 'AbortError') return;
            showErrorMessage('Router Error', err.message);
            return;
        }

        await injectPageScript(newController.script);
        await injectPageCss(fileName.replace('.html', '.css'));
        await new Promise(r => setTimeout(r, 0));

        if (typeof window[initFunction] === 'function') {
            try {
                await window[initFunction]();
            } catch (initErr) {
                showErrorMessage('Initialization Error', `The function <strong>${initFunction}</strong> threw an error.<br><br><code style="background:#f1f1f1;padding:8px;display:block;border-radius:4px;">${initErr.message}</code>`);
                return;
            }
        } else {
            showErrorMessage('Init Function Not Found', `The function <strong>${initFunction}</strong> is not defined.`);
            return;
        }

        if (typeof window[initFunction + '_mounted'] === 'function') {
            try { await window[initFunction + '_mounted'](); } catch (e) {}
        }
        currentInitFunction = initFunction;

        window.scrollTo(0, 0);
    }

    // ── EVENT BINDING ──
    document.addEventListener('DOMContentLoaded', () => {
        // No transition styles needed – instant swap

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
