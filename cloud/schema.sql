-- OpenBroker paid API (Cloudflare D1 / SQLite). Apply with: npm run cloud:db
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,            -- Google account id ("sub")
  email TEXT,
  credits REAL NOT NULL DEFAULT 0, -- Koo credits; 1 credit = ₹1 of AI usage
  created_at INTEGER NOT NULL
);

-- OpenBroker tokens the extension sends. Only SHA-256 hashes are stored, never the token itself.
CREATE TABLE IF NOT EXISTS tokens (
  hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);

-- One row per Razorpay payment id; `credited` makes repeated webhooks harmless.
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_paise INTEGER NOT NULL,
  credits REAL NOT NULL,
  credited INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- One row per AI call: what it cost and who paid.
CREATE TABLE IF NOT EXISTS usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  posts INTEGER NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost REAL NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS usage_user ON usage (user_id, created_at);
