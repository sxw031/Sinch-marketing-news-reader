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

    // Set default time range to 24h on initial load
    const now = new Date();
    const start = new Date();
    start.setHours(now.getHours() - 24);
    activeTimeRange = start.toISOString();

    await loadCompanies();
    await loadNews();
    
    // Highlight the 24h button by default
    const defaultTimeBtn = document.querySelector('.btn-quick-time[data-range="24h"]');
    if (defaultTimeBtn) defaultTimeBtn.classList.add('active');
    
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

    document.getElementById('refreshBtn').addEventListener('click', () => triggerAggregation(false));
    document.getElementById('fetchAllBtn').addEventListener('click', () => triggerAggregation(true));
    document.getElementById('applyFiltersBtn').addEventListener('click', () => loadNews());
    document.getElementById('searchInput').addEventListener('keypress', (e) => { if(e.key === 'Enter') loadNews(); });

    // Logo click to reset everything and show all with default 24h filter
    document.querySelector('.logo').addEventListener('click', (e) => {
        e.preventDefault();
        selectedCompanies = [];
        
        // Reset to default 24h range
        const now = new Date();
        const start = new Date();
        start.setHours(now.getHours() - 24);
        activeTimeRange = start.toISOString();
        
        document.getElementById('categoryFilter').value = '';
        document.getElementById('sourceFilter').value = '';
        document.getElementById('searchInput').value = '';
        
        document.querySelectorAll('.btn-quick-time').forEach(b => b.classList.remove('active'));
        const defaultTimeBtn = document.querySelector('.btn-quick-time[data-range="24h"]');
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
            
            if (data.success && data.status.inProgress) {
                const status = data.status;
                const progress = Math.round((status.completedCompanies.length / status.totalCompanies) * 100);
                
                if (syncText) syncText.textContent = `Syncing: ${status.currentCompany || 'Initializing...'} (${progress}%)`;
                if (syncProgress) syncProgress.style.width = `${progress}%`;
                
                // Silent background update
                await loadNews(false, true);
            } else {
                clearInterval(statusPollingInterval);
                statusPollingInterval = null;
                
                if (syncBar) syncBar.style.display = 'none';
                if (btn) {
                    btn.disabled = false;
                    btn.querySelector('i').classList.remove('fa-spin');
                }
                await loadNews(false, false); // Final update
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 3000); // Poll every 3s to save resources on Render Free
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

        let url = `${API_BASE}?limit=2000`; // Increased limit for full historical view
        
        // Precise Time Filtering: Always ensure we use the selected time range
        if (activeTimeRange) {
            // Convert to local ISO string for backend comparison
            const startDate = new Date(activeTimeRange);
            const isoDate = startDate.toISOString().replace('Z', '');
            url += `&startDate=${encodeURIComponent(isoDate)}`;
        }
        
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (source) url += `&source=${encodeURIComponent(source)}`;
        if (selectedCompanies.length > 0) url += `&companies=${selectedCompanies.join(',')}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        console.log('Fetching insights for range:', activeTimeRange);
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            allNews = data.data || [];
            renderNews();
        }
    } catch (error) {
        console.error('Error loading news:', error);
        if (!isSilent) showEmptyState(true);
    } finally {
        if (!isSilent) showLoading(false);
    }
}
