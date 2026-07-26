// deposit.js - Logic ya Deposit Page (Async IIFE + Router Ready)
// ZOSINTHA: enforceSession yachotsedwa – router imayang'anira session.

// ── GLOBAL FLAG: Kuti tipewe kuyika event listeners kawiri ──
if (!window._depositEventsAttached) {
    window._depositEventsAttached = true;
    document.addEventListener('click', function(e) {
        const target = e.target.closest('#btnDeposit');
        if (target && typeof window.processDeposit === 'function') {
            window.processDeposit();
        }

        const quickBtn = e.target.closest('.quick-btn');
        if (quickBtn && typeof window.setAmount === 'function') {
            const val = quickBtn.getAttribute('data-amount');
            if (val) window.setAmount(parseInt(val));
        }

        const netSel = e.target.closest('#networkSelector');
        if (netSel && typeof window.toggleNetworkDetails === 'function') {
            window.toggleNetworkDetails();
        }

        const infoBtn = e.target.closest('#howItWorksBtn');
        if (infoBtn) {
            document.getElementById('infoModal').classList.add('active');
        }

        const closeInfoBtn = e.target.closest('#closeInfoModalBtn');
        if (closeInfoBtn) {
            document.getElementById('infoModal').classList.remove('active');
        }

        const modalBg = e.target.closest('.fullscreen-modal');
        if (modalBg && modalBg.classList.contains('active') && e.target === modalBg) {
            modalBg.classList.remove('active');
        }
    });
}

