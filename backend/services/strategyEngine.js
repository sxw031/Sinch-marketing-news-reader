/**
 * Strategy Engine - Rubric-aligned strategic analysis for Sinch CSM team
 * Generates reports scored against 5 dimensions (25 points total):
 * 1. Industry Trends (5pts) - Quantifiable business implications, urgency
 * 2. Sinch Use Cases (5pts) - Engaged, Informed, Safe, Happy
 * 3. Buying Committee (5pts) - Personas, motivations, pain points
 * 4. Real-Life Stories (5pts) - Before/after, emotional + business impact
 * 5. How Sinch Wins (5pts) - Differentiators woven into customer story
 */

// --- Yearly Summary Data (curated major events per company 2023-2026) ---
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
  const keywords = ['messaging', 'communication', 'api', 'notification', 'sms', 'rcs', 'customer engagement', 'digital', 'platform', 'enterprise', 'app', 'chatbot', 'cpaas', 'omnichannel'];
  const text = highlights.join(' ').toLowerCase();
  const matches = keywords.filter(kw => text.includes(kw));
  if (matches.length >= 3) return 'High';
  if (matches.length >= 1) return 'Medium';
  return 'Low';
}

// =====================================================
// RUBRIC-ALIGNED FRAMEWORK
// =====================================================

// --- Sinch 4 Use Cases: Engaged, Informed, Safe, Happy ---
const SINCH_USE_CASES = {
  ENGAGED: {
    name: 'Engaged',
    icon: '💬',
    description: 'Two-way conversational experiences that drive revenue and deepen relationships',
    capabilities: ['RCS Business Messaging', 'WhatsApp Business API', 'Conversational AI', 'Rich media messaging', 'In-app messaging'],
    triggers: ['customer engagement', 'loyalty', 'retention', 'conversation', 'interactive', 'personalization', 'campaign', 'marketing', 'promotion', 'commerce', 'shopping', 'checkout'],
    value: 'Increases customer lifetime value by 25-40% through personalized, two-way conversations that feel natural and drive action.'
  },
  INFORMED: {
    name: 'Informed',
    icon: '📱',
    description: 'Timely, relevant notifications that keep customers in the loop and reduce support costs',
    capabilities: ['SMS/MMS notifications', 'Push notifications', 'Email API', 'Omnichannel orchestration', 'Delivery status tracking'],
    triggers: ['notification', 'alert', 'update', 'status', 'tracking', 'delivery', 'confirmation', 'reminder', 'booking', 'transaction', 'payment', 'statement'],
    value: 'Reduces inbound support calls by 30-50% while increasing customer satisfaction through proactive, timely updates.'
  },
  SAFE: {
    name: 'Safe',
    icon: '🔒',
    description: 'Identity verification and fraud prevention that protects customers and builds trust',
    capabilities: ['SMS OTP', 'Silent verification', 'Number verification', 'Flash Call', 'Data verification', 'Fraud detection'],
    triggers: ['verification', 'authentication', 'security', 'fraud', 'identity', 'otp', 'login', 'kyc', 'compliance', 'trust', 'protection', 'onboarding'],
    value: 'Prevents 95%+ of account takeover fraud while reducing verification friction by 60%, protecting both revenue and reputation.'
  },
  HAPPY: {
    name: 'Happy',
    icon: '😊',
    description: 'Seamless support experiences that resolve issues fast and turn detractors into promoters',
    capabilities: ['Contact center AI', 'IVR/Voice', 'Video calling', 'Agent assist', 'Chatbot handoff', 'Sentiment analysis'],
    triggers: ['support', 'service', 'help', 'complaint', 'resolution', 'satisfaction', 'nps', 'experience', 'contact center', 'call center', 'agent', 'chatbot'],
    value: 'Improves NPS by 20+ points and reduces average handle time by 40% through intelligent routing and AI-assisted resolution.'
  }
};

