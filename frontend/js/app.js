const API_BASE = '/api/news';
const SELECTED_COMPANIES_KEY = 'selectedCompanies';
let allNews = [];
let availableCompanies = [];
let selectedCompanies = [];
let activeTimeRange = null;

// Company to Domain mapping for Logo APIs
const companyDomains = {
    'HSBC': 'hsbc.com',
    'Grab': 'grab.com',
    'Vodafone': 'vodafone.com',
    'Cathay Pacific': 'cathaypacific.com',
    'Alibaba': 'alibaba.com',
    'Standard Chartered': 'sc.com',
    'Temu': 'temu.com',
    'Ctrip': 'trip.com',
    'Didi': 'didiglobal.com',
    'DBS': 'dbs.com',
    'Tencent': 'tencent.com',
    'Bank of China': 'boc.cn',
    'ByteDance': 'bytedance.com',
    'Gojek': 'gojek.com',
    'Citigroup': 'citigroup.com',
    'Binance': 'binance.com',
    'ShopBack': 'shopback.com',
    'Aeon Credit': 'aeoncredit.com.my'
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing MarketFeed Strategic Insights...');
    
    const saved = localStorage.getItem(SELECTED_COMPANIES_KEY);
    if (saved) {
        selectedCompanies = JSON.parse(saved);
    }

    // Set default time range to 6h on initial load for maximum speed and recency
    const now = new Date();
    const start = new Date();
    start.setHours(now.getHours() - 6);
    activeTimeRange = start.toISOString();

    await loadCompanies();
    await loadNews();
    
    // Highlight the 6h button by default
    const defaultTimeBtn = document.querySelector('.btn-quick-time[data-range="6h"]');
    if (defaultTimeBtn) defaultTimeBtn.classList.add('active');
    
    setupEventListeners();
    
    // Initial status check and start polling
    startStatusPolling();

    // Theme initialization
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const icon = document.querySelector('#themeToggle i');
        if (icon) icon.className = 'fas fa-sun';
    }
});

