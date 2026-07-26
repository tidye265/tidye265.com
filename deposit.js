// deposit.js - Logic ya Deposit Page (Auto-Fetch + Router Ready)

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

// ── AUTO-FETCH IIFE: Imfetche data nthawi yomweyo ikalowa ──
(async function autoFetchDepositData() {
    "use strict";

    console.log("🔄 [DEPOSIT] Auto-fetching page data in background...");

    // DOM elements
    const headerBalanceEl = document.getElementById('balanceDisplay');
    const networkNameEl = document.getElementById('networkName');
    const userPhoneEl = document.getElementById('userPhoneNumber');
    const userIdEl = document.getElementById('userIdDisplay');

    // Placeholder
    if (headerBalanceEl) headerBalanceEl.textContent = 'Loading...';

    try {
        // 1. Check session
        const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
        if (sessionError || !session) {
            console.warn('⚠️ No active session. Skipping data fetch.');
            if (headerBalanceEl) headerBalanceEl.textContent = 'MWK 0.00';
            return;
        }

        const userId = session.user.id;

        // 2. Fetch profile from Supabase
        const { data: profile, error: profileError } = await window.supabase
            .from('profiles')
            .select('phone, balance, bonus')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        // 3. Update balance header
        const formattedBalance = `MWK ${Number(profile.balance).toLocaleString()}`;
        if (headerBalanceEl) headerBalanceEl.innerHTML = formattedBalance;

        // 4. Update network UI (phone & network detection)
        if (profile.phone) {
            const network = detectNetworkFromPhone(profile.phone);
            if (userPhoneEl) userPhoneEl.textContent = profile.phone;
            if (userIdEl) userIdEl.textContent = `ID: ${userId}`;
            if (networkNameEl) {
                if (network === 'AIRTEL') {
                    networkNameEl.textContent = 'Airtel Money';
                    networkNameEl.style.color = 'var(--airtel)';
                    document.getElementById('networkLogo').style.display = 'block';
                    document.getElementById('networkLogo').src = 'airtel.jpg';
                } else if (network === 'TNM') {
                    networkNameEl.textContent = 'TNM Mpamba';
                    networkNameEl.style.color = 'var(--tnm)';
                    document.getElementById('networkLogo').style.display = 'block';
                    document.getElementById('networkLogo').src = 'tnm.jpg';
                } else {
                    networkNameEl.textContent = 'Unknown Network';
                    document.getElementById('networkLogo').style.display = 'none';
                }
                document.getElementById('networkInfoContainer').classList.add('network-loaded');
            }

            // Cache phone & network
            localStorage.setItem('tidye_phone_network_cache', JSON.stringify({
                phone: profile.phone,
                network: detectNetworkFromPhone(profile.phone),
                timestamp: Date.now()
            }));
        }

        // Cache balance & profile
        localStorage.setItem('tidye_balance_cache', JSON.stringify({ balance: profile.balance, timestamp: Date.now() }));
        localStorage.setItem('tidye_profile_cache', JSON.stringify({ data: profile, timestamp: Date.now() }));

        console.log('✅ [DEPOSIT] Data fetched and UI updated successfully.');

    } catch (err) {
        console.error('❌ Auto-fetch error:', err);
        if (headerBalanceEl) headerBalanceEl.textContent = 'MWK 0.00';
    }
})();

// ── HELPER: detect network from phone ──
function detectNetworkFromPhone(phone) {
    if (!phone) return 'UNKNOWN';
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('265')) clean = clean.substring(3);
    if (clean.startsWith('0')) clean = clean.substring(1);
    if (clean.startsWith('99') || clean.startsWith('98')) return 'AIRTEL';
    if (clean.startsWith('88') || clean.startsWith('31')) return 'TNM';
    return 'UNKNOWN';
}

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
                // Refresh balance after successful deposit
                await autoFetchDepositData();
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
                    // We'll use the global currentBalance from cache
                    const cachedBalance = getCachedBalance();
                    if (currentBalance > (cachedBalance || 0)) {
                        clearInterval(successPollInterval);
                        successPollInterval = null;
                        // Update UI
                        const formattedBalance = `MWK ${currentBalance.toLocaleString()}`;
                        document.getElementById('balanceDisplay').innerHTML = formattedBalance;
                        // Show success banner
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

        // Get phone and network from cache / auto-fetch
        const cachedPhoneNetwork = JSON.parse(localStorage.getItem('tidye_phone_network_cache'));
        const userPhone = cachedPhoneNetwork?.phone || 'Not provided';
        const network = cachedPhoneNetwork?.network || 'UNKNOWN';
        const userId = localStorage.getItem('tidye_user_code');

        if (!userPhone || userPhone === 'Not provided' || network === 'UNKNOWN' || !userId) {
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
                body: JSON.stringify({ amount, phone: userPhone, network, id: userId, turnstileToken: currentToken })
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

    function getCachedBalance() {
        try {
            const cached = localStorage.getItem('tidye_balance_cache');
            if (!cached) return null;
            const { balance, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 5 * 60 * 1000) return balance;
        } catch (e) {}
        return null;
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
    if (!importDashboardTurnstileToken()) initTurnstile();
    setInterval(() => {
        if (tokenCreatedAt && (Date.now() - tokenCreatedAt > 80000)) refreshTurnstile();
    }, 10000);
    await injectFooter();

    setupSeeMore();
    await fetchNotifications();

    console.log('✅ Deposit page fully initialized by router.');
};
