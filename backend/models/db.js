const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
let dbPath = process.env.DB_PATH || path.resolve(__dirname, '../news.db');

const dataDir = path.dirname(dbPath);
if (dataDir !== process.cwd()) {
    try {
        if (!fs.existsSync(dataDir)) {
            console.log(`Creating data directory: ${dataDir}`);
            fs.mkdirSync(dataDir, { recursive: true });
        }
    } catch (e) {
        console.error(`Error creating data directory: ${e.message}. Falling back to current directory.`);
        dbPath = path.join(process.cwd(), 'news.db');
    }
}
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Database error:', err.message);
  else {
    console.log('Connected to SQLite at', dbPath);
    // Optimize SQLite for high concurrency and prevent locking warnings
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA synchronous = NORMAL');
    db.run('PRAGMA busy_timeout = 15000'); // 15s timeout
    db.run('PRAGMA cache_size = -2000'); // 2MB cache
    initializeDatabase();
  }
});
function initializeDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY, company TEXT NOT NULL, title TEXT NOT NULL, description TEXT, url TEXT UNIQUE, source TEXT, imageUrl TEXT, category TEXT, publishedAt DATETIME, fetchedAt DATETIME DEFAULT CURRENT_TIMESTAMP, author TEXT, isRead BOOLEAN DEFAULT 0, isFavorite BOOLEAN DEFAULT 0, sentiment TEXT, UNIQUE(title, company))`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_company ON news(company)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_publishedAt ON news(publishedAt)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_fetchedAt ON news(fetchedAt)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_category ON news(category)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_filter ON news(company, publishedAt, category)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_url ON news(url)`);
  });
}
const db_helpers = {
  all: (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows))),
  get: (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))),
  run: (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { if (err) reject(err); else resolve({ id: this.lastID, changes: this.changes }); })),
  close: () => new Promise((resolve, reject) => db.close((err) => err ? reject(err) : resolve()))
};
module.exports = { db, db_helpers };
