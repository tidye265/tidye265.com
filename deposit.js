// deposit.js - SPA‑Ready Page Controller (v6.0 - Ultra Fast, Turnstile removed)
window.initDepositPage = async function() {
    "use strict";

    console.log("⚡ [DEPOSIT JS] initDepositPage started.");

    // 🟢 FIX: Wait for Router's Global ready promises
    await window.readySupabase; 
    // Turnstile is already rendered silently in the background by the router!

    // ── DOM REFERENCES ──
    const balanceDisplay = document.getElementById('balanceDisplay');
    const balanceWrapper = document.getElementById('balanceWrapper');
    const networkContainer = document.getElementById('networkInfoContainer');
    const networkLogo = document.getElementById('networkLogo');
    const networkNameEl = document.getElementById('networkName');
    const phoneNumEl = document.getElementById('userPhoneNumber');
    const userIdEl = document.getElementById('userIdDisplay');
    const statusDiv = document.getElementById('statusMessage');
    const btnDeposit = document.getElementById('btnDeposit');
    const amountInput = document.getElementById('depositAmount');
    const quickBtns = document.querySelectorAll('.quick-btn');
    const networkSelector = document.getElementById('networkSelector');
    const infoBtn = document.getElementById('howItWorksBtn');
    const closeInfoBtn = document.getElementById('closeInfoModalBtn');
    const infoModal = document.getElementById('infoModal');

    // ── CACHE HELPERS ──
    const CACHE_KEYS = { BALANCE: 'tidye_balance_cache', PHONE_NETWORK: 'tidye_phone_network_cache', PROFILE: 'tidye_profile_cache' };
    const CACHE_TTL = 24 * 60 * 60 * 1000;
    const BALANCE_CACHE_TTL = 5 * 60 * 1000;
    const BALANCE_FETCH_THROTTLE = 15000;

    let lastBalanceFetchTime = 0;
    let globalUserPhone = null;
    let globalDetectedNetwork = null;
    let globalCurrentBalance = 0;
    let globalUserId = null;
    let globalUserEmail = null;

    function setDefaultUserData() {
        globalUserPhone = 'Not provided';
        globalDetectedNetwork = 'UNKNOWN';
        globalUserId = '---';
        globalUserEmail = null;
        if (networkContainer) setupNetworkUI('Not provided', 'UNKNOWN');
    }

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
        try { localStorage.setItem(CACHE_KEYS.BALANCE, JSON.stringify({ balance, timestamp: Date.now() })); } catch (e) {}
    }

    function getCachedPhoneNetwork() {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.PHONE_NETWORK);
            if (!cached) return null;
            const { phone, network, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) return { phone, network };
        } catch (e) {}
        return null;
    }

    function cachePhoneNetwork(phone, network) {
        try { localStorage.setItem(CACHE_KEYS.PHONE_NETWORK, JSON.stringify({ phone, network, timestamp: Date.now() })); } catch (e) {}
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
        try { localStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify({ data, timestamp: Date.now() })); } catch (e) {}
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

    function enforceSession() {
        if (!getCleanSessionToken()) {
            window.location.replace('login.html');
            return false;
        }
        return true;
    }

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
        if (!networkContainer) return;
        if (!phone) phone = 'Not provided';
        if (phoneNumEl) phoneNumEl.textContent = phone;
        if (network !== 'UNKNOWN' && networkLogo) networkLogo.style.display = 'block';
        else if (networkLogo) networkLogo.style.display = 'none';

        globalUserPhone = phone;
        globalDetectedNetwork = network;

        if (network === 'AIRTEL' && networkNameEl) {
            networkNameEl.textContent = 'Airtel Money';
            networkNameEl.style.color = 'var(--airtel)';
            if (networkLogo) networkLogo.src = 'airtel.jpg';
        } else if (network === 'TNM' && networkNameEl) {
            networkNameEl.textContent = 'TNM Mpamba';
            networkNameEl.style.color = 'var(--tnm)';
            if (networkLogo) networkLogo.src = 'tnm.jpg';
        } else if (networkNameEl) {
            globalDetectedNetwork = 'UNKNOWN';
            networkNameEl.textContent = 'Unknown Network';
            if (networkLogo) networkLogo.style.display = 'none';
        }
        if (networkContainer) networkContainer.classList.add('network-loaded');
    }

    function updateBalanceUI(balance) {
        globalCurrentBalance = balance;
        const formatted = balance.toFixed(2);
        const [main, cents] = formatted.split('.');
        if (balanceDisplay) balanceDisplay.innerHTML = `MWK ${parseInt(main).toLocaleString()}<span class="bal-cents">.${cents}</span>`;
        if (balanceWrapper) balanceWrapper.classList.add('balance-loaded');
    }

    function showBalanceSkeleton() {
        if (balanceWrapper) balanceWrapper.classList.remove('balance-loaded');
    }

    async function fetchBalanceIfNeeded() {
        const now = Date.now();
        if (now - lastBalanceFetchTime < BALANCE_FETCH_THROTTLE) return;
        const tok = getCleanSessionToken();
        if (!tok) return;
        try {
            const res = await fetchWithRetry(`${window.SUPABASE_URL}/functions/v1/wallet-api`, {
                headers: { 'Authorization': `Bearer ${tok}` }
            });
            if (res.ok) {
                const d = await res.json();
                lastBalanceFetchTime = Date.now();
                const currentDisplayed = balanceDisplay?.textContent.replace(/[^0-9.-]+/g, "");
                if (parseFloat(currentDisplayed) !== d.balance) {
                    updateBalanceUI(Number(d.balance));
                } else {
                    if (balanceWrapper) balanceWrapper.classList.add('balance-loaded');
                }
                cacheBalance(Number(d.balance));
            } else if (res.status === 401) {
                window.location.replace('login.html');
            }
        } catch (e) {
            console.warn("Balance fetch failed after retries", e);
            const cached = getCachedBalance();
            if (cached !== null && balanceWrapper) {
                updateBalanceUI(cached);
                balanceWrapper.classList.add('balance-loaded');
            }
        }
    }

    async function fetchUserProfile() {
        const tok = getCleanSessionToken();
        if (!tok) {
            console.warn("No session token, skipping profile fetch.");
            setDefaultUserData();
            return;
        }
        try {
            const res = await fetchWithRetry(`${window.SUPABASE_URL}/functions/v1/settings-api`, {
                headers: { 'Authorization': `Bearer ${tok}` }
            });
            if (!res.ok) {
                console.warn(`Profile API returned status ${res.status}`);
                const cached = getCachedPhoneNetwork();
                if (cached) {
                    setupNetworkUI(cached.phone, cached.network);
                } else {
                    setDefaultUserData();
                }
                return;
            }
            const d = await res.json();
            cacheProfile(d);
            globalUserId = d.id || '---';
            globalUserEmail = d.email || null;
            if (d.phone_number) {
                const network = detectNetworkFromPhone(d.phone_number);
                cachePhoneNetwork(d.phone_number, network);
                setupNetworkUI(d.phone_number, network);
            } else {
                setDefaultUserData();
            }
        } catch (e) {
            console.warn("[Profile] fetch failed after retries", e);
            const cached = getCachedPhoneNetwork();
            if (cached) {
                setupNetworkUI(cached.phone, cached.network);
            } else {
                setDefaultUserData();
            }
        }
    }

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
        } catch (e) { console.warn("Notifications fetch failed", e); }
    }

    function fetchWithRetry(url, options = {}, retries = 3, delay = 500) {
        return new Promise((resolve, reject) => {
            let attempt = 0;
            function doFetch() {
                attempt++;
                fetch(url, options)
                    .then(res => {
                        if (res.ok) resolve(res);
                        else if (res.status === 404) reject(new Error(`HTTP 404 - Not Found`));
                        else if (attempt < retries) setTimeout(doFetch, delay * attempt);
                        else reject(new Error(`Failed after ${retries} attempts`));
                    })
                    .catch(err => {
                        if (err.name === 'AbortError') {
                            reject(err);
                            return;
                        }
                        if (attempt < retries) setTimeout(doFetch, delay * attempt);
                        else reject(err);
                    });
            }
            doFetch();
        });
    }

    // ── PROCESS DEPOSIT (Ultra Fast Turnstile) ──
    let isProcessing = false;
    let currentTxRef = null;
    let successPollInterval = null;
    let failurePollInterval = null;

    function showStatus(message, type) {
        if (!statusDiv) return;
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
        if (btnDeposit) {
            btnDeposit.classList.remove('loading-state');
            btnDeposit.disabled = false;
            btnDeposit.innerHTML = 'DEPOSIT';
        }
        isProcessing = false;
        currentTxRef = null;
        stopPolling();
    }

    async function checkDepositStatus(txRef) {
        const token = getCleanSessionToken();
        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/check-deposit-status`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ tx_ref: txRef })
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data.status === 'failed') {
                stopPolling();
                let msg = data.error_message || "Deposit failed.";
                if (msg.toLowerCase().includes("insufficient")) msg = "PS! You have insufficient balance.";
                showStatus(msg, "error");
                resetDepositUI();
            } else if (data.status === 'success') {
                stopPolling();
                await fetchBalanceIfNeeded();
                resetDepositUI();
            }
        } catch (e) { console.warn("Status check error", e); }
    }

    async function pollForDepositSuccess(amount) {
        const token = getCleanSessionToken();
        let attempts = 0, maxAttempts = 30;
        
        if (!window._tidyeIntervals) window._tidyeIntervals = [];
        
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
                    if (currentBalance > globalCurrentBalance) {
                        clearInterval(successPollInterval);
                        successPollInterval = null;
                        globalCurrentBalance = currentBalance;
                        cacheBalance(currentBalance);
                        updateBalanceUI(currentBalance);
                        document.getElementById('walletTrigger')?.classList.add('glow-success');

                        let banner = document.getElementById('successBanner');
                        if (!banner) {
                            const newBanner = document.createElement('div');
                            newBanner.id = 'successBanner';
                            newBanner.className = 'success-banner';
                            newBanner.innerHTML = '<i class="bi bi-check-circle-fill"></i><span></span>';
                            document.body.insertBefore(newBanner, document.querySelector('.deposit-container'));
                            banner = newBanner;
                        }
                        if (banner) {
                            banner.style.display = 'flex';
                            banner.querySelector('span').innerText = `Deposit MWK ${amount.toLocaleString()} Successfully`;
                            setTimeout(() => {
                                banner.style.display = 'none';
                                document.getElementById('walletTrigger')?.classList.remove('glow-success');
                            }, 8000);
                        }
                        resetDepositUI();
                        if (statusDiv) statusDiv.style.display = 'none';
                        if (failurePollInterval) clearInterval(failurePollInterval);
                        return;
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
        window._tidyeIntervals.push(successPollInterval);
    }

    window.processDeposit = async function() {
        if (isProcessing) {
            showStatus("Please wait, already processing...", "info");
            return;
        }
        const amount = parseFloat(amountInput?.value || "0");
        if (isNaN(amount) || amount < 50 || amount > 750000) {
            showStatus("Enter valid amount (Min:50, Max:750,000 MWK)", "error");
            return;
        }
        if (!globalUserPhone || globalUserPhone === 'Not provided' || !globalDetectedNetwork || globalDetectedNetwork === 'UNKNOWN' || !globalUserId) {
            showStatus("Phone or network not recognized. Please update your profile with a valid phone number.", "error");
            return;
        }

        if (btnDeposit) {
            isProcessing = true;
            btnDeposit.disabled = true;
            btnDeposit.classList.add('loading-state');
            btnDeposit.innerHTML = '<i class="bi bi-arrow-repeat spin-icon"></i> Processing...';
        }
        if (statusDiv) statusDiv.style.display = 'none';

        // 🟢 FIX: GET TOKEN INSTANTLY FROM SINGLETON MANAGER
        // No manual render or check logic here! 
        // It executes the hidden widget and returns instantly.
        let token = await window.getFreshTurnstileToken().catch(err => {
            console.warn("Turnstile error:", err);
            return null;
        });

        if (!token) {
            showStatus("Turnstile verification failed. Please refresh the page.", "error");
            resetDepositUI();
            return;
        }

        try {
            const sessionToken = getCleanSessionToken();
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/payment-topup-api`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    phone: globalUserPhone,
                    network: globalDetectedNetwork,
                    id: globalUserId,
                    email: globalUserEmail,
                    turnstileToken: token // Token is automatically consumed and cleared on next execution
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                currentTxRef = data.tx_ref;
                showStatus("Check your phone & Enter PIN to complete...", "info");
                if (btnDeposit) btnDeposit.innerHTML = '<i class="bi bi-hourglass-split spin-icon"></i> Awaiting Confirmation...';
                if (amountInput) amountInput.value = '';
                pollForDepositSuccess(amount);
                if (failurePollInterval) clearInterval(failurePollInterval);
                
                if (!window._tidyeIntervals) window._tidyeIntervals = [];
                failurePollInterval = setInterval(() => {
                    if (currentTxRef) checkDepositStatus(currentTxRef);
                }, 5000);
                window._tidyeIntervals.push(failurePollInterval);
            } else {
                let msg = data.error || "Transaction failed.";
                if (msg.toLowerCase().includes("insufficient")) msg = "You have insufficient balance.";
                showStatus(msg, "error");
                resetDepositUI();
            }
        } catch (e) {
            console.error(e);
            showStatus("Network error. Please try again.", "error");
            resetDepositUI();
        }
    };

    // ── EVENT LISTENERS ──
    if (window._depositClickHandler) document.removeEventListener('click', window._depositClickHandler);
    window._depositClickHandler = function(e) {
        const target = e.target.closest('#btnDeposit');
        if (target && typeof window.processDeposit === 'function') window.processDeposit();

        const quickBtn = e.target.closest('.quick-btn');
        if (quickBtn && typeof window.setAmount === 'function') {
            const val = quickBtn.getAttribute('data-amount');
            if (val) window.setAmount(parseInt(val));
        }

        const netSel = e.target.closest('#networkSelector');
        if (netSel && typeof window.toggleNetworkDetails === 'function') window.toggleNetworkDetails();

        const infoBtnEl = e.target.closest('#howItWorksBtn');
        if (infoBtnEl && infoModal) infoModal.classList.add('active');

        const closeBtn = e.target.closest('#closeInfoModalBtn');
        if (closeBtn && infoModal) infoModal.classList.remove('active');

        const modalBg = e.target.closest('.fullscreen-modal');
        if (modalBg && modalBg.classList.contains('active') && e.target === modalBg) modalBg.classList.remove('active');
    };
    document.addEventListener('click', window._depositClickHandler);

    window.toggleNetworkDetails = function() {
        if (networkSelector) networkSelector.classList.toggle('open');
    };
    window.setAmount = function(val) {
        if (amountInput) amountInput.value = val;
    };

    // ── EXECUTE FETCH & INIT ──
    if (!enforceSession()) return;
    await checkApiLock();

    const cachedBalance = getCachedBalance();
    if (cachedBalance !== null) updateBalanceUI(cachedBalance);
    else showBalanceSkeleton();

    const cachedPhone = getCachedPhoneNetwork();
    if (cachedPhone) setupNetworkUI(cachedPhone.phone, cachedPhone.network);
    else if (networkContainer) networkContainer.classList.remove('network-loaded');

    const cachedProfile = getCachedProfile();
    if (cachedProfile) {
        globalUserId = cachedProfile.id || '---';
        globalUserEmail = cachedProfile.email || null;
    } else setDefaultUserData();

    await fetchBalanceIfNeeded();
    await fetchUserProfile();

    // Footer injection - Skip if already loaded by Router Cache
    async function injectFooter() {
        const placeholder = document.getElementById('footer-placeholder');
        if (!placeholder) return;
        // Skip fetch if the router's pageCache already has footer.html or if placeholder has content
        if (placeholder.children.length > 0) return;
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
    setupSeeMore();
    await fetchNotifications();

    const offlineModal = document.getElementById('offlineModal');
    function updateOnlineStatus() {
        if (!navigator.onLine && offlineModal) offlineModal.classList.add('show');
        else if (offlineModal) offlineModal.classList.remove('show');
    }
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('online', updateOnlineStatus);
    updateOnlineStatus();

    function syncBalanceFromHeader() {
        const headerText = document.getElementById('balanceDisplay')?.innerHTML;
        const accountBal = document.getElementById('accountBalanceDisplay');
        if (accountBal && headerText) accountBal.innerHTML = headerText;
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
            if (cachedBonus !== null) bonusVal.innerHTML = 'MWK ' + Number(cachedBonus).toLocaleString();
        }
    }
    syncBalanceFromHeader();

    console.log('✅ Deposit page fully initialized.');
};

// ── LIFECYCLE HOOKS ──
window.initDepositPage_beforeEnter = function() {
    console.log("🔄 [DEPOSIT LIFECYCLE] beforeEnter: Preparing Deposit Context");
};

window.initDepositPage_mounted = function() {
    console.log("✅ [DEPOSIT LIFECYCLE] mounted: Page animation complete");
};

// Fallback listeners
window.addEventListener('spa:pageLoaded', (e) => {
    if (e.detail.page === 'deposit.html') initDepositPage();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initDepositPage();
} else {
    document.addEventListener('DOMContentLoaded', initDepositPage);
}
