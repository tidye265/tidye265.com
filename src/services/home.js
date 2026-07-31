/* src/services/home.js */
// ── Secure Logger ──
export const SecureLogger = {
    info: (m, d) => console.log('[INFO]', m, d),
    warn: (m, d) => console.warn('[WARN]', m, d),
    error: (m, d) => console.error('[ERROR]', m, d)
};

// ── Cookie Consent ──
export function checkCookieConsent() {
    return localStorage.getItem('tidye_cookie_consent') === 'accepted';
}

export function acceptCookie() {
    localStorage.setItem('tidye_cookie_consent', 'accepted');
}

// ── Live Ticker ──
export async function fetchLiveMatches() {
    try {
        const res = await fetch('https://api.example.com/live-matches');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        return data.matches || [];
    } catch (e) {
        return [];
    }
}

// ── Turnstile ──
export function initTurnstile(containerElement) {
    if (typeof turnstile === 'undefined') {
        setTimeout(() => initTurnstile(containerElement), 1000);
        return;
    }
    try {
        turnstile.render(containerElement, {
            sitekey: '0x4AAAAAADQhPHJB5viRCO84',
            callback: (token) => {
                window.AppState = window.AppState || {};
                window.AppState.turnstileVerified = true;
                window.AppState.turnstileToken = token;
            },
            'error-callback': () => {
                window.AppState.turnstileVerified = false;
            },
            theme: 'light'
        });
    } catch (e) {}
}

// ── Footer Injection ──
export async function injectFooter() {
    try {
        const res = await fetch('/footer.html');
        if (res.ok) {
            return await res.text();
        }
        return '';
    } catch (e) {
        SecureLogger.error('Footer injection', e);
        return '';
    }
}

// ── Session Check ──
export function isLoggedIn() {
    const raw = localStorage.getItem('tidye_session_token');
    return !!(raw && raw !== 'null' && raw !== 'undefined');
}
