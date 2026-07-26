// index.js - Logic ya Home Page (SPA Ready)

// Global flag kuti tipewe kuyika event listeners kawiri
if (!window._indexEventsAttached) {
    window._indexEventsAttached = true;
    document.addEventListener('click', function(e) {
        // Compact auth bar close
        const closeBtn = e.target.closest('#compactAuthClose');
        if (closeBtn) {
            document.getElementById('compactAuthBar')?.classList.remove('active');
            window.AppState.authBarVisible = false;
        }

        // Cookie accept
        const cookieBtn = e.target.closest('#cookieAcceptBtn');
        if (cookieBtn) {
            localStorage.setItem('tidye_cookie_consent', 'accepted');
            window.AppState.cookieConsentGiven = true;
            document.getElementById('cookieConsentBar')?.classList.remove('visible');
        }

        // Search toggle
        const searchToggle = e.target.closest('#searchToggle');
        if (searchToggle) {
            document.getElementById('searchBar')?.classList.add('active');
            document.getElementById('searchInput')?.focus();
        }

        const searchClose = e.target.closest('#searchClose');
        if (searchClose) {
            document.getElementById('searchBar')?.classList.remove('active');
            document.getElementById('searchInput').value = '';
        }

        // Sub-header and feature boxes interception (if not logged in)
        const subItem = e.target.closest('#categoryNav .sub-item');
        if (subItem && !localStorage.getItem('tidye_session_token')) {
            e.preventDefault();
            showCompactAuthBar(subItem.getAttribute('data-category') || '');
        }

        const featureBox = e.target.closest('.feature-box');
        if (featureBox && !localStorage.getItem('tidye_session_token')) {
            e.preventDefault();
            showCompactAuthBar(featureBox.id === 'casinoBox' ? 'casino' : 'sport');
        }

        const betCard = e.target.closest('.betting-feature-card');
        if (betCard && !localStorage.getItem('tidye_session_token')) {
            e.preventDefault();
            showCompactAuthBar('features');
        }
    });
}

window.init = async function() {
    "use strict";

    // ── STATE ──
    window.AppState = window.AppState || {
        stillLoading: true,
        cookieConsentGiven: false,
        authBarVisible: false,
        rateLimitCount: 0,
        rateLimitReset: 0
    };

    // ── DOM REFS ──
    const loader = document.getElementById('loader');
    const errorContainer = document.getElementById('errorContainer');
    const compactAuthBar = document.getElementById('compactAuthBar');
    const cookieConsentBar = document.getElementById('cookieConsentBar');
    const searchInput = document.getElementById('searchInput');
    const hpField = document.getElementById('hpField');
    const liveTickerTrack = document.getElementById('liveTickerTrack');

    // ── Secure Logger ──
    const SecureLogger = { info: (m,d) => console.log('[INFO]',m,d), warn: (m,d) => console.warn('[WARN]',m,d), error: (m,d) => console.error('[ERROR]',m,d) };

    // ── Honeypot ──
    function checkHoneypot() { return hpField && hpField.value.trim() !== ''; }
    if (hpField) {
        hpField.addEventListener('input', () => { if (checkHoneypot()) SecureLogger.warn('Bot detected'); });
    }

    // ── COOKIE CONSENT ──
    function checkCookieConsent() {
        const consent = localStorage.getItem('tidye_cookie_consent');
        if (consent === 'accepted') {
            AppState.cookieConsentGiven = true;
            cookieConsentBar?.classList.remove('visible');
        } else {
            setTimeout(() => cookieConsentBar?.classList.add('visible'), 800);
        }
    }
    checkCookieConsent();

    // ── COMPACT AUTH BAR ──
    function showCompactAuthBar(category = '') {
        const now = Date.now();
        if (AppState.rateLimitReset > 0 && now < AppState.rateLimitReset && AppState.rateLimitCount >= 5) return;
        if (now >= AppState.rateLimitReset) { AppState.rateLimitCount = 0; AppState.rateLimitReset = now + 60000; }
        AppState.rateLimitCount++;
        compactAuthBar?.classList.add('active');
        AppState.authBarVisible = true;
    }
    function hideCompactAuthBar() {
        compactAuthBar?.classList.remove('active');
        AppState.authBarVisible = false;
    }

    // Click outside logic (already handled in global listener, but we can add)
    document.addEventListener('click', (e) => {
        if (AppState.authBarVisible && !e.target.closest('#compactAuthBar') && !e.target.closest('.feature-box') && !e.target.closest('#categoryNav .sub-item')) {
            hideCompactAuthBar();
        }
    });

    // ── LIVE TICKER ──
    async function fetchLiveMatches() {
        try {
            const res = await fetch('https://api.example.com/live-matches');
            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            return data.matches || [];
        } catch (e) { return []; }
    }
    function renderLiveTicker(matches) {
        if (!liveTickerTrack) return;
        if (!matches.length) {
            liveTickerTrack.innerHTML = '<span class="live-ticker-no-data">No live matches</span>';
            return;
        }
        let html = '';
        matches.forEach(m => html += `<span class="live-ticker-item">⚽ ${m.home_team} vs ${m.away_team} <span class="live-ticker-odds">${m.odds}</span></span>`);
        liveTickerTrack.innerHTML = html + html;
    }
    async function initLiveTicker() {
        const matches = await fetchLiveMatches();
        renderLiveTicker(matches);
    }
    await initLiveTicker();

    // ── TURNSTILE ──
    function initTurnstile() {
        if (typeof turnstile === 'undefined') { setTimeout(initTurnstile, 1000); return; }
        try {
            turnstile.render('#turnstileContainer', {
                sitekey: '0x4AAAAAADQhPHJB5viRCO84',
                callback: (token) => { AppState.turnstileVerified = true; AppState.turnstileToken = token; },
                'error-callback': () => { AppState.turnstileVerified = false; },
                theme: 'light'
            });
        } catch(e) {}
    }
    initTurnstile();

    // ── SEARCH INPUT ──
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                window.location.href = `matches.html?search=${encodeURIComponent(searchInput.value.trim())}`;
            }
        });
    }

    // ── SUB-HEADER ACTIVE STATE ──
    function updateSubHeaderActive() {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('#categoryNav .sub-item').forEach(item => {
            const href = item.getAttribute('href') || '';
            item.classList.remove('active');
            if (href && currentPath.includes(href.replace('.html',''))) item.classList.add('active');
        });
    }
    updateSubHeaderActive();

    // ── FOOTER INJECTION ──
    async function injectFooter() {
        try {
            const res = await fetch('footer.html');
            if (res.ok) {
                const html = await res.text();
                const placeholder = document.getElementById('footer-placeholder');
                if (placeholder) {
                    placeholder.innerHTML = html;
                    placeholder.querySelectorAll('script').forEach(old => {
                        const newScript = document.createElement('script');
                        newScript.textContent = old.textContent;
                        document.body.appendChild(newScript).remove();
                    });
                }
            }
        } catch(e) { SecureLogger.error('Footer injection', e); }
    }
    await injectFooter();

    // ── DISMISS LOADER ──
    if (loader) {
        AppState.stillLoading = false;
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 400);
    }

    console.log('Index page initialized successfully.');
};
