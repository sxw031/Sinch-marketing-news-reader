const API_BASE = '/api/news';
const SELECTED_COMPANIES_KEY = 'selectedCompanies';
let allNews = [];
let availableCompanies = [];
let selectedCompanies = [];

// Company to Domain mapping for Clearbit Logo API
const companyDomains = {
    'HSBC': 'hsbc.com',
    'Grab': 'grab.com',
    'VGE': 'vgegroup.com',
    'Cathay Pacific': 'cathaypacific.com',
    'Alibaba': 'alibaba.com',
    'Charter Bank': 'standardchartered.com',
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
    console.log('Initializing MarketFeed Mobile Optimized...');
    
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

function getLogoUrl(companyName) {
    const domain = companyDomains[companyName];
    if (domain) {
        // Use a more robust combination of logo services
        return `https://logo.clearbit.com/${domain}?size=200`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=f1f5f9&color=6366f1&size=128&bold=true`;
}

function renderCompanyGrid() {
    const container = document.getElementById('companyFilters');
    container.innerHTML = '';
    
    availableCompanies.forEach(company => {
        const isSelected = selectedCompanies.includes(company.name);
        const item = document.createElement('div');
        item.className = `company-item ${isSelected ? 'selected' : ''}`;
        item.dataset.company = company.name;
        
        item.innerHTML = `
            <img src="${getLogoUrl(company.name)}" alt="${company.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=random'">
            <span>${company.name}</span>
        `;
        
        // Use click for better compatibility, style handles active state
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

async function loadNews() {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}?limit=400`);
        const data = await response.json();
        if (data.success) {
            allNews = data.data || [];
            renderNews();
        }
    } catch (error) {
        console.error('Error loading news:', error);
        showError('Failed to load news.');
    } finally {
        showLoading(false);
    }
}

function renderNews() {
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

    // Search Filter
    const search = document.getElementById('searchInput').value.toLowerCase();
    if (search) {
        filteredNews = filteredNews.filter(n => 
            n.title.toLowerCase().includes(search) || 
            (n.description && n.description.toLowerCase().includes(search))
        );
    }

    filteredNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

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
                <img src="${logoUrl}" alt="${article.company}" class="news-card-logo" onerror="this.src='https://via.placeholder.com/100?text=${encodeURIComponent(article.company)}'">
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
        <div style="text-align: center; margin-bottom: 1.5rem; background: #f1f5f9; padding: 2rem; border-radius: 16px;">
            <img src="${logoUrl}" alt="${article.company}" style="max-width: 160px; height: 80px; object-fit: contain;">
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
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function setupEventListeners() {
    const selectorModal = document.getElementById('companySelectorModal');
    const articleModal = document.getElementById('articleModal');

    // Company Selector
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

    // Filtering & Refresh
    document.getElementById('refreshBtn').addEventListener('click', loadNews);
    document.getElementById('searchInput').addEventListener('input', renderNews);
    document.getElementById('startDate').addEventListener('change', renderNews);
    document.getElementById('endDate').addEventListener('change', renderNews);
    document.getElementById('categoryFilter').addEventListener('change', renderNews);
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('categoryFilter').value = '';
        document.getElementById('searchInput').value = '';
        selectedCompanies = [];
        localStorage.removeItem(SELECTED_COMPANIES_KEY);
        renderNews();
        renderCompanyGrid();
    });

    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
    });

    // Modal Closing
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