async function loadCompanies() {
    try {
        const response = await fetch(`${API_BASE}/companies`);
        const data = await response.json();
        if (data.success) {
            availableCompanies = data.data;
            renderCompanyGrid();
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

function getLogoUrl(companyName, type = 'primary') {
    // 1. Check if we have a direct logoUrl from availableCompanies
    const company = availableCompanies.find(c => c.name === companyName);
    if (company && company.logoUrl) return company.logoUrl;

    const domain = companyDomains[companyName];
    if (!domain) return `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=f1f5f9&color=6366f1&size=128&bold=true`;
    
    // 2. Use DDG Icons as primary (more reliable for some Chinese/International brands)
    if (type === 'primary') return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    // 3. Clearbit as secondary
    if (type === 'secondary') return `https://logo.clearbit.com/${domain}?size=128`;
    // 4. Google as tertiary
    if (type === 'tertiary') return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=f1f5f9&color=6366f1&size=128&bold=true`;
}

window.handleLogoError = function(img, companyName) {
    const currentSrc = img.src;
    const domain = companyDomains[companyName];
    if (!domain) return;

    if (currentSrc.includes('duckduckgo.com')) {
        img.src = getLogoUrl(companyName, 'secondary');
    } else if (currentSrc.includes('clearbit.com')) {
        img.src = getLogoUrl(companyName, 'tertiary');
    } else if (!currentSrc.includes('ui-avatars.com')) {
        img.src = getLogoUrl(companyName, 'fallback');
    }
};

function renderCompanyGrid() {
    const container = document.getElementById('companyFilters');
    if (!container) return;
    container.innerHTML = '';
    
    availableCompanies.forEach(company => {
        const isSelected = selectedCompanies.includes(company.name);
        const item = document.createElement('div');
        item.className = `company-item ${isSelected ? 'selected' : ''}`;
        item.dataset.company = company.name;
        
        item.innerHTML = `
            <img src="${getLogoUrl(company.name)}" alt="${company.name}" loading="lazy" onerror="handleLogoError(this, '${company.name}')">
            <span>${company.name}</span>
        `;
        
        item.addEventListener('click', () => {
            item.classList.toggle('selected');
        });

        container.appendChild(item);
    });
    
    updateSelectionLabel();
}

function updateSelectionLabel() {
    const count = selectedCompanies.length;
    const label = document.getElementById('selectedCountLabel');
    if (count === 0) label.textContent = 'Select Companies';
    else if (count === availableCompanies.length) label.textContent = 'All Companies';
    else label.textContent = `${count} Companies`;
}

async function loadNews(isExplicitRefresh = false) {
    showLoading(true);
    try {
        const category = document.getElementById('categoryFilter').value;
        const source = document.getElementById('sourceFilter').value;
        const search = document.getElementById('searchInput').value;
        
        if (isExplicitRefresh) {
            await fetch(`${API_BASE}/aggregate`, { method: 'POST' });
            // Small delay to allow some new items to be found
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        let url = `${API_BASE}?limit=1000`;
        
        // Use activeTimeRange if set by quick filters (ensure precise ISO format)
        if (activeTimeRange) {
            const isoDate = new Date(activeTimeRange).toISOString().replace('Z', '');
            url += `&startDate=${encodeURIComponent(isoDate)}`;
        }
        
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (source) url += `&source=${encodeURIComponent(source)}`;
        if (selectedCompanies.length > 0) url += `&companies=${selectedCompanies.join(',')}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        console.log('Fetching news with URL:', url);
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            allNews = data.data || [];
            renderNews();
        }
    } catch (error) {
        console.error('Error loading news:', error);
        showEmptyState(true);
    } finally {
        showLoading(false);
    }
}

function renderNews() {
    const newsList = document.getElementById('newsList');
    if (allNews.length === 0) {
        showEmptyState(true);
    } else {
        showEmptyState(false);
        newsList.innerHTML = allNews.map(article => createNewsCard(article)).join('');
        
        document.querySelectorAll('.news-card').forEach(card => {
            card.addEventListener('click', () => {
                showArticleModal(JSON.parse(card.dataset.article));
            });
        });
    }
    updateStats(allNews.length);
}

function createNewsCard(article) {
    const date = formatDate(article.publishedAt);
    const logoUrl = getLogoUrl(article.company);
    const isStrategic = article.category === 'Strategic Insights';
    const categoryBadgeClass = isStrategic ? 'badge-strategic' : 'badge-category';
    
    return `
        <div class="news-card ${isStrategic ? 'strategic' : ''}" data-article='${JSON.stringify(article).replace(/'/g, "&apos;")}'>
            <div class="news-card-image-container">
                <img src="${logoUrl}" alt="${article.company}" class="news-card-logo" loading="lazy" onerror="handleLogoError(this, '${article.company}')">
            </div>
            <div class="news-card-content">
                <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
                <p class="news-card-description">${escapeHtml(article.description || 'No summary available')}</p>
                <div class="news-card-meta">
                    <span class="badge badge-company">${article.company}</span>
                    <span class="badge badge-source">${article.source}</span>
                    <span class="badge ${categoryBadgeClass}">${article.category || 'General'}</span>
                    <span class="news-card-date">${date}</span>
                </div>
            </div>
        </div>
    `;
}

function showArticleModal(article) {
    const modal = document.getElementById('articleModal');
    const modalBody = document.getElementById('modalBody');
    const logoUrl = getLogoUrl(article.company);
    
    modalBody.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem; background: #f8fafc; padding: 2.5rem; border-radius: 20px; border: 1px solid var(--border);">
            <img src="${logoUrl}" alt="${article.company}" style="max-width: 180px; height: 90px; object-fit: contain;" onerror="handleLogoError(this, '${article.company}')">
        </div>
        <h2 style="font-size: 1.6rem; margin-bottom: 1.5rem; font-weight: 800; line-height: 1.3;">${escapeHtml(article.title)}</h2>
        <div class="news-card-meta" style="margin-bottom: 2rem;">
            <span class="badge badge-company">${article.company}</span>
            <span class="badge badge-source">${article.source}</span>
            <span class="badge badge-category">${article.category}</span>
            <span class="news-card-date">${formatDate(article.publishedAt)}</span>
        </div>
        <div style="font-size: 1.05rem; line-height: 1.7; color: var(--text-main); margin-bottom: 2.5rem;">${escapeHtml(article.description || 'No description available')}</div>
        <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="btn-icon-text btn-refresh" style="text-decoration: none; justify-content: center; padding: 1rem;">View Original Source <i class="fas fa-external-link-alt"></i></a>
    `;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function setupEventListeners() {
    const selectorModal = document.getElementById('companySelectorModal');
    const articleModal = document.getElementById('articleModal');
    const reportModal = document.getElementById('reportModal');

    document.getElementById('openCompanySelector').addEventListener('click', () => {
        selectorModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });

    document.getElementById('closeSelector').addEventListener('click', () => {
        selectorModal.style.display = 'none';
        document.body.style.overflow = '';
    });

    document.getElementById('applySelectorBtn').addEventListener('click', () => {
        selectedCompanies = Array.from(document.querySelectorAll('.company-item.selected')).map(item => item.dataset.company);
        localStorage.setItem(SELECTED_COMPANIES_KEY, JSON.stringify(selectedCompanies));
        selectorModal.style.display = 'none';
        document.body.style.overflow = '';
        updateSelectionLabel();
        // Zero-wait: load from DB immediately based on selection
        loadNews(false, false);
    });

    document.getElementById('selectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.company-item').forEach(item => item.classList.add('selected'));
    });

    document.getElementById('deselectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.company-item').forEach(item => item.classList.remove('selected'));
    });

    document.getElementById('refreshBtn').addEventListener('click', async () => await triggerAggregation(false));
    document.getElementById('fetchAllBtn').addEventListener('click', async () => await triggerAggregation(true));
    document.getElementById('applyFiltersBtn').addEventListener('click', () => loadNews(false, false));
    
    // Podcast Logic
    const podcastBtn = document.getElementById('podcastBtn');
    const podcastPlayer = document.getElementById('podcastPlayer');
    
    podcastBtn.addEventListener('click', async () => {
        if (podcastBtn.classList.contains('playing')) {
            podcastPlayer.pause();
            podcastBtn.classList.remove('playing');
            podcastBtn.querySelector('span').textContent = 'Daily Podcast';
            return;
        }

        try {
            podcastBtn.classList.add('loading');
            podcastBtn.querySelector('span').textContent = 'Generating...';
            
            // Request podcast audio from backend
            const response = await fetch(`${API_BASE}/podcast`);
            if (!response.ok) throw new Error('Failed to generate podcast');
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            podcastPlayer.src = url;
            podcastPlayer.play();
            
            podcastBtn.classList.remove('loading');
            podcastBtn.classList.add('playing');
            podcastBtn.querySelector('span').textContent = 'Playing...';
            
            podcastPlayer.onended = () => {
                podcastBtn.classList.remove('playing');
                podcastBtn.querySelector('span').textContent = 'Daily Podcast';
            };
        } catch (error) {
            console.error('Podcast error:', error);
            alert('Could not generate podcast. Please ensure news is loaded.');
            podcastBtn.classList.remove('loading');
            podcastBtn.querySelector('span').textContent = 'Daily Podcast';
        }
    });
    document.getElementById('searchInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') loadNews(false, false); });

    // Logo click to reset everything and show all with default 24h filter
    document.querySelector('.logo').addEventListener('click', (e) => {
        e.preventDefault();
        selectedCompanies = [];
        
        // Reset to default 6h range
        const now = new Date();
        const start = new Date();
        start.setHours(now.getHours() - 6);
        activeTimeRange = start.toISOString();
        
        document.getElementById('categoryFilter').value = '';
        document.getElementById('sourceFilter').value = '';
        document.getElementById('searchInput').value = '';
        
        document.querySelectorAll('.btn-quick-time').forEach(b => b.classList.remove('active'));
        const defaultTimeBtn = document.querySelector('.btn-quick-time[data-range="6h"]');
        if (defaultTimeBtn) defaultTimeBtn.classList.add('active');
        
        localStorage.removeItem(SELECTED_COMPANIES_KEY);
        renderCompanyGrid();
        loadNews();
    });

    document.querySelectorAll('.btn-quick-time').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-quick-time').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const range = btn.dataset.range;
            const now = new Date();
            let start = new Date();
            switch(range) {
                case '6h': start.setHours(now.getHours() - 6); break;
                case '12h': start.setHours(now.getHours() - 12); break;
                case '24h': start.setHours(now.getHours() - 24); break;
                case '48h': start.setHours(now.getHours() - 48); break;
                case '1w': start.setDate(now.getDate() - 7); break;
                case '1m': start.setMonth(now.getMonth() - 1); break;
                case '2020': start = new Date('2020-01-01T00:00:00Z'); break;
            }
            
            // Set global activeTimeRange so it persists through Apply Filters
            activeTimeRange = start.toISOString();
            loadNews();
        });
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('categoryFilter').value = '';
        document.getElementById('sourceFilter').value = '';
        document.getElementById('searchInput').value = '';
        document.querySelectorAll('.btn-quick-time').forEach(b => b.classList.remove('active'));
        selectedCompanies = [];
        activeTimeRange = null; // Clear time range on reset
        localStorage.removeItem(SELECTED_COMPANIES_KEY);
        renderCompanyGrid();
        loadNews();
    });

    // AI Chat
    const aiChatToggle = document.getElementById('aiChatToggle');
    const aiChatWindow = document.getElementById('aiChatWindow');
    const aiChatInput = document.getElementById('aiChatInput');
    const aiChatMessages = document.getElementById('aiChatMessages');

    aiChatToggle.addEventListener('click', () => {
        aiChatWindow.style.display = aiChatWindow.style.display === 'none' ? 'flex' : 'none';
    });

    document.getElementById('closeAiChat').addEventListener('click', () => {
        aiChatWindow.style.display = 'none';
    });

    async function handleAiChat() {
        const query = aiChatInput.value.trim();
        if (!query) return;
        appendAiMessage('user', query);
        aiChatInput.value = '';
        const botMsgDiv = appendAiMessage('bot', 'Analyzing news...');
        try {
            const response = await fetch('/api/news/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, context: allNews.slice(0, 15) })
            });
            const data = await response.json();
            botMsgDiv.textContent = data.answer || "I couldn't find a specific answer for that.";
        } catch (error) {
            botMsgDiv.textContent = "Connection error.";
        }
    }

    document.getElementById('sendAiMessage').addEventListener('click', handleAiChat);
    aiChatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleAiChat(); });

    function appendAiMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ${role}`;
        msgDiv.textContent = text;
        aiChatMessages.appendChild(msgDiv);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
        return msgDiv;
    }

    // Strategy Report
    document.getElementById('generateReportBtn').addEventListener('click', async () => {
        reportModal.style.display = 'block';
        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = '<div class="report-loading"><div class="spinner"></div><p>Crafting your strategic analysis...</p></div>';
        try {
            const strategicNews = allNews.filter(n => n.category === 'Strategic Insights');
            const response = await fetch('/api/news/ai/strategy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ news: strategicNews.slice(0, 20) })
            });
            const data = await response.json();
            if (data.success) {
                // Add Listen Button at top
                const listenBtnHtml = `
                    <div style="margin-bottom: 20px; text-align: right;">
                        <button id="listenToReportBtn" class="btn-icon-text btn-refresh" style="background: var(--primary); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer;">
                            <i class="fas fa-play"></i> <span>Listen to Report</span>
                        </button>
                        <audio id="reportAudio" style="display:none"></audio>
                    </div>
                `;

                // Professional Markdown-to-HTML rendering
                let html = data.report
                    .replace(/^# (.*$)/gim, '<h1 style="font-size: 1.8rem; margin: 1rem 0; color: var(--primary);">$1</h1>')
                    .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.4rem; margin: 1rem 0; border-bottom: 2px solid var(--border); padding-bottom: 0.3rem;">$1</h2>')
                    .replace(/^### (.*$)/gim, '<h3 style="font-size: 1.2rem; margin: 1rem 0 0.5rem; color: var(--text-main);">$1</h3>')
                    .replace(/^#### (.*$)/gim, '<h4 style="font-size: 1.1rem; margin: 0.8rem 0 0.3rem; font-weight: bold;">$1</h4>')
                    .replace(/^\> (.*$)/gim, '<blockquote style="border-left: 4px solid var(--primary); background: var(--bg-secondary); padding: 0.8rem; margin: 0.8rem 0; font-style: italic; border-radius: 0 8px 8px 0;">$1</blockquote>')
                    .replace(/\*\*\*/g, '<hr style="border: none; border-top: 1px solid var(--border); margin: 1.5rem 0;">')
                    .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*)\*/g, '<em>$1</em>')
                    .replace(/!\[(.*?)\]\((.*?)\)/g, '<div class="report-img-container" style="margin: 15px 0;"><img src="$2" alt="$1" style="width:100%; border-radius:12px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); object-fit: cover; max-height: 250px;"></div>')
                    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 600;">$1 <i class="fas fa-external-link-alt" style="font-size: 0.8em;"></i></a>')
                    .replace(/^\* (.*$)/gim, '<li style="margin-bottom: 0.3rem; list-style-type: none;"><i class="fas fa-check-circle" style="color: var(--success); margin-right: 8px;"></i> $1</li>')
                    .replace(/\n/g, '<br>');

                reportContent.innerHTML = listenBtnHtml + `<div class="report-styled-content" style="padding: 0.5rem;">${html}</div>`;
                
                // Audio Logic for Report
                const listenBtn = document.getElementById('listenToReportBtn');
                const reportAudio = document.getElementById('reportAudio');
                listenBtn.addEventListener('click', async () => {
                    if (listenBtn.classList.contains('playing')) {
                        reportAudio.pause();
                        listenBtn.classList.remove('playing');
                        listenBtn.querySelector('span').textContent = 'Listen to Report';
                        return;
                    }
                    try {
                        listenBtn.classList.add('loading');
                        listenBtn.querySelector('span').textContent = 'Synthesizing...';
                        const audioRes = await fetch('/api/news/report-speech', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: data.report })
                        });
                        const blob = await audioRes.blob();
                        reportAudio.src = URL.createObjectURL(blob);
                        reportAudio.play();
                        listenBtn.classList.remove('loading');
                        listenBtn.classList.add('playing');
                        listenBtn.querySelector('span').textContent = 'Playing...';
                    } catch (e) {
                        alert('Audio failed');
                        listenBtn.classList.remove('loading');
                    }
                });
                reportAudio.onended = () => {
                    listenBtn.classList.remove('playing');
                    listenBtn.querySelector('span').textContent = 'Listen to Report';
                };
            } else {
                reportContent.innerHTML = '<p>Failed to generate strategy. Please try again.</p>';
            }
        } catch (error) {
            reportContent.innerHTML = '<p>AI Strategy Engine is currently busy.</p>';
        }
    });

    document.getElementById('closeReportModal').addEventListener('click', () => {
        reportModal.style.display = 'none';
    });

    document.getElementById('downloadReportBtn').addEventListener('click', () => {
        const content = document.getElementById('reportContent').innerText;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MarketFeed_Strategy_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
    });

    document.getElementById('themeToggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        const icon = document.querySelector('#themeToggle i');
        if (icon) icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        articleModal.style.display = 'none';
        document.body.style.overflow = '';
    });

    window.addEventListener('click', (e) => {
        if (e.target === selectorModal || e.target === articleModal || e.target === reportModal) {
            selectorModal.style.display = 'none';
            articleModal.style.display = 'none';
            reportModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}

function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
    document.getElementById('newsList').style.opacity = show ? '0.4' : '1';
}

function showEmptyState(isEmpty) {
    const emptyState = document.getElementById('emptyState');
    const newsList = document.getElementById('newsList');
    if (isEmpty) {
        newsList.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
    }
}

function updateStats(count) {
    const totalArticles = document.getElementById('totalArticles');
    if (totalArticles) totalArticles.textContent = count || '0';
}

function formatDate(dateString) {
    // If no date provided (null/undefined), return empty string to "leave it blank"
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // If invalid date, return empty string
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diff = now - date;
    
    // Future dates (sometimes happens due to timezone shifts)
    if (diff < 0) return 'Just now';
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    
    // Less than 1 hour
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `${mins}m ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }
    
    // Less than 7 days
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days}d ago`;
    }

    // Less than 30 days (Weeks)
    if (diff < 2592000000) {
        const weeks = Math.floor(diff / 604800000);
        return `${weeks}w ago`;
    }

    // Less than 1 year (Months)
    if (diff < 31536000000) {
        const months = Math.floor(diff / 2592000000);
        return `${months}mo ago`;
    }
    
    // Default to date string
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

let statusPollingInterval = null;

async function triggerAggregation(isFull = false) {
    const btn = isFull ? document.getElementById('fetchAllBtn') : document.getElementById('refreshBtn');
    const originalText = btn ? btn.querySelector('span').textContent : '';
    
    // Non-blocking: Keep current view while syncing
    if (btn) {
        btn.disabled = true;
        btn.querySelector('i').classList.add('fa-spin');
    }

    try {
        const response = await fetch(`${API_BASE}/aggregate?full=${isFull}`, { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            startStatusPolling(btn, originalText);
        } else {
            console.error('Failed to start aggregation:', data.message);
            if (btn) {
                btn.disabled = false;
                btn.querySelector('i').classList.remove('fa-spin');
            }
        }
    } catch (error) {
        console.error('Error triggering aggregation:', error);
        if (btn) {
            btn.disabled = false;
            btn.querySelector('i').classList.remove('fa-spin');
        }
    }
}

function startStatusPolling(btn, originalText) {
    if (statusPollingInterval) clearInterval(statusPollingInterval);
    
    const syncBar = document.getElementById('syncStatusBar');
    const syncText = document.getElementById('syncStatusText');
    const syncProgress = document.getElementById('syncProgressBar');
    
    if (syncBar) syncBar.style.display = 'block';
    
    statusPollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/aggregation-status`);
            const data = await response.json();

            // Also check debug stats for deep diagnosis
            try {
                const debugResponse = await fetch(`/api/debug/stats`);
                const debugData = await debugResponse.json();
                if (debugData.success) {
                    console.log('DEBUG STATS:', debugData);
                    // Auto-trigger if empty
                    if (debugData.db.newsCount === 0 && !data.status.inProgress) {
                        console.warn('Database is empty. Re-triggering sync...');
                        triggerAggregation(true);
                    }
                }
            } catch (e) {
                // Ignore debug stats error to not break main flow
            }
            
            if (data.success && data.status.inProgress) {
                const status = data.status;
                const progress = Math.round((status.completedCompanies.length / status.totalCompanies) * 100);
                
                // Enhanced feedback: count of companies
                const count = status.completedCompanies.length;
                const total = status.totalCompanies || 18;
                
                if (syncText) syncText.textContent = `Syncing: ${count}/${total} [${status.currentCompany || '...'}] ${progress}%`;
                if (syncProgress) {
                    syncProgress.style.width = `${progress}%`;
                    syncProgress.setAttribute('aria-valuenow', progress);
                }
                
                // FORCE STREAMING: Load news every 2 seconds during sync
                // We pass true for isSilent to avoid clearing the list/showing loaders
                await loadNews(false, true);
            } else {
                clearInterval(statusPollingInterval);
                statusPollingInterval = null;
                
                if (syncBar) {
                    if (syncText) syncText.textContent = 'Sync complete! Finalizing...';
                    setTimeout(() => {
                        syncBar.style.display = 'none';
                        if (btn) {
                            btn.disabled = false;
                            btn.querySelector('i').classList.remove('fa-spin');
                        }
                    }, 1000);
                }
                
                // Final update: ensure we load with current filters
                await loadNews(false, false); 
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 2000); // Higher frequency for better streaming feel
}

async function loadNews(isExplicitRefresh = false, isSilent = false) {
    if (!isSilent) showLoading(true);
    try {
        const category = document.getElementById('categoryFilter').value;
        const source = document.getElementById('sourceFilter').value;
        const search = document.getElementById('searchInput').value;
        
        if (isExplicitRefresh) {
            await triggerAggregation(false);
            return;
        }

        // Optimized limit for faster initial load
        let url = `${API_BASE}?limit=1500`; 
        
        // Time Filter
        if (activeTimeRange) {
            const startDate = new Date(activeTimeRange);
            const isoDate = startDate.toISOString().replace('Z', '');
            url += `&startDate=${encodeURIComponent(isoDate)}`;
        }
        
        // Dynamic Filter parameters
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (source) url += `&source=${encodeURIComponent(source)}`;
        if (selectedCompanies.length > 0) url += `&companies=${selectedCompanies.join(',')}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        console.log(`Loading news [Source: ${source || 'All'}, Range: ${activeTimeRange || 'All'}]`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            allNews = data.data || [];
            renderNews();
            if (allNews.length === 0 && !isSilent) {
                showEmptyState(true);
            } else {
                showEmptyState(false);
            }
        }
    } catch (error) {
        console.error('Error loading news:', error);
        if (!isSilent) showEmptyState(true);
    } finally {
        if (!isSilent) showLoading(false);
    }
}
