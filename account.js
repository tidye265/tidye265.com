// account.js - Logic ya Account Page (Async IIFE + Router Ready)

// ── GLOBAL FLAG: Kuti tipewe kuyika event listeners kawiri ──
if (!window._accountEventsAttached) {
    window._accountEventsAttached = true;
    document.addEventListener('click', function(e) {
        // Logout button
        const logoutTarget = e.target.closest('#logoutBtn');
        if (logoutTarget && typeof window.logout === 'function') {
            logout();
        }

        // Avatar click (cycleAvatar)
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

// ── ASYNC IIFE: Imfetche data nthawi yomweyo ikalowa ──
(async () => {
    "use strict";

    console.log("⚡ [ACCOUNT PAGE] Async IIFE: Fetching data immediately...");

    // ── CACHE HELPERS (zomwe zilipo) ──
    const CACHE_KEYS = {
        BALANCE: 'tidye_balance_cache',
        BONUS: 'tidye_bonus_cache',
        PROFILE: 'tidye_profile_cache',
        PREFETCH_DATA: 'tidye_prefetch_cache'
    };
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    const BALANCE_FETCH_THROTTLE = 15000; // 15 seconds

    let lastBalanceFetchTime = 0;

    function getCachedBalance() {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.BALANCE);
            if (!cached) return null;
            const { balance, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) return balance;
        } catch (e) {}
        return null;
    }

    function cacheBalance(balance) {
        try {
            localStorage.setItem(CACHE_KEYS.BALANCE, JSON.stringify({ balance, timestamp: Date.now() }));
        } catch (e) {}
    }

    function getCachedBonus() {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.BONUS);
            if (!cached) return null;
            const { bonus, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) return bonus;
        } catch (e) {}
        return null;
    }

    function cacheBonus(bonus) {
        try {
            localStorage.setItem(CACHE_KEYS.BONUS, JSON.stringify({ bonus, timestamp: Date.now() }));
        } catch (e) {}
    }

    function getCachedProfile() {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.PROFILE);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) return data;
        } catch (e) {}
        return null;
    }

    function cacheProfile(data) {
        try {
            localStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {}
    }

    function getCleanSessionToken() {
        let raw = localStorage.getItem('tidye_session_token');
        if (!raw || raw === 'null' || raw === 'undefined') return null;
        try { let p = JSON.parse(raw); if (p?.access_token) return p.access_token; if (typeof p === 'string') return p; } catch (
            e) {}
        return raw.replace(/^["']|["']$/g, '').trim();
    }

    function enforceSession() {
        if (!getCleanSessionToken()) {
            window.location.replace('login.html');
            return false;
        }
        return true;
    }

    // ── FETCH BALANCE ──
    async function fetchBalanceIfNeeded() {
        const now = Date.now();
        if (now - lastBalanceFetchTime < BALANCE_FETCH_THROTTLE) return;
        const tok = getCleanSessionToken();
        if (!tok) return;
        try {
            const res = await fetch(window.SUPABASE_URL + '/functions/v1/wallet-api', {
                headers: { 'Authorization': 'Bearer ' + tok }
            });
            if (res.ok) {
                const d = await res.json();
                const balance = Number(d.balance);
                lastBalanceFetchTime = Date.now();
                const currentDisplayed = document.getElementById('balanceDisplay').textContent.replace(/[^0-9.-]+/g, '');
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
        } catch (e) {}
    }

    // ── FETCH PROFILE ──
    async function fetchUserProfile() {
        const tok = getCleanSessionToken();
        if (!tok) return;
        try {
            const res = await fetch(window.SUPABASE_URL + '/functions/v1/settings-api', {
                headers: { 'Authorization': 'Bearer ' + tok }
            });
            if (res.ok) {
                const d = await res.json();
                localStorage.setItem('tidye_user_code', d.id || '');
                cacheProfile(d);
                window._userData = d;
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

    // ── UI UPDATE FUNCTIONS ──
    const balanceDisplay = document.getElementById('balanceDisplay');
    const balanceWrapper = document.getElementById('balanceWrapper');

    function updateBalanceUI(balance) {
        const formatted = balance.toFixed(2);
        const [main, cents] = formatted.split('.');
        balanceDisplay.innerHTML = 'MWK ' + parseInt(main).toLocaleString() + '<span class="bal-cents">.' + cents + '</span>';
        balanceWrapper.classList.add('balance-loaded');

        const accountBal = document.getElementById('accountBalanceDisplay');
        if (accountBal) {
            accountBal.innerHTML = 'MWK ' + parseInt(main).toLocaleString() + '<span class="bal-cents">.' + cents + '</span>';
        }
    }

    function updateBonusUI(bonus) {
        const bonusDisplay = document.getElementById('bonusDisplay');
        if (bonusDisplay) {
            const formatted = Number(bonus || 0).toFixed(2);
            bonusDisplay.innerHTML = 'MWK ' + Number(formatted).toLocaleString();
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

    // ── EXECUTE FETCH (only if session exists) ──
    if (enforceSession()) {
        // Load from cache first
        const cachedBalance = getCachedBalance();
        if (cachedBalance !== null) {
            updateBalanceUI(cachedBalance);
        } else {
            balanceWrapper.classList.remove('balance-loaded');
        }
        const cachedBonus = getCachedBonus();
        updateBonusUI(cachedBonus !== null ? cachedBonus : 0);

        // Then fetch fresh data
        await fetchBalanceIfNeeded();
        await fetchUserProfile();

        console.log("✅ [ASYNC IIFE] Data fetched successfully.");
    } else {
        console.warn("⚠️ No session, skipping data fetch.");
    }
})();

// ── ROUTER ENTRY POINT (router imayimba iyi) ──
window.initAccountPage = async function() {
    "use strict";

    console.log("⚡ [ACCOUNT PAGE] Router initAccountPage called.");

    // ── Betslip ──
    let currentBets = JSON.parse(localStorage.getItem('tidye_bet_slip') || '[]');
    function saveBets() { localStorage.setItem('tidye_bet_slip', JSON.stringify(currentBets)); }
    window.removeBet = (i) => { currentBets.splice(i, 1);
        saveBets(); };

    // ── CACHE HELPERS (already defined, but we keep them for completeness) ──
    // ... (same as above, but we already have them in IIFE, so we can skip redeclaring)

    // ── AVATAR ──
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

    // ── LOGOUT ──
    window.logout = async function() {
        const btn = document.getElementById('logoutBtn');
        if (!btn) return;
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin-icon"></i> Logging out...';

        const user_id = (window._userData && window._userData.id) || localStorage.getItem('tidye_user_code');
        const session_token = getCleanSessionToken();

        if (user_id && session_token) {
            try {
                await fetch(window.SUPABASE_URL + '/functions/v1/api-logout', {
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

    // ── TURNSTILE ──
    const TURNSTILE_SITEKEY = "0x4AAAAAADQhPHJB5viRCO84";

    function triggerTurnstile() {
        if (typeof turnstile === 'undefined') { setTimeout(triggerTurnstile, 100); return; }
        try {
            turnstile.render('#turnstile-bg-holder', {
                sitekey: TURNSTILE_SITEKEY,
                action: 'account',
                size: 'invisible',
                callback: token => { window.turnstileToken = token;
                    sessionStorage.setItem('tidye_turnstile_token', token); },
                'expired-callback': () => { window.turnstileToken = null; },
                'error-callback': () => { window.turnstileToken = null; }
            });
        } catch (e) {}
    }

    // ── FOOTER INJECTION ──
    const footerPromise = fetch('footer.html')
        .then(response => response.ok ? response.text() : '')
        .catch(() => '');

    async function injectFooter() {
        const placeholder = document.getElementById('footer-placeholder');
        if (!placeholder) return;
        const html = await footerPromise;
        if (html) {
            placeholder.innerHTML = html;
            placeholder.querySelectorAll('script').forEach(s => {
                const ns = document.createElement('script');
                ns.textContent = s.textContent;
                document.body.appendChild(ns).remove();
            });
        }
    }

    function checkOffline() {
        const modal = document.getElementById('slowNetModal');
        if (!navigator.onLine) modal.classList.add('show');
        else modal.classList.remove('show');
    }

    // ── EXECUTE REMAINING INIT ──
    if (!enforceSession()) return;
    await checkApiLock();

    // 1. Avatar initialisation (if not already done)
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

    // 2. Turnstile & Footer
    triggerTurnstile();
    await injectFooter();

    // 3. Offline/online listeners
    window.addEventListener('offline', checkOffline);
    window.addEventListener('online', checkOffline);

    // 4. Sync balance from header (already done in IIFE, but ensure it's synced)
    syncBalanceFromHeader();

    console.log('✅ Account page fully initialized by router.');
};

// Helper: Sync balance from header
function syncBalanceFromHeader() {
    const headerText = document.getElementById('balanceDisplay').innerHTML;
    const accountBal = document.getElementById('accountBalanceDisplay');
    if (accountBal && headerText) {
        accountBal.innerHTML = headerText;
    }
    const bonusVal = document.getElementById('bonusDisplay');
    if (bonusVal) {
        const cachedBonus = (() => {
            try {
                const cached = localStorage.getItem(CACHE_KEYS.BONUS);
                if (!cached) return null;
                const { bonus, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL) return bonus;
            } catch (e) {}
            return null;
        })();
        if (cachedBonus !== null) {
            bonusVal.innerHTML = 'MWK ' + Number(cachedBonus).toLocaleString();
        }
    }
}

// Helper: checkApiLock (if needed)
async function checkApiLock() {
    try {
        const res = await fetch(window.SUPABASE_URL + '/functions/v1/api-lock', {
            headers: { 'Authorization': 'Bearer ' + window.SUPABASE_ANON_KEY }
        });
        if (!res.ok) return;
        const d = await res.json();
        if (d.locked) window.location.replace('updating.html');
    } catch (e) {}
}
