(function() {
    // ========== CACHE HELPERS ==========
    const CACHE_KEYS = {
        BALANCE: 'tidye_balance_cache',
        PROFILE: 'tidye_profile_cache',
        MATCHES: 'tidye_matches_cache',
        ODDS: 'tidye_odds_cache'
    };
    const BALANCE_CACHE_TTL = 5 * 60 * 1000;
    const BALANCE_FETCH_THROTTLE = 15000;
    const CACHE_TTL = 5 * 60 * 1000;

    let lastBalanceFetchTime = 0;
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
            localStorage.setItem(CACHE_KEYS.BALANCE, JSON.stringify({ balance, timestamp: Date.now() }));
        } catch (e) {}
    }

    function getCachedProfile() {
        try {
            const cached = localStorage.getItem(CACHE_KEYS.PROFILE);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < BALANCE_CACHE_TTL) return data;
        } catch(e) {}
        return null;
    }
    function cacheProfile(data) {
        try {
            localStorage.setItem(CACHE_KEYS.PROFILE, JSON.stringify({ data, timestamp: Date.now() }));
        } catch(e) {}
    }

    function getCached(key) {
        try {
            const c = localStorage.getItem(key);
            if (!c) return null;
            const { data, ts } = JSON.parse(c);
            return (Date.now() - ts < CACHE_TTL) ? data : null;
        } catch(e) { return null; }
    }
    function setCache(key, data) {
        try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch(e) {}
    }

    function getCleanSessionToken() {
        let raw = localStorage.getItem('tidye_session_token');
        if (!raw || raw === 'null' || raw === 'undefined') return null;
        try {
            let p = JSON.parse(raw);
            if (p?.access_token) return p.access_token;
            if (typeof p === 'string') return p;
        } catch(e){}
        return raw.replace(/^["']|["']$/g, '').trim();
    }

    function enforceSession() {
        if (!getCleanSessionToken()) { window.location.replace('login.html'); return false; }
        return true;
    }

    async function checkApiLock() {
        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/api-lock`, { headers: { Authorization: `Bearer ${window.SUPABASE_ANON_KEY}` } });
            if (res.ok) {
                const d = await res.json();
                if (d.locked) window.location.replace('updating.html');
            }
        } catch(e) {}
    }

    const balanceDisplay = document.getElementById('balanceDisplay');
    function updateBalanceUI(balance) {
        const f = balance.toFixed(2);
        const [main, cents] = f.split('.');
        balanceDisplay.innerHTML = `MWK ${parseInt(main).toLocaleString()}<span class="bal-cents">.${cents}</span>`;
        document.getElementById('balanceWrapper').classList.add('balance-loaded');
    }
    function showBalanceSkeleton() { document.getElementById('balanceWrapper').classList.remove('balance-loaded'); }

    // Init balance
    (function initBalance() {
        const cachedBalance = getCachedBalance();
        if (cachedBalance !== null) updateBalanceUI(cachedBalance);
        else showBalanceSkeleton();
    })();

    async function fetchBalanceIfNeeded() {
        const now = Date.now();
        if (now - lastBalanceFetchTime < BALANCE_FETCH_THROTTLE) return;
        const tok = getCleanSessionToken();
        if (!tok) return;
        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/wallet-api`, { headers: { 'Authorization': `Bearer ${tok}` } });
            if (res.ok) {
                const d = await res.json();
                const balance = Number(d.balance);
                lastBalanceFetchTime = Date.now();
                const currentDisplayed = document.getElementById('balanceDisplay').textContent.replace(/[^0-9.-]+/g,"");
                if (parseFloat(currentDisplayed) !== balance) updateBalanceUI(balance);
                else document.getElementById('balanceWrapper').classList.add('balance-loaded');
                cacheBalance(balance);
            } else if (res.status === 401) {
                window.location.replace('login.html');
            }
        } catch(e) {}
    }

    (function initProfileFromCache() {
        const cachedProfile = getCachedProfile();
        if (cachedProfile) {
            globalUserId = cachedProfile.id;
            globalUserEmail = cachedProfile.email || null;
        }
    })();

    async function fetchUserProfile() {
        const tok = getCleanSessionToken();
        if (!tok) return;
        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/settings-api`, { headers: { 'Authorization': `Bearer ${tok}` } });
            if (res.ok) {
                const d = await res.json();
                cacheProfile(d);
                globalUserId = d.id;
                globalUserEmail = d.email || null;
            } else if (res.status === 401) {
                window.location.replace('login.html');
            }
        } catch(e) {}
    }

    const footerPromise = fetch('footer.html').then(r => r.ok ? r.text() : '').catch(() => '');
    (function injectFooterImmediately() {
        const placeholder = document.getElementById('footer-placeholder');
        if (placeholder) {
            footerPromise.then(html => {
                if (html) {
                    placeholder.innerHTML = html;
                    placeholder.querySelectorAll('script').forEach(old => {
                        const s = document.createElement('script');
                        s.textContent = old.textContent;
                        document.body.appendChild(s).remove();
                    });
                }
            }).catch(() => {});
        }
    })();

    let allMatches = [], oddsMap = {}, favouriteLeagues = JSON.parse(localStorage.getItem('tidye_fav_leagues') || '[]');
    let displayedCount = 20, activeLeagueFilter = 'all', activeMarketFilter = '1X2', activeDateFilter = 'all', showFavoritesOnly = false;
    let countdownInterval = null;

    const sportsCountBadge = document.getElementById('sportsCountBadge');
    const matchesContainer = document.getElementById('matchesContainer');
    const sentinel = document.getElementById('scrollSentinel');

    function updateSportsCount() {
        if (sportsCountBadge) sportsCountBadge.textContent = allMatches.length;
    }

    function saveFavorites() { localStorage.setItem('tidye_fav_leagues', JSON.stringify(favouriteLeagues)); }

    // NO DEMO ODDS GENERATION – removed entirely

    function generateBookiesCount(matchId) {
        let hash = 0;
        for (let i = 0; i < matchId.length; i++) {
            hash = ((hash << 5) - hash) + matchId.charCodeAt(i);
            hash |= 0;
        }
        return 9 + (Math.abs(hash) % 37);
    }

    async function fetchMatches() {
        const tok = getCleanSessionToken();
        if (!tok) return;

        const cachedMatches = getCached(CACHE_KEYS.MATCHES);
        if (cachedMatches) {
            allMatches = cachedMatches;
            updateSportsCount();
            buildLeagueFilter();
            buildDateFilter();
            buildMarketFilter();
        }
        const cachedOdds = getCached(CACHE_KEYS.ODDS);
        if (cachedOdds) { oddsMap = cachedOdds; renderVisible(); }

        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/get-sport-api`, { headers: { Authorization: `Bearer ${tok}` } });
            if (!res.ok) throw new Error('Failed to fetch matches');
            const data = await res.json();
            if (data.code === 0 && data.data) {
                allMatches = data.data;
                setCache(CACHE_KEYS.MATCHES, allMatches);
                updateSportsCount();
                buildLeagueFilter();
                buildDateFilter();
                renderVisible();
                const matchIds = allMatches.map(m => m.matchId).join(',');
                if (matchIds) await fetchOdds(matchIds);
            } else {
                throw new Error(data.message || 'No data returned');
            }
        } catch(e) {
            console.error(e);
            matchesContainer.innerHTML = `<div class="empty-state"><i class="bi bi-exclamation-triangle"></i><br>${e.message || 'Unable to load matches.'}</div>`;
        }
    }

    async function fetchOdds(matchIds) {
        const tok = getCleanSessionToken();
        if (!tok) return;
        try {
            const res = await fetch(`${window.SUPABASE_URL}/functions/v1/get-odds-api?matchId=${matchIds}&companyId=8`, { headers: { Authorization: `Bearer ${tok}` } });
            if (!res.ok) return;
            const data = await res.json();
            if (data.code === 0 && data.data) {
                parseOddsResponse(data.data);
                setCache(CACHE_KEYS.ODDS, oddsMap);
                renderVisible();
            }
        } catch(e) { console.warn('Odds fetch error', e); }
    }

    function parseOddsResponse(oddsData) {
        oddsMap = {};
        const arr = oddsData.europeOdds || [];
        arr.forEach(entry => {
            const parts = entry.split(',');
            const matchId = parts[0];
            const companyId = parts[1];
            if (companyId === '8') {
                const initHome = parseFloat(parts[2]), initDraw = parseFloat(parts[3]), initAway = parseFloat(parts[4]);
                const instHome = parseFloat(parts[5]), instDraw = parseFloat(parts[6]), instAway = parseFloat(parts[7]);
                oddsMap[matchId] = {
                    home: instHome.toFixed(2),
                    draw: instDraw.toFixed(2),
                    away: instAway.toFixed(2),
                    initHome, initDraw, initAway
                };
            }
        });
    }

    // ... (rest of the functions exactly as before – closeAllDropdowns, buildLeagueFilter, applyFilters, renderVisible, etc.)

    function renderVisible() {
        if (activeMarketFilter !== '1X2') {
            matchesContainer.innerHTML = '<div class="empty-state"><i class="bi bi-cone-striped"></i><br>This market is coming soon.</div>';
            return;
        }
        const filtered = applyFilters();
        if (!filtered.length) {
            matchesContainer.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><br>No matches found.</div>';
            return;
        }
        const visible = filtered.slice(0, displayedCount);
        let html = '';
        visible.forEach(m => {
            const isLive = m.status > 0 && m.status < 4;
            let odds = oddsMap[m.matchId];
            const hasOdds = odds && odds.home && odds.draw && odds.away;
            const homeOdds = hasOdds ? odds.home : null;
            const drawOdds = hasOdds ? odds.draw : null;
            const awayOdds = hasOdds ? odds.away : null;
            const matchTime = m.matchTime ? new Date(m.matchTime * 1000) : null;
            const timeStr = matchTime ? matchTime.toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
            const countdownHtml = matchTime && matchTime > new Date() ? `<div class="countdown" data-end="${matchTime.getTime()}">${calcCountdown(matchTime)}</div>` : '';
            const bookiesCount = generateBookiesCount(m.matchId);

            let oddsHtml = '';
            if (hasOdds) {
                oddsHtml = `<div class="odds-area">
                    <div class="odds-row">
                        <div class="odds-cell" onclick="handleOddsClick('${m.matchId}', '1', '${homeOdds}', '${escapeHTML(m.homeName)}', '${escapeHTML(m.awayName)}', '${escapeHTML(m.leagueName)}', event)">
                            <span class="label">1</span>
                            <span class="value">${homeOdds}</span>
                        </div>
                        <div class="odds-cell" onclick="handleOddsClick('${m.matchId}', 'X', '${drawOdds}', '${escapeHTML(m.homeName)}', '${escapeHTML(m.awayName)}', '${escapeHTML(m.leagueName)}', event)">
                            <span class="label">X</span>
                            <span class="value">${drawOdds}</span>
                        </div>
                        <div class="odds-cell" onclick="handleOddsClick('${m.matchId}', '2', '${awayOdds}', '${escapeHTML(m.homeName)}', '${escapeHTML(m.awayName)}', '${escapeHTML(m.leagueName)}', event)">
                            <span class="label">2</span>
                            <span class="value">${awayOdds}</span>
                        </div>
                    </div>
                    <div class="bookies-link" onclick="window.location.href='odds-events.html?matchId=${m.matchId}'" title="View all bookmakers">${bookiesCount}+</div>
                </div>`;
            } else {
                oddsHtml = `<div class="odds-area"><div style="flex:1;text-align:center;font-size:14px;color:#9ca3af;">Odds not available</div></div>`;
            }

            html += `<div class="match-card">
                ${isLive ? `<div class="match-live-circle">LIVE</div>` : ''}
                <div class="match-datetime">${timeStr}</div>
                ${countdownHtml}
                <div class="match-team-row home">${escapeHTML(m.homeName || 'Home')}</div>
                <div class="match-team-row away">${escapeHTML(m.awayName || 'Away')}</div>
                <div class="match-league">${escapeHTML(m.leagueName || 'League')}</div>
                <div class="match-market-label">Full‑time 1 X 2</div>
                ${isLive ? `<div class="match-score">${m.homeScore||0} - ${m.awayScore||0}</div>` : ''}
                ${oddsHtml}
            </div>`;
        });
        matchesContainer.innerHTML = html;
        updateCountdowns();
        const slip = JSON.parse(localStorage.getItem('tidye_bet_slip') || '[]');
        slip.forEach(bet => {
            document.querySelectorAll('.odds-cell').forEach(cell => {
                const onclick = cell.getAttribute('onclick') || '';
                if (onclick.includes(`'${bet.matchId}'`) && onclick.includes(`'${bet.selection}'`)) cell.classList.add('selected');
            });
        });
    }

    // ... (the rest of the helper functions like oddsChangeIndicator, calcCountdown, updateCountdowns, handleOddsClick, escapeHTML, setupInfiniteScroll, checkOffline, fetchBackgroundPrefetch, and DOMContentLoaded listener – all unchanged except that we removed oddsChangeIndicator usage because we no longer show change arrows (since we don't have initial vs instant difference). But we can keep the function; it will just show nothing if diff is zero.)

    // DOMContentLoaded
    document.addEventListener('DOMContentLoaded', async () => {
        if (!enforceSession()) return;
        await checkApiLock(); checkOffline();
        await fetchBackgroundPrefetch();
        await fetchMatches();
        setupInfiniteScroll();

        // Dropdown toggles
        document.getElementById('leagueFilterBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('leagueDropdown').classList.toggle('open');
            document.getElementById('marketDropdown').classList.remove('open');
            document.getElementById('dateDropdown').classList.remove('open');
        });
        document.getElementById('marketFilterBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('marketDropdown').classList.toggle('open');
            document.getElementById('leagueDropdown').classList.remove('open');
            document.getElementById('dateDropdown').classList.remove('open');
            if (!document.getElementById('marketDropdown').innerHTML) buildMarketFilter();
        });
        document.getElementById('dateFilterBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('dateDropdown').classList.toggle('open');
            document.getElementById('leagueDropdown').classList.remove('open');
            document.getElementById('marketDropdown').classList.remove('open');
        });
        document.getElementById('searchFilterBtn').addEventListener('click', () => {
            document.getElementById('searchBar').classList.toggle('active');
            if (document.getElementById('searchBar').classList.contains('active')) document.getElementById('searchInput').focus();
        });
        document.getElementById('favFilterBtn').addEventListener('click', () => {
            showFavoritesOnly = !showFavoritesOnly;
            document.getElementById('favFilterBtn').classList.toggle('active', showFavoritesOnly);
            displayedCount = 20;
            renderVisible();
        });
        document.addEventListener('click', () => closeAllDropdowns());
        document.getElementById('searchInput').addEventListener('input', () => { displayedCount = 20; renderVisible(); });

        document.getElementById('seeMoreSubBtn').addEventListener('click', e => {
            e.preventDefault();
            document.getElementById('categoryNav').classList.toggle('show-more');
            e.currentTarget.querySelector('span').textContent = document.getElementById('categoryNav').classList.contains('show-more') ? 'Less' : 'See More';
        });

        countdownInterval = setInterval(updateCountdowns, 1000);
        window.addEventListener('offline', checkOffline);
        window.addEventListener('online', () => { checkOffline(); location.reload(); });
    });
})();