// ── ASYNC IIFE: Imfetche data nthawi yomweyo ikalowa ──
(async () => {
    "use strict";

    console.log("⚡ [DEPOSIT PAGE] Async IIFE: Fetching data immediately...");

    // ── CACHE HELPERS ──
    const CACHE_KEYS = {
        BALANCE: 'tidye_balance_cache',
        PHONE_NETWORK: 'tidye_phone_network_cache',
        PROFILE: 'tidye_profile_cache'
    };
    const BALANCE_CACHE_TTL = 5 * 60 * 1000;
    const PHONE_CACHE_TTL = 24 * 60 * 60 * 1000;
    const BALANCE_FETCH_THROTTLE = 15000;

    let lastBalanceFetchTime = 0;
    let globalUserPhone = null;
    let globalDetectedNetwork = null;
    let globalCurrentBalance = 0;
    let globalUserId = null;
    let globalUserEmail = null;

    function getCachedBalance() {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.BALANCE);
            if (!cached) return null;
            const { balance, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < BALANCE_CACHE_TTL) return balance;
        } catch (e) {}
        return null;
    }

    function cacheBalance(balance) {
        try {
            localStorage.setItem(CACHE_KEYS.BALANCE, JSON.stringify({
                balance: balance,
                timestamp: Date.now()
            }));
        } catch (e) {}
    }

    function getCachedPhoneNetwork() {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.PHONE_NETWORK);
            if (!cached) return null;
            const { phone, network, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < PHONE_CACHE_TTL) return { phone, network };
        } catch (e) {}
        return null;
    }

    function cachePhoneNetwork(phone, network) {
        try {
            localStorage.setItem(CACHE_KEYS.PHONE_NETWORK, JSON.stringify({
                phone: phone,
                network: network,
                timestamp: Date.now()
            }));
        } catch (e) {}
    }

    function getCachedProfile() {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.PROFILE);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < BALANCE_CACHE_TTL) return data;
        } catch (e) {}
        return null;
    }

    function cacheProfile(data) {
        try {
            localStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {}
    }

    // ── SESSION TOKEN ──
    function getCleanSessionToken() {
        let rawToken = localStorage.getItem('tidye_session_token');
        if (!rawToken || rawToken === 'null' || rawToken === 'undefined') return null;
        try {
            let parsed = JSON.parse(rawToken);
            if (parsed?.access_token) return parsed.access_token;
            if (typeof parsed === 'string') return parsed;
        } catch (e) {}
        return rawToken.replace(/^["']|["']$/g, '').trim();
    }

    // ── FETCH BALANCE ──
    async function fetchBalanceIfNeeded() {
        const now = Date.now();
        if (now - lastBalanceFetchTime < BALANCE_FETCH_THROTTLE) return;
        const tok = getCleanSessionToken();
        if (!tok) return;
        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/wallet-api`, {
                headers: { 'Authorization': `Bearer ${tok}` }
            });
            if (res.ok) {
                const d = await res.json();
                const balance = Number(d.balance);
                lastBalanceFetchTime = Date.now();
                const currentDisplayed = document.getElementById('balanceDisplay').textContent.replace(/[^0-9.-]+/g, "");
                if (parseFloat(currentDisplayed) !== balance) {
                    updateBalanceUI(balance);
                } else {
                    document.getElementById('balanceWrapper').classList.add('balance-loaded');
                }
                cacheBalance(balance);
            } else if (res.status === 401) {
                window.location.replace('login.html');
            }
        } catch (e) {}
    }

    // ── FETCH PROFILE ──
    async function fetchUserProfile() {
        const tok = getCleanSessionToken();
        if (!tok) return;
        const container = document.getElementById('networkInfoContainer');
        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/settings-api`, {
                headers: { 'Authorization': `Bearer ${tok}` }
            });
            if (res.ok) {
                const d = await res.json();
                cacheProfile(d);
                globalUserId = d.id;
                globalUserEmail = d.email || null;
                if (d.phone_number) {
                    const network = detectNetworkFromPhone(d.phone_number);
                    cachePhoneNetwork(d.phone_number, network);
                    setupNetworkUI(d.phone_number, network);
                } else {
                    const phone = 'Not provided';
                    globalUserPhone = phone;
                    globalDetectedNetwork = 'UNKNOWN';
                    setupNetworkUI(phone, 'UNKNOWN');
                }
            } else {
                if (res.status === 401) {
                    window.location.replace('login.html');
                    return;
                }
                const cachedPhone = getCachedPhoneNetwork();
                if (cachedPhone) {
                    setupNetworkUI(cachedPhone.phone, cachedPhone.network);
                } else {
                    if (container) container.classList.remove('network-loaded');
                }
            }
        } catch (e) {
            console.warn("[Profile] Background fetch failed, using cached data.", e);
            const cachedPhone = getCachedPhoneNetwork();
            if (cachedPhone) {
                setupNetworkUI(cachedPhone.phone, cachedPhone.network);
            } else {
                if (container) container.classList.remove('network-loaded');
            }
        }
    }

    // ── NETWORK DETECTION ──
    function detectNetworkFromPhone(phone) {
        if (!phone) return 'UNKNOWN';
        let clean = phone.replace(/\D/g, '');
        if (clean.startsWith('265')) clean = clean.substring(3);
        if (clean.startsWith('0')) clean = clean.substring(1);
        if (clean.startsWith('99') || clean.startsWith('98')) return 'AIRTEL';
        if (clean.startsWith('88') || clean.startsWith('31')) return 'TNM';
        return 'UNKNOWN';
    }

    function setupNetworkUI(phone, network) {
        const container = document.getElementById('networkInfoContainer');
        const logo = document.getElementById('networkLogo');
        const nameEl = document.getElementById('networkName');
        const numEl = document.getElementById('userPhoneNumber');

        if (!phone) phone = 'Not provided';
        numEl.textContent = phone;
        
        if (network !== 'UNKNOWN') {
            logo.style.display = 'block';
        } else {
            logo.style.display = 'none';
        }
        
        globalUserPhone = phone;
        globalDetectedNetwork = network;

        if (network === 'AIRTEL') {
            nameEl.textContent = 'Airtel Money';
            nameEl.style.color = 'var(--airtel)';
            logo.src = 'airtel.jpg';
        } else if (network === 'TNM') {
            nameEl.textContent = 'TNM Mpamba';
            nameEl.style.color = 'var(--tnm)';
            logo.src = 'tnm.jpg';
        } else {
            globalDetectedNetwork = 'UNKNOWN';
            nameEl.textContent = 'Unknown Network';
            logo.style.display = 'none';
        }
        container.classList.add('network-loaded');
    }

    // ── UI UPDATE FUNCTIONS ──
    function updateBalanceUI(balance) {
        globalCurrentBalance = balance;
        const formatted = balance.toFixed(2);
        const [main, cents] = formatted.split('.');
        document.getElementById('balanceDisplay').innerHTML =
            `MWK ${parseInt(main).toLocaleString()}<span class="bal-cents">.${cents}</span>`;
        document.getElementById('balanceWrapper').classList.add('balance-loaded');
    }

    function showBalanceSkeleton() {
        document.getElementById('balanceWrapper').classList.remove('balance-loaded');
    }

    // ── EXECUTE FETCH (only if session exists) ──
    if (getCleanSessionToken()) {
        // Load from cache first
        const cachedBalance = getCachedBalance();
        if (cachedBalance !== null) {
            updateBalanceUI(cachedBalance);
        } else {
            showBalanceSkeleton();
        }
        const cachedPhone = getCachedPhoneNetwork();
        if (cachedPhone) {
            setupNetworkUI(cachedPhone.phone, cachedPhone.network);
        } else {
            const container = document.getElementById('networkInfoContainer');
            if (container) container.classList.remove('network-loaded');
        }
        const cachedProfile = getCachedProfile();
        if (cachedProfile) {
            globalUserId = cachedProfile.id;
            globalUserEmail = cachedProfile.email || null;
        }

        // Then fetch fresh data
        await fetchBalanceIfNeeded();
        await fetchUserProfile();

        console.log("✅ [ASYNC IIFE] Data fetched successfully.");
    } else {
        console.warn("⚠️ No session, skipping data fetch.");
    }

    // ── KEEP GLOBALS FOR ROUTER ──
    window.globalUserPhone = globalUserPhone;
    window.globalDetectedNetwork = globalDetectedNetwork;
    window.globalCurrentBalance = globalCurrentBalance;
    window.globalUserId = globalUserId;
    window.globalUserEmail = globalUserEmail;
})();

