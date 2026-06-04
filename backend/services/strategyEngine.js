/**
 * Heuristic Strategy Engine v3
 * Generates beautifully formatted strategic reports - no AI API needed
 */

const STRATEGY_TEMPLATES = {
  EXPANSION: {
    title: 'Market Expansion & Growth',
    icon: '🚀',
    actions: [
      'Leverage Sinch messaging infrastructure to support new market entry communications',
      'Offer localized number provisioning and compliance consulting for target regions',
      'Propose scalable API architecture to handle increased traffic from new user segments',
      'Develop go-to-market communication playbook using Sinch omnichannel capabilities'
    ]
  },
  PARTNERSHIP: {
    title: 'Ecosystem & Partnership Integration',
    icon: '🤝',
    actions: [
      'Identify cross-platform integration opportunities with Sinch APIs',
      'Develop co-marketing materials highlighting combined value proposition',
      'Explore joint technical workshops for voice and video API integration',
      'Map partner ecosystem touchpoints for Sinch product placement'
    ]
  },
  FINANCIAL: {
    title: 'Revenue & Financial Strategy',
    icon: '💰',
    actions: [
      'Analyze messaging volume to propose cost-effective committed-use tiers',
      'Introduce Sinch Verification tools to protect growing transaction volume',
      'Offer financial reporting automation through analytics dashboard',
      'Identify upsell opportunities based on revenue growth trajectory'
    ]
  },
  TECHNOLOGY: {
    title: 'Digital Transformation & Innovation',
    icon: '💻',
    actions: [
      'Pitch Sinch AI-powered conversational platform for customer support modernization',
      'Demonstrate rich messaging (RCS/WhatsApp) for improved mobile engagement',
      'Recommend migration from legacy SMS to unified omni-channel API',
      'Propose chatbot integration for automated customer journey optimization'
    ]
  },
  ISSUE: {
    title: 'Risk Mitigation & Recovery',
    icon: '⚠️',
    actions: [
      'Propose Sinch redundant routing for 99.99% uptime on critical services',
      'Set up automated monitoring and alerting for API traffic anomalies',
      'Conduct technical audit to identify communication flow bottlenecks',
      'Develop crisis communication playbook using Sinch broadcast capabilities'
    ]
  },
  GENERAL: {
    title: 'Strategic Account Management',
    icon: '🎯',
    actions: [
      'Schedule quarterly business review to align Sinch roadmap with client goals',
      'Identify key stakeholders for relationship building and expansion',
      'Offer personalized demo of latest Sinch features for their vertical',
      'Develop account growth plan with clear milestones and KPIs'
    ]
  }
};

const KEYWORD_MAP = {
  EXPANSION: ['expand', 'growth', 'launch', 'new market', 'opening', 'acquisition', 'merger', 'hiring', 'enter', 'scale'],
  PARTNERSHIP: ['partnership', 'collaboration', 'joint venture', 'alliance', 'agreement', 'deal', 'contract', 'signed'],
  FINANCIAL: ['revenue', 'profit', 'earnings', 'quarterly', 'funding', 'investment', 'stock', 'ipo', 'dividend', 'fiscal'],
  TECHNOLOGY: ['ai', 'software', 'platform', 'app', 'digital', 'update', 'innovation', 'cloud', 'machine learning', 'api'],
  ISSUE: ['outage', 'downtime', 'issue', 'problem', 'layoff', 'drop', 'decline', 'loss', 'breach', 'fine', 'penalty']
};

function classifyNews(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  for (const [type, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => text.includes(kw))) return type;
  }
  return 'GENERAL';
}

function generateHeuristicReport(newsArticles) {
  if (!newsArticles || newsArticles.length === 0) {
    return '# MarketFeed Strategic Report\n\nNo recent news available to analyze. Please sync news first or select a broader time range.';
  }

  const companyNames = [...new Set(newsArticles.map(a => a.company))];
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Classify all articles
  const analysisMap = new Map();
  newsArticles.forEach(article => {
    const type = classifyNews(article.title, article.description);
    if (!analysisMap.has(type)) analysisMap.set(type, []);
    analysisMap.get(type).push(article);
  });

  // Build report
  let report = '';
  report += `# 📊 MarketFeed Strategic Briefing\n`;
  report += `> **Sinch Account Intelligence Report** | ${date}\n`;
  report += `> ${newsArticles.length} signals analyzed across ${companyNames.length} companies\n\n`;
  report += `---\n\n`;

  // Executive Summary
  report += `## **Executive Summary**\n`;
  const types = [...analysisMap.keys()];
  report += `Our intelligence scan detected activity in **${types.length} strategic categories**: `;
  report += types.map(t => STRATEGY_TEMPLATES[t]?.title || t).join(', ') + '. ';
  report += `This presents ${types.includes('EXPANSION') || types.includes('PARTNERSHIP') ? 'significant' : 'notable'} opportunities for Sinch engagement.\n\n`;

  // Priority Opportunities
  report += `## **Priority Opportunities**\n\n`;

  for (const [type, articles] of analysisMap.entries()) {
    const template = STRATEGY_TEMPLATES[type] || STRATEGY_TEMPLATES.GENERAL;
    const companies = [...new Set(articles.map(a => a.company))];

    report += `### ${template.icon} **${template.title}**\n`;
    report += `**Signals:** ${articles.length} | **Companies:** ${companies.join(', ')}\n\n`;

    // Show top 2 news items as evidence
    articles.slice(0, 2).forEach(a => {
      report += `> *${a.company}*: ${a.title}\n`;
    });
    report += `\n`;

    // Action items
    report += `**Recommended Actions:**\n`;
    template.actions.slice(0, 3).forEach(action => {
      report += `- ${action}\n`;
    });
    report += `\n---\n\n`;
  }

  // Company Deep Dive
  report += `## **Company Deep Dive**\n\n`;

  companyNames.forEach(company => {
    const companyNews = newsArticles.filter(a => a.company === company);
    report += `### 🏢 **${company}** (${companyNews.length} signals)\n`;

    companyNews.slice(0, 3).forEach(a => {
      const category = classifyNews(a.title, a.description);
      const icon = STRATEGY_TEMPLATES[category]?.icon || '📋';
      report += `- ${icon} **${a.title}**\n`;
      if (a.description) {
        report += `  ${a.description.substring(0, 120)}...\n`;
      }
    });
    report += `\n`;
  });

  report += `---\n`;
  report += `*Generated by MarketFeed Strategy Engine v3.0 | Sinch Internal Use Only*\n`;

  return report;
}

module.exports = { generateHeuristicReport };
