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

    let report = `==========================================\n`;
    report += `📊 SINCH STRATEGIC ANALYSIS & ACTION PLAN\n`;
    report += `==========================================\n\n`;
    report += `📅 Date: ${new Date().toLocaleDateString()}\n`;
    report += `🔍 Scope: ${newsArticles.length} insights | ${companyNames.length} companies\n\n`;

    report += `## 1️⃣ EXECUTIVE SUMMARY\n`;
    report += `------------------------------------------\n`;
    report += `Our recent market intelligence indicates high activity in sectors related to ${[...analysisMap.keys()].join(', ')}. `;
    report += `For Sinch, this represents a critical window to deepen integration and provide infrastructure stability during these corporate transitions.\n\n`;

    report += `## 2️⃣ STRATEGIC OPPORTUNITIES\n`;
    report += `------------------------------------------\n\n`;

    for (const [type, articles] of analysisMap.entries()) {
        const template = STRATEGY_TEMPLATES[type] || STRATEGY_TEMPLATES.GENERAL;
        report += `${template.title}\n`;
        report += `Context: ${articles.length} updates from ${[...new Set(articles.map(a => a.company))].join(', ')}\n\n`;
        report += `Actionable Plan for Sinch:\n`;
        template.points.forEach(point => {
            report += `  • ${point}\n`;
        });
        report += `\n`;
    }

    report += `## 3️⃣ KEY INSIGHT REFERENCES\n`;
    report += `------------------------------------------\n`;
    newsArticles.slice(0, 10).forEach(a => {
        report += `📍 [${a.company}] ${a.title}\n`;
        report += `   Date: ${new Date(a.publishedAt).toLocaleDateString()}\n\n`;
    });

    report += `\n---\n*Generated by MarketFeed Heuristic Engine v2.0*`;

    return report;
}

module.exports = { generateHeuristicReport };