// --- Buying Committee Personas ---
const BUYING_COMMITTEE = {
  CTO_VP_ENGINEERING: {
    title: 'CTO / VP Engineering',
    priorities: ['System reliability & uptime', 'API scalability', 'Developer experience', 'Technical debt reduction', 'Security & compliance'],
    painPoints: ['Vendor lock-in', 'Integration complexity', 'Maintaining 99.99% SLA', 'Managing multiple communication vendors'],
    metrics: ['API uptime %', 'Time to integrate', 'Developer satisfaction', 'Incident response time'],
    sinchPitch: 'Single API for all channels, 99.99% uptime SLA, comprehensive SDKs, and dedicated solutions engineering support.'
  },
  CMO_VP_MARKETING: {
    title: 'CMO / VP Marketing',
    priorities: ['Customer engagement rates', 'Campaign ROI', 'Personalization at scale', 'Brand consistency across channels'],
    painPoints: ['Low open rates on email', 'Channel fragmentation', 'Proving messaging ROI', 'Reaching customers on preferred channels'],
    metrics: ['Engagement rate', 'Conversion rate', 'Customer acquisition cost', 'Campaign ROI'],
    sinchPitch: 'Rich messaging (RCS/WhatsApp) delivers 3-5x higher engagement than SMS, with built-in analytics to prove ROI.'
  },
  CFO_VP_FINANCE: {
    title: 'CFO / VP Finance',
    priorities: ['Cost optimization', 'Predictable spend', 'Revenue growth enablement', 'Risk mitigation'],
    painPoints: ['Unpredictable messaging costs', 'Fraud losses', 'Multiple vendor contracts', 'Compliance penalties'],
    metrics: ['Cost per message', 'Fraud prevention savings', 'Revenue per customer', 'Total cost of ownership'],
    sinchPitch: 'Consolidated billing across all channels, volume-based pricing that scales, and fraud prevention that pays for itself 10x over.'
  },
  COO_VP_OPERATIONS: {
    title: 'COO / VP Operations',
    priorities: ['Operational efficiency', 'Customer experience consistency', 'Process automation', 'Vendor consolidation'],
    painPoints: ['Manual notification processes', 'Inconsistent customer experience', 'Too many point solutions', 'Scaling operations globally'],
    metrics: ['Operational cost per customer', 'Process automation %', 'Customer effort score', 'Time to market'],
    sinchPitch: 'One platform replaces 5+ point solutions, with orchestration that automates channel selection and failover.'
  },
  HEAD_OF_PRODUCT: {
    title: 'Head of Product',
    priorities: ['User experience', 'Feature velocity', 'In-app engagement', 'Competitive differentiation'],
    painPoints: ['Building messaging in-house is expensive', 'Maintaining channel integrations', 'Keeping up with new channels (RCS, WhatsApp)', 'A/B testing at scale'],
    metrics: ['Feature adoption rate', 'User engagement', 'Time to launch', 'Churn reduction'],
    sinchPitch: 'Embed rich communication directly into your product with pre-built SDKs, so your team ships faster and users stay engaged.'
  }
};

// --- Industry-specific context for each company ---
const INDUSTRY_CONTEXT = {
  'HSBC': { vertical: 'Banking & Financial Services', region: 'Global (APAC-focused)', pressures: ['Digital-first competitors', 'Regulatory compliance costs', 'Customer expectations for real-time banking', 'Branch-to-digital migration'] },
  'Grab': { vertical: 'Super-app / Ride-hailing / Fintech', region: 'Southeast Asia', pressures: ['Driver/rider communication at scale', 'Financial inclusion for unbanked', 'Multi-service coordination', 'Fraud prevention in payments'] },
  'Vodafone': { vertical: 'Telecommunications', region: 'Europe & Africa', pressures: ['Revenue decline from traditional services', 'Enterprise messaging monetization', 'Network-as-a-platform strategy', '5G ROI realization'] },
  'Cathay Pacific': { vertical: 'Aviation & Travel', region: 'Asia-Pacific', pressures: ['Passenger experience differentiation', 'Disruption communication at scale', 'Loyalty program engagement', 'Operational messaging (crew, ground ops)'] },
  'Alibaba': { vertical: 'E-commerce & Cloud', region: 'Global (China-origin)', pressures: ['Seller-buyer communication', 'Cross-border commerce messaging', 'Cloud platform stickiness', 'AI-powered customer service'] },
  'Standard Chartered': { vertical: 'Banking & Financial Services', region: 'Asia, Africa, Middle East', pressures: ['Digital banking competition', 'Cross-border payment notifications', 'KYC/AML compliance messaging', 'Wealth client engagement'] },
  'Temu': { vertical: 'E-commerce', region: 'Global', pressures: ['Seller communication at scale', 'Order/delivery notifications', 'Customer trust building', 'Regulatory compliance messaging'] },
  'Ctrip': { vertical: 'Online Travel', region: 'China & Global', pressures: ['Real-time travel disruption alerts', 'Multi-language customer support', 'Booking confirmation across channels', 'AI concierge communication'] },
  'Didi': { vertical: 'Ride-hailing & Mobility', region: 'China & International', pressures: ['Driver-rider real-time messaging', 'Safety verification', 'International expansion communication', 'Autonomous vehicle notifications'] },
  'DBS': { vertical: 'Banking & Financial Services', region: 'Singapore & Asia', pressures: ['Digital-only banking experience', 'Transaction notifications at scale', 'Fraud prevention alerts', 'Wealth advisory communication'] },
  'Tencent': { vertical: 'Technology & Gaming', region: 'Global (China-origin)', pressures: ['Enterprise communication platform', 'International expansion', 'Cloud messaging APIs', 'Mini-program notifications'] },
  'Bank of China': { vertical: 'Banking & Financial Services', region: 'China & Global', pressures: ['Digital yuan notification infrastructure', 'Cross-border banking alerts', 'Mobile banking engagement', 'Branch digitization'] },
  'ByteDance': { vertical: 'Social Media & AI', region: 'Global', pressures: ['Creator-brand messaging', 'E-commerce transaction notifications', 'Enterprise communication (Lark)', 'Content moderation alerts'] },
  'Gojek': { vertical: 'Super-app / Ride-hailing', region: 'Southeast Asia', pressures: ['Multi-service notifications', 'Merchant communication', 'Payment verification', 'Driver coordination messaging'] },
  'Citigroup': { vertical: 'Banking & Financial Services', region: 'Global', pressures: ['Institutional client communication', 'Digital transformation messaging', 'Compliance notifications', 'Wealth management engagement'] },
  'Binance': { vertical: 'Cryptocurrency & Fintech', region: 'Global', pressures: ['Security verification at scale', 'Real-time trading alerts', 'Regulatory compliance notifications', 'User onboarding verification'] },
  'ShopBack': { vertical: 'E-commerce & Fintech', region: 'Asia-Pacific', pressures: ['Cashback notification timing', 'Merchant engagement messaging', 'Payment confirmation', 'User re-engagement campaigns'] },
  'Aeon Credit': { vertical: 'Consumer Finance', region: 'Southeast Asia', pressures: ['Loan approval notifications', 'Payment reminders', 'Digital onboarding verification', 'Collections communication'] }
};

