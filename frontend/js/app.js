const API_BASE = '/api/news';
const SELECTED_COMPANIES_KEY = 'mf_companies';

let allNews = [];
let availableCompanies = [];
let selectedCompanies = JSON.parse(localStorage.getItem(SELECTED_COMPANIES_KEY) || '[]');
let activeTimeRange = null;
let currentSort = 'latest'; // 'latest' or 'relevance'
let pollingTimer = null;

// Logo URLs - reliable sources for each company
const LOGO_MAP = {
  'HSBC': 'https://logo.clearbit.com/hsbc.com',
  'Grab': 'https://logo.clearbit.com/grab.com',
  'Vodafone': 'https://logo.clearbit.com/vodafone.com',
  'Cathay Pacific': 'https://logo.clearbit.com/cathaypacific.com',
  'Alibaba': 'https://logo.clearbit.com/alibaba.com',
  'Standard Chartered': 'https://logo.clearbit.com/sc.com',
  'Temu': 'https://logo.clearbit.com/temu.com',
  'Ctrip': 'https://logo.clearbit.com/trip.com',
  'Didi': 'https://logo.clearbit.com/didiglobal.com',
  'DBS': 'https://logo.clearbit.com/dbs.com',
  'Tencent': 'https://logo.clearbit.com/tencent.com',
  'Bank of China': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Bank_of_China_logo.svg/200px-Bank_of_China_logo.svg.png',
  'ByteDance': 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a0/ByteDance_logo_English.svg/200px-ByteDance_logo_English.svg.png',
  'Gojek': 'https://logo.clearbit.com/gojek.com',
  'Citigroup': 'https://logo.clearbit.com/citigroup.com',
  'Binance': 'https://logo.clearbit.com/binance.com',
  'ShopBack': 'https://logo.clearbit.com/shopback.com',
  'Aeon Credit': 'https://logo.clearbit.com/aeoncredit.com.my'
};

// Sinch relevance keywords for sorting
const SINCH_KEYWORDS = [
  'messaging', 'sms', 'communication', 'api', 'cpaas', 'cloud', 'digital transformation',
  'customer engagement', 'notification', 'verification', 'otp', 'rcs', 'whatsapp',
  'chatbot', 'omnichannel', 'mobile', 'fintech', 'payment', 'authentication',
  'enterprise', 'saas', 'platform', 'integration', 'partner', 'expansion',
  'acquisition', 'revenue', 'growth', 'strategy', 'market', 'launch'
];

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', async () => {
  // Default: show last 24 hours
  const now = new Date();
  now.setHours(now.getHours() - 24);
  activeTimeRange = now.toISOString();

  await loadCompanies();
  await loadNews();
  setupEventListeners();

  // Theme
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = 'fas fa-sun';
  }
});

// ==================== DATA LOADING ====================
async function loadCompanies() {
  try {
    const res = await fetch(`${API_BASE}/companies`);
    const data = await res.json();
    if (data.success) {
      availableCompanies = data.data;
      renderCompanyGrid();
    }
  } catch (e) { console.error('loadCompanies:', e); }
}

