import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, '../../database/card-game.db');

// 如果数据库不存在，先初始化
if (!existsSync(dbPath)) {
  const schemaPath = join(__dirname, '../../database/schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  const statements = schema.split(';').filter(stmt => stmt.trim());
  statements.forEach(stmt => {
    if (stmt.trim()) {
      db.exec(stmt);
    }
  });

  console.log('数据库自动初始化完成');
}

// 创建数据库连接
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL'); // 提高并发性能

export default db;
