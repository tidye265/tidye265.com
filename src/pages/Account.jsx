/* src/pages/Account.jsx */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/account.css';
import {
    getCleanSessionToken,
    enforceSession,
    getCachedBalance,
    cacheBalance,
    getCachedBonus,
    cacheBonus,
    getCachedProfile,
    cacheProfile,
    fetchBalanceFromAPI,
    fetchProfileFromAPI,
    triggerBackgroundPrefetch,
    checkApiLock,
    performLogout,
    triggerTurnstile,
    getCurrentAvatar,
    cycleAvatar
} from '../services/account';

const AccountPage = () => {
    // ── STATE ──
    const [balance, setBalance] = useState(null);
    const [bonus, setBonus] = useState(0);
    const [profile, setProfile] = useState(null);
    const [isBalanceLoaded, setIsBalanceLoaded] = useState(false);
    const [isProfileLoaded, setIsProfileLoaded] = useState(false);
    const [avatarSrc, setAvatarSrc] = useState('');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [showMore, setShowMore] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [footerHtml, setFooterHtml] = useState('');

    const lastBalanceFetchTime = useRef(0);
    const footerRef = useRef(null);
    const turnstileRendered = useRef(false);

    // ── HELPER: UPDATE BALANCE UI ──
    const updateBalanceUI = (newBalance) => {
        setBalance(newBalance);
        setIsBalanceLoaded(true);
        cacheBalance(newBalance);
    };

    const updateBonusUI = (newBonus) => {
        setBonus(Number(newBonus));
        cacheBonus(newBonus);
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
        if (result !== null && result.balance !== undefined) {
            updateBalanceUI(result.balance);
            if (result.bonus !== null) {
                updateBonusUI(result.bonus);
            }
            lastBalanceFetchTime.current = Date.now();
        }
    }, []);

    // ── FETCH PROFILE ──
    const fetchProfile = useCallback(async () => {
        const token = getCleanSessionToken();
        if (!token) return;

        const cached = getCachedProfile();
        if (cached) {
            setProfile(cached);
            setIsProfileLoaded(true);
            if (typeof cached.bonus === 'number') {
                updateBonusUI(cached.bonus);
            }
        }

        const data = await fetchProfileFromAPI(token);
        if (data === 'UNAUTHORIZED') {
            window.location.replace('/login');
            return;
        }
        if (data) {
            setProfile(data);
            setIsProfileLoaded(true);
            cacheProfile(data);
            if (typeof data.bonus === 'number') {
                updateBonusUI(data.bonus);
            }
            localStorage.setItem('tidye_user_code', data.id || '');
        }
    }, []);

    // ── BACKGROUND PREFETCH ──
    const runPrefetch = useCallback(async () => {
        const token = getCleanSessionToken();
        if (!token) return;
        const userId = localStorage.getItem('tidye_user_code');
        if (!userId) return;
        
        const cachedData = getPrefetchCache('account');
        if (cachedData) {
            if (cachedData.wallet && typeof cachedData.wallet.balance === 'number') {
                updateBalanceUI(cachedData.wallet.balance);
            }
            if (cachedData.profile) {
                setProfile(cachedData.profile);
                setIsProfileLoaded(true);
                cacheProfile(cachedData.profile);
                if (typeof cachedData.profile.bonus === 'number') {
                    updateBonusUI(cachedData.profile.bonus);
                }
            }
        }

        const freshData = await triggerBackgroundPrefetch(token, userId, 'account');
        if (freshData) {
            if (freshData.wallet && typeof freshData.wallet.balance === 'number') {
                updateBalanceUI(freshData.wallet.balance);
            }
            if (freshData.profile) {
                setProfile(freshData.profile);
                setIsProfileLoaded(true);
                cacheProfile(freshData.profile);
                if (typeof freshData.profile.bonus === 'number') {
                    updateBonusUI(freshData.profile.bonus);
                }
            }
        }
    }, []);

    // ── INIT ──
    useEffect(() => {
        if (!enforceSession()) return;
        checkApiLock();

        const cachedBal = getCachedBalance();
        if (cachedBal !== null) {
            setBalance(cachedBal);
            setIsBalanceLoaded(true);
        }
        const cachedBon = getCachedBonus();
        if (cachedBon !== null) {
            setBonus(Number(cachedBon));
        }
        const cachedProf = getCachedProfile();
        if (cachedProf) {
            setProfile(cachedProf);
            setIsProfileLoaded(true);
        }

        const { src } = getCurrentAvatar();
        setAvatarSrc(src);

        fetchBalance(true);
        fetchProfile();
        runPrefetch();

        if (!turnstileRendered.current) {
            triggerTurnstile();
            turnstileRendered.current = true;
        }

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [fetchBalance, fetchProfile, runPrefetch]);

    // ── FOOTER INJECTION ──
    useEffect(() => {
        fetch('/footer.html')
            .then(res => res.ok ? res.text() : '')
            .then(html => setFooterHtml(html))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (footerHtml && footerRef.current) {
            const placeholder = footerRef.current;
            placeholder.innerHTML = footerHtml;
            const scripts = placeholder.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.textContent = oldScript.textContent;
                document.body.appendChild(newScript).remove();
            });
        }
    }, [footerHtml]);

    // ── HANDLE LOGOUT ──
    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        const user_id = profile?.id || localStorage.getItem('tidye_user_code');
        const session_token = getCleanSessionToken();
        await performLogout(user_id, session_token);
        setIsLoggingOut(false);
    };

    // ── HANDLE AVATAR CLICK ──
    const handleCycleAvatar = () => {
        const { src } = cycleAvatar();
        setAvatarSrc(src);
    };

    // ── RENDER HELPERS ──
    const formatBalance = (val) => {
        if (val === null) return '0.00';
        const [main, cents] = val.toFixed(2).split('.');
        return `${parseInt(main).toLocaleString()}.${cents}`;
    };

    return (
        <>
            <div className={`network-modal ${isOffline ? 'show' : ''}`}>
                <div className="network-modal-content">
                    <div className="network-modal-icon"><i className="bi bi-wifi-off"></i></div>
                    <div className="network-modal-title">No Internet Connection</div>
                    <div className="network-modal-text">You appear to be offline. Please check your connection and try again.</div>
                    <button className="network-modal-btn" onClick={() => window.location.reload()}>Retry</button>
                </div>
            </div>

            <div id="turnstile-bg-holder" style={{ display: 'none' }}></div>

            <div className="sticky-nav-holder">
                <header id="mainHeader">
                    <div className="logo-container">
                        <img src="/logoo.jpg" alt="Tidye265" />
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

            <main role="main" id="mainContent">
                <div className="account-container" id="accountContainer">
                    <div className="profile-card" id="profileCard">
                        {!isProfileLoaded ? (
                            <div className="skeleton skeleton-avatar" id="avatarSkeleton"></div>
                        ) : (
                            <div className="profile-avatar" onClick={handleCycleAvatar}>
                                <img 
                                    id="avatarImg" 
                                    src={avatarSrc} 
                                    alt="Avatar" 
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = '<span style="font-size:28px;font-weight:800;color:#1a1d21">U</span>';
                                    }} 
                                />
                            </div>
                        )}
                        <div style={{ flex: 1 }}>
                            {!isProfileLoaded ? (
                                <>
                                    <div className="skeleton skeleton-text" id="nameSkeleton"></div>
                                    <div className="skeleton skeleton-text" style={{ width: '40%' }} id="phoneSkeleton"></div>
                                    <div className="skeleton skeleton-text" style={{ width: '30%' }} id="idSkeleton"></div>
                                </>
                            ) : (
                                <>
                                    <div className="profile-name">{profile?.full_name || profile?.name || 'User'}</div>
                                    <div className="profile-phone">{profile?.phone_number || 'Not provided'}</div>
                                    <div className="profile-id">ID: {profile?.id || '---'}</div>
                                    <a href="/settings" className="profile-edit"><i className="bi bi-pencil-square"></i> Edit Profile</a>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="balance-card" id="balanceCard">
                        <div className="balance-label">Current Balance</div>
                        <div className="balance-amount" id="accountBalanceDisplay">
                            {!isBalanceLoaded ? (
                                <span className="skeleton" style={{ display: 'inline-block', width: '120px', height: '24px', borderRadius: '4px' }}></span>
                            ) : (
                                <>
                                    MWK {formatBalance(balance)}<span className="bal-cents">.{balance !== null ? (balance % 1).toFixed(2).split('.')[1] : '00'}</span>
                                </>
                            )}
                        </div>
                        <div className="bonus-row">
                            <span className="bonus-label">Bonus</span>
                            <span className="bonus-value" id="bonusDisplay">MWK {bonus.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <a href="/deposit" className="action-btn deposit"><i className="bi bi-plus-circle-fill"></i> DEPOSIT</a>
                        <a href="/withdraw" className="action-btn withdraw"><i className="bi bi-arrow-down-circle-fill"></i> WITHDRAW</a>
                    </div>

                    <div className="settings-list">
                        <a href="/transactions" className="settings-item"><i className="bi bi-list-ul"></i> View Transactions <i className="bi bi-chevron-right chevron"></i></a>
                        <a href="/settings" className="settings-item"><i className="bi bi-gear"></i> Account Settings <i className="bi bi-chevron-right chevron"></i></a>
                        <a href="/faq" className="settings-item"><i className="bi bi-question-circle"></i> Help & FAQ <i className="bi bi-chevron-right chevron"></i></a>
                        <a href="https://wa.me/265885699967" target="_blank" rel="noreferrer" className="settings-item"><i className="bi bi-whatsapp"></i> Live Support <i className="bi bi-chevron-right chevron"></i></a>
                        <a href="/terms" className="settings-item"><i className="bi bi-file-text"></i> Terms & Conditions <i className="bi bi-chevron-right chevron"></i></a>
                        <a href="/download/Tidye265.apk" className="settings-item" download><i className="bi bi-download"></i> Download APK <i className="bi bi-chevron-right chevron"></i></a>
                    </div>

                    <button className="logout-btn" id="logoutBtn" disabled={isLoggingOut} onClick={handleLogout}>
                        {isLoggingOut ? <><i className="bi bi-arrow-repeat spin-icon"></i> Logging out...</> : <><i className="bi bi-box-arrow-right"></i> Log Out</>}
                    </button>
                </div>
            </main>

            <div id="footer-placeholder" ref={footerRef}></div>
        </>
    );
};

export default AccountPage;