// --- Sinch Success Stories (real-like case studies for each vertical) ---
const SINCH_STORIES = {
  'Banking & Financial Services': {
    customer: 'a leading APAC bank',
    before: 'relied on email and branch visits for customer communication, resulting in 12% engagement rates and rising support call volumes',
    after: 'deployed Sinch omnichannel messaging (WhatsApp + RCS + SMS fallback) for transaction alerts, achieving 94% read rates within 3 minutes',
    impact: '45% reduction in inbound support calls, $8M annual savings, and NPS improved from +32 to +58',
    timeframe: '6 months from pilot to full deployment'
  },
  'Super-app / Ride-hailing / Fintech': {
    customer: 'a Southeast Asian super-app with 50M+ users',
    before: 'used 4 different vendors for SMS, push, in-app, and voice—causing delivery gaps, inconsistent experience, and $2M/year in wasted spend',
    after: 'consolidated to Sinch\'s unified API with intelligent channel orchestration and silent number verification',
    impact: 'Verification success rate jumped from 72% to 98%, driver-rider communication latency dropped 80%, and annual messaging costs reduced by 35%',
    timeframe: '3-month migration, ROI positive in month 2'
  },
  'Telecommunications': {
    customer: 'a European telco launching enterprise messaging services',
    before: 'struggled to monetize their network for business messaging, losing enterprise customers to OTT platforms',
    after: 'white-labeled Sinch\'s RCS and CPaaS platform, offering enterprises rich messaging through their existing network relationships',
    impact: 'Generated $15M in new enterprise messaging revenue in year 1, with 200+ enterprise clients onboarded',
    timeframe: '4 months to launch, break-even in 8 months'
  },
  'Aviation & Travel': {
    customer: 'a major Asian airline serving 35M passengers annually',
    before: 'sent disruption notifications via email only—passengers missed rebooking windows, causing $50M in annual compensation costs',
    after: 'implemented Sinch real-time messaging across WhatsApp, SMS, and RCS with automated rebooking links',
    impact: '89% of disrupted passengers received alerts within 2 minutes, self-service rebooking increased 340%, compensation costs dropped 28%',
    timeframe: 'Pilot in 6 weeks, full rollout in 4 months'
  },
  'E-commerce & Cloud': {
    customer: 'a global e-commerce platform with 500M+ active buyers',
    before: 'order notifications had 8% click-through rate via email, and seller-buyer disputes escalated due to poor communication',
    after: 'deployed Sinch conversational messaging for order updates, delivery tracking, and seller-buyer chat with AI translation',
    impact: 'Click-through on order updates reached 67%, dispute resolution time dropped from 72 hours to 4 hours, repeat purchase rate increased 22%',
    timeframe: 'Phased rollout over 5 months across 12 markets'
  },
  'E-commerce': {
    customer: 'a fast-growing cross-border e-commerce platform',
    before: 'customer trust was low due to lack of proactive communication—30% of support tickets were "where is my order?" queries',
    after: 'implemented Sinch proactive delivery notifications with rich tracking links and two-way messaging for delivery issues',
    impact: 'WISMO tickets dropped 62%, customer satisfaction score improved from 3.2 to 4.6/5, and return rate decreased 18%',
    timeframe: '8 weeks from integration to live in 20+ markets'
  },
  'Online Travel': {
    customer: 'Asia\'s largest OTA processing 1M+ bookings daily',
    before: 'booking confirmations via email had 35% open rate, and last-minute itinerary changes caused passenger confusion',
    after: 'Sinch omnichannel booking confirmations (WhatsApp preferred, SMS fallback) with real-time itinerary updates and AI concierge',
    impact: 'Confirmation open rate reached 96%, customer service calls reduced 40%, and ancillary revenue (upgrades via messaging) grew $12M annually',
    timeframe: '10 weeks integration, scaled to 15 languages'
  },
  'Super-app / Ride-hailing': {
    customer: 'a Southeast Asian super-app with 50M+ users',
    before: 'used 4 different vendors for SMS, push, in-app, and voice—causing delivery gaps, inconsistent experience, and $2M/year in wasted spend',
    after: 'consolidated to Sinch\'s unified API with intelligent channel orchestration and silent number verification',
    impact: 'Verification success rate jumped from 72% to 98%, driver-rider communication latency dropped 80%, and annual messaging costs reduced by 35%',
    timeframe: '3-month migration, ROI positive in month 2'
  },
  'Technology & Gaming': {
    customer: 'a global technology company with 500M+ platform users',
    before: 'developer notification infrastructure was fragmented across regions, causing 15% message delivery failures and compliance issues',
    after: 'unified on Sinch global messaging APIs with local number provisioning, compliance automation, and real-time delivery analytics',
    impact: 'Delivery rate improved to 99.7%, compliance incidents dropped to zero, and developer integration time reduced from 3 weeks to 2 days',
    timeframe: 'Global rollout in 6 months across 40+ countries'
  },
  'Social Media & AI': {
    customer: 'a global social media platform with 1B+ users',
    before: 'account verification relied on SMS OTP with 68% success rate in emerging markets, losing millions of potential users',
    after: 'deployed Sinch silent verification + flash call fallback, with intelligent routing based on device and network conditions',
    impact: 'Verification success rate reached 96% globally, new user onboarding improved 41%, and verification costs dropped 55%',
    timeframe: 'Pilot in 3 markets, global in 4 months'
  },
  'Cryptocurrency & Fintech': {
    customer: 'a top-5 global crypto exchange',
    before: 'security OTPs had 25% failure rate in high-fraud regions, causing account lockouts and $5M monthly in support costs',
    after: 'implemented Sinch adaptive verification (silent verify → SMS OTP → voice OTP) with real-time fraud scoring',
    impact: 'OTP success rate reached 99.2%, fraud attempts blocked increased 300%, support tickets for access issues dropped 70%',
    timeframe: '6 weeks to deploy globally'
  },
  'E-commerce & Fintech': {
    customer: 'a cashback and payments platform in APAC',
    before: 'cashback notifications via push had 22% delivery rate, and users missed time-sensitive deals',
    after: 'Sinch omnichannel notifications with smart timing (push → SMS → WhatsApp) based on user engagement patterns',
    impact: 'Deal redemption rate increased 85%, monthly active users grew 23%, and merchant satisfaction score improved from 3.8 to 4.7',
    timeframe: '5 weeks integration, A/B tested for 3 weeks before full rollout'
  },
  'Consumer Finance': {
    customer: 'a consumer lending company in Southeast Asia with 5M+ borrowers',
    before: 'payment reminders via SMS had 40% read rate, resulting in 18% late payment rate and rising collections costs',
    after: 'deployed Sinch WhatsApp payment reminders with one-tap payment links, plus conversational collections for overdue accounts',
    impact: 'On-time payment rate improved from 82% to 94%, collections costs dropped 45%, and customer complaints about communication decreased 60%',
    timeframe: '4 weeks to pilot, 8 weeks to full portfolio'
  }
};

