/* src/pages/Home.jsx */
import React, { useState, useEffect, useRef } from 'react';
import '../styles/home.css';
import {
    SecureLogger,
    checkCookieConsent,
    acceptCookie,
    fetchLiveMatches,
    initTurnstile,
    injectFooter,
    isLoggedIn
} from '../services/home';

const HomePage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [isAuthBarVisible, setIsAuthBarVisible] = useState(false);
    const [cookieConsentGiven, setCookieConsentGiven] = useState(false);
    const [liveMatches, setLiveMatches] = useState([]);
    const [footerHtml, setFooterHtml] = useState('');

    // Image error states (POPANDA DOM kusintha)
    const [logoError, setLogoError] = useState(false);
    const [liveError, setLiveError] = useState(false);
    const [matchesError, setMatchesError] = useState(false);
    const [aviatorError, setAviatorError] = useState(false);
    const [casinoError, setCasinoError] = useState(false);
    const [gamesError, setGamesError] = useState(false);

    const searchInputRef = useRef(null);
    const turnstileRef = useRef(null);
    const footerRef = useRef(null);
    const rateLimitRef = useRef({ count: 0, resetTime: 0 });

    const showCompactAuthBar = (category = '') => {
        const now = Date.now();
        if (rateLimitRef.current.resetTime > 0 && now < rateLimitRef.current.resetTime && rateLimitRef.current.count >= 5) return;
        if (now >= rateLimitRef.current.resetTime) {
            rateLimitRef.current.count = 0;
            rateLimitRef.current.resetTime = now + 60000;
        }
        rateLimitRef.current.count++;
        setIsAuthBarVisible(true);
    };
    const hideCompactAuthBar = () => setIsAuthBarVisible(false);

    const handleProtectedClick = (e, category = '') => {
        if (!isLoggedIn()) {
            e.preventDefault();
            showCompactAuthBar(category);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 400);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const consented = checkCookieConsent();
        setCookieConsentGiven(consented);
        if (!consented) {
            const timer = setTimeout(() => {
                document.getElementById('cookieConsentBar')?.classList.add('visible');
            }, 800);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAcceptCookie = () => {
        acceptCookie();
        setCookieConsentGiven(true);
        document.getElementById('cookieConsentBar')?.classList.remove('visible');
    };

    useEffect(() => {
        const loadTicker = async () => {
            const matches = await fetchLiveMatches();
            setLiveMatches(matches);
        };
        loadTicker();
    }, []);

    useEffect(() => {
        if (turnstileRef.current) {
            initTurnstile(turnstileRef.current);
        }
    }, []);

    useEffect(() => {
        const loadFooter = async () => {
            const html = await injectFooter();
            setFooterHtml(html);
        };
        loadFooter();
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

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isAuthBarVisible && !e.target.closest('#compactAuthBar') && !e.target.closest('.feature-box') && !e.target.closest('#categoryNav .sub-item')) {
                hideCompactAuthBar();
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isAuthBarVisible]);

    useEffect(() => {
        const handleSearchKey = (e) => {
            if (e.key === 'Enter' && searchInputRef.current?.value.trim()) {
                window.location.href = `/matches.html?search=${encodeURIComponent(searchInputRef.current.value.trim())}`;
            }
        };
        const input = searchInputRef.current;
        if (input) {
            input.addEventListener('keydown', handleSearchKey);
            return () => input.removeEventListener('keydown', handleSearchKey);
        }
    }, []);

    return (
        <>
            <div className="hp-field-wrap" aria-hidden="true">
                <input type="text" name="hp_name" id="hpField" tabIndex="-1" autoComplete="off" />
            </div>

            {isLoading && (
                <div id="loader" aria-hidden="true" style={{ display: 'block' }}>
                    <div className="sk-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 15px', height: '70px', background: '#29282b' }}>
                        <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '8px' }}></div>
                        <div className="skeleton" style={{ width: '34px', height: '34px', borderRadius: '50%', marginLeft: 'auto' }}></div>
                        <div className="skeleton" style={{ width: '90px', height: '36px', borderRadius: '20px' }}></div>
                    </div>
                    <div className="skeleton" style={{ height: '45px', width: '100%', background: '#29282b', marginBottom: '0' }}></div>
                    <div style={{ background: '#fff', padding: '25px 20px 5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div className="skeleton" style={{ width: '260px', height: '28px' }}></div>
                        <div className="skeleton" style={{ width: '200px', height: '16px' }}></div>
                        <div className="skeleton" style={{ width: '160px', height: '28px', borderRadius: '20px' }}></div>
                    </div>
                    <div className="skeleton" style={{ height: '12px', margin: '15px 20px', borderRadius: '12px' }}></div>
                    <div className="sk-two-box-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '20px' }}>
                        <div className="skeleton" style={{ height: '50vh', minHeight: '300px', borderRadius: '20px' }}></div>
                        <div className="skeleton" style={{ height: '50vh', minHeight: '300px', borderRadius: '20px' }}></div>
                    </div>
                </div>
            )}

            <div className="sticky-nav-holder">
                <header id="mainHeader">
                    <a href="/" className="logo-container">
                        {logoError ? <span style={{ color: '#fff', fontWeight: 'bold' }}>tidye</span> : <img src="/logoo.jpg" alt="Tidye265 Logo" onError={() => setLogoError(true)} />}
                    </a>
                    <div className={`search-wrapper ${isSearchActive ? 'active' : ''}`} id="searchBar">
                        <div className="search-inner-box">
                            <i className="bi bi-search"></i>
                            <input type="text" placeholder="Search..." id="searchInput" ref={searchInputRef} />
                        </div>
                        <button className="search-close-btn" id="searchClose" onClick={() => setIsSearchActive(false)}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <div className="header-controls">
                        <button className="search-trigger" id="searchToggle" style={{ background: 'none', border: 'none', color: '#b0b0b0', fontSize: '17px', padding: '8px' }} onClick={() => setIsSearchActive(true)}>
                            <i className="bi bi-search"></i>
                        </button>
                        <nav className="auth-actions" id="authActions">
                            <a href="/login" className="btn-login" id="btnLoginHeader">LOGIN</a>
                            <a href="/register" className="btn-join" id="btnJoinHeader">JOIN</a>
                        </nav>
                    </div>
                </header>

                <div className={`compact-auth-bar ${isAuthBarVisible ? 'active' : ''}`} id="compactAuthBar">
                    <span className="compact-auth-text">Sign in to access this feature</span>
                    <div className="compact-auth-buttons">
                        <a href="/login" className="btn-login">LOGIN</a>
                        <a href="/register" className="btn-join">JOIN</a>
                    </div>
                    <button className="compact-auth-close" id="compactAuthClose" onClick={hideCompactAuthBar}>&times;</button>
                </div>

                <nav className="sub-header" id="categoryNav">
                    <a href="/live" className="sub-item" onClick={(e) => handleProtectedClick(e, 'live')} data-category="live">
                        {liveError ? <i className="bi bi-broadcast" style={{ fontSize: '16px', color: '#b0b0b0' }}></i> : <img src="/live.svg" className="category-icon" alt="Live" onError={() => setLiveError(true)} />}
                        <span>Live</span>
                    </a>
                    <a href="/matches" className="sub-item" onClick={(e) => handleProtectedClick(e, 'matches')} data-category="matches">
                        {matchesError ? <i className="bi bi-trophy" style={{ fontSize: '16px', color: '#b0b0b0' }}></i> : <img src="/matches.svg" className="category-icon" alt="Matches" onError={() => setMatchesError(true)} />}
                        <span>Matches</span>
                    </a>
                    <a href="/aviator" className="sub-item" onClick={(e) => handleProtectedClick(e, 'aviator')} data-category="aviator">
                        {aviatorError ? <i className="bi bi-airplane" style={{ fontSize: '16px', color: '#b0b0b0' }}></i> : <img src="/aviator.svg" className="category-icon" alt="Aviator" onError={() => setAviatorError(true)} />}
                        <span>Aviator</span>
                    </a>
                    <a href="/casino" className="sub-item" onClick={(e) => handleProtectedClick(e, 'casino')} data-category="casino">
                        {casinoError ? <i className="bi bi-dice-6" style={{ fontSize: '16px', color: '#b0b0b0' }}></i> : <img src="/casino.svg" className="category-icon" alt="Casino" onError={() => setCasinoError(true)} />}
                        <span>Casino</span>
                    </a>
                    <a href="/games" className="sub-item" onClick={(e) => handleProtectedClick(e, 'games')} data-category="games">
                        {gamesError ? <i className="bi bi-controller" style={{ fontSize: '16px', color: '#b0b0b0' }}></i> : <img src="/games.svg" className="category-icon" alt="Games" onError={() => setGamesError(true)} />}
                        <span>Games</span>
                    </a>
                </nav>
            </div>

            <main role="main">
                <div id="app-content">
                    <div className="welcome-section">
                        <h1 className="welcome-title">WELCOME TO <span>tiDye265</span> !!</h1>
                        <p className="welcome-sub">Malawi's Most Advanced Betting Platform</p>
                        <div className="premium-badge">tiDye265 Lets enjoy</div>
                    </div>

                    <div className="quick-stats-strip">
                        <div className="stat-chip"><i className="bi bi-broadcast"></i><span>Live Now</span><span className="stat-value">24+</span></div>
                        <div className="stat-chip"><i className="bi bi-cash-coin"></i><span>Min Bet</span><span className="stat-value">MK 20</span></div>
                        <div className="stat-chip"><i className="bi bi-star-fill"></i><span>Bonus</span><span className="stat-value">Up to 1500%</span></div>
                        <div className="stat-chip"><i className="bi bi-shield-check"></i><span>Platform</span><span className="stat-value">100% Secure</span></div>
                    </div>

                    <div className="live-ticker-bar">
                        <span className="live-ticker-label">🔴 LIVE</span>
                        <div className="live-ticker-scroll">
                            <div className="live-ticker-track" id="liveTickerTrack">
                                {liveMatches.length === 0 ? (
                                    <span className="live-ticker-no-data">Loading live matches...</span>
                                ) : (
                                    [...liveMatches, ...liveMatches].map((m, i) => (
                                        <span key={i} className="live-ticker-item">
                                            ⚽ {m.home_team} vs {m.away_team} <span className="live-ticker-odds">{m.odds}</span>
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <section className="two-box-section">
                        <a href="/casino" className="feature-box" id="casinoBox" onClick={(e) => handleProtectedClick(e, 'casino')}>
                            <span className="feature-box-badge">HOT 🔥</span>
                            <img src="/casino.jpg" alt="Casino" onError={(e) => e.target.src = '/default.jpg'} />
                            <div className="feature-box-label">Casino</div>
                        </a>
                        <a href="/matches" className="feature-box" id="sportBox" onClick={(e) => handleProtectedClick(e, 'sport')}>
                            <span className="feature-box-badge">LIVE ⚡</span>
                            <img src="/sports.jpg" alt="Sport" onError={(e) => e.target.src = '/default.jpg'} />
                            <div className="feature-box-label">Sport</div>
                        </a>
                    </section>

                    <section className="betting-features-section">
                        <a href="/live" className="betting-feature-card" onClick={(e) => handleProtectedClick(e, 'live')}><div className="betting-feature-icon"><i className="bi bi-broadcast-pin"></i></div>Live Betting</a>
                        <a href="/casino" className="betting-feature-card" onClick={(e) => handleProtectedClick(e, 'casino')}><div className="betting-feature-icon"><i className="bi bi-dice-5"></i></div>Live Casino</a>
                        <a href="/aviator" className="betting-feature-card" onClick={(e) => handleProtectedClick(e, 'aviator')}><div className="betting-feature-icon"><i className="bi bi-airplane-engines"></i></div>Aviator</a>
                        <a href="/matches" className="betting-feature-card" onClick={(e) => handleProtectedClick(e, 'matches')}><div className="betting-feature-icon"><i className="bi bi-trophy-fill"></i></div>Sportsbook</a>
                        <a href="#" className="betting-feature-card" id="featureJackpot" onClick={(e) => handleProtectedClick(e, 'jackpot')}><div className="betting-feature-icon"><i className="bi bi-gem"></i></div>Jackpots</a>
                        <a href="#" className="betting-feature-card" id="featureVirtuals" onClick={(e) => handleProtectedClick(e, 'virtuals')}><div className="betting-feature-icon"><i className="bi bi-cpu"></i></div>Virtuals</a>
                        <a href="#" className="betting-feature-card" id="featurePromos" onClick={(e) => handleProtectedClick(e, 'promos')}><div className="betting-feature-icon"><i className="bi bi-gift-fill"></i></div>Promotions</a>
                        <a href="#" className="betting-feature-card" id="featureCashout" onClick={(e) => handleProtectedClick(e, 'cashout')}><div className="betting-feature-icon"><i className="bi bi-cash-stack"></i></div>Quick Cashout</a>
                    </section>

                    <div className="important-links">
                        <a href="/faq"><i className="bi bi-question-circle"></i> FAQ</a>
                        <a href="/terms"><i className="bi bi-file-text"></i> Terms</a>
                        <a href="/privacy"><i className="bi bi-shield-lock"></i> Privacy</a>
                        <a href="/login"><i className="bi bi-box-arrow-in-right"></i> Login</a>
                        <a href="/register"><i className="bi bi-person-plus"></i> Register</a>
                    </div>

                    <section id="errorContainer" className="system-alert" role="alert"></section>
                </div>
            </main>

            <div id="footer-placeholder" ref={footerRef}></div>

            <div className="cookie-consent-bar" id="cookieConsentBar">
                <span className="cookie-consent-text">This site uses essential cookies. By continuing, you agree to our Privacy Policy.</span>
                <button className="cookie-consent-btn" id="cookieAcceptBtn" style={{ background: '#1a1d21', color: '#FFD700', padding: '10px 20px', borderRadius: '8px', fontWeight: '700' }} onClick={handleAcceptCookie}>GOT IT</button>
            </div>

            <div id="turnstileContainer" style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '300px', height: '65px', zIndex: '-1', opacity: '0' }} ref={turnstileRef}></div>
        </>
    );
};

export default HomePage;
