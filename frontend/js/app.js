const API_BASE = '/api/news';
const SELECTED_COMPANIES_KEY = 'selectedCompanies';
let allNews = [];
let availableCompanies = [];
let selectedCompanies = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing MarketFeed...');
    
    // Set date constraints
    setupDateConstraints();
    
    // Load data
    await loadCompanies();
    await loadNews();
    
    // UI interactions
    setupEventListeners();
    loadSelectedCompanies();
    
    // Dark mode check
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').textContent = '☀️';
    }
});

function setupDateConstraints() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    const today = new Date().toISOString().split('T')[0];
    const minDate = '2020-01-01';
    
    startDateInput.min = minDate;
    startDateInput.max = today;
    endDateInput.min = minDate;
    endDateInput.max = today;
    
    // Default to show recent news
    endDateInput.value = today;
}

async function loadCompanies() {
    try {
        const response = await fetch(`${API_BASE}/companies`);
        const data = await response.json();
        if (data.success) {
            availableCompanies = data.data;
            renderCompanyFilters();
            updateStats();
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

function renderCompanyFilters() {
    const container = document.getElementById('companyFilters');
    container.innerHTML = '';
    
    availableCompanies.forEach(company => {
        const div = document.createElement('div');
        div.className = 'company-filter';
        div.innerHTML = `
            <input type="checkbox" id="company-${company.id}" value="${company.name}" ${selectedCompanies.includes(company.name) ? 'checked' : ''}>
            <label for="company-${company.id}">${company.name}</label>
        `;
        
        // Add click event to the whole div for better UX
        div.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = div.querySelector('input');
                checkbox.checked = !checkbox.checked;
                // Trigger change manually
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        container.appendChild(div);
    });
}

async function loadNews() {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}?limit=300`);
        const data = await response.json();
        if (data.success) {
            allNews = data.data || [];
            renderNews();
        }
    } catch (error) {
        console.error('Error loading news:', error);
        showError('Failed to load news. Please try again.');
    } finally {
        showLoading(false);
    }
}

function renderNews() {
    const newsList = document.getElementById('newsList');
    const emptyState = document.getElementById('emptyState');
    
    let filteredNews = allNews;

    // Filter by Company
    const checkedCompanies = getSelectedCompanies();
    if (checkedCompanies.length > 0) {
        filteredNews = filteredNews.filter(news => checkedCompanies.includes(news.company));
        document.getElementById('companyDropdownBtn').querySelector('span').textContent = 
            checkedCompanies.length === 1 ? checkedCompanies[0] : `${checkedCompanies.length} Companies Selected`;
    } else {
        document.getElementById('companyDropdownBtn').querySelector('span').textContent = 'Select Companies';
    }

    // Filter by Date
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate) {
        filteredNews = filteredNews.filter(news => new Date(news.publishedAt) >= new Date(startDate));
    }
    if (endDate) {
        // Add 23:59:59 to end date to include all news from that day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filteredNews = filteredNews.filter(news => new Date(news.publishedAt) <= end);
    }

    // Filter by Search
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filteredNews = filteredNews.filter(news => 
            news.title.toLowerCase().includes(searchTerm) || 
            (news.description && news.description.toLowerCase().includes(searchTerm))
        );
    }

    // Sort by Date Descending
    filteredNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    if (filteredNews.length === 0) {
        newsList.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        newsList.innerHTML = filteredNews.map(article => createNewsCard(article)).join('');
        
        // Add click events to cards
        document.querySelectorAll('.news-card').forEach(card => {
            card.addEventListener('click', () => {
                const article = JSON.parse(card.dataset.article);
                showArticleModal(article);
            });
        });
    }
    
    updateStats(filteredNews.length);
}

function createNewsCard(article) {
    const date = formatDate(article.publishedAt);
    const imageUrl = article.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(article.company)}&background=random&size=200`;
    
    return `
        <div class="news-card" data-article='${JSON.stringify(article).replace(/'/g, "&apos;")}'>
            <img src="${imageUrl}" alt="${article.title}" class="news-card-image" onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
            <div class="news-card-content">
                <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
                <p class="news-card-description">${escapeHtml(article.description || 'No description available')}</p>
                <div class="news-card-meta">
                    <span class="badge badge-company">${article.company}</span>
                    <span class="badge badge-source">${article.source}</span>
                    <span class="news-card-date">${date}</span>
                </div>
            </div>
        </div>
    `;
}

function showArticleModal(article) {
    const modal = document.getElementById('articleModal');
    const modalBody = document.getElementById('modalBody');
    
    const imageUrl = article.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(article.company)}&background=random&size=400`;
    
    modalBody.innerHTML = `
        <img src="${imageUrl}" alt="${article.title}" onerror="this.style.display='none'">
        <h2>${escapeHtml(article.title)}</h2>
        <div class="news-card-meta" style="margin-bottom: 1.5rem;">
            <span class="badge badge-company">${article.company}</span>
            <span class="badge badge-source">${article.source}</span>
            <span class="badge badge-category">${article.category || 'General'}</span>
            <span class="news-card-date">${formatDate(article.publishedAt)}</span>
        </div>
        <p>${escapeHtml(article.description || 'No description available')}</p>
        <div style="margin-top: 2rem;">
            <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; color: white; display: inline-block;">Read Full Article →</a>
        </div>
    `;
    modal.style.display = 'block';
}

function setupEventListeners() {
    // Refresh
    document.getElementById('refreshBtn').addEventListener('click', loadNews);
    
    // Search
    document.getElementById('searchInput').addEventListener('input', renderNews);
    
    // Dates
    document.getElementById('startDate').addEventListener('change', renderNews);
    document.getElementById('endDate').addEventListener('change', renderNews);
    
    // Reset
    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('searchInput').value = '';
        document.querySelectorAll('.company-filter input').forEach(cb => cb.checked = false);
        selectedCompanies = [];
        localStorage.removeItem(SELECTED_COMPANIES_KEY);
        renderNews();
    });

    // Company Checkboxes
    document.addEventListener('change', (e) => {
        if (e.target.closest('.company-filter')) {
            saveSelectedCompanies();
            renderNews();
        }
    });

    // Theme Toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        document.getElementById('themeToggle').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });

    // Modal Close
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('articleModal').style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('articleModal')) {
            document.getElementById('articleModal').style.display = 'none';
        }
    });
}

function getSelectedCompanies() {
    const checkboxes = document.querySelectorAll('.company-filter input:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function saveSelectedCompanies() {
    selectedCompanies = getSelectedCompanies();
    localStorage.setItem(SELECTED_COMPANIES_KEY, JSON.stringify(selectedCompanies));
}

function loadSelectedCompanies() {
    const saved = localStorage.getItem(SELECTED_COMPANIES_KEY);
    if (saved) {
        selectedCompanies = JSON.parse(saved);
        renderCompanyFilters();
    }
}

function updateStats(filteredCount) {
    document.getElementById('totalArticles').textContent = filteredCount !== undefined ? filteredCount : allNews.length;
    document.getElementById('totalCompanies').textContent = availableCompanies.length;
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