async function loadNews(silent = false) {
  if (!silent) showLoading(true);
  try {
    let url = `${API_BASE}?limit=300`;
    if (activeTimeRange) url += `&startDate=${encodeURIComponent(activeTimeRange)}`;

    const category = document.getElementById('categoryFilter').value;
    const source = document.getElementById('sourceFilter').value;
    const search = document.getElementById('searchInput').value.trim();

    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (source) url += `&source=${encodeURIComponent(source)}`;
    if (selectedCompanies.length > 0) url += `&companies=${selectedCompanies.join(',')}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      allNews = data.data || [];
      sortAndRender();
    }
  } catch (e) {
    console.error('loadNews:', e);
    if (!silent) showEmptyState(true);
  } finally {
    if (!silent) showLoading(false);
  }
}

// ==================== SORTING ====================
function calculateSinchRelevance(article) {
  let score = 0;
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  SINCH_KEYWORDS.forEach(kw => {
    if (text.includes(kw)) score += 2;
  });
  if (article.category === 'Strategic Insights') score += 5;
  // Boost companies with higher Sinch relevance
  const highRelevance = ['Grab', 'DBS', 'Vodafone', 'HSBC', 'Standard Chartered', 'Tencent', 'Alibaba'];
  if (highRelevance.includes(article.company)) score += 3;
  return score;
}

function sortAndRender() {
  if (currentSort === 'relevance') {
    allNews.sort((a, b) => calculateSinchRelevance(b) - calculateSinchRelevance(a));
  } else {
    allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
  renderNews();
}

// ==================== AGGREGATION & PROGRESS ====================
async function triggerAggregation() {
  showSyncBar(true, 'Starting sync...', 0);
  try {
    await fetch(`${API_BASE}/aggregate`, { method: 'POST' });
    startPolling();
  } catch (e) {
    console.error('triggerAggregation:', e);
    showSyncBar(true, 'Sync failed - retrying...', 0);
    setTimeout(() => showSyncBar(false), 3000);
  }
}

function startPolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/aggregation-status`);
      const data = await res.json();
      if (data.success && data.status.inProgress) {
        const s = data.status;
        const done = s.completedCompanies.length;
        const total = s.totalCompanies || 18;
        const pct = Math.round((done / total) * 100);
        showSyncBar(true, `Syncing: ${done}/${total} [${s.currentCompany || '...'}]`, pct);
        // Refresh news every other poll
        if (done % 2 === 0) await loadNews(true);
      } else {
        showSyncBar(true, 'Sync complete!', 100);
        setTimeout(() => showSyncBar(false), 2500);
        clearInterval(pollingTimer);
        pollingTimer = null;
        await loadNews(false);
      }
    } catch (e) { console.error('polling:', e); }
  }, 2500);
}

function showSyncBar(show, text, pct) {
  const bar = document.getElementById('syncStatusBar');
  const textEl = document.getElementById('syncStatusText');
  const progressEl = document.getElementById('syncProgressBar');
  if (bar) bar.style.display = show ? 'block' : 'none';
  if (textEl && text) textEl.textContent = `${text} ${pct !== undefined ? '(' + pct + '%)' : ''}`;
  if (progressEl && pct !== undefined) progressEl.style.width = `${pct}%`;
}

// ==================== RENDERING ====================
function renderNews() {
  const list = document.getElementById('newsList');
  if (allNews.length === 0) { showEmptyState(true); return; }
  showEmptyState(false);
  list.innerHTML = allNews.map(a => createCard(a)).join('');
  list.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => showArticleModal(JSON.parse(card.dataset.article)));
  });
}

function createCard(article) {
  const logo = getLogoUrl(article.company);
  const date = formatRelativeTime(article.publishedAt);
  const isStrategic = article.category === 'Strategic Insights';
  const relevanceScore = calculateSinchRelevance(article);
  const relevanceDot = relevanceScore >= 8 ? '<span class="relevance-dot high" title="High Sinch relevance"></span>' :
                       relevanceScore >= 4 ? '<span class="relevance-dot medium" title="Medium Sinch relevance"></span>' : '';
  return `
    <div class="news-card ${isStrategic ? 'strategic' : ''}" data-article='${JSON.stringify(article).replace(/'/g, "&#39;")}'>
      <div class="news-card-image-container">
        <img src="${logo}" alt="${article.company}" class="news-card-logo" loading="lazy" onerror="handleLogoError(this,'${article.company}')">
      </div>
      <div class="news-card-content">
        <h3 class="news-card-title">${relevanceDot}${esc(article.title)}</h3>
        <p class="news-card-description">${esc(article.description || '')}</p>
        <div class="news-card-meta">
          <span class="badge badge-company">${article.company}</span>
          <span class="badge badge-source">${article.source || 'Web'}</span>
          <span class="badge ${isStrategic ? 'badge-strategic' : 'badge-category'}">${article.category || 'General'}</span>
          <span class="news-card-date">${date}</span>
        </div>
      </div>
    </div>`;
}