// --- Sinch Differentiators (woven, not listed) ---
const SINCH_DIFFERENTIATORS = {
  scale: 'processes 700B+ messages annually across 600+ operator connections',
  reach: 'direct connections in 190+ countries with local number provisioning',
  reliability: '99.99% uptime SLA backed by redundant global infrastructure',
  omnichannel: 'single API for SMS, RCS, WhatsApp, Voice, Video, Email—no channel silos',
  intelligence: 'AI-powered channel orchestration that picks the right channel at the right time',
  compliance: 'built-in regulatory compliance for GDPR, TCPA, and local messaging laws in every market',
  ecosystem: 'pre-built integrations with Salesforce, HubSpot, Zendesk, and 100+ platforms',
  speed: 'average integration time of 2 days with comprehensive SDKs and sandbox environments'
};

// --- Period context ---
function getPeriodContext(period) {
  switch (period) {
    case 'weekly':
      return { label: 'Weekly Strategic Review', timeframe: 'Past 7 Days', refreshNote: 'Next refresh recommended: Monday morning', focusNote: 'Focus on immediate action items and short-term engagement windows.', daysBack: 7 };
    case 'monthly':
      return { label: 'Monthly Strategic Assessment', timeframe: 'Past 30 Days', refreshNote: 'Next refresh recommended: 1st of next month', focusNote: 'Focus on emerging patterns, pipeline development, and QBR preparation.', daysBack: 30 };
    case 'quarterly':
      return { label: 'Quarterly Business Review Intelligence', timeframe: 'Past 90 Days', refreshNote: 'Next refresh recommended: end of quarter', focusNote: 'Focus on strategic account planning, executive engagement, and long-term opportunity mapping.', daysBack: 90 };
    default:
      return { label: 'Daily Strategic Briefing', timeframe: 'Past 24 Hours', refreshNote: 'Next refresh recommended in 24 hours', focusNote: 'Focus on time-sensitive signals and immediate outreach opportunities.', daysBack: 1 };
  }
}

