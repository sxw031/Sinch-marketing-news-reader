require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const newsRoutes = require('./routes/news');
const { aggregateAllNews, getNews, getNewsCount } = require('./services/newsAggregator');
const { generateHeuristicReport } = require('./services/strategyEngine');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/news', newsRoutes);

// AI Strategy Report (heuristic, no API key needed)
app.post('/api/news/ai/strategy', async (req, res) => {
  try {
    const { news } = req.body;
    const report = generateHeuristicReport(news || []);
    res.json({ success: true, report });
  } catch (error) {
    console.error('[Strategy]', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Chat - Smart heuristic Q&A tailored for Sinch CSMs
app.post('/api/news/ai/chat', async (req, res) => {
  try {
    const { query, context } = req.body;
    if (!query) return res.json({ success: true, answer: 'Hi! I\'m your MarketFeed assistant. Ask me about any of the 18 companies I track, market trends, or Sinch engagement opportunities.' });

    const q = query.toLowerCase();
    const news = context || [];
    const { COMPANIES } = require('./config/sources');
    const companyNames = COMPANIES.map(c => c.name);

    // Detect mentioned company (handle partial matches too)
    let mentionedCompany = companyNames.find(c => q.includes(c.toLowerCase()));
    if (!mentionedCompany) {
      // Try partial/alias matching
      const aliases = { 'dbs': 'DBS', 'hsbc': 'HSBC', 'grab': 'Grab', 'temu': 'Temu', 'didi': 'Didi', 'gojek': 'Gojek', 'citi': 'Citigroup', 'citibank': 'Citigroup', 'alibaba': 'Alibaba', 'ali': 'Alibaba', 'tiktok': 'ByteDance', 'bytedance': 'ByteDance', 'tencent': 'Tencent', 'wechat': 'Tencent', 'binance': 'Binance', 'crypto': 'Binance', 'cathay': 'Cathay Pacific', 'vodafone': 'Vodafone', 'stanchart': 'Standard Chartered', 'sc': 'Standard Chartered', 'boc': 'Bank of China', 'shopback': 'ShopBack', 'aeon': 'Aeon Credit', 'ctrip': 'Ctrip', 'trip.com': 'Ctrip' };
      const matchedAlias = Object.keys(aliases).find(a => q.includes(a));
      if (matchedAlias) mentionedCompany = aliases[matchedAlias];
    }

    // Detect intent
    const isAboutTrends = /trend|overview|summary|what.s happening|update|latest|market|today/i.test(query);
    const isAboutSinch = /sinch|opportunity|csm|engagement|outreach|upsell|cross.sell|prospect|pipeline/i.test(query);
    const isAboutRisk = /risk|threat|concern|problem|issue|challenge|warning|negative/i.test(query);
    const isAboutStrategy = /strategy|recommend|suggest|action|next step|what should|how to|approach/i.test(query);
    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|sup|yo)\b/i.test(query.trim());

    let answer = '';

    if (isGreeting) {
      const count = news.length;
      const companies = [...new Set(news.map(n => n.company))].length;
      answer = `Hey there! 👋\n\nI'm currently tracking **${count} articles** across **${companies} companies** in your portfolio. Here's what I can help with:\n\n`;
      answer += `- Ask about a specific company: *"What's happening with HSBC?"*\n`;
      answer += `- Get market trends: *"Give me an overview"*\n`;
      answer += `- Find Sinch opportunities: *"Any engagement opportunities?"*\n`;
      answer += `- Strategic advice: *"What should I focus on this week?"*\n\n`;
      answer += `What would you like to know?`;
    } else if (mentionedCompany) {
      const companyNews = news.filter(n => n.company === mentionedCompany);
      if (companyNews.length > 0) {
        const strategic = companyNews.filter(n => n.category === 'Strategic Insights');
        const finance = companyNews.filter(n => n.category === 'Finance');
        const tech = companyNews.filter(n => n.category === 'Technology');

        answer = `## ${mentionedCompany}\n\n`;
        answer += `I've got **${companyNews.length} recent articles** on ${mentionedCompany}. Let me break it down:\n\n`;

        if (strategic.length > 0) {
          answer += `### 🚀 Strategic Moves\n`;
          strategic.slice(0, 3).forEach(n => {
            answer += `- **${n.title}** — *${n.source}*\n`;
          });
          answer += `\n`;
        }

        if (finance.length > 0) {
          answer += `### 💰 Financial Updates\n`;
          finance.slice(0, 2).forEach(n => {
            answer += `- ${n.title} — *${n.source}*\n`;
          });
          answer += `\n`;
        }

        if (tech.length > 0) {
          answer += `### 💻 Technology & Digital\n`;
          tech.slice(0, 2).forEach(n => {
            answer += `- ${n.title} — *${n.source}*\n`;
          });
          answer += `\n`;
        }

        // Always provide Sinch CSM angle
        const sinchKw = ['messaging', 'communication', 'api', 'digital', 'platform', 'app', 'notification', 'customer', 'mobile', 'cloud', 'engagement', 'chatbot', 'ai', 'automation'];
        const sinchRelevant = companyNews.filter(n => sinchKw.some(kw => ((n.title||'')+(n.description||'')).toLowerCase().includes(kw)));
        
        answer += `---\n\n`;
        if (sinchRelevant.length > 0) {
          answer += `### 🎯 Your CSM Angle\n\n`;
          answer += `I spotted **${sinchRelevant.length} signal${sinchRelevant.length > 1 ? 's' : ''}** that could be relevant for Sinch. `;
          answer += `${mentionedCompany} appears to be investing in digital/communication infrastructure. `;
          answer += `This could be a good time to:\n\n`;
          answer += `1. **Schedule a check-in** to discuss their evolving communication needs\n`;
          answer += `2. **Share a case study** about similar companies using Sinch APIs\n`;
          answer += `3. **Propose a QBR topic** around: *${sinchRelevant[0].title.substring(0, 60)}*\n`;
        } else {
          answer += `### 💡 CSM Note\n\n`;
          answer += `No direct communication/messaging signals this cycle, but stay engaged. Monitor for digital transformation or customer experience initiatives that could open doors for Sinch solutions.`;
        }
      } else {
        answer = `I don't have recent news about **${mentionedCompany}** in your current view.\n\n`;
        answer += `**Quick fixes:**\n`;
        answer += `- Expand the time range to 48h or 1 week\n`;
        answer += `- Click Refresh to fetch the latest\n`;
        answer += `- Check if ${mentionedCompany} is in your selected companies filter`;
      }
    } else if (isAboutSinch) {
      const sinchKw = ['messaging', 'communication', 'api', 'digital', 'platform', 'notification', 'customer engagement', 'chatbot', 'rcs', 'sms', 'mobile', 'cloud communication', 'omnichannel'];
      const opportunities = news.filter(n => sinchKw.some(kw => ((n.title||'')+(n.description||'')).toLowerCase().includes(kw)));
      
      answer = `## 🎯 Sinch Engagement Radar\n\n`;
      
      if (opportunities.length > 0) {
        answer += `Great news — I found **${opportunities.length} signals** across your accounts that align with Sinch's value proposition:\n\n`;
        const byCompany = {};
        opportunities.forEach(n => { if (!byCompany[n.company]) byCompany[n.company] = []; byCompany[n.company].push(n); });
        
        const sorted = Object.entries(byCompany).sort((a, b) => b[1].length - a[1].length);
        sorted.slice(0, 6).forEach(([co, arts]) => {
          const strength = arts.length >= 3 ? '🔥 Hot' : arts.length >= 2 ? '⚡ Warm' : '📌 Watch';
          answer += `**${co}** ${strength}\n`;
          arts.slice(0, 2).forEach(a => { answer += `  - ${a.title}\n`; });
          answer += `\n`;
        });
        
        answer += `---\n\n`;
        answer += `**Recommended Actions:**\n`;
        answer += `1. Prioritize the 🔥 Hot accounts for immediate outreach\n`;
        answer += `2. Prepare talking points around their digital initiatives\n`;
        answer += `3. Generate a Strategy Report for detailed per-account action plans\n`;
      } else {
        answer += `No strong CPaaS/messaging signals detected right now. This is normal — not every news cycle will surface opportunities.\n\n`;
        answer += `**What to do:**\n`;
        answer += `- Expand to 1-week view for broader signal detection\n`;
        answer += `- Check the Strategy Report for pattern-based recommendations\n`;
        answer += `- Focus on relationship maintenance with your top accounts`;
      }
    } else if (isAboutTrends) {
      const companies = [...new Set(news.map(n => n.company))];
      const categories = {};
      news.forEach(n => { categories[n.category || 'General'] = (categories[n.category || 'General'] || 0) + 1; });
      const counts = {};
      news.forEach(n => { counts[n.company] = (counts[n.company] || 0) + 1; });
      const topCompanies = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 5);

      answer = `## 📊 Market Pulse\n\n`;
      answer += `Here's your snapshot across **${news.length} articles** from **${companies.length} companies**:\n\n`;
      
      answer += `### Most Active This Cycle\n`;
      topCompanies.forEach(([co, cnt], i) => {
        const bar = '█'.repeat(Math.min(cnt, 10));
        answer += `${i+1}. **${co}** — ${cnt} articles ${bar}\n`;
      });
      
      answer += `\n### Category Breakdown\n`;
      answer += `| Category | Count | % |\n|----------|-------|---|\n`;
      Object.entries(categories).sort((a,b) => b[1]-a[1]).forEach(([cat, count]) => {
        answer += `| ${cat} | ${count} | ${Math.round(count/news.length*100)}% |\n`;
      });
      
      answer += `\n### Key Takeaway\n`;
      const topCat = Object.entries(categories).sort((a,b) => b[1]-a[1])[0];
      answer += `The dominant theme is **${topCat[0]}** (${topCat[1]} articles). `;
      if (topCat[0] === 'Strategic Insights') {
        answer += `This suggests significant corporate activity — mergers, partnerships, and expansions are in play. Great time for proactive CSM outreach.`;
      } else if (topCat[0] === 'Technology') {
        answer += `Tech-heavy cycles often signal digital transformation budgets being deployed — a prime opportunity for Sinch API conversations.`;
      } else {
        answer += `Keep monitoring for strategic signals that could translate into Sinch engagement opportunities.`;
      }
    } else if (isAboutRisk) {
      const riskKw = ['layoff', 'cut', 'decline', 'loss', 'fine', 'penalty', 'lawsuit', 'investigation', 'breach', 'hack', 'downturn', 'restructur', 'close', 'shut'];
      const risks = news.filter(n => riskKw.some(kw => ((n.title||'')+(n.description||'')).toLowerCase().includes(kw)));
      
      answer = `## ⚠️ Risk Radar\n\n`;
      if (risks.length > 0) {
        answer += `Detected **${risks.length} potential risk signals** across your accounts:\n\n`;
        risks.slice(0, 5).forEach(n => {
          answer += `- **${n.company}**: ${n.title}\n`;
        });
        answer += `\n**CSM Implication:** These accounts may be going through internal changes. Approach with empathy, focus on value demonstration, and be prepared for potential budget discussions or stakeholder changes.`;
      } else {
        answer += `No significant risk signals detected in the current view. Your accounts appear stable. This is a good time for growth-oriented conversations rather than defensive plays.`;
      }
    } else if (isAboutStrategy) {
      const strategic = news.filter(n => n.category === 'Strategic Insights');
      const topStrategic = [...new Set(strategic.map(n => n.company))].slice(0, 5);
      
      answer = `## 🧭 This Week's Playbook\n\n`;
      answer += `Based on ${news.length} signals I'm tracking, here's my recommended focus:\n\n`;
      answer += `### Priority Accounts\n`;
      if (topStrategic.length > 0) {
        topStrategic.forEach((co, i) => {
          const coNews = strategic.filter(n => n.company === co);
          answer += `${i+1}. **${co}** — ${coNews.length} strategic signal${coNews.length > 1 ? 's' : ''} (${coNews[0].title.substring(0, 50)}...)\n`;
        });
      }
      answer += `\n### Recommended Actions\n\n`;
      answer += `1. **Immediate:** Schedule touchpoints with accounts showing expansion/partnership signals\n`;
      answer += `2. **This week:** Prepare QBR materials incorporating the latest strategic moves\n`;
      answer += `3. **Ongoing:** Monitor for digital transformation announcements — these are your strongest Sinch entry points\n`;
      answer += `4. **Proactive:** Share relevant industry insights with your champions to stay top-of-mind\n\n`;
      answer += `*Pro tip: Click "Generate Strategy Report" for a detailed, per-account action plan you can share with your team.*`;
    } else {
      // Smart keyword search with context
      const words = q.split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'are', 'was', 'what', 'how', 'why', 'who', 'when', 'where', 'can', 'does', 'about', 'with', 'this', 'that', 'from', 'have', 'has'].includes(w));
      const relevant = news.filter(n => {
        const text = ((n.title || '') + ' ' + (n.description || '') + ' ' + (n.company || '')).toLowerCase();
        return words.some(w => text.includes(w));
      });
      
      if (relevant.length > 0) {
        answer = `## Results for "${query}"\n\n`;
        answer += `Found **${relevant.length} matching articles**:\n\n`;
        
        // Group by company for cleaner display
        const byCompany = {};
        relevant.forEach(n => { if (!byCompany[n.company]) byCompany[n.company] = []; byCompany[n.company].push(n); });
        
        Object.entries(byCompany).slice(0, 5).forEach(([co, arts]) => {
          answer += `**${co}**\n`;
          arts.slice(0, 2).forEach(a => { answer += `- ${a.title} *(${a.source})*\n`; });
          answer += `\n`;
        });
        
        if (relevant.length > 8) answer += `*Showing top results. ${relevant.length - 8} more available — try narrowing by company or category.*`;
      } else {
        answer = `Hmm, I couldn't find articles matching "${query}" in your current view.\n\n`;
        answer += `**Here's what might help:**\n\n`;
        answer += `- Try a company name: *"Tell me about Grab"*\n`;
        answer += `- Ask about trends: *"What's the market overview?"*\n`;
        answer += `- Find opportunities: *"Any Sinch engagement signals?"*\n`;
        answer += `- Get strategic advice: *"What should I focus on?"*\n`;
        answer += `- Expand time range to 1 week for more data\n\n`;
        answer += `I work best when you ask about the 18 companies I track or about market patterns I can detect from the news.`;
      }
    }

    res.json({ success: true, answer });
  } catch (error) {
    console.error('[AI Chat]', error.message);
    res.json({ success: true, answer: 'Sorry, I hit a snag processing that. Could you rephrase your question?' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MarketFeed is running', uptime: Math.round(process.uptime()) });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, error: err.message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MarketFeed] Running on port ${PORT}`);

  // Auto-sync on startup (non-blocking)
  setTimeout(async () => {
    try {
      const count = await getNewsCount();
      console.log(`[Startup] Current news count: ${count}`);
      if (count < 10) {
        console.log('[Startup] Low news count, triggering initial sync...');
        await aggregateAllNews({
          onProgress: (name) => console.log(`  Syncing: ${name}`)
        });
      }
    } catch (err) {
      console.error('[Startup] Auto-sync failed:', err.message);
    }
  }, 2000);

  // Recurring sync every 2 hours
  setInterval(async () => {
    console.log('[Scheduled] Running periodic sync...');
    try {
      await aggregateAllNews({});
    } catch (err) {
      console.error('[Scheduled] Sync failed:', err.message);
    }
  }, 2 * 60 * 60 * 1000);
});

module.exports = app;