function showArticleModal(article) {
  const modal = document.getElementById('articleModal');
  const body = document.getElementById('modalBody');
  const logo = getLogoUrl(article.company);
  body.innerHTML = `
    <div style="text-align:center;margin-bottom:1.5rem;background:var(--bg-secondary);padding:1.5rem;border-radius:12px;">
      <img src="${logo}" alt="${article.company}" style="max-width:140px;height:70px;object-fit:contain;" onerror="handleLogoError(this,'${article.company}')">
    </div>
    <h2 style="font-size:1.4rem;margin-bottom:0.75rem;font-weight:800;line-height:1.3;">${esc(article.title)}</h2>
    <div class="news-card-meta" style="margin-bottom:1.25rem;">
      <span class="badge badge-company">${article.company}</span>
      <span class="badge badge-source">${article.source}</span>
      <span class="badge badge-category">${article.category}</span>
      <span class="news-card-date">${formatRelativeTime(article.publishedAt)}</span>
    </div>
    <p style="font-size:1rem;line-height:1.7;color:var(--text-main);margin-bottom:1.5rem;">${esc(article.description || 'No description available')}</p>
    <div style="display:flex;justify-content:center;">
      <a href="${article.url}" target="_blank" rel="noopener" class="btn-source-link">
        View Original Source <i class="fas fa-external-link-alt"></i>
      </a>
    </div>`;
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

// ==================== YEARLY SUMMARY ====================
async function showYearlySummary(year) {
  const modal = document.getElementById('yearlySummaryModal');
  const title = document.getElementById('yearlySummaryTitle');
  const content = document.getElementById('yearlySummaryContent');

  title.textContent = year === 2026 ? `2026 Year-to-Date (as of ${new Date().toLocaleDateString('en-US', {month:'short', day:'numeric'})})` : `${year} Major Events Summary`;
  content.innerHTML = '<div style="text-align:center;padding:3rem;"><div class="spinner"></div><p>Loading summary...</p></div>';
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';

  try {
    const res = await fetch(`${API_BASE}/yearly-summary/${year}`);
    const data = await res.json();
    if (data.success) {
      content.innerHTML = renderYearlySummary(data.data, year);
    } else {
      content.innerHTML = '<p style="text-align:center;padding:2rem;">Failed to load summary.</p>';
    }
  } catch (e) {
    content.innerHTML = '<p style="text-align:center;padding:2rem;">Error loading summary.</p>';
  }
}

function renderYearlySummary(companies, year) {
  let html = `<div class="yearly-summary">`;
  const dateLabel = companies[0]?.dateLabel || `Full Year ${year}`;
  html += `<div class="yearly-header"><h2>${year} Strategic Events</h2>
    <p>${dateLabel} | ${companies.length} tracked accounts</p></div>`;

  companies.forEach(c => {
    const relevanceClass = c.sinchRelevance === 'High' ? 'relevance-high' : c.sinchRelevance === 'Medium' ? 'relevance-medium' : 'relevance-low';
    const logo = getLogoUrl(c.company);
    html += `
      <div class="yearly-company-card">
        <div class="yearly-company-header">
          <img src="${logo}" alt="${c.company}" class="yearly-logo" onerror="handleLogoError(this,'${c.company}')">
          <div>
            <h3>${c.company}</h3>
            <span class="badge ${relevanceClass}">Sinch: ${c.sinchRelevance}</span>
          </div>
        </div>
        <ul class="yearly-highlights">
          ${c.highlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
      </div>`;
  });

  html += `</div>`;
  return html;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navRight = document.getElementById('navRight');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      navRight.classList.toggle('mobile-open');
      const icon = mobileToggle.querySelector('i');
      icon.className = navRight.classList.contains('mobile-open') ? 'fas fa-times' : 'fas fa-bars';
    });
  }

  // Refresh & Fetch All
  document.getElementById('refreshBtn').addEventListener('click', () => triggerAggregation());
  document.getElementById('fetchAllBtn').addEventListener('click', () => triggerAggregation());

  // Filters - auto apply on change
  document.getElementById('categoryFilter').addEventListener('change', () => loadNews());
  document.getElementById('sourceFilter').addEventListener('change', () => loadNews());
  document.getElementById('searchInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') loadNews(); });

  // Sort buttons
  document.querySelectorAll('.btn-sort').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSort = btn.dataset.sort;
      sortAndRender();
    });
  });

  // Time range buttons
  document.querySelectorAll('.btn-quick-time').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;

      // Year buttons -> show yearly summary modal
      if (['2023', '2024', '2025', '2026'].includes(range)) {
        showYearlySummary(parseInt(range));
        return;
      }

      // Regular time filter
      document.querySelectorAll('.btn-quick-time:not(.btn-yearly)').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const now = new Date();
      switch (range) {
        case '1h': now.setHours(now.getHours() - 1); break;
        case '6h': now.setHours(now.getHours() - 6); break;
        case '24h': now.setHours(now.getHours() - 24); break;
        case '48h': now.setHours(now.getHours() - 48); break;
        case '72h': now.setHours(now.getHours() - 72); break;
        case '1w': now.setDate(now.getDate() - 7); break;
        case '1m': now.setMonth(now.getMonth() - 1); break;
      }
      activeTimeRange = now.toISOString();
      loadNews();
    });
  });

  // Reset
  document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('sourceFilter').value = '';
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.btn-quick-time').forEach(b => b.classList.remove('active'));
    const btn24h = document.querySelector('.btn-quick-time[data-range="24h"]');
    if (btn24h) btn24h.classList.add('active');
    selectedCompanies = [];
    const now = new Date();
    now.setHours(now.getHours() - 24);
    activeTimeRange = now.toISOString();
    currentSort = 'latest';
    document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active'));
    const latestBtn = document.querySelector('.btn-sort[data-sort="latest"]');
    if (latestBtn) latestBtn.classList.add('active');
    localStorage.removeItem(SELECTED_COMPANIES_KEY);
    renderCompanyGrid();
    loadNews();
  });

  // Logo click -> home
  document.querySelector('.logo').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('resetBtn').click();
  });

  // Company selector
  const selectorModal = document.getElementById('companySelectorModal');
  document.getElementById('openCompanySelector').addEventListener('click', () => {
    selectorModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  });
  document.getElementById('closeSelector').addEventListener('click', () => {
    selectorModal.style.display = 'none';
    document.body.style.overflow = '';
  });
  document.getElementById('applySelectorBtn').addEventListener('click', () => {
    selectedCompanies = Array.from(document.querySelectorAll('.company-item.selected')).map(el => el.dataset.company);
    localStorage.setItem(SELECTED_COMPANIES_KEY, JSON.stringify(selectedCompanies));
    selectorModal.style.display = 'none';
    document.body.style.overflow = '';
    updateSelectionLabel();
    loadNews();
  });
  document.getElementById('selectAllBtn').addEventListener('click', () => {
    document.querySelectorAll('.company-item').forEach(el => el.classList.add('selected'));
  });
  document.getElementById('deselectAllBtn').addEventListener('click', () => {
    document.querySelectorAll('.company-item').forEach(el => el.classList.remove('selected'));
  });

  // ==================== PODCAST ====================
  const podcastBtn = document.getElementById('podcastBtn');
  const podcastPlayer = document.getElementById('podcastPlayer');
  podcastBtn.addEventListener('click', async () => {
    // If already playing, pause
    if (podcastBtn.classList.contains('playing')) {
      podcastPlayer.pause();
      podcastBtn.classList.remove('playing');
      podcastBtn.querySelector('span').textContent = 'Daily Podcast';
      return;
    }
    // Generate podcast
    try {
      podcastBtn.classList.add('loading');
      podcastBtn.querySelector('span').textContent = 'Generating (~20s)...';
      podcastBtn.disabled = true;

      const res = await fetch(`${API_BASE}/podcast`, {
        method: 'GET',
        headers: { 'Accept': 'audio/mpeg, application/json' }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('audio')) {
        const blob = await res.blob();
        if (blob.size < 1000) throw new Error('Audio file too small - generation may have failed');
        podcastPlayer.src = URL.createObjectURL(blob);
        await podcastPlayer.play();
        podcastBtn.classList.remove('loading');
        podcastBtn.classList.add('playing');
        podcastBtn.querySelector('span').textContent = 'Playing...';
        podcastBtn.disabled = false;
        podcastPlayer.onended = () => {
          podcastBtn.classList.remove('playing');
          podcastBtn.querySelector('span').textContent = 'Daily Podcast';
        };
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Unexpected response format');
      }
    } catch (e) {
      console.error('Podcast error:', e);
      podcastBtn.classList.remove('loading');
      podcastBtn.querySelector('span').textContent = 'Daily Podcast';
      podcastBtn.disabled = false;
      alert(`Podcast generation failed: ${e.message}\n\nThis may be due to TTS not being available on the server. Please check Render logs.`);
    }
  });

  // ==================== STRATEGY REPORT ====================
  const reportModal = document.getElementById('reportModal');
  document.getElementById('generateReportBtn').addEventListener('click', async () => {
    reportModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    const content = document.getElementById('reportContent');
    content.innerHTML = '<div class="report-loading" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:250px;"><div class="spinner"></div><p>Generating strategic analysis...</p></div>';
    try {
      const newsForReport = allNews.filter(n => n.category === 'Strategic Insights').slice(0, 20);
      const fallback = newsForReport.length > 0 ? newsForReport : allNews.slice(0, 15);
      const res = await fetch('/api/news/ai/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news: fallback })
      });
      const data = await res.json();
      if (data.success) {
        content.innerHTML = `<div class="report-body">${renderMarkdown(data.report)}</div>`;
      } else {
        content.innerHTML = '<p style="text-align:center;padding:2rem;">Failed to generate report.</p>';
      }
    } catch (e) {
      content.innerHTML = '<p style="text-align:center;padding:2rem;">Error generating report. Please try again.</p>';
    }
  });
  document.getElementById('closeReportModal').addEventListener('click', () => { reportModal.style.display = 'none'; document.body.style.overflow = ''; });

  // Listen to report button
  document.getElementById('listenReportBtn').addEventListener('click', async function() {
    const btn = this;
    const reportText = document.getElementById('reportContent').innerText;
    if (!reportText || reportText.includes('Generating')) { alert('Please generate a report first.'); return; }

    if (btn.classList.contains('playing')) {
      const audio = document.getElementById('reportAudioPlayer');
      if (audio) audio.pause();
      btn.classList.remove('playing');
      btn.querySelector('span').textContent = 'Listen';
      return;
    }

    btn.querySelector('span').textContent = 'Synthesizing...';
    btn.disabled = true;
    try {
      const res = await fetch('/api/news/report-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reportText.substring(0, 2000) })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('audio')) {
        const blob = await res.blob();
        let audio = document.getElementById('reportAudioPlayer');
        if (!audio) { audio = document.createElement('audio'); audio.id = 'reportAudioPlayer'; document.body.appendChild(audio); }
        audio.src = URL.createObjectURL(blob);
        await audio.play();
        btn.classList.add('playing');
        btn.querySelector('span').textContent = 'Playing...';
        btn.disabled = false;
        audio.onended = () => { btn.classList.remove('playing'); btn.querySelector('span').textContent = 'Listen'; };
      } else {
        throw new Error('TTS not available');
      }
    } catch (e) {
      alert('Report audio: ' + e.message);
      btn.querySelector('span').textContent = 'Listen';
      btn.disabled = false;
    }
  });

  // Download report
  document.getElementById('downloadReportBtn').addEventListener('click', () => {
    const text = document.getElementById('reportContent').innerText;
    if (!text || text.includes('Generating')) { alert('Please generate a report first.'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `MarketFeed_Report_${new Date().toISOString().split('T')[0]}.txt`; a.click();
  });

  // Yearly Summary Modal close
  document.getElementById('closeYearlyModal').addEventListener('click', () => {
    document.getElementById('yearlySummaryModal').style.display = 'none';
    document.body.style.overflow = '';
  });

  // ==================== AI CHAT ====================
  const chatWindow = document.getElementById('aiChatWindow');
  document.getElementById('aiChatToggle').addEventListener('click', () => {
    chatWindow.style.display = chatWindow.style.display === 'none' ? 'flex' : 'none';
  });
  document.getElementById('closeAiChat').addEventListener('click', () => { chatWindow.style.display = 'none'; });

  async function handleChat() {
    const input = document.getElementById('aiChatInput');
    const q = input.value.trim();
    if (!q) return;
    appendChat('user', q);
    input.value = '';
    const botMsg = appendChat('bot', '<div class="typing-indicator"><span></span><span></span><span></span></div>');
    try {
      const res = await fetch('/api/news/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, context: allNews.slice(0, 50) })
      });
      const data = await res.json();
      botMsg.innerHTML = renderMarkdown(data.answer || 'No answer available.');
    } catch (e) { botMsg.textContent = 'Connection error. Please try again.'; }
  }
  document.getElementById('sendAiMessage').addEventListener('click', handleChat);
  document.getElementById('aiChatInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });

  // Theme toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.querySelector('#themeToggle i').className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  });

  // Modal close handlers
  const articleModal = document.getElementById('articleModal');
  document.getElementById('closeModal').addEventListener('click', () => { articleModal.style.display = 'none'; document.body.style.overflow = ''; });
  window.addEventListener('click', (e) => {
    [selectorModal, articleModal, reportModal, document.getElementById('yearlySummaryModal')].forEach(m => {
      if (e.target === m) { m.style.display = 'none'; document.body.style.overflow = ''; }
    });
  });
}

// ==================== HELPERS ====================
function getLogoUrl(name) {
  return LOGO_MAP[name] || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f1f5f9&color=6366f1&size=128&bold=true`;
}

window.handleLogoError = function(img, name) {
  if (img.src.includes('clearbit') || img.src.includes('wikipedia')) {
    const domains = { 'HSBC': 'hsbc.com', 'Grab': 'grab.com', 'Vodafone': 'vodafone.com', 'Cathay Pacific': 'cathaypacific.com', 'Alibaba': 'alibaba.com', 'Standard Chartered': 'sc.com', 'Temu': 'temu.com', 'Ctrip': 'trip.com', 'Didi': 'didiglobal.com', 'DBS': 'dbs.com', 'Tencent': 'tencent.com', 'Bank of China': 'boc.cn', 'ByteDance': 'bytedance.com', 'Gojek': 'gojek.com', 'Citigroup': 'citigroup.com', 'Binance': 'binance.com', 'ShopBack': 'shopback.com', 'Aeon Credit': 'aeoncredit.com.my' };
    const domain = domains[name];
    if (domain) { img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`; return; }
  }
  if (!img.src.includes('ui-avatars')) {
    img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f1f5f9&color=6366f1&size=128&bold=true`;
  }
};

function renderCompanyGrid() {
  const container = document.getElementById('companyFilters');
  if (!container) return;
  container.innerHTML = '';
  availableCompanies.forEach(c => {
    const el = document.createElement('div');
    el.className = `company-item ${selectedCompanies.includes(c.name) ? 'selected' : ''}`;
    el.dataset.company = c.name;
    el.innerHTML = `<img src="${getLogoUrl(c.name)}" alt="${c.name}" loading="lazy" onerror="handleLogoError(this,'${c.name}')"><span>${c.name}</span>`;
    el.addEventListener('click', () => el.classList.toggle('selected'));
    container.appendChild(el);
  });
  updateSelectionLabel();
}

function updateSelectionLabel() {
  const label = document.getElementById('selectedCountLabel');
  if (selectedCompanies.length === 0) label.textContent = 'All Companies';
  else label.textContent = `${selectedCompanies.length} Selected`;
}

function appendChat(role, text) {
  const container = document.getElementById('aiChatMessages');
  const div = document.createElement('div');
  div.className = `ai-message ${role}`;
  div.innerHTML = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function renderMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/^### (.*$)/gim, '<h3 class="report-h3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="report-h2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="report-h1">$1</h1>')
    .replace(/^\> (.*$)/gim, '<blockquote class="report-quote">$1</blockquote>')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^---$/gim, '<hr class="report-divider">')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="report-img">')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="report-link">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function showLoading(show) {
  document.getElementById('loadingSpinner').style.display = show ? 'block' : 'none';
  document.getElementById('newsList').style.opacity = show ? '0.4' : '1';
}

function showEmptyState(show) {
  document.getElementById('emptyState').style.display = show ? 'block' : 'none';
  if (show) document.getElementById('newsList').innerHTML = '';
}

function formatRelativeTime(str) {
  if (!str) return '';
  let dateStr = str;
  if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const now = Date.now();
  const diff = now - d.getTime();

  if (diff < 0) return 'Just now';
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  if (diff < 2592000000) return `${Math.floor(diff / 604800000)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function esc(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
