# MarketFeed | Marketing Strategic Insights Dashboard

A professional, AI-driven marketing news aggregator designed for Customer Success Managers (CSMs) and marketing teams to track strategic updates from 20 key global companies.

## 🚀 Key Features

- **AI-Driven Insights**:
  - **AI Chat Assistant**: Ask questions about market trends or specific company news.
  - **CSM Strategy Report**: One-click generation of marketing analysis and strategic plans based on "Strategic Insights".
- **Advanced Aggregation**:
  - **No API Keys Required**: Uses public RSS feeds, TechCrunch, and optimized web scraping (Bing, DuckDuckGo).
  - **Premium Source Focus**: Targets LinkedIn, NYT, WSJ, Bloomberg, and Official Websites.
  - **Smart Categorization**: Automatically classifies news into *Strategic Insights*, *Finance*, *Marketing*, *Technology*, and *General*.
- **Modern UI/UX**:
  - **iOS-style Glassmorphism**: A sleek, professional dashboard with dark mode support.
  - **Quick Time Filters**: Instant filtering for 3h, 24h, 1w, 1m, and 3m.
  - **Company Selector**: Grid-based visual selector for the 20 tracked companies.
  - **Responsive Design**: Optimized for both desktop and mobile viewing.

## 🏢 Tracked Companies (20)

- **Finance**: HSBC, DBS, Bank of China, Citigroup, Standard Chartered, Binance, Aeon Credit.
- **Technology**: Grab, Didi, Gojek, Tencent, ByteDance.
- **Marketing/E-commerce**: Alibaba, PDD, Temu, ShopBack.
- **General/Other**: Cathay Pacific, Ctrip, Vodafone, Government of Singapore.

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3 (Custom Properties, Glassmorphism), JavaScript (Vanilla).
- **Backend**: Node.js, Express.
- **AI**: OpenAI GPT-4o-mini integration.
- **Database**: SQLite (Local storage with auto-cleanup).
- **Scraping**: Axios, Cheerio, RSS-Parser.

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sxw031/sinch-marketing-news-reader.git
   cd sinch-marketing-news-reader
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key_here
   UPDATE_INTERVAL=1 # Hours between auto-updates
   DB_PATH=./news.db
   ```

3. **Start the application**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📂 Project Structure

```
MarketFeed/
├── backend/
│   ├── server.js           # Main entry & AI endpoints
│   ├── routes/             # API routing
│   ├── services/           # News fetching & AI logic
│   ├── models/             # Database helpers
│   └── config/             # Company & source registry
├── frontend/
│   ├── index.html          # Main dashboard UI
│   ├── css/                # Modern styling
│   └── js/                 # Frontend logic & AI interaction
├── news.db                 # SQLite database
└── README.md
```

## 🚀 Deployment on Render

1. Create a new **Web Service** on Render.
2. Connect your GitHub repository.
3. Use the following settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   - `OPENAI_API_KEY`: Your API key.
   - `NODE_VERSION`: `20.x`

## 📄 License

Internal use only for the Sinch CSM Team.
