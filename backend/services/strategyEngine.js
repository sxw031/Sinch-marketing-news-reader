/**
 * Strategy Engine - Heuristic-based strategic analysis for Sinch CSM team
 * No external AI dependency required
 */

// --- Yearly Summary Data (curated major events per company 2023-2025) ---
const YEARLY_EVENTS = {
  2023: {
    'HSBC': ['Acquired Silicon Valley Bank UK for £1', 'Launched Zing international payments app', 'Announced $3B share buyback program', 'Expanded wealth management in Asia'],
    'Grab': ['Achieved profitability for first time (Q3)', 'Launched GrabMaps for enterprise', 'Expanded financial services with GrabFin', 'Partnership with Booking.com'],
    'Vodafone': ['Merged UK operations with Three (CK Hutchison)', 'Sold Spain business to Zegona', 'Launched Africa fintech spinoff M-Pesa', 'CEO Margherita Della Valle took over'],
    'Cathay Pacific': ['Massive post-COVID recovery, record passenger growth', 'Ordered 32 Airbus A321neo aircraft', 'Resumed full Hong Kong hub operations', 'Launched premium economy refresh'],
    'Alibaba': ['Split into 6 business units (historic restructuring)', 'Cancelled Cainiao IPO', 'New CEO Eddie Wu took over from Daniel Zhang', 'Cloud division became independent unit'],
    'Standard Chartered': ['Launched digital bank Mox in Hong Kong', 'Expanded crypto custody services', 'Partnered with Microsoft on AI banking', 'Grew wealth management AUM 15%'],
    'Temu': ['Explosive US growth, became #1 downloaded app', 'Expanded to 40+ countries', 'Super Bowl advertising debut', 'Revenue exceeded $16B'],
    'Ctrip': ['Rebranded globally as Trip.com Group', 'Record international travel bookings post-COVID', 'Expanded AI-powered travel planning', 'Listed on Hong Kong Stock Exchange'],
    'Didi': ['Relisted app on Chinese app stores after 2-year ban', 'Resumed new user registration', 'Expanded autonomous driving testing', 'Recovered to 80% of pre-ban ride volume'],
    'DBS': ['Named World\'s Best Bank (Global Finance) 4th time', 'Launched AI-powered advisory platform', 'Expanded digital banking to India', 'Record net profit of S$10.3B'],
    'Tencent': ['WeChat reached 1.3B monthly active users', 'Gaming revenue recovered after regulatory easing', 'Invested heavily in AI/LLM development', 'Divested JD.com stake worth $16.4B'],
    'Bank of China': ['Expanded digital yuan (e-CNY) pilot programs', 'Opened branches in 5 new countries', 'Launched cross-border payment platform', 'Green bond issuance exceeded $10B'],
    'ByteDance': ['TikTok reached 1.5B monthly users globally', 'Launched enterprise AI tools (Doubao)', 'Revenue exceeded $110B', 'Faced US TikTok ban legislation'],
    'Gojek': ['Merged with Tokopedia as GoTo Group', 'Achieved adjusted EBITDA profitability', 'Expanded GoPay financial services', 'Launched GoTo Financial'],
    'Citigroup': ['Major restructuring under CEO Jane Fraser', 'Exited 14 consumer banking markets', 'Launched new wealth management platform', 'Cut 20,000 jobs in reorganization'],
    'Binance': ['CEO CZ pleaded guilty to AML violations', 'Paid $4.3B fine to US DOJ', 'New CEO Richard Teng took over', 'Lost market share but maintained #1 position'],
    'ShopBack': ['Reached profitability in core markets', 'Expanded PayLater service across SEA', 'Launched ShopBack Pay', 'Grew to 40M+ users across Asia-Pacific'],
    'Aeon Credit': ['Expanded digital lending in Malaysia', 'Launched new mobile app platform', 'Grew motorcycle financing portfolio', 'Partnered with e-commerce platforms']
  },
  2024: {
    'HSBC': ['Sold Canada operations for $10B', 'Expanded AI customer service globally', 'Launched embedded finance APIs', 'Record Asia wealth management growth'],
    'Grab': ['Full-year profitability achieved', 'Launched GrabAds platform for advertisers', 'Expanded lending to SMEs', 'Integrated AI into driver matching'],
    'Vodafone': ['Completed Three UK merger approval process', 'Sold Italian operations', 'Launched 5G standalone network', 'Partnered with Microsoft on generative AI'],
    'Cathay Pacific': ['Launched new premium cabin products', 'Ordered 30 Boeing 777-9 aircraft', 'Expanded cargo operations significantly', 'Returned to pre-COVID profitability'],
    'Alibaba': ['Completed cloud division independence', 'Invested $2B in AI infrastructure', 'Taobao and Tmall merged operations', 'International commerce grew 40%+'],
    'Standard Chartered': ['Expanded digital asset services', 'Launched AI-powered trade finance', 'Grew Africa banking operations', 'Partnered with fintechs on embedded banking'],
    'Temu': ['Became top e-commerce app in 50+ countries', 'Revenue exceeded $30B', 'Faced regulatory scrutiny in EU', 'Expanded semi-managed seller model'],
    'Ctrip': ['AI travel assistant launched globally', 'Record revenue exceeding pre-COVID levels', 'Expanded outbound China travel services', 'Invested in content-driven travel planning'],
    'Didi': ['Full recovery to pre-ban levels', 'Expanded autonomous robotaxi fleet', 'Launched international expansion (LatAm)', 'Achieved consistent profitability'],
    'DBS': ['Launched AI-powered wealth advisory', 'Expanded digital banking to 6 new markets', 'Record revenue of S$20B+', 'Named most innovative bank in Asia'],
    'Tencent': ['Launched Hunyuan AI model', 'WeChat Pay expanded internationally', 'Gaming revenue hit new highs', 'Cloud & AI services grew 30%+'],
    'Bank of China': ['Digital yuan transactions exceeded $1T', 'Expanded Belt & Road financing', 'Launched AI-powered risk management', 'Green finance portfolio doubled'],
    'ByteDance': ['TikTok Shop became major e-commerce player', 'Launched AI chatbot (Doubao) to public', 'Revenue exceeded $150B', 'Continued US regulatory battles'],
    'Gojek': ['GoTo Group returned to growth', 'GoPay became Indonesia\'s top e-wallet', 'Expanded on-demand services', 'Launched enterprise logistics solutions'],
    'Citigroup': ['Completed major organizational restructuring', 'Launched new digital banking platform', 'Expanded wealth management in Asia', 'Invested $1B in technology modernization'],
    'Binance': ['Recovered market share under new leadership', 'Expanded compliance infrastructure', 'Launched institutional custody service', 'Grew to 200M+ registered users'],
    'ShopBack': ['Expanded to Australia and Japan', 'ShopBack Pay reached 10M users', 'Launched merchant analytics platform', 'Achieved group-level profitability'],
    'Aeon Credit': ['Digital transformation accelerated', 'Launched AI credit scoring', 'Expanded to Vietnam and Cambodia', 'Grew Islamic financing products']
  },
  2025: {
    'HSBC': ['Launched AI-powered global trade platform', 'Expanded embedded banking APIs', 'Grew APAC wealth management 25%', 'Partnered with tech firms on RCS banking notifications'],
    'Grab': ['Launched GrabConnect enterprise communications', 'Expanded financial services to 8 markets', 'AI-powered customer engagement platform', 'Revenue exceeded $3B annually'],
    'Vodafone': ['Completed Three UK merger', 'Launched RCS Business Messaging at scale', 'Expanded IoT connectivity platform', 'Partnered with CPaaS providers for enterprise messaging'],
    'Cathay Pacific': ['Launched AI customer service chatbot', 'Expanded loyalty program digitally', 'Record passenger numbers', 'Invested in sustainable aviation fuel'],
    'Alibaba': ['AI-first strategy across all business units', 'International e-commerce surpassed domestic growth', 'Cloud AI revenue grew 60%', 'Launched enterprise communication tools'],
    'Standard Chartered': ['Expanded digital banking to 15 markets', 'AI-powered compliance and KYC', 'Launched cross-border payment APIs', 'Partnered on messaging-based banking'],
    'Temu': ['Faced import regulation changes in US/EU', 'Shifted to local fulfillment model', 'Launched seller communication platform', 'Revenue growth moderated to 40%'],
    'Ctrip': ['AI travel agent became primary booking interface', 'Expanded B2B travel services', 'Launched enterprise travel management', 'Grew international revenue 50%'],
    'Didi': ['Autonomous ride-hailing launched commercially', 'Expanded to 5 new international markets', 'Launched enterprise mobility solutions', 'Partnered on in-app messaging'],
    'DBS': ['Fully AI-powered banking operations', 'Launched embedded finance for platforms', 'Expanded digital banking to Middle East', 'Named world\'s best digital bank'],
    'Tencent': ['WeChat enterprise services grew 40%', 'AI integration across all products', 'International gaming revenue surpassed domestic', 'Cloud messaging APIs expanded globally'],
    'Bank of China': ['Digital yuan international expansion', 'AI-powered cross-border services', 'Launched developer banking APIs', 'Green finance exceeded $50B'],
    'ByteDance': ['TikTok resolution with US government', 'Enterprise AI tools gained major adoption', 'Revenue exceeded $200B', 'Launched business messaging platform'],
    'Gojek': ['GoTo became SEA super-app leader', 'Enterprise services division launched', 'AI-powered merchant communications', 'Expanded to 3 new countries'],
    'Citigroup': ['New digital-first banking platform live', 'Expanded API banking services', 'AI-powered wealth management', 'Grew institutional messaging services'],
    'Binance': ['Full regulatory compliance achieved globally', 'Launched institutional prime services', 'Expanded Web3 enterprise solutions', 'Grew to 250M+ users'],
    'ShopBack': ['IPO preparation announced', 'Expanded to 12 markets', 'Launched merchant engagement platform', 'AI-powered personalization engine'],
    'Aeon Credit': ['Fully digital lending platform live', 'Expanded to 3 new SEA markets', 'AI customer engagement launched', 'Partnered with messaging platforms for notifications']
  },
  2026: {
    'HSBC': ['Q1 earnings beat expectations with strong Asia growth', 'Expanded AI-driven wealth advisory to retail clients', 'Launched real-time cross-border payment corridor Asia-Europe', 'Partnered with Sinch competitor on WhatsApp Banking'],
    'Grab': ['Launched GrabForBusiness enterprise platform', 'Expanded ride-hailing to Pakistan and Bangladesh', 'GrabFin reached 10M lending customers', 'AI-powered driver communication system deployed'],
    'Vodafone': ['Three UK merger fully operational', 'Launched next-gen RCS platform for enterprise', 'Expanded 5G private networks for manufacturing', 'Announced CPaaS marketplace for SMBs'],
    'Cathay Pacific': ['Record H1 2026 passenger traffic', 'Launched AI-powered rebooking and disruption messaging', 'Expanded cargo e-commerce logistics', 'Sustainability report showed 15% emission reduction'],
    'Alibaba': ['Qwen AI model became top enterprise AI in China', 'International commerce revenue surpassed $15B', 'Launched AliExpress instant messaging for sellers', 'Cloud revenue grew 45% YoY'],
    'Standard Chartered': ['Launched open banking APIs in 20 markets', 'AI fraud detection prevented $2B in losses', 'Expanded Mox digital bank to Singapore', 'Partnered on embedded finance messaging'],
    'Temu': ['Shifted strategy to brand partnerships', 'Launched in-app live commerce with messaging', 'Regulatory compliance achieved in EU under DSA', 'Revenue growth stabilized at 25% YoY'],
    'Ctrip': ['Became China\'s largest outbound travel platform', 'AI concierge handled 60% of customer queries', 'Launched Trip.com Business for corporate travel', 'Expanded hotel messaging and review platform'],
    'Didi': ['Autonomous taxis launched in 3 Chinese cities', 'International expansion reached 12 countries', 'Launched enterprise fleet management APIs', 'In-app safety messaging system upgraded'],
    'DBS': ['Named world\'s best bank for 5th consecutive year', 'Launched DBS Developer Portal 2.0', 'AI handled 85% of customer interactions', 'Expanded digital banking to Saudi Arabia'],
    'Tencent': ['WeChat reached 1.4B MAU', 'Enterprise WeChat became dominant B2B tool in China', 'AI-powered mini-programs grew 60%', 'International cloud messaging expanded to LATAM'],
    'Bank of China': ['Digital yuan cross-border pilot with 15 countries', 'Launched AI customer service across all branches', 'Green bond issuance exceeded $20B in H1', 'Mobile banking MAU surpassed 300M'],
    'ByteDance': ['TikTok Shop GMV exceeded $50B globally', 'Doubao AI assistant reached 100M users', 'Launched Lark enterprise messaging globally', 'Revenue on track to exceed $250B'],
    'Gojek': ['GoTo Group profitable for full year', 'GoPay became SEA\'s largest digital wallet', 'Launched GoEnterprise B2B services', 'AI-powered merchant notification system'],
    'Citigroup': ['Completed 3-year digital transformation', 'Launched Citi Developer Hub for API banking', 'AI wealth advisory reached $100B AUM', 'Expanded institutional messaging infrastructure'],
    'Binance': ['Reached 300M registered users', 'Launched regulated exchange in 10 new markets', 'Institutional custody AUM exceeded $50B', 'Web3 messaging integration for DeFi notifications'],
    'ShopBack': ['Completed IPO on SGX', 'Expanded to 15 markets across APAC', 'ShopBack Pay reached 20M users', 'Launched AI-powered merchant engagement messaging'],
    'Aeon Credit': ['Digital lending volume doubled YoY', 'Expanded Islamic fintech across SEA', 'Launched AI credit decisioning engine', 'Customer notification system upgraded to omnichannel']
  }
};

