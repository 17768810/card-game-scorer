import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, 'card-game.db');
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 执行schema.sql
const schemaPath = join(__dirname, 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');
const statements = schema.split(';').filter(stmt => stmt.trim());
statements.forEach(stmt => {
  if (stmt.trim()) {
    db.exec(stmt);
  }
});
console.log('✓ schema 初始化完成');

// 执行所有migration
const migrations = [
  '001_add_game_types.sql',
  '002_add_room_enhancements.sql',
  '003_add_user_global_id.sql',
];

for (const file of migrations) {
  const sql = readFileSync(join(__dirname, 'migrations', file), 'utf-8');
  try {
    db.exec(sql);
    console.log(`✓ migration ${file} 执行成功`);
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
      console.log(`⊙ migration ${file} 已应用，跳过`);
    } else {
      console.error(`✗ migration ${file} 失败:`, err.message);
      process.exit(1);
    }
  }
}

console.log('数据库初始化完成');
console.log('数据库路径:', dbPath);

process.exit(0);
