/* src/services/withdraw.js */
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || window.SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY;
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Logger ──
export const Logger = {
    info: (msg, data = {}) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
    warn: (msg, data = {}) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data),
    error: (msg, data = {}) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, data)
};

// ── CACHE KEYS ──
export const CACHE_KEYS = {
    BALANCE: 'tidye_balance_cache',
    PHONE_NETWORK: 'tidye_phone_network_cache',
    PROFILE: 'tidye_profile_cache'
};
const BALANCE_CACHE_TTL = 5 * 60 * 1000;
const PHONE_CACHE_TTL = 24 * 60 * 60 * 1000;
const BALANCE_FETCH_THROTTLE = 15000;

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
        if (Date.now() - timestamp < BALANCE_CACHE_TTL) return balance;
    } catch (e) {}
    return null;
}
export function cacheBalance(balance) {
    try {
        localStorage.setItem(CACHE_KEYS.BALANCE, JSON.stringify({ balance, timestamp: Date.now() }));
    } catch (e) {}
}

export function getCachedPhoneNetwork() {
    try {
        const cached = localStorage.getItem(CACHE_KEYS.PHONE_NETWORK);
        if (!cached) return null;
        const { phone, network, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < PHONE_CACHE_TTL) return { phone, network };
    } catch (e) {}
    return null;
}
export function cachePhoneNetwork(phone, network) {
    try {
        localStorage.setItem(CACHE_KEYS.PHONE_NETWORK, JSON.stringify({ phone, network, timestamp: Date.now() }));
    } catch (e) {}
}

export function getCachedProfile() {
    try {
        const cached = localStorage.getItem(CACHE_KEYS.PROFILE);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < BALANCE_CACHE_TTL) return data;
    } catch(e) {}
    return null;
}
export function cacheProfile(data) {
    try {
        localStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify({ data, timestamp: Date.now() }));
    } catch(e) {}
}

export function detectNetworkFromPhone(phone) {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('265')) clean = clean.substring(3);
    if (clean.startsWith('0')) clean = clean.substring(1);
    if (clean.startsWith('99') || clean.startsWith('98')) return 'AIRTEL';
    if (clean.startsWith('88') || clean.startsWith('31')) return 'TNM';
    return 'UNKNOWN';
}

// ── API CALLS ──
export async function fetchBalanceFromAPI(token) {
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-api`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const d = await res.json();
            return Number(d.balance);
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
            return await res.json();
        } else if (res.status === 401) {
            return 'UNAUTHORIZED';
        }
        return null;
    } catch (e) {
        return null;
    }
}

export async function checkApiLock() {
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/api-lock`, {
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.locked) window.location.replace('/updating');
        }
    } catch(e) {}
}

export async function processWithdrawAPI(token, amount, phone, network) {
    const tokenRes = await fetch(`${SUPABASE_URL}/functions/v1/token-code-api`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'withdraw',
            amount: amount,
            session_id: crypto.randomUUID()
        })
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.success) {
        return { success: false, error: tokenData.error || "Failed to obtain security token." };
    }
    const securityToken = tokenData.token;
    if (!securityToken) {
        return { success: false, error: "Security token not received." };
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/payout-fund-api`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amount,
            phone: phone,
            network: network,
            token: securityToken
        })
    });
    const data = await response.json();
    if (response.ok && data.success) {
        return { success: true, data };
    } else {
        return { success: false, error: data.error || "Withdrawal failed. Try again." };
    }
}
