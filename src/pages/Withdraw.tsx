/* src/pages/Withdraw.jsx */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/withdraw.css';
import {
    getCleanSessionToken,
    enforceSession,
    getCachedBalance,
    cacheBalance,
    getCachedPhoneNetwork,
    cachePhoneNetwork,
    fetchBalanceFromAPI,
    fetchProfileFromAPI,
    checkApiLock,
    processWithdrawAPI,
    detectNetworkFromPhone,
    Logger
} from '../services/withdraw';

const WithdrawPage = () => {
    // ── STATE ──
    const [balance, setBalance] = useState(null);
    const [isBalanceLoaded, setIsBalanceLoaded] = useState(false);
    const [phone, setPhone] = useState(null);
    const [network, setNetwork] = useState(null);
    const [isNetworkLoaded, setIsNetworkLoaded] = useState(false);
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState({ message: '', type: '' });
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isNetworkOpen, setIsNetworkOpen] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [footerHtml, setFooterHtml] = useState('');

    const lastBalanceFetchTime = useRef(0);
    const footerRef = useRef(null);

    // ── HELPERS ──
    const showStatus = (message, type) => {
        setStatus({ message, type });
        if (type !== 'error') {
            setTimeout(() => setStatus({ message: '', type: '' }), 8000);
        }
    };

    const updateBalanceUI = (newBalance) => {
        setBalance(newBalance);
        setIsBalanceLoaded(true);
        cacheBalance(newBalance);
    };

    // ── FETCH BALANCE ──
    const fetchBalance = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && now - lastBalanceFetchTime.current < 15000) return;
        const token = getCleanSessionToken();
        if (!token) return;

        const cached = getCachedBalance();
        if (cached !== null && !force) {
            setBalance(cached);
            setIsBalanceLoaded(true);
        }

        const result = await fetchBalanceFromAPI(token);
        if (result === 'UNAUTHORIZED') {
            window.location.replace('/login');
            return;
        }
        if (result !== null) {
            updateBalanceUI(result);
            lastBalanceFetchTime.current = Date.now();
        }
    }, []);

    // ── FETCH PROFILE ──
    const fetchProfile = useCallback(async () => {
        const token = getCleanSessionToken();
        if (!token) return;

        const cachedPhone = getCachedPhoneNetwork();
        if (cachedPhone) {
            setPhone(cachedPhone.phone);
            setNetwork(cachedPhone.network);
            setIsNetworkLoaded(true);
        }

        const data = await fetchProfileFromAPI(token);
        if (data === 'UNAUTHORIZED') {
            window.location.replace('/login');
            return;
        }
        if (data && data.phone_number) {
            const detectedNetwork = detectNetworkFromPhone(data.phone_number);
            setPhone(data.phone_number);
            setNetwork(detectedNetwork);
            setIsNetworkLoaded(true);
            cachePhoneNetwork(data.phone_number, detectedNetwork);
        }
    }, []);

    // ── INIT ──
    useEffect(() => {
        const init = async () => {
            const token = getCleanSessionToken();
            if (!token) {
                window.location.replace('/login');
                return;
            }
            await checkApiLock();
            await fetchBalance(true);
            await fetchProfile();
        };
        init();
    }, [fetchBalance, fetchProfile]);

    // ── OFFLINE HANDLER ──
    useEffect(() => {
        const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, []);

    // ── FOOTER INJECTION (KONZEDWA KUTI TILETSE 404 CRASH) ──
    useEffect(() => {
        fetch('/footer.html')
            .then(res => res.ok ? res.text() : '')
            .then(html => setFooterHtml(html))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (footerHtml && footerRef.current) {
            try {
                const placeholder = footerRef.current;
                // Chitetezo: Ngati zikubweza HTML yathunthu (404), tisiye kuti tipewe SyntaxError
                const trimmed = footerHtml.trim();
                if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
                    console.warn("⚠️ Received a full HTML document instead of footer. Skipping injection.");
                    setFooterHtml(''); // Chotsani kuti tisabwereze
                    return;
                }

                placeholder.innerHTML = footerHtml;
                const scripts = placeholder.querySelectorAll('script');
                scripts.forEach(oldScript => {
                    try {
                        const newScript = document.createElement('script');
                        newScript.textContent = oldScript.textContent;
                        document.body.appendChild(newScript).remove();
                    } catch (innerError) {
                        console.warn('Footer script injection failed:', innerError.message);
                    }
                });
            } catch (outerError) {
                console.warn('Footer injection failed:', outerError.message);
                setFooterHtml('');
            }
        }
    }, [footerHtml]);

    // ── WITHDRAW HANDLER ──
    const handleWithdraw = async () => {
        if (isProcessing) {
            showStatus("Please wait, processing...", "info");
            return;
        }

        const amountNum = Math.floor(parseFloat(amount));
        if (isNaN(amountNum) || amountNum < 50 || amountNum > 750000) {
            showStatus("Amount must be between MWK 50 and 750,000.", "error");
            return;
        }
        if (balance !== null && amountNum > balance) {
            showStatus(`Insufficient balance. Available: MWK ${balance.toFixed(2)}`, "error");
            return;
        }
        if (!phone || !network || network === 'UNKNOWN') {
            showStatus("Phone number not recognized. Update profile.", "error");
            return;
        }

        const token = getCleanSessionToken();
        if (!token) {
            showStatus("Session expired. Please log in again.", "error");
            return;
        }

        setIsProcessing(true);
        setStatus({ message: '', type: '' });

        const result = await processWithdrawAPI(token, amountNum, phone, network);
        if (result.success) {
            showStatus(`Withdrawal of MWK ${amountNum.toLocaleString()} sent! Check your phone.`, "info");
            setAmount('');
            const banner = document.getElementById('successBanner');
            if (banner) {
                banner.style.display = 'flex';
                banner.querySelector('span').innerText = `Withdrew MWK ${amountNum.toLocaleString()}`;
                setTimeout(() => { banner.style.display = 'none'; }, 5000);
            }
            setTimeout(() => {
                lastBalanceFetchTime.current = 0;
                fetchBalance(true);
            }, 1500);
        } else {
            showStatus(result.error || "Withdrawal failed. Try again.", "error");
        }
        setIsProcessing(false);
    };

    // ── RENDER ──
    const formatBalance = (val) => {
        if (val === null) return '0.00';
        const [main, cents] = val.toFixed(2).split('.');
        return `${parseInt(main).toLocaleString()}.${cents}`;
    };

    return (
        <>
            {/* Offline Modal */}
            <div className={`fullscreen-modal ${isOffline ? 'active' : ''}`}>
                <div className="modal-card" style={{ textAlign: 'center' }}>
                    <div className="modal-header" style={{ justifyContent: 'center' }}>
                        <i className="bi bi-wifi-off" style={{ fontSize: '28px', color: '#ef4444' }}></i>
                    </div>
                    <p style={{ fontWeight: '600', marginTop: '5px' }}>You are offline</p>
                    <p style={{ fontSize: '13px' }}>Please check your internet connection. The modal will disappear once you're back online.</p>
                </div>
            </div>

            {/* Header */}
            <div className="sticky-nav-holder">
                <header id="mainHeader">
                    <div className="logo-container">
                        <a href="/dashboard">
                            <img src="/logoo.jpg" alt="Tidye265" />
                        </a>
                    </div>
                    <div className="header-controls">
                        <img src="/18+.png" alt="18+" className="age-badge" onError={(e) => e.target.style.display='none'} />
                        <a href="/deposit" className="header-balance-container" id="walletTrigger">
                            <div id="balanceWrapper" className={isBalanceLoaded ? 'balance-loaded' : ''}>
                                <span className="bal-label">BALANCE</span>
                                <span className="bal-amount">
                                    <span className="balance-skeleton skeleton skeleton-inline-block"></span>
                                    <span className="balance-real" id="balanceDisplay">
                                        MWK {formatBalance(balance)}<span className="bal-cents">.{balance !== null ? (balance % 1).toFixed(2).split('.')[1] : '00'}</span>
                                    </span>
                                </span>
                            </div>
                            <div className="header-dep-btn"><i className="bi bi-plus-lg"></i></div>
                        </a>
                    </div>
                </header>

                {/* Sub Header */}
                <nav className={`sub-header ${showMore ? 'show-more' : ''}`} id="categoryNav">
                    <a href="/live" className="sub-item"><img src="/live.svg" className="category-icon" alt="Live"/><span>Live</span><span className="live-badge">LIVE</span></a>
                    <a href="/matches" className="sub-item"><img src="/matches.svg" className="category-icon" alt="Sports"/><span>Sports</span></a>
                    <a href="/casino" className="sub-item"><img src="/casino.svg" className="category-icon" alt="Casino"/><span>Casino</span></a>
                    <a href="/casino" className="sub-item"><img src="/aviator.png" className="category-icon" alt="Aviator"/><span>Aviator</span></a>
                    <a href="/virtual" className="sub-item"><img src="/vi.png" className="category-icon" alt="Virtual"/><span>Virtual</span><span className="virtual-badge">VIRTUAL</span></a>
                    <div className="sub-item more-btn" onClick={() => setShowMore(!showMore)}>
                        <i className="bi bi-three-dots"></i>
                        <span>{showMore ? 'Less' : 'See More'}</span>
                    </div>
                    <div className="more-items" id="moreCategories">
                        <a href="/games" className="sub-item"><img src="/games.svg" className="category-icon" alt="Games"/><span>Games</span></a>
                        <a href="/esports" className="sub-item"><img src="/games.svg" className="category-icon" alt="eSports"/><span>eSports</span></a>
                    </div>
                </nav>
            </div>

            {/* Info Banner */}
            <div className="info-white-container">
                <p><i className="bi bi-cash-coin" style={{ color: '#FFD700', marginRight: '5px' }}></i> Withdraw funds instantly from your tiDye265 wallet to your mobile money account. Enter amount and submit.</p>
            </div>

            {/* Success Banner */}
            <div id="successBanner" className="success-banner">
                <i className="bi bi-check-circle-fill"></i>
                <span></span>
            </div>

            {/* Withdraw Form */}
            <div className="withdraw-container">
                <div className="section-title">
                    Withdrawal Method
                    <span className="info-icon" onClick={() => setIsInfoModalOpen(true)}>
                        <i className="bi bi-question-circle"></i> How it works
                    </span>
                </div>

                <div className={`network-selector ${isNetworkOpen ? 'open' : ''}`} onClick={() => setIsNetworkOpen(!isNetworkOpen)}>
                    <div className="network-info" id="networkInfoContainer">
                        {!isNetworkLoaded && (
                            <>
                                <div className="network-logo-skeleton skeleton skeleton-circle"></div>
                                <div className="network-text-skeleton">
                                    <div className="skeleton skeleton-text" style={{ width: '120px' }}></div>
                                    <div className="skeleton skeleton-text" style={{ width: '160px' }}></div>
                                </div>
                            </>
                        )}
                        <div className="network-real-content" style={{ display: isNetworkLoaded ? 'flex' : 'none' }}>
                            <img
                                src={network === 'AIRTEL' ? '/airtel.jpg' : network === 'TNM' ? '/tnm.jpg' : ''}
                                alt="Network"
                                className="network-logo"
                                style={{ display: network && network !== 'UNKNOWN' ? 'block' : 'none' }}
                            />
                            <div className="network-text">
                                <div className="nt-name" style={{ color: network === 'AIRTEL' ? 'var(--airtel)' : network === 'TNM' ? 'var(--tnm)' : 'inherit' }}>
                                    {network === 'AIRTEL' ? 'Airtel Money' : network === 'TNM' ? 'TNM Mpamba' : 'Unknown Network'}
                                </div>
                                <div className="nt-num">{phone || 'Loading...'}</div>
                            </div>
                        </div>
                    </div>
                    <i className="bi bi-chevron-down chevron"></i>
                </div>
                <div className="network-details">
                    <div style={{ padding: '10px 0 0', fontSize: '11.5px', color: '#5f6c80' }}>
                        <i className="bi bi-shield-check"></i> Secured by tiDye265
                    </div>
                </div>

                <div className="amount-group">
                    <div className="section-title">Withdrawal Amount</div>
                    <div className="amount-input-wrapper">
                        <span className="currency-symbol">MWK</span>
                        <input
                            type="number"
                            id="withdrawAmount"
                            className="amount-input"
                            placeholder="0"
                            inputMode="numeric"
                            autoComplete="off"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className="amount-limits"><span>Min: MWK 50</span><span>Max: MWK 750,000</span></div>
                    <div className="quick-amounts">
                        <button className="quick-btn" onClick={() => setAmount('50')}>MWK 50</button>
                        <button className="quick-btn" onClick={() => setAmount('1000')}>MWK 1,000</button>
                        <button className="quick-btn" onClick={() => setAmount('10000')}>MWK 10,000</button>
                    </div>
                </div>

                <button className="btn-submit" id="btnWithdraw" disabled={isProcessing} onClick={handleWithdraw}>
                    {isProcessing ? <><i className="bi bi-arrow-repeat spin-icon"></i> PROCESSING..</> : 'WITHDRAW'}
                </button>
                <div className="button-plain-note"><i className="bi bi-shield-lock"></i> Instant payout to your registered mobile money</div>
                {status.message && (
                    <div id="statusMessage" className={`alert ${status.type}`} style={{ display: 'block' }}>
                        {status.message}
                    </div>
                )}
            </div>

            {/* Footer Placeholder */}
            <div id="footer-placeholder" ref={footerRef}></div>

            {/* Info Modal */}
            <div className={`fullscreen-modal ${isInfoModalOpen ? 'active' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) setIsInfoModalOpen(false); }}>
                <div className="modal-card">
                    <div className="modal-header">
                        <span><i className="bi bi-cash-stack" style={{ color: '#FFD700' }}></i> Withdraw Funds</span>
                        <button className="modal-close" onClick={() => setIsInfoModalOpen(false)}><i className="bi bi-x-lg"></i></button>
                    </div>
                    <div>
                        <h4><i className="bi bi-play-circle"></i> How it works</h4>
                        <ul>
                            <li>1. Enter the amount you want to withdraw.</li>
                            <li>2. Submit your withdrawal request.</li>
                            <li>3. Funds will be sent instantly to your registered mobile money number.</li>
                            <li>4. Your wallet balance will decrease immediately after successful withdrawal.</li>
                        </ul>
                        <div style={{ background: '#F8FAFE', padding: '12px', borderRadius: '14px', marginTop: '12px' }}>
                            <strong><i className="bi bi-exclamation-diamond"></i> Important Notes</strong><br />
                            • Minimum withdrawal: MWK 50 | Maximum: MWK 750,000.<br />
                            • You must have sufficient balance in your wallet.<br />
                            • The mobile number used must match your account's registered phone.<br />
                            • Withdrawals are final and processed instantly.
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WithdrawPage;
