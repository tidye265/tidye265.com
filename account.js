// account.js - v8.0 (Ultra Speed & Router v12 Ready - Clean Singleton Architecture)
// ZOSINTHA ZAKULU:
// 1. Parallel Fetch (Promise.all)
// 2. Memory Cache (Singleton) + Deduplication
// 3. AbortController (auto-cancel on page leave)
// 4. requestIdleCallback (lazy footer & preload)
// 5. DOM Batch Updates
// 6. Preload Avatar

// ── CONSTANTS & GLOBAL STATE ──
const ACCOUNT_CACHE_KEYS = {
    BALANCE: 'tidye_balance_cache',
    BONUS: 'tidye_bonus_cache',
    PROFILE: 'tidye_profile_cache'
};
const ACCOUNT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const BALANCE_FETCH_THROTTLE = 15000;    // 15 seconds

// Global memory cache & abort controllers (Singleton)
window.__accountState = {
    balance: null,
    bonus: null,
    profile: null,
    balancePromise: null,
    profilePromise: null,
    balanceController: null,
    profileController: null,
    lastBalanceFetch: 0
};

// ── HELPER: SYNC BALANCE (Yotchedwa mu footer) ──
window.syncAccountBalance = function() {
    const headerText = document.getElementById('balanceDisplay')?.innerHTML;
    const accountBal = document.getElementById('accountBalanceDisplay');
    if (accountBal && headerText) {
        accountBal.innerHTML = headerText;
    }
    const bonusVal = document.getElementById('bonusDisplay');
    if (bonusVal) {
        try {
            const cached = localStorage.getItem(ACCOUNT_CACHE_KEYS.BONUS);
            if (!cached) return;
            const { bonus, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < ACCOUNT_CACHE_TTL && bonus !== null) {
                bonusVal.innerHTML = 'MWK ' + Number(bonus).toLocaleString();
            }
        } catch (e) {}
    }
};

