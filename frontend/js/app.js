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
    'PDD': 'pinduoduo.com',
    'DBS': 'dbs.com',
    'Tencent': 'tencent.com',
    'Bank of China': 'boc.cn',
    'ByteDance': 'bytedance.com',
    'Gojek': 'gojek.com',
    'Citigroup': 'citigroup.com',
    'Government of Singapore': 'gov.sg',
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

    await loadCompanies();
    await loadNews();
    
    setupEventListeners();
    
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
    const domain = companyDomains[companyName];
    if (type === 'primary' && domain) return `https://logo.clearbit.com/${domain}?size=128`;
    if (type === 'secondary' && domain) return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=f1f5f9&color=6366f1&size=128&bold=true`;
}

window.handleLogoError = function(img, companyName) {
    const currentSrc = img.src;
    const domain = companyDomains[companyName];
    if (currentSrc.includes('clearbit.com') && domain) {
        img.src = getLogoUrl(companyName, 'secondary');
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
        
        // Use activeTimeRange if set by quick filters
        if (activeTimeRange) {
            url += `&startDate=${activeTimeRange}`;
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
        loadNews();
    });

    document.getElementById('selectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.company-item').forEach(item => item.classList.add('selected'));
    });

    document.getElementById('deselectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.company-item').forEach(item => item.classList.remove('selected'));
    });

    document.getElementById('refreshBtn').addEventListener('click', () => loadNews(true));
    document.getElementById('applyFiltersBtn').addEventListener('click', () => loadNews());
    document.getElementById('searchInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') loadNews(); });

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
                reportContent.innerHTML = `<div style="white-space: pre-wrap; font-size: 1.05rem; line-height: 1.8;">${data.report}</div>`;
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
    if (!dateString) return 'Recent';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
