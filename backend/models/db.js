const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use /tmp on Render (ephemeral but avoids path issues), or local for dev
const dbDir = process.env.RENDER ? '/tmp' : path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, 'news.db');
console.log(`[DB] Path: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('[DB] Connection error:', err.message); return; }
  console.log('[DB] Connected');
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA busy_timeout = 10000');
  initSchema();
});

function initSchema() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT,
      source TEXT,
      category TEXT DEFAULT 'General',
      publishedAt TEXT,
      fetchedAt TEXT DEFAULT (datetime('now')),
      UNIQUE(title, company)
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_company ON news(company)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_published ON news(publishedAt DESC)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_source ON news(source)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_category ON news(category)`);
  });
}

const query = {
  all: (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
  }),
  get: (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  }),
  run: (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  })
};

module.exports = { db, query };