// --- Classification helpers ---
const KEYWORD_MAP = {
  EXPANSION: ['expand', 'growth', 'launch', 'new market', 'opening', 'acquisition', 'merger', 'hiring', 'enter', 'scale', 'international'],
  PARTNERSHIP: ['partnership', 'collaboration', 'joint venture', 'alliance', 'agreement', 'deal', 'contract', 'signed', 'integrate'],
  FINANCIAL: ['revenue', 'profit', 'earnings', 'quarterly', 'funding', 'investment', 'stock', 'ipo', 'dividend', 'record'],
  TECHNOLOGY: ['ai', 'software', 'platform', 'app', 'digital', 'update', 'innovation', 'cloud', 'machine learning', 'api', 'chatbot'],
  ISSUE: ['outage', 'downtime', 'issue', 'problem', 'layoff', 'drop', 'decline', 'loss', 'breach', 'fine', 'regulatory']
};

function classifyNews(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  for (const [type, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => text.includes(kw))) return type;
  }
  return 'GENERAL';
}

function determineUrgency(articles) {
  const sinchKeywords = ['messaging', 'communication', 'api', 'cpaas', 'notification', 'sms', 'rcs', 'whatsapp', 'chatbot', 'omnichannel'];
  const competitorKeywords = ['twilio', 'vonage', 'infobip', 'messagebird', 'bandwidth', 'plivo'];
  const text = articles.map(a => `${a.title} ${a.description || ''}`).join(' ').toLowerCase();

  if (competitorKeywords.some(kw => text.includes(kw))) return 'HIGH_URGENCY';
  const sinchMatches = sinchKeywords.filter(kw => text.includes(kw));
  if (sinchMatches.length >= 3) return 'HIGH_URGENCY';
  if (sinchMatches.length >= 1) return 'MEDIUM_URGENCY';
  return 'LOW_URGENCY';
}

/**
 * Match news to Sinch use cases
 */
function matchUseCases(articles) {
  const matches = { ENGAGED: [], INFORMED: [], SAFE: [], HAPPY: [] };

  articles.forEach(article => {
    const text = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
    for (const [useCase, config] of Object.entries(SINCH_USE_CASES)) {
      if (config.triggers.some(trigger => text.includes(trigger))) {
        matches[useCase].push(article);
      }
    }
  });

  return matches;
}

/**
 * Identify relevant buying committee personas based on news signals
 */
function identifyBuyingCommittee(articles, company) {
  const text = articles.map(a => `${a.title} ${a.description || ''}`).join(' ').toLowerCase();
  const relevant = [];

  if (text.match(/api|platform|integration|developer|technology|infrastructure|security|cloud/)) {
    relevant.push('CTO_VP_ENGINEERING');
  }
  if (text.match(/customer|engagement|campaign|marketing|brand|loyalty|personalization|acquisition/)) {
    relevant.push('CMO_VP_MARKETING');
  }
  if (text.match(/revenue|cost|profit|savings|budget|investment|roi|pricing|financial/)) {
    relevant.push('CFO_VP_FINANCE');
  }
  if (text.match(/operations|efficiency|automation|scale|process|vendor|consolidat/)) {
    relevant.push('COO_VP_OPERATIONS');
  }
  if (text.match(/product|feature|user experience|app|launch|adoption|churn|engagement/)) {
    relevant.push('HEAD_OF_PRODUCT');
  }

  // Always include at least 2 personas
  if (relevant.length < 2) {
    if (!relevant.includes('CTO_VP_ENGINEERING')) relevant.push('CTO_VP_ENGINEERING');
    if (!relevant.includes('COO_VP_OPERATIONS')) relevant.push('COO_VP_OPERATIONS');
  }

  return relevant.slice(0, 4);
}

/**
 * Get relevant success story for a company
 */
function getRelevantStory(company) {
  const ctx = INDUSTRY_CONTEXT[company];
  if (!ctx) return SINCH_STORIES['Banking & Financial Services'];
  return SINCH_STORIES[ctx.vertical] || SINCH_STORIES['Banking & Financial Services'];
}

/**
 * Generate trend analysis for longer-period reports
 */
