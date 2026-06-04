/**
 * Heuristic Strategy Engine v2
 * Generates beautifully formatted strategic plans without requiring an AI API Key
 */

const STRATEGY_TEMPLATES = {
    EXPANSION: {
        title: "🚀 Market Expansion & Growth Strategy",
        emoji: "🌐",
        points: [
            "Leverage Sinch's global messaging footprint to support their new market entry.",
            "Offer localized number provisioning and compliance consulting in the new regions.",
            "Propose a scalable API architecture to handle increased traffic from new user segments."
        ]
    },
    PARTNERSHIP: {
        title: "🤝 Ecosystem & Partnership Integration",
        emoji: "🔗",
        points: [
            "Identify cross-platform integration opportunities between Sinch and their new partners.",
            "Develop co-marketing materials highlighting the combined value proposition.",
            "Explore joint technical workshops to streamline the integration of Sinch's voice and video APIs."
        ]
    },
    FINANCIAL: {
        title: "💰 Revenue Optimization & Financial Stability",
        emoji: "📈",
        points: [
            "Analyze their current messaging volume to propose more cost-effective committed-use tiers.",
            "Introduce fraud prevention tools (Sinch Verification) to protect their growing transaction volume.",
            "Offer financial reporting automation through Sinch's analytics dashboard."
        ]
    },
    TECHNOLOGY: {
        title: "💻 Digital Transformation & Tech Innovation",
        emoji: "✨",
        points: [
            "Pitch Sinch's AI-powered conversational platform to modernize their customer support.",
            "Demonstrate how Sinch's rich messaging (RCS/WhatsApp) can improve their mobile engagement rates.",
            "Recommend migrating legacy SMS notifications to a unified omni-channel API."
        ]
    },
    ISSUE: {
        title: "⚠️ Risk Mitigation & Service Recovery",
        emoji: "🛡️",
        points: [
            "Propose Sinch's redundant routing capabilities to ensure 99.99% uptime for their critical services.",
            "Set up automated monitoring and alerting for their API traffic to preempt future issues.",
            "Conduct a technical audit to identify and fix bottlenecks in their current communication flow."
        ]
    },
    GENERAL: {
        title: "🎯 Strategic Account Management",
        emoji: "📋",
        points: [
            "Schedule a quarterly business review (QBR) to align Sinch's roadmap with their 2024 goals.",
            "Identify key stakeholders in their newly formed departments for relationship building.",
            "Offer a personalized demo of Sinch's latest features tailored to their industry vertical."
        ]
    }
};

const KEYWORD_MAP = {
    EXPANSION: ['expand', 'growth', 'launch', 'new market', 'opening', 'acquisition', 'merger', 'hiring'],
    PARTNERSHIP: ['partnership', 'collaboration', 'joint venture', 'alliance', 'agreement'],
    FINANCIAL: ['revenue', 'profit', 'earnings', 'quarterly', 'funding', 'investment', 'stock', 'ipo'],
    TECHNOLOGY: ['ai', 'software', 'platform', 'app', 'digital', 'update', 'innovation', 'cloud'],
    ISSUE: ['outage', 'downtime', 'issue', 'problem', 'layoff', 'drop', 'decline', 'loss']
};

function generateHeuristicReport(newsArticles) {
    if (!newsArticles || newsArticles.length === 0) {
        return "### 📭 Sinch Strategic Analysis Report\n\nNo recent strategic news found to analyze. Please try a broader time range or select more companies.";
    }

    const analysisMap = new Map();
    const companyNames = [...new Set(newsArticles.map(a => a.company))];

    newsArticles.forEach(article => {
        const content = (article.title + " " + article.description).toLowerCase();
        let matched = false;

        for (const [type, keywords] of Object.entries(KEYWORD_MAP)) {
            if (keywords.some(kw => content.includes(kw))) {
                if (!analysisMap.has(type)) analysisMap.set(type, []);
                analysisMap.get(type).push(article);
                matched = true;
                break;
            }
        }
        if (!matched) {
            if (!analysisMap.has('GENERAL')) analysisMap.set('GENERAL', []);
            analysisMap.get('GENERAL').push(article);
        }
    });

    let report = `# 📊 MarketFeed Strategic Briefing\n\n`;
    report += `> **Intelligence Report for Sinch Account Teams**\n`;
    report += `> 📅 Generated: ${new Date().toLocaleDateString()} | 🔍 Scope: ${newsArticles.length} insights | 🏢 Companies: ${companyNames.length}\n\n`;
    
    report += `![Strategic Analysis](https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80)\n\n`;

    report += `## 1️⃣ Executive Summary\n`;
    report += `***\n`;
    report += `Our current analysis reveals significant movement in **${[...analysisMap.keys()].map(k => k.toLowerCase()).join(', ')}** sectors. This presents a unique strategic window for Sinch to reinforce its role as a critical infrastructure partner during these client transitions.\n\n`;

    report += `## 2️⃣ Strategic Opportunities by Sector\n`;
    report += `***\n\n`;

    for (const [type, articles] of analysisMap.entries()) {
        const template = STRATEGY_TEMPLATES[type] || STRATEGY_TEMPLATES.GENERAL;
        const typeImages = {
            EXPANSION: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=400&q=60',
            PARTNERSHIP: 'https://images.unsplash.com/photo-1521791136064-7986c2959210?auto=format&fit=crop&w=400&q=60',
            FINANCIAL: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=60',
            TECHNOLOGY: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=400&q=60',
            ISSUE: 'https://images.unsplash.com/photo-1590272456521-1bbe160a18ce?auto=format&fit=crop&w=400&q=60',
            GENERAL: 'https://images.unsplash.com/photo-1454165833767-6216d503f1a1?auto=format&fit=crop&w=400&q=60'
        };

        report += `### **${template.title}**\n`;
        report += `![${type}](${typeImages[type]})\n\n`;
        report += `**Context:** ${articles.length} strategic updates from **${[...new Set(articles.map(a => a.company))].join(', ')}**.\n\n`;
        report += `#### **Proposed Action Plan:**\n`;
        template.points.forEach(point => {
            report += `*   **${point.split(' ')[0]}** ${point.split(' ').slice(1).join(' ')}\n`;
        });
        report += `\n---\n\n`;
    }

    report += `## 3️⃣ Deep Dive by Company\n`;
    report += `***\n\n`;
    
    companyNames.forEach(company => {
        const companyNews = newsArticles.filter(a => a.company === company);
        report += `### 🏢 **${company.toUpperCase()}**\n`;
        report += `> *Total Strategic Signals: ${companyNews.length}*\n\n`;
        
        companyNews.slice(0, 3).forEach(a => {
            report += `*   **${a.title}**\n`;
            report += `    _${a.description.substring(0, 150)}..._\n`;
            report += `    [Read Source](${a.url}) | *${new Date(a.publishedAt).toLocaleDateString()}*\n\n`;
        });
        report += `\n`;
    });

    report += `\n\n***\n*Generated by MarketFeed Strategic Engine v3.0 | Sinch Internal Use Only*`;

    return report;
}

module.exports = { generateHeuristicReport };