// ── ROUTER ENTRY POINT (router imayimba iyi) ──
window.initDepositPage = async function() {
    "use strict";

    console.log("⚡ [DEPOSIT PAGE] Router initDepositPage called.");

    // ── PROCESS DEPOSIT ──
    let isProcessing = false;
    let currentTxRef = null;
    let successPollInterval = null;
    let failurePollInterval = null;

    function showStatus(message, type) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.textContent = message;
        statusDiv.className = `alert ${type}`;
        statusDiv.style.display = 'block';
        if (type !== 'error') setTimeout(() => { if (statusDiv) statusDiv.style.display = 'none'; }, 8000);
    }

    function stopPolling() {
        if (successPollInterval) clearInterval(successPollInterval);
        if (failurePollInterval) clearInterval(failurePollInterval);
        successPollInterval = null;
        failurePollInterval = null;
    }

    function resetDepositUI() {
        const btn = document.getElementById('btnDeposit');
        if (btn) {
            btn.classList.remove('loading-state');
            btn.disabled = false;
            btn.innerHTML = 'DEPOSIT';
        }
        isProcessing = false;
        currentTxRef = null;
        stopPolling();
    }

    async function checkDepositStatus(txRef, expectedAmount) {
        const token = getCleanSessionToken();
        try {
            const response = await fetch(`${window.SUPABASE_URL}/functions/v1/check-deposit-status`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ tx_ref: txRef })
            });
            if (!response.ok) return;
            const data = await response.json();
            if (data.status === 'failed') {
                stopPolling();
                let errorMsg = data.error_message || "Deposit failed. Insufficient balance?";
                if (errorMsg.toLowerCase().includes("insufficient") || errorMsg.toLowerCase().includes("balance")) {
                    errorMsg = "PS! You have insufficient balance to make deposit";
                }
                showStatus(errorMsg, "error");
                resetDepositUI();
            } else if (data.status === 'success') {
                stopPolling();
                await fetchBalanceIfNeeded();
                resetDepositUI();
            }
        } catch (err) { console.warn("Error checking deposit status", err); }
    }

    async function pollForDepositSuccess(expectedAmount) {
        const token = getCleanSessionToken();
        let attempts = 0, maxAttempts = 30;
        successPollInterval = setInterval(async () => {
            attempts++;
            try {
                const res = await fetch(`${window.SUPABASE_URL}/functions/v1/wallet-api`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const currentBalance = Number(data.balance);
                    if (currentBalance > window.globalCurrentBalance) {
                        clearInterval(successPollInterval);
                        successPollInterval = null;
                        window.globalCurrentBalance = currentBalance;
                        cacheBalance(currentBalance);
                        updateBalanceUI(currentBalance);
                        document.getElementById('walletTrigger').classList.add('glow-success');

                        let banner = document.getElementById('successBanner');
                        if (!banner) {
                            const newBanner = document.createElement('div');
                            newBanner.id = 'successBanner';
                            newBanner.className = 'success-banner';
                            newBanner.innerHTML = '<i class="bi bi-check-circle-fill"></i><span></span>';
                            document.body.insertBefore(newBanner, document.querySelector('.deposit-container'));
                            banner = newBanner;
                        }
                        banner.style.display = 'flex';
                        banner.querySelector('span').innerText = `Deposit MWK ${expectedAmount.toLocaleString()} Successfully`;
                        setTimeout(() => {
                            banner.style.display = 'none';
                            document.getElementById('walletTrigger').classList.remove('glow-success');
                        }, 8000);

                        resetDepositUI();
                        document.getElementById('statusMessage').style.display = 'none';
                        if (failurePollInterval) clearInterval(failurePollInterval);
                    }
                }
            } catch (e) { console.error(e); }
            if (attempts >= maxAttempts) {
                clearInterval(successPollInterval);
                successPollInterval = null;
                if (failurePollInterval) clearInterval(failurePollInterval);
                showStatus("Verification taking longer, balance will auto-refresh.", "info");
                resetDepositUI();
            }
        }, 4000);
    }

    window.processDeposit = async function() {
        if (isProcessing) {
            showStatus("Please wait, already processing...", "info");
            return;
        }

        const amountInput = document.getElementById('depositAmount').value;
        const amount = parseFloat(amountInput);
        if (isNaN(amount) || amount < 50 || amount > 750000) {
            showStatus("Enter valid amount (Min:50, Max:750,000 MWK)", "error");
            return;
        }
        if (!window.globalUserPhone || window.globalUserPhone === 'Not provided' || !window.globalDetectedNetwork || window.globalDetectedNetwork === 'UNKNOWN' || !window.globalUserId) {
            showStatus("Phone or network not recognized. Please refresh or contact support.", "error");
            return;
        }

        const btn = document.getElementById('btnDeposit');
        isProcessing = true;
        btn.disabled = true;
        btn.classList.add('loading-state');
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin-icon"></i> Processing...';
        document.getElementById('statusMessage').style.display = 'none';

        let verificationResult = await waitForTurnstileToken();
        let currentToken = verificationResult.token;
        let txRef = null;

        try {
            const token = getCleanSessionToken();
            const response = await fetch(`${window.SUPABASE_URL}/functions/v1/payment-topup-api`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, phone: window.globalUserPhone, network: window.globalDetectedNetwork, id: window.globalUserId, email: window.globalUserEmail, turnstileToken: currentToken })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                txRef = data.tx_ref;
                currentTxRef = txRef;
                showStatus("Check your phone & Enter PIN to complete...", "info");
                btn.innerHTML = '<i class="bi bi-hourglass-split spin-icon"></i> Awaiting Confirmation...';
                document.getElementById('depositAmount').value = '';

                pollForDepositSuccess(amount);

                if (failurePollInterval) clearInterval(failurePollInterval);
                failurePollInterval = setInterval(() => {
                    if (currentTxRef) checkDepositStatus(currentTxRef, amount);
                }, 5000);
            } else {
                let errorMsg = data.error || "Transaction failed, try again.";
                if (errorMsg.toLowerCase().includes("insufficient") || errorMsg.toLowerCase().includes("balance")) {
                    errorMsg = "You have insufficient balance to make this deposit. Please ensure you have enough funds in your mobile money account.";
                }
                showStatus(errorMsg, "error");
                resetDepositUI();
            }
        } catch (e) {
            console.error(e);
            showStatus("Network error. Please try again.", "error");
            resetDepositUI();
        } finally {
            refreshTurnstile();
        }
    };

    // ── TURNSTILE ──
    let turnstileWidgetId = null;
    let turnstileToken = null;
    let tokenCreatedAt = 0;

    function importDashboardTurnstileToken() {
        const savedToken = sessionStorage.getItem('tidye_turnstile_token');
        const savedTime = sessionStorage.getItem('tidye_turnstile_created_at');
        if (savedToken && savedTime && (Date.now() - parseInt(savedTime) < 90000)) {
            turnstileToken = savedToken;
            tokenCreatedAt = parseInt(savedTime);
            return true;
        }
        return false;
    }

    function initTurnstile() {
        if (typeof turnstile === 'undefined') { setTimeout(initTurnstile, 300); return; }
        if (turnstileWidgetId !== null) return;
        turnstileWidgetId = turnstile.render('#turnstileWidget', {
            sitekey: '0x4AAAAAADQhPHJB5viRCO84',
            size: 'invisible',
            callback: (token) => {
                turnstileToken = token;
                tokenCreatedAt = Date.now();
                sessionStorage.setItem('tidye_turnstile_token', token);
                sessionStorage.setItem('tidye_turnstile_created_at', tokenCreatedAt);
            },
            'error-callback': refreshTurnstile,
            'expired-callback': refreshTurnstile,
            'timeout-callback': refreshTurnstile
        });
        turnstile.execute(turnstileWidgetId);
    }

    function isTokenStillValid() {
        return turnstileToken && (Date.now() - tokenCreatedAt < 90000);
    }

    function refreshTurnstile() {
        turnstileToken = null;
        tokenCreatedAt = 0;
        sessionStorage.removeItem('tidye_turnstile_token');
        sessionStorage.removeItem('tidye_turnstile_created_at');
        if (typeof turnstile !== 'undefined' && turnstileWidgetId !== null) {
            turnstile.reset(turnstileWidgetId);
            turnstile.execute(turnstileWidgetId);
        }
    }

    async function waitForTurnstileToken() {
        if (isTokenStillValid()) return { token: turnstileToken, error: null };
        return new Promise(resolve => {
            let attempts = 0;
            const interval = setInterval(() => {
                if (isTokenStillValid()) { clearInterval(interval); resolve({ token: turnstileToken, error: null }); return; }
                if (++attempts >= 15) { clearInterval(interval); resolve({ token: null, error: 'timeout' }); }
            }, 200);
        });
    }

    // ── SEE MORE ──
    function setupSeeMore() {
        const moreBtn = document.getElementById('seeMoreSubBtn');
        const subHeader = document.getElementById('categoryNav');
        if (moreBtn && subHeader) {
            const newBtn = moreBtn.cloneNode(true);
            moreBtn.parentNode.replaceChild(newBtn, moreBtn);
            newBtn.addEventListener('click', e => {
                e.preventDefault();
                subHeader.classList.toggle('show-more');
                newBtn.querySelector('span').textContent = subHeader.classList.contains('show-more') ? 'Less' : 'See More';
            });
        }
    }

    // ── FOOTER ──
    const FOOTER_CACHE_KEY = 'tidye_footer_cache';
    const FOOTER_CACHE_TTL = 24 * 60 * 60 * 1000;

    function getCachedFooter() {
        try {
            const cached = localStorage.getItem(FOOTER_CACHE_KEY);
            if (!cached) return null;
            const { html, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < FOOTER_CACHE_TTL) return html;
        } catch (e) {}
        return null;
    }

    function cacheFooter(html) {
        try { localStorage.setItem(FOOTER_CACHE_KEY, JSON.stringify({ html, timestamp: Date.now() })); } catch (e) {}
    }

    function executeScripts(container) {
        container.querySelectorAll('script').forEach(s => {
            const ns = document.createElement('script');
            ns.textContent = s.textContent;
            document.body.appendChild(ns).remove();
        });
    }

    async function injectFooter() {
        const placeholder = document.getElementById('footer-placeholder');
        if (!placeholder) return;
        const baseFooter = '<footer style="background:#29282b;color:#888;padding:20px 15px;border-top:1px solid #3a3a3a;text-align:center;font-size:13px;">&copy; 2026 Tidye265. All rights reserved.</footer>';
        placeholder.innerHTML = baseFooter;
        const cached = getCachedFooter();
        if (cached) {
            placeholder.innerHTML = cached;
            executeScripts(placeholder);
        } else {
            try {
                const res = await fetch('footer.html');
                if (res.ok) {
                    const html = await res.text();
                    if (html) {
                        cacheFooter(html);
                        placeholder.innerHTML = html;
                        executeScripts(placeholder);
                    }
                }
            } catch (e) { /* silent */ }
        }
    }

    // ── OFFLINE ──
    const offlineModal = document.getElementById('offlineModal');
    function updateOnlineStatus() {
        if (!navigator.onLine) offlineModal.classList.add('active');
        else offlineModal.classList.remove('active');
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // ── HELPERS ──
    window.toggleNetworkDetails = function() {
        const sel = document.getElementById('networkSelector');
        if (sel) sel.classList.toggle('open');
    };
    window.setAmount = function(val) {
        const input = document.getElementById('depositAmount');
        if (input) input.value = val;
    };

    function getCleanSessionToken() {
        let rawToken = localStorage.getItem('tidye_session_token');
        if (!rawToken || rawToken === 'null' || rawToken === 'undefined') return null;
        try {
            let parsed = JSON.parse(rawToken);
            if (parsed?.access_token) return parsed.access_token;
            if (typeof parsed === 'string') return parsed;
        } catch (e) {}
        return rawToken.replace(/^["']|["']$/g, '').trim();
    }

    // ── NOTIFICATIONS ──
    async function fetchNotifications() {
        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/noti-api`, {
                headers: { 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.notifications && data.notifications.length > 0) {
                    const notification = data.notifications[0];
                    const banner = document.getElementById('notificationBanner');
                    if (banner && notification.message) {
                        banner.textContent = notification.message;
                        banner.className = notification.type;
                        banner.style.display = 'block';
                    }
                }
            }
        } catch (e) { console.warn("Failed to fetch notifications", e); }
    }

    // ── EXECUTE REMAINING INIT ──
    // Router yatsopano imayang'anira session, kotero palibe kufuna kuyimba enforceSession.

    // 1. Turnstile & Footer
    if (!importDashboardTurnstileToken()) initTurnstile();
    setInterval(() => {
        if (tokenCreatedAt && (Date.now() - tokenCreatedAt > 80000)) refreshTurnstile();
    }, 10000);
    await injectFooter();

    // 2. See More
    setupSeeMore();

    // 3. Notifications
    await fetchNotifications();

    console.log('✅ Deposit page fully initialized by router.');
};

// Helper: checkApiLock (if needed)
async function checkApiLock() {
    try {
        const res = await fetch(`${window.SUPABASE_URL}/functions/v1/api-lock`, {
            headers: { 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.locked) window.location.replace('updating.html');
        }
    } catch (e) {}
}
