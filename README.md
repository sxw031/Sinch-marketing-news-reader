# Marketing News Reader

An internal marketing news aggregator for tracking the latest news and updates from major companies.

## Supported Companies (20 total)

### Banking & Finance (5)
- HSBC
- DBS
- Bank of China
- Citigroup
- Aeon Credit

### E-commerce & Fintech (4)
- Alibaba
- PDD
- Temu
- ShopBack

### Super Apps & Ride-hailing (3)
- Grab
- Didi
- Gojek

### Technology & Media (3)
- Tencent
- ByteDance
- Binance

### Travel & Hospitality
- Ctrip

### Airlines & Energy
- Cathay Pacific
- VGE

### Specialized Services
- Charter Bank
- Government of Singapore

## Features

- **Multi-source Aggregation**: Pulls from public RSS feeds and official company sources via web scraping
- **Real-time Updates**: Updates within 1 hour
- **Smart Filtering**: Filter by company, date range, and category
- **Authentic Sources**: Prioritizes verified news sources to avoid misinformation
- **Team Sharing**: Built for 10-member teams to share marketing insights
- **Light & Fast**: Minimal dependencies, quick load times

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js with Express
- **Database**: SQLite (local)
- **Data Sources**: Public RSS feeds, web scraping (Cheerio)

## Installation

```bash
git clone https://github.com/sxw031/sinch-marketing-news-reader.git
cd sinch-marketing-news-reader
npm install
```

## Environment Setup

Create a `.env` file in the root directory:

```
# NEWSAPI_KEY is no longer required
PORT=3000
DB_PATH=./data/news.db
UPDATE_INTERVAL=60
```

This application uses public data sources and does not require any API keys.

## Running the Application

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production

```bash
npm start
```

## Project Structure

```
sinch-marketing-news-reader/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   └── news.js
│   ├── controllers/
│   │   └── newsController.js
│   ├── services/
│   │   ├── newsAggregator.js
│   │   ├── newsApi.js
│   │   ├── rssFeedFetcher.js
│   │   └── webScraper.js
│   ├── models/
│   │   └── db.js
│   └── config/
│       └── sources.js
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── data/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## API Endpoints

### Get all news
```
GET /api/news
```

### Get news by company
```
GET /api/news?company=HSBC&limit=20
```

### Filter by date range
```
GET /api/news?company=Alibaba&startDate=2024-01-01&endDate=2024-01-31
```

### Get multiple companies
```
GET /api/news?companies=Grab,Didi,Gojek&limit=50
```

### Get companies list
```
GET /api/news/companies
```

### Trigger manual aggregation
```
POST /api/news/aggregate
```

## Features

### Multi-Source News Aggregation
- **Web Search**: Public news results from search engines
- **RSS Feeds**: Official company news feeds
- **Web Scraping**: Latest announcements from official websites

### Smart Filtering
- Filter by individual companies or multiple companies
- Date range filtering
- Full-text search across titles and descriptions
- Category-based filtering

### Auto-Updates
- Automatic news fetching every hour
- Duplicate detection and prevention
- Old news cleanup (keeps last 30 days)
- Scheduled aggregation with logging

### Beautiful UI
- Responsive design for all devices
- Dark mode compatible
- Quick company selection
- Real-time statistics
- Modal view for full articles
- Persistent filter settings

## Contributing

For internal team members: Please follow the contribution guidelines and test locally before sharing.

## License

Internal use only
