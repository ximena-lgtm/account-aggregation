import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "openfinance.db");
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS banks (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT, color TEXT, type TEXT,
  display_order INTEGER DEFAULT 999, enabled INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY, application_id TEXT NOT NULL, bank_id TEXT NOT NULL,
  scopes TEXT NOT NULL, purpose TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  expires_at TEXT, created_at TEXT NOT NULL, ledger_handle TEXT
);
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY, application_id TEXT NOT NULL, approved INTEGER NOT NULL,
  amount INTEGER, currency TEXT DEFAULT 'COP', rate REAL, term_months INTEGER,
  monthly_payment INTEGER, first_payment TEXT, rationale TEXT, created_at TEXT NOT NULL
);
`);

export default db;
