import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../database/card-game.db');
const migrationsPath = join(__dirname, '../../database/migrations');

console.log('开始数据库迁移...');
console.log('数据库路径:', dbPath);

const db = new Database(dbPath);

// 读取并执行迁移文件
const migrationFile = join(migrationsPath, '003_add_user_global_id.sql');

if (fs.existsSync(migrationFile)) {
  console.log(`执行迁移: ${migrationFile}`);
  const sql = fs.readFileSync(migrationFile, 'utf8');

  try {
    db.exec(sql);
    console.log('✓ 迁移成功完成');
  } catch (error) {
    console.error('✗ 迁移失败:', error.message);
    process.exit(1);
  }
} else {
  console.error('✗ 迁移文件不存在');
  process.exit(1);
}

db.close();
console.log('数据库迁移完成');
