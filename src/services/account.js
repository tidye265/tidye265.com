/* src/services/account.js */
import { createClient } from '@supabase/supabase-js';

// ── Configuration ──
export const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || window.SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Logger ──
export const Logger = {
    info: (msg, data = {}) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
    warn: (msg, data = {}) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data),
    error: (msg, data = {}) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, data)
};

// ── CACHE KEYS & TTL ──
export const CACHE_KEYS = {
    BALANCE: 'tidye_balance_cache',
    BONUS: 'tidye_bonus_cache',
    PROFILE: 'tidye_profile_cache',
    PREFETCH_DATA: 'tidye_prefetch_cache'
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const BALANCE_FETCH_THROTTLE = 15000; // 15 seconds

// ── SESSION ──
export function getCleanSessionToken() {
    let raw = localStorage.getItem('tidye_session_token');
    if (!raw || raw === 'null' || raw === 'undefined') return null;
    try {
        let p = JSON.parse(raw);
        if (p?.access_token) return p.access_token;
        if (typeof p === 'string') return p;
    } catch(e) {}
    return raw.replace(/^["']|["']$/g, '').trim();
}

export function enforceSession() {
    if (!getCleanSessionToken()) {
        window.location.replace('/login');
        return false;
    }
    return true;
}

// ── BALANCE CACHE ──
export function getCachedBalance() {
    try {
        const cached = localStorage.getItem(CACHE_KEYS.BALANCE);
        if (!cached) return null;
        const { balance, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) return balance;
    } catch(e) {}
    return null;
}
export function cacheBalance(balance) {
    try {
        localStorage.setItem(CACHE_KEYS.BALANCE, JSON.stringify({ balance, timestamp: Date.now() }));
    } catch(e) {}
}

// ── BONUS CACHE ──
export function getCachedBonus() {
    try {
        const cached = localStorage.getItem(CACHE_KEYS.BONUS);
        if (!cached) return null;
        const { bonus, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) return bonus;
    } catch(e) {}
    return null;
}
export function cacheBonus(bonus) {
    try {
        localStorage.setItem(CACHE_KEYS.BONUS, JSON.stringify({ bonus, timestamp: Date.now() }));
    } catch(e) {}
}

// ── PROFILE CACHE ──
export function getCachedProfile() {
    try {
        const cached = localStorage.getItem(CACHE_KEYS.PROFILE);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) return data;
    } catch(e) {}
    return null;
}
export function cacheProfile(data) {
    try {
        localStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify({ data, timestamp: Date.now() }));
    } catch(e) {}
}

// ── PREFETCH CACHE ──
export function getPrefetchCache(page) {
    try {
        const key = `${CACHE_KEYS.PREFETCH_DATA}_${page}`;
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 60000) return data;
    } catch(e) {}
    return null;
}
export function setPrefetchCache(page, data) {
    try {
        const key = `${CACHE_KEYS.PREFETCH_DATA}_${page}`;
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch(e) {}
}

// ── API CALLS ──
export async function fetchBalanceFromAPI(token) {
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-api`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const d = await res.json();
            return { balance: Number(d.balance), bonus: typeof d.bonus === 'number' ? d.bonus : null };
        } else if (res.status === 401) {
            return 'UNAUTHORIZED';
        }
        return null;
    } catch (e) {
        return null;
    }
}

export async function fetchProfileFromAPI(token) {
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/settings-api`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data;
        } else if (res.status === 401) {
            return 'UNAUTHORIZED';
        }
        return null;
    } catch (e) {
        return null;
    }
}

export async function triggerBackgroundPrefetch(token, userId, page) {
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/background-prefetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId, page })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
                setPrefetchCache(page, data.data);
                return data.data;
            }
        }
    } catch(e) {
        Logger.warn('Background prefetch error:', e);
    }
    return null;
}

export async function checkApiLock() {
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/api-lock`, {
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        if (!res.ok) return;
        const d = await res.json();
        if (d.locked) window.location.replace('/updating');
    } catch(e) {}
}

// ── LOGOUT ──
export async function performLogout(user_id, session_token) {
    if (user_id && session_token) {
        try {
            await fetch(`${SUPABASE_URL}/functions/v1/api-logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id, session_token })
            });
        } catch(e) {}
    }

    localStorage.removeItem('tidye_session_token');
    localStorage.removeItem('tidye_user_code');
    localStorage.removeItem('tidye_balance_cache');
    localStorage.removeItem('tidye_bonus_cache');
    localStorage.removeItem('tidye_profile_cache');
    localStorage.removeItem('tidye_phone_network_cache');
    sessionStorage.clear();
    window.location.replace('/login');
}

// ── TURNSTILE ──
export function triggerTurnstile() {
    const TURNSTILE_SITEKEY = "0x4AAAAAADQhPHJB5viRCO84";
    if (typeof turnstile === 'undefined') {
        setTimeout(triggerTurnstile, 100);
        return;
    }
    try {
        turnstile.render('#turnstile-bg-holder', {
            sitekey: TURNSTILE_SITEKEY,
            action: 'account',
            size: 'invisible',
            callback: token => {
                window.turnstileToken = token;
                sessionStorage.setItem('tidye_turnstile_token', token);
            },
            'expired-callback': () => { window.turnstileToken = null; },
            'error-callback': () => { window.turnstileToken = null; }
        });
    } catch(e) {}
}

// ── AVATAR ──
export function getCurrentAvatar() {
    const idx = parseInt(localStorage.getItem('tidye_user_avatar_idx') || '6');
    return { idx, src: `/user${idx}.jpeg` };
}

export function cycleAvatar() {
    let idx = parseInt(localStorage.getItem('tidye_user_avatar_idx') || '6');
    idx = idx >= 7 ? 1 : idx + 1;
    localStorage.setItem('tidye_user_avatar_idx', idx);
    return { idx, src: `/user${idx}.jpeg` };
}
