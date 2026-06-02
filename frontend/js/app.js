const API_BASE = '/api/news';
const SELECTED_COMPANIES_KEY = 'selectedCompanies';
let allNews = [];
let availableCompanies = [];
let selectedCompanies = [];

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
    console.log('Initializing MarketFeed Optimized...');
    
    setupDateConstraints();
    
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
        document.getElementById('themeToggle').textContent = '☀️';
    }
});

function setupDateConstraints() {
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    startDateInput.min = '2020-01-01';
    startDateInput.max = today;
    endDateInput.min = '2020-01-01';
    endDateInput.max = today;
    endDateInput.value = today;
}

async function loadCompanies() {
    try {
        const response = await fetch(`${API_BASE}/companies`);
        const data = await response.json();
        if (data.success) {
            availableCompanies = data.data;
            renderCompanyGrid();
            updateStats();
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

/**
 * Enhanced Logo Fetching Logic
 * 1. Primary: Clearbit (High quality)
 * 2. Secondary: Google Favicon (Very fast & reliable)
 * 3. Fallback: UI Avatars (Instant, never fails)
 */
function getLogoUrl(companyName, type = 'primary') {
    const domain = companyDomains[companyName];
    
    if (type === 'primary' && domain) {
        return `https://logo.clearbit.com/${domain}?size=128`;
    }
    
    if (type === 'secondary' && domain) {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }
    
    // Final fallback: UI Avatars
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=f1f5f9&color=6366f1&size=128&bold=true`;
}

// Global function for img onerror to handle fallbacks
window.handleLogoError = function(img, companyName) {
    const currentSrc = img.src;
    const domain = companyDomains[companyName];
    
    if (currentSrc.includes('clearbit.com') && domain) {
        // Switch to Google Favicon
        img.src = getLogoUrl(companyName, 'secondary');
    } else if (!currentSrc.includes('ui-avatars.com')) {
        // Switch to UI Avatars
        img.src = getLogoUrl(companyName, 'fallback');
    }
};

function renderCompanyGrid() {
    const container = document.getElementById('companyFilters');
    container.innerHTML = '';
    
    availableCompanies.forEach(company => {
        const isSelected = selectedCompanies.includes(company.name);
        const item = document.createElement('div');
        item.className = `company-item ${isSelected ? 'selected' : ''}`;
        item.dataset.company = company.name;
        
        item.innerHTML = `
            <img src="${getLogoUrl(company.name)}" 
                 alt="${company.name}" 
                 loading="lazy"
                 onerror="handleLogoError(this, '${company.name}')">
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
    if (count === 0) {
        label.textContent = 'Select Companies';
    } else if (count === availableCompanies.length) {
        label.textContent = 'All Companies Selected';
    } else {
        label.textContent = `${count} Selected`;
    }
}

async function loadNews(isExplicitRefresh = false) {
    showLoading(true);
    try {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        const category = document.getElementById('categoryFilter').value;
        const source = document.getElementById('sourceFilter').value;
        const search = document.getElementById('searchInput').value;
        
        // If it's an explicit refresh, we trigger the background aggregation first
        if (isExplicitRefresh) {
            console.log('Triggering contextual background aggregation...');
            // We can pass current filters to the backend to optimize the crawl (future enhancement)
            await fetch(`${API_BASE}/aggregate`, { method: 'POST' });
            // Wait a bit for the background process to start finding things
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        let url = `${API_BASE}?limit=1000`;
        
        // Default View: If no filters are set, only show news from today
        if (!start && !end && !category && !source && !search && selectedCompanies.length === 0) {
            const today = new Date().toISOString().split('T')[0];
            url += `&startDate=${today}`;
        } else {
            if (start) url += `&startDate=${start}`;
            if (end) url += `&endDate=${end}`;
            if (category) url += `&category=${category}`;
            if (source) url += `&source=${encodeURIComponent(source)}`;
            if (selectedCompanies.length > 0) url += `&companies=${selectedCompanies.join(',')}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
            allNews = data.data || [];
            renderNews(true);
            document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
        }
    } catch (error) {
        console.error('Error loading news:', error);
        showError('Failed to load news.');
    } finally {
        showLoading(false);
    }
}

function renderNews(isExplicitApply = false) {
    const newsList = document.getElementById('newsList');
    const emptyState = document.getElementById('emptyState');
    
    let filteredNews = allNews;

    // Company Filter
    if (selectedCompanies.length > 0) {
        filteredNews = filteredNews.filter(news => selectedCompanies.includes(news.company));
    }

    // Date Filter
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    if (start) filteredNews = filteredNews.filter(n => new Date(n.publishedAt) >= new Date(start));
    if (end) {
        const endDateObj = new Date(end);
        endDateObj.setHours(23, 59, 59, 999);
        filteredNews = filteredNews.filter(n => new Date(n.publishedAt) <= endDateObj);
    }

    // Category Filter
    const selectedCategory = document.getElementById('categoryFilter').value;
    if (selectedCategory) {
        filteredNews = filteredNews.filter(n => n.category === selectedCategory);
    }

    // Source Filter
    const selectedSource = document.getElementById('sourceFilter').value;
    if (selectedSource) {
        filteredNews = filteredNews.filter(n => n.source === selectedSource);
    }

    // Search Filter
    const search = document.getElementById('searchInput').value.toLowerCase();
    if (search) {
        filteredNews = filteredNews.filter(n => 
            n.title.toLowerCase().includes(search) || 
            (n.description && n.description.toLowerCase().includes(search))
        );
    }

    // Sorting: Newest first
    filteredNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // If too many news (e.g. > 100) and not searching, prioritize Strategic Insights
    if (filteredNews.length > 100 && !search && !selectedCategory && isExplicitApply) {
        const strategic = filteredNews.filter(n => n.category === 'Strategic Insights');
        const others = filteredNews.filter(n => n.category !== 'Strategic Insights');
        // Show all strategic first, then others
        filteredNews = [...strategic, ...others];
    }

    if (filteredNews.length === 0) {
        newsList.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        newsList.innerHTML = filteredNews.map(article => createNewsCard(article)).join('');
        
        document.querySelectorAll('.news-card').forEach(card => {
            card.addEventListener('click', () => {
                showArticleModal(JSON.parse(card.dataset.article));
            });
        });
    }
    
    updateStats(filteredNews.length);
    updateSelectionLabel();
}

function createNewsCard(article) {
    const date = formatDate(article.publishedAt);
    const logoUrl = getLogoUrl(article.company);
    const isStrategic = article.category === 'Strategic Insights';
    const categoryBadgeClass = isStrategic ? 'badge-strategic' : 'badge-category';
    
    return `
        <div class="news-card ${isStrategic ? 'strategic' : ''}" data-article='${JSON.stringify(article).replace(/'/g, "&apos;")}'>
            <div class="news-card-image-container">
                <img src="${logoUrl}" 
                     alt="${article.company}" 
                     class="news-card-logo" 
                     loading="lazy"
                     onerror="handleLogoError(this, '${article.company}')">
            </div>
            <div class="news-card-content">
                <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
                <p class="news-card-description">${escapeHtml(article.description || 'No description available')}</p>
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
        <div style="text-align: center; margin-bottom: 1.5rem; background: #ffffff; padding: 2rem; border-radius: 16px; border: 1px solid var(--border);">
            <img src="${logoUrl}" 
                 alt="${article.company}" 
                 style="max-width: 160px; height: 80px; object-fit: contain;"
                 onerror="handleLogoError(this, '${article.company}')">
        </div>
        <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">${escapeHtml(article.title)}</h2>
        <div class="news-card-meta" style="margin-bottom: 1.5rem;">
            <span class="badge badge-company">${article.company}</span>
            <span class="badge badge-source">${article.source}</span>
            <span class="news-card-date">${formatDate(article.publishedAt)}</span>
        </div>
        <p style="font-size: 1rem; line-height: 1.6; color: var(--text-main);">${escapeHtml(article.description || 'No description available')}</p>
        <div style="margin-top: 2rem;">
            <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="text-decoration: none; display: block; text-align: center;">Read Full Article →</a>
        </div>
    `;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function setupEventListeners() {
    const selectorModal = document.getElementById('companySelectorModal');
    const articleModal = document.getElementById('articleModal');

    document.getElementById('openCompanySelector').addEventListener('click', () => {
        document.querySelectorAll('.company-item').forEach(item => {
            if (selectedCompanies.includes(item.dataset.company)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        selectorModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });

    document.getElementById('closeSelector').addEventListener('click', () => {
        selectorModal.style.display = 'none';
        document.body.style.overflow = '';
    });

    document.getElementById('applySelectorBtn').addEventListener('click', () => {
        const selected = Array.from(document.querySelectorAll('.company-item.selected')).map(item => item.dataset.company);
        selectedCompanies = selected;
        localStorage.setItem(SELECTED_COMPANIES_KEY, JSON.stringify(selectedCompanies));
        selectorModal.style.display = 'none';
        document.body.style.overflow = '';
        renderNews();
    });

    document.getElementById('selectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.company-item').forEach(item => item.classList.add('selected'));
    });

    document.getElementById('deselectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.company-item').forEach(item => item.classList.remove('selected'));
    });

    document.getElementById('refreshBtn').addEventListener('click', () => loadNews(true));
    document.getElementById('searchInput').addEventListener('input', renderNews);
    
    // Explicit Apply Filters for Dates and Category
    document.getElementById('applyFiltersBtn').addEventListener('click', () => loadNews());

    // Quick Time Filters
    document.querySelectorAll('.btn-quick-time').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-quick-time').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const range = btn.dataset.range;
            const now = new Date();
            let start = new Date();

            switch(range) {
                case '3h': start.setHours(now.getHours() - 3); break;
                case '24h': start.setHours(now.getHours() - 24); break;
                case '48h': start.setHours(now.getHours() - 48); break;
                case '1w': start.setDate(now.getDate() - 7); break;
                case '1m': start.setMonth(now.getMonth() - 1); break;
                case '3m': start.setMonth(now.getMonth() - 3); break;
            }

            document.getElementById('startDate').value = start.toISOString().split('T')[0];
            document.getElementById('endDate').value = now.toISOString().split('T')[0];
            loadNews();
        });
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('categoryFilter').value = '';
        document.getElementById('sourceFilter').value = '';
        document.getElementById('searchInput').value = '';
        document.querySelectorAll('.btn-quick-time').forEach(b => b.classList.remove('active'));
        selectedCompanies = [];
        localStorage.removeItem(SELECTED_COMPANIES_KEY);
        loadNews(); // Re-fetch default view from server
        renderCompanyGrid();
    });

    // AI Chat Interaction
    const aiChatToggle = document.getElementById('aiChatToggle');
    const aiChatWindow = document.getElementById('aiChatWindow');
    const closeAiChat = document.getElementById('closeAiChat');
    const aiChatInput = document.getElementById('aiChatInput');
    const sendAiMessage = document.getElementById('sendAiMessage');
    const aiChatMessages = document.getElementById('aiChatMessages');

    aiChatToggle.addEventListener('click', () => {
        aiChatWindow.style.display = aiChatWindow.style.display === 'none' ? 'flex' : 'none';
    });

    closeAiChat.addEventListener('click', () => {
        aiChatWindow.style.display = 'none';
    });

    async function handleAiChat() {
        const query = aiChatInput.value.trim();
        if (!query) return;

        // Add user message
        appendAiMessage('user', query);
        aiChatInput.value = '';

        // Show typing indicator
        const botMsgDiv = appendAiMessage('bot', 'Thinking...');

        try {
            const response = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, context: allNews.slice(0, 20) }) // Send top news as context
            });
            const data = await response.json();
            botMsgDiv.textContent = data.answer || "I'm sorry, I couldn't process that.";
        } catch (error) {
            botMsgDiv.textContent = "Error connecting to AI assistant.";
        }
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }

    sendAiMessage.addEventListener('click', handleAiChat);
    aiChatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleAiChat(); });

    function appendAiMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `ai-message ${role}`;
        msgDiv.textContent = text;
        aiChatMessages.appendChild(msgDiv);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
        return msgDiv;
    }

    // Strategy Report Generation
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportModal = document.getElementById('reportModal');
    const closeReportModal = document.getElementById('closeReportModal');
    const reportContent = document.getElementById('reportContent');

    generateReportBtn.addEventListener('click', async () => {
        reportModal.style.display = 'block';
        reportContent.innerHTML = '<div class="report-loading"><div class="spinner"></div><p>AI is analyzing CSM Strategic Insights and crafting your strategy...</p></div>';
        
        try {
            const strategicNews = allNews.filter(n => n.category === 'Strategic Insights');
            const response = await fetch(`${API_BASE}/ai/strategy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ news: strategicNews })
            });
            const data = await response.json();
            if (data.success) {
                reportContent.innerHTML = `<div class="report-text">${data.report.replace(/\n/g, '<br>')}</div>`;
            } else {
                reportContent.innerHTML = '<p>Failed to generate report. Please try again.</p>';
            }
        } catch (error) {
            reportContent.innerHTML = '<p>Error connecting to strategy engine.</p>';
        }
    });

    closeReportModal.addEventListener('click', () => {
        reportModal.style.display = 'none';
    });

    document.getElementById('downloadReportBtn').addEventListener('click', () => {
        const content = reportContent.innerText;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sinch_Strategy_Report_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
    });

    document.getElementById('themeToggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        articleModal.style.display = 'none';
        document.body.style.overflow = '';
    });

    window.addEventListener('click', (e) => {
        if (e.target === selectorModal) {
            selectorModal.style.display = 'none';
            document.body.style.overflow = '';
        }
        if (e.target === articleModal) {
            articleModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}

function updateStats(filteredCount) {
    document.getElementById('totalArticles').textContent = filteredCount !== undefined ? filteredCount : allNews.length;
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
    document.getElementById('newsList').style.opacity = show ? '0.5' : '1';
}

function showError(message) {
    const emptyState = document.getElementById('emptyState');
    emptyState.querySelector('p').textContent = message;
    emptyState.style.display = 'block';
}