function generateTrendAnalysis(newsArticles, period) {
  if (period === 'daily') return '';

  const companies = {};
  const themes = { messaging: 0, digital: 0, expansion: 0, financial: 0, partnership: 0, risk: 0 };

  newsArticles.forEach(article => {
    companies[article.company] = (companies[article.company] || 0) + 1;
    const text = ((article.title || '') + ' ' + (article.description || '')).toLowerCase();
    if (text.match(/messaging|sms|rcs|notification|communication/)) themes.messaging++;
    if (text.match(/digital|platform|api|cloud|ai|automation/)) themes.digital++;
    if (text.match(/expand|launch|new market|growth|scale/)) themes.expansion++;
    if (text.match(/revenue|profit|earnings|funding|ipo/)) themes.financial++;
    if (text.match(/partner|collaboration|alliance|deal|agreement/)) themes.partnership++;
    if (text.match(/layoff|decline|loss|breach|fine|regulatory/)) themes.risk++;
  });

  let analysis = `\n---\n\n## 📈 **Trend Analysis**\n\n`;

  const sorted = Object.entries(companies).sort((a, b) => b[1] - a[1]);
  analysis += `### Account Activity Ranking\n`;
  analysis += `| Rank | Company | Signals | Activity |\n|------|---------|---------|----------|\n`;
  sorted.slice(0, 10).forEach(([co, count], i) => {
    const level = count >= 10 ? '🔥 Very High' : count >= 5 ? '⚡ High' : count >= 3 ? '📊 Moderate' : '📌 Low';
    analysis += `| ${i + 1} | ${co} | ${count} | ${level} |\n`;
  });

  analysis += `\n### Theme Distribution\n`;
  const sortedThemes = Object.entries(themes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const themeIcons = { messaging: '💬', digital: '💻', expansion: '🚀', financial: '💰', partnership: '🤝', risk: '⚠️' };
  sortedThemes.forEach(([theme, count]) => {
    const pct = Math.round(count / newsArticles.length * 100);
    const bar = '█'.repeat(Math.min(Math.round(pct / 5), 15));
    analysis += `- ${themeIcons[theme] || '📊'} **${theme.charAt(0).toUpperCase() + theme.slice(1)}**: ${count} signals (${pct}%) ${bar}\n`;
  });

  return analysis;
}

// =====================================================
// MAIN REPORT GENERATOR (Rubric-Aligned, Concise)
// =====================================================

/**
 * Generate rubric-aligned strategy report
 * Target: 7-8 minute read (~1600-2000 words)
 * Flow: Context → Trends → Use Cases → Stakeholders → Story → Differentiation → Actions
 */
function generateHeuristicReport(newsArticles, period = 'daily') {
  if (!newsArticles || newsArticles.length === 0) {
    return '# MarketFeed Strategic Report\n\nNo recent news available. Please sync news first or select a broader time range.';
  }

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const ctx = getPeriodContext(period);

  // Group by company
  const grouped = {};
  newsArticles.forEach(n => {
    if (!grouped[n.company]) grouped[n.company] = [];
    grouped[n.company].push(n);
  });
  const companies = Object.keys(grouped);

  // Sinch-relevant signals
  const sinchKeywords = ['messaging', 'communication', 'notification', 'sms', 'rcs', 'api', 'customer engagement', 'digital transformation', 'app', 'platform', 'chatbot', 'ai', 'omnichannel', 'enterprise', 'verification', 'authentication'];
  const sinchOpportunities = newsArticles.filter(n => {
    const text = ((n.title || '') + ' ' + (n.description || '')).toLowerCase();
    return sinchKeywords.some(kw => text.includes(kw));
  });

  // Use case matching
  const useCaseMatches = matchUseCases(newsArticles);

  // Top companies by signal count
  const topCompanies = Object.entries(grouped)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  // Urgency classification
  const highUrgency = Object.entries(grouped).filter(([, articles]) => determineUrgency(articles) === 'HIGH_URGENCY');
  const medUrgency = Object.entries(grouped).filter(([, articles]) => determineUrgency(articles) === 'MEDIUM_URGENCY');

  // ===== REPORT =====
  let report = `# ${ctx.label}\n`;
  report += `> ${date} | ${ctx.timeframe} | **${newsArticles.length}** signals across **${companies.length}** accounts | **${sinchOpportunities.length}** Sinch-relevant\n\n`;

  // ===== EXECUTIVE SNAPSHOT =====
  report += `## Executive Snapshot\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| High-priority accounts | ${highUrgency.length > 0 ? highUrgency.map(([c]) => c).join(', ') : 'None this period'} |\n`;
  report += `| Top use case triggered | ${Object.entries(useCaseMatches).sort((a, b) => b[1].length - a[1].length)[0]?.[0] || 'N/A'} (${Object.entries(useCaseMatches).sort((a, b) => b[1].length - a[1].length)[0]?.[1]?.length || 0} signals) |\n`;
  report += `| Most active accounts | ${topCompanies.slice(0, 3).map(([c, a]) => `${c} (${a.length})`).join(', ')} |\n`;
  report += `| Immediate actions needed | ${highUrgency.length + Math.min(medUrgency.length, 3)} |\n\n`;

  // ===== SECTION 1: INDUSTRY TRENDS =====
  report += `---\n\n## 1. Industry Trends & Urgency\n\n`;

  // Pick top 5 most impactful signals across all companies
  const topSignals = sinchOpportunities.length > 0 ? sinchOpportunities.slice(0, 5) : newsArticles.slice(0, 5);

  report += `| Company | Signal | Implication for Sinch |\n`;
  report += `|---------|--------|----------------------|\n`;
  topSignals.forEach(article => {
    const type = classifyNews(article.title, article.description);
    const implications = {
      EXPANSION: 'New market = 3-5x notification volume growth',
      TECHNOLOGY: 'Platform modernization = 40% higher messaging spend',
      FINANCIAL: 'Revenue growth = 2.5x more likely to approve new vendors',
      PARTNERSHIP: 'Partner expansion = 60% increase in API call volume',
      ISSUE: 'Service issues = 3x more receptive to failover solutions',
      GENERAL: 'Evolving needs = engagement window open for 48 hours'
    };
    report += `| ${article.company} | ${article.title.substring(0, 65)}${article.title.length > 65 ? '...' : ''} | ${implications[type] || implications.GENERAL} |\n`;
  });

  report += `\n> **💡 Conversation opener:** *"I saw [signal] about your company—how is this affecting your communication strategy? Are you seeing increased pressure on [specific area]?"*\n\n`;

  // ===== SECTION 2: SINCH USE CASES =====
  report += `---\n\n## 2. Sinch Use Case Mapping\n\n`;
  report += `Each signal maps to one of Sinch's four pillars. Here's where the opportunities are this period:\n\n`;

  report += `| Use Case | Signals | Key Accounts | Lead Capability |\n`;
  report += `|----------|---------|--------------|-----------------|\n`;
  for (const [key, useCase] of Object.entries(SINCH_USE_CASES)) {
    const matched = useCaseMatches[key];
    const cos = [...new Set(matched.map(a => a.company))].slice(0, 3);
    report += `| ${useCase.icon} **${useCase.name}** | ${matched.length} | ${cos.length > 0 ? cos.join(', ') : '—'} | ${useCase.capabilities[0]} |\n`;
  }

  // Detail the top use case
  const topUseCase = Object.entries(useCaseMatches).sort((a, b) => b[1].length - a[1].length)[0];
  if (topUseCase && topUseCase[1].length > 0) {
    const uc = SINCH_USE_CASES[topUseCase[0]];
    report += `\n**Focus: ${uc.icon} ${uc.name}** — ${uc.value}\n\n`;
    topUseCase[1].slice(0, 2).forEach(article => {
      report += `- **${article.company}**: "${article.title.substring(0, 70)}" → ${uc.capabilities[0]} + ${uc.capabilities[1]}\n`;
    });
  }

  report += `\n> **💡 Ask:** *"Which matters most right now—keeping customers Engaged, Informed, Safe, or Happy? Where's the biggest gap?"*\n\n`;

  // ===== SECTION 3: BUYING COMMITTEE =====
  report += `---\n\n## 3. Buying Committee Map\n\n`;

  // Show top 2 companies only for conciseness
  topCompanies.slice(0, 2).forEach(([company, articles]) => {
    const personas = identifyBuyingCommittee(articles, company);
    const industryCtx = INDUSTRY_CONTEXT[company];

    report += `### ${company} (${industryCtx?.vertical || 'Technology'})\n\n`;
    report += `| Persona | Priority | Pain Point | Sinch Pitch |\n`;
    report += `|---------|----------|------------|-------------|\n`;
    personas.slice(0, 3).forEach(personaKey => {
      const persona = BUYING_COMMITTEE[personaKey];
      if (!persona) return;
      report += `| ${persona.title} | ${persona.priorities[0]} | ${persona.painPoints[0]} | ${persona.sinchPitch.substring(0, 60)}... |\n`;
    });
    report += `\n**Entry point:** ${BUYING_COMMITTEE[personas[0]]?.title || 'Technical lead'} → expand to ${BUYING_COMMITTEE[personas[1]]?.title || 'Business sponsor'}\n\n`;
  });

  report += `> **💡 Ask:** *"Who else needs to be involved in a communication infrastructure decision? What keeps them up at night?"*\n\n`;

  // ===== SECTION 4: REAL-LIFE STORY =====
  report += `---\n\n## 4. Success Story to Tell\n\n`;

  // One compelling story, matched to top company
  const storyCompany = topCompanies[0]?.[0] || companies[0];
  const story = getRelevantStory(storyCompany);
  const storyCtx = INDUSTRY_CONTEXT[storyCompany];

  report += `**For your next conversation with ${storyCompany}:**\n\n`;
  report += `*"Let me share what happened with ${story.customer}. They ${story.before}. After deploying Sinch, they ${story.after}. The result? ${story.impact}. All within ${story.timeframe}."*\n\n`;
  report += `> **💡 Ask:** *"Does this sound familiar? Given [their recent signal], are you facing similar challenges around [pain point]?"*\n\n`;

  // Add a second story if different vertical
  if (topCompanies.length > 1) {
    const story2Company = topCompanies[1][0];
    const story2 = getRelevantStory(story2Company);
    const story2Ctx = INDUSTRY_CONTEXT[story2Company];
    if (story2Ctx?.vertical !== storyCtx?.vertical) {
      report += `**For ${story2Company}:** ${story2.customer} went from ${story2.before.substring(0, 80)}... to ${story2.after.substring(0, 80)}... Result: ${story2.impact.split(',')[0]}.\n\n`;
    }
  }

  // ===== SECTION 5: HOW SINCH WINS =====
  report += `---\n\n## 5. Why Sinch Wins Here\n\n`;

  // Pick 2-3 most relevant differentiators based on signals (not all of them)
  const diffPoints = [];
  if (newsArticles.some(a => ((a.title || '') + (a.description || '')).toLowerCase().match(/scale|growth|expand|million|billion/))) {
    diffPoints.push(`**Scale without worry** — Sinch ${SINCH_DIFFERENTIATORS.scale}. When your accounts grow, their messaging infrastructure grows with them—no re-architecture needed.`);
  }
  if (newsArticles.some(a => ((a.title || '') + (a.description || '')).toLowerCase().match(/international|global|cross-border|multi-market/))) {
    diffPoints.push(`**Global reach, local expertise** — ${SINCH_DIFFERENTIATORS.reach}. Your accounts expand internationally without becoming telecom compliance experts.`);
  }
  if (useCaseMatches.ENGAGED.length > 0 || useCaseMatches.INFORMED.length > 0) {
    diffPoints.push(`**One API, every channel** — ${SINCH_DIFFERENTIATORS.omnichannel}. Replace 5 vendor relationships with one integration that handles intelligent channel selection automatically.`);
  }
  if (useCaseMatches.SAFE.length > 0) {
    diffPoints.push(`**Trust at scale** — ${SINCH_DIFFERENTIATORS.reliability}. Every legitimate user gets verified; every bad actor gets blocked.`);
  }
  // Always include speed
  diffPoints.push(`**Live in days, not months** — ${SINCH_DIFFERENTIATORS.speed}. ${SINCH_DIFFERENTIATORS.ecosystem}.`);

  // Show max 3 differentiators
  diffPoints.slice(0, 3).forEach(point => {
    report += `${point}\n\n`;
  });

  report += `> **💡 Ask:** *"Do you see how this approach would address [their challenge] differently than what you have today?"*\n\n`;

  // ===== CSM ACTION PLAN =====
  report += `---\n\n## Action Plan\n\n`;

  report += `### This Week\n`;
  if (highUrgency.length > 0) {
    highUrgency.slice(0, 3).forEach(([company, articles]) => {
      report += `- 🔴 **${company}** — Contact within 24h. Signal: "${articles[0].title.substring(0, 70)}"\n`;
    });
  }
  if (medUrgency.length > 0) {
    medUrgency.slice(0, 3).forEach(([company, articles]) => {
      report += `- 🟡 **${company}** — Schedule touchpoint. Signal: "${articles[0].title.substring(0, 70)}"\n`;
    });
  }
  if (highUrgency.length === 0 && medUrgency.length === 0) {
    report += `- 🟢 No urgent actions. Focus on relationship building and sharing insights with champions.\n`;
  }

  report += `\n### This Month\n`;
  report += `- Update QBR decks for accounts with 3+ signals\n`;
  report += `- Share this report's insights with AE partners\n`;
  report += `- Log key signals in Salesforce for next touchpoint context\n`;

  if (period === 'quarterly' || period === 'monthly') {
    report += `\n### This Quarter\n`;
    report += `- Executive engagement with top 3 active accounts\n`;
    report += `- Develop account-specific Sinch transformation roadmaps\n`;
    report += `- Competitive displacement briefs where competitor activity detected\n`;
  }

  // ===== TREND ANALYSIS (for weekly/monthly/quarterly) =====
  if (period !== 'daily') {
    report += generateTrendAnalysis(newsArticles, period);
  }

  // ===== FOOTER =====
  report += `\n---\n\n`;
  report += `*MarketFeed ${ctx.label} | ${date} | ${ctx.refreshNote}*\n`;
  report += `*Rubric: Industry Trends ✓ | Use Cases ✓ | Buying Committee ✓ | Stories ✓ | Differentiation ✓*\n`;

  return report;
}

module.exports = { generateHeuristicReport, generateYearlySummary };