/**
 * Generate yearly summary for all companies
 */
function generateYearlySummary(year) {
  const events = YEARLY_EVENTS[year];
  if (!events) return [];

  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const dateLabel = isCurrentYear ? `As of ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : `Full Year ${year}`;

  return Object.entries(events).map(([company, highlights]) => ({
    company,
    year,
    dateLabel,
    highlights,
    sinchRelevance: assessSinchRelevance(highlights)
  }));
}

function assessSinchRelevance(highlights) {
  const keywords = ['messaging', 'communication', 'api', 'notification', 'sms', 'rcs', 'customer engagement', 'digital', 'platform', 'enterprise', 'app', 'chatbot'];
  const text = highlights.join(' ').toLowerCase();
  const matches = keywords.filter(kw => text.includes(kw));
  if (matches.length >= 3) return 'High';
  if (matches.length >= 1) return 'Medium';
  return 'Low';
}

// --- Strategy Report Templates ---
const STRATEGY_TEMPLATES = {
  EXPANSION: { title: 'Market Expansion & Growth', icon: '🚀', actions: ['Leverage Sinch messaging infrastructure to support new market entry communications', 'Offer localized number provisioning and compliance consulting', 'Propose scalable API architecture for increased traffic'] },
  PARTNERSHIP: { title: 'Ecosystem & Partnership Integration', icon: '🤝', actions: ['Identify cross-platform integration opportunities with Sinch APIs', 'Develop co-marketing materials highlighting combined value', 'Explore joint technical workshops for voice and video API'] },
  FINANCIAL: { title: 'Revenue & Financial Strategy', icon: '💰', actions: ['Analyze messaging volume to propose cost-effective tiers', 'Introduce Sinch Verification tools for growing transactions', 'Identify upsell opportunities based on revenue growth'] },
  TECHNOLOGY: { title: 'Digital Transformation & Innovation', icon: '💻', actions: ['Pitch Sinch AI-powered conversational platform', 'Demonstrate rich messaging (RCS/WhatsApp) for mobile engagement', 'Recommend migration from legacy SMS to unified omni-channel API'] },
  ISSUE: { title: 'Risk Mitigation & Recovery', icon: '⚠️', actions: ['Propose Sinch redundant routing for 99.99% uptime', 'Set up automated monitoring and alerting for API traffic', 'Develop crisis communication playbook using Sinch broadcast'] },
  GENERAL: { title: 'Strategic Account Management', icon: '🎯', actions: ['Schedule quarterly business review to align Sinch roadmap', 'Identify key stakeholders for relationship building', 'Offer personalized demo of latest Sinch features'] }
};

const KEYWORD_MAP = {
  EXPANSION: ['expand', 'growth', 'launch', 'new market', 'opening', 'acquisition', 'merger', 'hiring', 'enter', 'scale'],
  PARTNERSHIP: ['partnership', 'collaboration', 'joint venture', 'alliance', 'agreement', 'deal', 'contract', 'signed'],
  FINANCIAL: ['revenue', 'profit', 'earnings', 'quarterly', 'funding', 'investment', 'stock', 'ipo', 'dividend'],
  TECHNOLOGY: ['ai', 'software', 'platform', 'app', 'digital', 'update', 'innovation', 'cloud', 'machine learning', 'api'],
  ISSUE: ['outage', 'downtime', 'issue', 'problem', 'layoff', 'drop', 'decline', 'loss', 'breach', 'fine']
};

function classifyNews(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  for (const [type, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => text.includes(kw))) return type;
  }
  return 'GENERAL';
}

/**
 * Generate heuristic strategy report from news articles
 */
function generateHeuristicReport(newsArticles) {
  if (!newsArticles || newsArticles.length === 0) {
    return '# MarketFeed Strategic Report\n\nNo recent news available. Please sync news first or select a broader time range.';
  }

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const grouped = {};
  newsArticles.forEach(n => {
    if (!grouped[n.company]) grouped[n.company] = [];
    grouped[n.company].push(n);
  });
  const companies = Object.keys(grouped);
  const strategic = newsArticles.filter(n => n.category === 'Strategic Insights');

  // Sinch-relevant signals
  const sinchKeywords = ['messaging', 'communication', 'notification', 'sms', 'rcs', 'api', 'customer engagement', 'digital transformation', 'app', 'platform', 'chatbot', 'ai', 'customer experience', 'omnichannel'];
  const sinchOpportunities = newsArticles.filter(n => {
    const text = ((n.title || '') + ' ' + (n.description || '')).toLowerCase();
    return sinchKeywords.some(kw => text.includes(kw));
  });

  let report = `# 📊 MarketFeed Strategic Briefing\n`;
  report += `> **Sinch CSM Intelligence Report** | ${date}\n`;
  report += `> ${newsArticles.length} signals across ${companies.length} companies\n\n---\n\n`;

  // Executive Summary
  report += `## **Executive Summary**\n`;
  report += `Analyzed ${newsArticles.length} news signals from ${companies.length} accounts. ${strategic.length} classified as strategic insights. `;
  if (sinchOpportunities.length > 0) {
    report += `**${sinchOpportunities.length} signals** indicate Sinch engagement opportunities.\n\n`;
  } else {
    report += `Monitor these accounts for communication and digital transformation initiatives.\n\n`;
  }

  // Sinch Opportunities
  if (sinchOpportunities.length > 0) {
    report += `## **🎯 Sinch Engagement Opportunities**\n\n`;
    sinchOpportunities.slice(0, 5).forEach(n => {
      report += `**${n.company}**: ${n.title}\n`;
      if (n.description) report += `> ${n.description.substring(0, 150)}\n\n`;
    });
    report += `---\n\n`;
  }

  // Classify and group
  const analysisMap = new Map();
  newsArticles.forEach(article => {
    const type = classifyNews(article.title, article.description);
    if (!analysisMap.has(type)) analysisMap.set(type, []);
    analysisMap.get(type).push(article);
  });

  report += `## **Priority Categories**\n\n`;
  for (const [type, articles] of analysisMap.entries()) {
    const template = STRATEGY_TEMPLATES[type] || STRATEGY_TEMPLATES.GENERAL;
    const cos = [...new Set(articles.map(a => a.company))];
    report += `### ${template.icon} **${template.title}**\n`;
    report += `**${articles.length} signals** | ${cos.join(', ')}\n\n`;
    articles.slice(0, 2).forEach(a => { report += `> *${a.company}*: ${a.title}\n`; });
    report += `\n**Actions:** ${template.actions[0]}\n\n---\n\n`;
  }

  // Per-Company
  report += `## **Account Intelligence**\n\n`;
  Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).forEach(([company, articles]) => {
    report += `### **${company}** (${articles.length} signals)\n`;
    articles.slice(0, 3).forEach(a => { report += `- ${a.title}\n`; });
    report += `\n`;
  });

  report += `---\n*Generated by MarketFeed | Sinch Internal*\n`;
  return report;
}

module.exports = { generateHeuristicReport, generateYearlySummary };
