// account.js - v7.0 (Router v12 Ready - Clean Singleton Architecture)
// ZOSINTHA ZAKULU:
// 1. Kuchotsa global IIFE (kuti zigwirizane ndi SPA lifecycle ya router)
// 2. Kuchotsa Turnstile logic yonse (Router imagwira ntchito imeneyo)
// 3. Kugwiritsa ntchito 'window.readySupabase' kuti mupewe kuthamangitsa zinthu musanakwane

// ── CONSTANTS & CACHE HELPERS (GLOBAL SCOPE) ──
const ACCOUNT_CACHE_KEYS = {
    BALANCE: 'tidye_balance_cache',
    BONUS: 'tidye_bonus_cache',
    PROFILE: 'tidye_profile_cache'
};
const ACCOUNT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const BALANCE_FETCH_THROTTLE = 15000;    // 15 seconds

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
        console.warn("⚠️ No session, redirecting."); // Safety fallback
        window.location.replace('login.html');
        return;
    }

    // ── CACHE HELPERS (LOCAL) ──
    function getCachedBalance() {
        try {
            const cached = localStorage.getItem(ACCOUNT_CACHE_KEYS.BALANCE);
            if (!cached) return null;
            const { balance, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < ACCOUNT_CACHE_TTL) return balance;
        } catch (e) {}
        return null;
    }

    function cacheBalance(balance) {
        try { localStorage.setItem(ACCOUNT_CACHE_KEYS.BALANCE, JSON.stringify({ balance, timestamp: Date.now() })); } catch (e) {}
    }

    function getCachedBonus() {
        try {
            const cached = localStorage.getItem(ACCOUNT_CACHE_KEYS.BONUS);
            if (!cached) return null;
            const { bonus, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < ACCOUNT_CACHE_TTL) return bonus;
        } catch (e) {}
        return null;
    }

    function cacheBonus(bonus) {
        try { localStorage.setItem(ACCOUNT_CACHE_KEYS.BONUS, JSON.stringify({ bonus, timestamp: Date.now() })); } catch (e) {}
    }

    function getCachedProfile() {
        try {
            const cached = localStorage.getItem(ACCOUNT_CACHE_KEYS.PROFILE);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < ACCOUNT_CACHE_TTL) return data;
        } catch (e) {}
        return null;
    }

    function cacheProfile(data) {
        try { localStorage.setItem(ACCOUNT_CACHE_KEYS.PROFILE, JSON.stringify({ data, timestamp: Date.now() })); } catch (e) {}
    }

    // ── UI UPDATE FUNCTIONS ──
    const balanceWrapper = document.getElementById('balanceWrapper');

    function updateBalanceUI(balance) {
        const balanceDisplay = document.getElementById('balanceDisplay');
        if (!balanceDisplay) return;
        const formatted = balance.toFixed(2);
        const [main, cents] = formatted.split('.');
        balanceDisplay.innerHTML = 'MWK ' + parseInt(main).toLocaleString() + '<span class="bal-cents">.' + cents + '</span>';
        if (balanceWrapper) balanceWrapper.classList.add('balance-loaded');

        const accountBal = document.getElementById('accountBalanceDisplay');
        if (accountBal) {
            accountBal.innerHTML = 'MWK ' + parseInt(main).toLocaleString() + '<span class="bal-cents">.' + cents + '</span>';
        }
    }

    function updateBonusUI(bonus) {
        const bonusDisplay = document.getElementById('bonusDisplay');
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

    // ── FETCH DATA ──
    let lastBalanceFetchTime = 0;
    let globalUserData = null;

    async function fetchBalanceIfNeeded() {
        const now = Date.now();
        if (now - lastBalanceFetchTime < BALANCE_FETCH_THROTTLE) return;
        const tok = getCleanSessionToken();
        if (!tok) return;
        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/wallet-api`, {
                headers: { 'Authorization': 'Bearer ' + tok }
            });
            if (res.ok) {
                const d = await res.json();
                const balance = Number(d.balance);
                lastBalanceFetchTime = Date.now();
                const currentDisplayed = document.getElementById('balanceDisplay')?.textContent.replace(/[^0-9.-]+/g, '');
                if (parseFloat(currentDisplayed) !== balance) {
                    updateBalanceUI(balance);
                }
                cacheBalance(balance);
                if (typeof d.bonus === 'number') {
                    cacheBonus(d.bonus);
                    updateBonusUI(d.bonus);
                }
            } else if (res.status === 401) {
                window.location.replace('login.html');
            }
        } catch (e) { console.warn("Balance fetch error", e); }
    }

    async function fetchUserProfile() {
        const tok = getCleanSessionToken();
        if (!tok) return;
        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/settings-api`, {
                headers: { 'Authorization': 'Bearer ' + tok }
            });
            if (res.ok) {
                const d = await res.json();
                localStorage.setItem('tidye_user_code', d.id || '');
                cacheProfile(d);
                globalUserData = d;
                updateProfileUI(d);
                if (typeof d.bonus === 'number') {
                    cacheBonus(d.bonus);
                    updateBonusUI(d.bonus);
                }
            } else if (res.status === 401) {
                window.location.replace('login.html');
            }
        } catch (e) { console.warn('Profile fetch error', e); }
    }

    // ── LOAD INITIAL CACHED DATA & FETCH FRESH ──
    const cachedBalance = getCachedBalance();
    if (cachedBalance !== null) updateBalanceUI(cachedBalance);
    else if (balanceWrapper) balanceWrapper.classList.remove('balance-loaded');

    const cachedBonus = getCachedBonus();
    updateBonusUI(cachedBonus !== null ? cachedBonus : 0);

    await fetchBalanceIfNeeded();
    await fetchUserProfile();

    // ── AVATAR LOGIC ──
    window.cycleAvatar = function() {
        let idx = parseInt(localStorage.getItem('tidye_user_avatar_idx') || '6');
        idx = idx >= 7 ? 1 : idx + 1;
        localStorage.setItem('tidye_user_avatar_idx', idx);
        const avatarImg = document.getElementById('avatarImg');
        if (avatarImg) avatarImg.src = 'user' + idx + '.jpeg';
        const profileAvatar = document.querySelector('.profile-avatar');
        if (profileAvatar && !document.getElementById('avatarImg')) {
            profileAvatar.innerHTML =
                '<img id="avatarImg" src="user' + idx +
                '.jpeg" alt="Avatar" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'<span style=font-size:28px;font-weight:800;color:#1a1d21>U</span>\';">';
        }
    };

    // Initial Avatar Setup
    const avatarSkeleton = document.getElementById('avatarSkeleton');
    if (avatarSkeleton) {
        const idx = parseInt(localStorage.getItem('tidye_user_avatar_idx') || '6');
        const avatarSrc = 'user' + idx + '.jpeg';
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

        const user_id = (globalUserData && globalUserData.id) || localStorage.getItem('tidye_user_code');
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

    // ── EVENT LISTENERS (Attached ONCE globally) ──
    if (!window._accountEventsAttached) {
        window._accountEventsAttached = true;
        document.addEventListener('click', function(e) {
            // Logout button
            const logoutTarget = e.target.closest('#logoutBtn');
            if (logoutTarget && typeof window.logout === 'function') {
                window.logout();
            }

            // Avatar click
            const avatarTarget = e.target.closest('.profile-avatar');
            if (avatarTarget && typeof window.cycleAvatar === 'function') {
                window.cycleAvatar();
            }

            // "See More" button
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

    // ── FOOTER INJECTION ──
    async function injectFooter() {
        const placeholder = document.getElementById('footer-placeholder');
        if (!placeholder || placeholder.children.length > 0) return; // Skip if already loaded
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
    await injectFooter();

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