// ── ROUTER ENTRY POINT ──
window.initAccountPage = async function() {
    "use strict";

    console.log("⚡ [ACCOUNT PAGE] Router initAccountPage called.");

    // 1. Wait for Supabase globals to be defined by Router
    await window.readySupabase;

    // 2. Check API Lock
    async function checkApiLock() {
        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/api-lock`, {
                headers: { 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` }
            });
            if (res.ok) {
                const d = await res.json();
                if (d.locked) window.location.replace('updating.html');
            }
        } catch (e) {}
    }
    await checkApiLock();

    // 3. Session Token Helper
    function getCleanSessionToken() {
        let raw = localStorage.getItem('tidye_session_token');
        if (!raw || raw === 'null' || raw === 'undefined') return null;
        try { let p = JSON.parse(raw); if (p?.access_token) return p.access_token; if (typeof p === 'string') return p; } catch (e) {}
        return raw.replace(/^["']|["']$/g, '').trim();
    }

    if (!getCleanSessionToken()) {
        console.warn("⚠️ No session, redirecting.");
        window.location.replace('login.html');
        return;
    }

    // ── CACHE HELPERS (Memory + LocalStorage) ──
    function getCachedBalance() {
        // 1. Memory check
        if (window.__accountState.balance !== null) return window.__accountState.balance;
        // 2. LocalStorage check
        try {
            const cached = localStorage.getItem(ACCOUNT_CACHE_KEYS.BALANCE);
            if (!cached) return null;
            const { balance, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < ACCOUNT_CACHE_TTL) {
                window.__accountState.balance = balance; // store in memory
                return balance;
            }
        } catch (e) {}
        return null;
    }

    function cacheBalance(balance) {
        window.__accountState.balance = balance;
        try { localStorage.setItem(ACCOUNT_CACHE_KEYS.BALANCE, JSON.stringify({ balance, timestamp: Date.now() })); } catch (e) {}
    }

    function getCachedBonus() {
        if (window.__accountState.bonus !== null) return window.__accountState.bonus;
        try {
            const cached = localStorage.getItem(ACCOUNT_CACHE_KEYS.BONUS);
            if (!cached) return null;
            const { bonus, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < ACCOUNT_CACHE_TTL) {
                window.__accountState.bonus = bonus;
                return bonus;
            }
        } catch (e) {}
        return null;
    }

    function cacheBonus(bonus) {
        window.__accountState.bonus = bonus;
        try { localStorage.setItem(ACCOUNT_CACHE_KEYS.BONUS, JSON.stringify({ bonus, timestamp: Date.now() })); } catch (e) {}
    }

    function getCachedProfile() {
        if (window.__accountState.profile !== null) return window.__accountState.profile;
        try {
            const cached = localStorage.getItem(ACCOUNT_CACHE_KEYS.PROFILE);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < ACCOUNT_CACHE_TTL) {
                window.__accountState.profile = data;
                return data;
            }
        } catch (e) {}
        return null;
    }

    function cacheProfile(data) {
        window.__accountState.profile = data;
        try { localStorage.setItem(ACCOUNT_CACHE_KEYS.PROFILE, JSON.stringify({ data, timestamp: Date.now() })); } catch (e) {}
    }

    // ── UI UPDATE FUNCTIONS (DOM BATCHING) ──
    const balanceWrapper = document.getElementById('balanceWrapper');
    const balanceDisplay = document.getElementById('balanceDisplay');
    const accountBal = document.getElementById('accountBalanceDisplay');
    const bonusDisplay = document.getElementById('bonusDisplay');

    function updateBalanceUI(balance) {
        if (!balanceDisplay) return;
        const formatted = balance.toFixed(2);
        const [main, cents] = formatted.split('.');
        const html = 'MWK ' + parseInt(main).toLocaleString() + '<span class="bal-cents">.' + cents + '</span>';
        balanceDisplay.innerHTML = html;
        if (accountBal) accountBal.innerHTML = html;
        if (balanceWrapper) balanceWrapper.classList.add('balance-loaded');
    }

    function updateBonusUI(bonus) {
        if (bonusDisplay) {
            bonusDisplay.innerHTML = 'MWK ' + Number(bonus || 0).toLocaleString();
        }
    }

    function updateProfileUI(user) {
        const name = user.full_name || user.name || 'User';
        const phone = user.phone_number || 'Not provided';
        const userId = user.id || localStorage.getItem('tidye_user_code') || '---';

        const nameSkeleton = document.getElementById('nameSkeleton');
        const phoneSkeleton = document.getElementById('phoneSkeleton');
        const idSkeleton = document.getElementById('idSkeleton');

        if (nameSkeleton) nameSkeleton.outerHTML = '<div class="profile-name">' + name + '</div>';
        if (phoneSkeleton) phoneSkeleton.outerHTML = '<div class="profile-phone">' + phone + '</div>';
        if (idSkeleton) idSkeleton.outerHTML = '<div class="profile-id">ID: ' + userId + '</div>';

        const editLink = document.querySelector('.profile-edit');
        if (!editLink) {
            const infoDiv = document.getElementById('profileCard')?.querySelector('.profile-info');
            if (infoDiv) {
                infoDiv.insertAdjacentHTML('beforeend',
                    '<a href="settings.html" class="profile-edit"><i class="bi bi-pencil-square"></i> Edit Profile</a>'
                );
            }
        }
    }

    // Batched UI update
    function updateAllUI({ balance, bonus, profile }) {
        if (typeof balance === 'number') updateBalanceUI(balance);
        if (typeof bonus === 'number') updateBonusUI(bonus);
        if (profile) updateProfileUI(profile);
    }

    // ── FETCH DATA WITH DEDUPLICATION & ABORTCONTROLLER ──
    function fetchBalanceIfNeeded() {
        const now = Date.now();
        if (now - window.__accountState.lastBalanceFetch < BALANCE_FETCH_THROTTLE) {
            return Promise.resolve(window.__accountState.balance);
        }
        // Deduplication: return existing promise if already fetching
        if (window.__accountState.balancePromise) {
            return window.__accountState.balancePromise;
        }

        const tok = getCleanSessionToken();
        if (!tok) return Promise.resolve(null);

        // Abort controller
        window.__accountState.balanceController = new AbortController();
        const signal = window.__accountState.balanceController.signal;

        const promise = (async () => {
            try {
                const res = await fetch(`${window.SUPABASE_URL}/functions/v1/wallet-api`, {
                    headers: { 'Authorization': 'Bearer ' + tok },
                    signal
                });
                if (res.ok) {
                    const d = await res.json();
                    const balance = Number(d.balance);
                    window.__accountState.lastBalanceFetch = Date.now();
                    cacheBalance(balance);
                    if (typeof d.bonus === 'number') {
                        cacheBonus(d.bonus);
                    }
                    return { balance, bonus: d.bonus };
                } else if (res.status === 401) {
                    window.location.replace('login.html');
                }
            } catch (e) {
                if (e.name !== 'AbortError') console.warn("Balance fetch error", e);
            } finally {
                window.__accountState.balancePromise = null;
                window.__accountState.balanceController = null;
            }
            return null;
        })();

        window.__accountState.balancePromise = promise;
        return promise;
    }

    function fetchUserProfile() {
        if (window.__accountState.profilePromise) {
            return window.__accountState.profilePromise;
        }
        const tok = getCleanSessionToken();
        if (!tok) return Promise.resolve(null);

        window.__accountState.profileController = new AbortController();
        const signal = window.__accountState.profileController.signal;

        const promise = (async () => {
            try {
                const res = await fetch(`${window.SUPABASE_URL}/functions/v1/settings-api`, {
                    headers: { 'Authorization': 'Bearer ' + tok },
                    signal
                });
                if (res.ok) {
                    const d = await res.json();
                    localStorage.setItem('tidye_user_code', d.id || '');
                    cacheProfile(d);
                    if (typeof d.bonus === 'number') {
                        cacheBonus(d.bonus);
                    }
                    return { profile: d, bonus: d.bonus };
                } else if (res.status === 401) {
                    window.location.replace('login.html');
                }
            } catch (e) {
                if (e.name !== 'AbortError') console.warn('Profile fetch error', e);
            } finally {
                window.__accountState.profilePromise = null;
                window.__accountState.profileController = null;
            }
            return null;
        })();

        window.__accountState.profilePromise = promise;
        return promise;
    }

    // ── LOAD INITIAL CACHED DATA & FETCH FRESH (PARALLEL) ──
    const cachedBalance = getCachedBalance();
    const cachedBonus = getCachedBonus();
    const cachedProfile = getCachedProfile();

    // Show cached data immediately
    if (cachedBalance !== null) updateBalanceUI(cachedBalance);
    else if (balanceWrapper) balanceWrapper.classList.remove('balance-loaded');
    updateBonusUI(cachedBonus !== null ? cachedBonus : 0);
    if (cachedProfile) updateProfileUI(cachedProfile);

    // Parallel fresh fetch (Promise.all)
    try {
        const [balanceResult, profileResult] = await Promise.all([
            fetchBalanceIfNeeded(),
            fetchUserProfile()
        ]);

        // Merge results and update DOM once (batch)
        const data = {};
        if (balanceResult) {
            data.balance = balanceResult.balance;
            data.bonus = balanceResult.bonus;
        }
        if (profileResult) {
            data.profile = profileResult.profile;
            if (profileResult.bonus) data.bonus = profileResult.bonus;
        }
        if (Object.keys(data).length > 0) {
            updateAllUI(data);
        }
    } catch (e) {
        // In case both fail, we already have cached data shown
    }

    // ── AVATAR LOGIC ──
    window.cycleAvatar = function() {
        let idx = parseInt(localStorage.getItem('tidye_user_avatar_idx') || '6');
        idx = idx >= 7 ? 1 : idx + 1;
        localStorage.setItem('tidye_user_avatar_idx', idx);
        const avatarSrc = 'user' + idx + '.jpeg';
        const avatarImg = document.getElementById('avatarImg');
        if (avatarImg) avatarImg.src = avatarSrc;
        const profileAvatar = document.querySelector('.profile-avatar');
        if (profileAvatar && !document.getElementById('avatarImg')) {
            profileAvatar.innerHTML =
                '<img id="avatarImg" src="' + avatarSrc + '" alt="Avatar" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'<span style=font-size:28px;font-weight:800;color:#1a1d21>U</span>\';">';
        }
        // Preload next image
        const nextIdx = idx >= 7 ? 1 : idx + 1;
        new Image().src = 'user' + nextIdx + '.jpeg';
    };

    // Initial Avatar Setup & Preload
    const avatarSkeleton = document.getElementById('avatarSkeleton');
    if (avatarSkeleton) {
        const idx = parseInt(localStorage.getItem('tidye_user_avatar_idx') || '6');
        const avatarSrc = 'user' + idx + '.jpeg';
        // Preload current avatar for instant display
        new Image().src = avatarSrc;
        // Preload next avatar to be ready
        const nextIdx = idx >= 7 ? 1 : idx + 1;
        new Image().src = 'user' + nextIdx + '.jpeg';

        avatarSkeleton.outerHTML =
            `
            <div class="profile-avatar" onclick="cycleAvatar()">
                <img id="avatarImg" src="${avatarSrc}" alt="Avatar" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=font-size:28px;font-weight:800;color:#1a1d21>U</span>';">
            </div>
        `;
    }

    // ── LOGOUT LOGIC ──
    window.logout = async function() {
        const btn = document.getElementById('logoutBtn');
        if (!btn) return;
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin-icon"></i> Logging out...';

        const user_id = (window.__accountState.profile && window.__accountState.profile.id) || localStorage.getItem('tidye_user_code');
        const session_token = getCleanSessionToken();

        if (user_id && session_token) {
            try {
                await fetch(`${window.SUPABASE_URL}/functions/v1/api-logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id, session_token })
                });
            } catch (e) {}
        }

        localStorage.removeItem('tidye_session_token');
        localStorage.removeItem('tidye_user_code');
        localStorage.removeItem('tidye_balance_cache');
        localStorage.removeItem('tidye_bonus_cache');
        localStorage.removeItem('tidye_profile_cache');
        localStorage.removeItem('tidye_phone_network_cache');
        sessionStorage.clear();
        window.location.replace('login.html');
    };

    // ── EVENT LISTENERS ──
    if (!window._accountEventsAttached) {
        window._accountEventsAttached = true;
        document.addEventListener('click', function(e) {
            const logoutTarget = e.target.closest('#logoutBtn');
            if (logoutTarget && typeof window.logout === 'function') {
                window.logout();
            }
            const avatarTarget = e.target.closest('.profile-avatar');
            if (avatarTarget && typeof window.cycleAvatar === 'function') {
                window.cycleAvatar();
            }
            const moreBtn = e.target.closest('#seeMoreSubBtn');
            if (moreBtn) {
                const subHeader = document.getElementById('categoryNav');
                if (subHeader) {
                    subHeader.classList.toggle('show-more');
                    moreBtn.querySelector('span').textContent = subHeader.classList.contains('show-more') ? 'Less' : 'See More';
                }
            }
        });
    }

    // ── FOOTER INJECTION (Lazy via requestIdleCallback) ──
    async function injectFooter() {
        const placeholder = document.getElementById('footer-placeholder');
        if (!placeholder || placeholder.children.length > 0) return;
        try {
            const res = await fetch('footer.html');
            if (res.ok) {
                const html = await res.text();
                if (html) {
                    placeholder.innerHTML = html;
                    placeholder.querySelectorAll('script').forEach(s => {
                        const ns = document.createElement('script');
                        ns.textContent = s.textContent;
                        document.body.appendChild(ns).remove();
                    });
                }
            }
        } catch (e) { /* silent */ }
    }
    // Run footer injection only when browser is idle
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => injectFooter());
    } else {
        setTimeout(injectFooter, 200);
    }

    // ── OFFLINE MODAL ──
    const offlineModal = document.getElementById('slowNetModal');
    function updateOnlineStatus() {
        if (!navigator.onLine && offlineModal) offlineModal.classList.add('show');
        else if (offlineModal) offlineModal.classList.remove('show');
    }
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('online', updateOnlineStatus);
    updateOnlineStatus();

    // ── FINAL SYNC ──
    window.syncAccountBalance();

    console.log('✅ Account page fully initialized.');
};

// ── LIFECYCLE HOOKS FOR ROUTER v12 ──
window.initAccountPage_beforeEnter = function() {
    console.log("🔄 [ACCOUNT LIFECYCLE] beforeEnter: Preparing Context");
};

window.initAccountPage_mounted = function() {
    console.log("✅ [ACCOUNT LIFECYCLE] mounted: UI visible.");
};

// ── NEW LIFECYCLE: Auto-cancel requests when leaving page ──
window.initAccountPage_beforeLeave = function() {
    console.log("⏹️ [ACCOUNT LIFECYCLE] beforeLeave: Aborting pending requests.");
    if (window.__accountState.balanceController) {
        window.__accountState.balanceController.abort();
        window.__accountState.balancePromise = null;
        window.__accountState.balanceController = null;
    }
    if (window.__accountState.profileController) {
        window.__accountState.profileController.abort();
        window.__accountState.profilePromise = null;
        window.__accountState.profileController = null;
    }
};
