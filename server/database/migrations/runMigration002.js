/**
 * 数据库迁移脚本执行器 - Room Enhancements
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'card-game.db');
const db = new Database(dbPath);

console.log('开始执行数据库迁移 002_add_room_enhancements...');

try {
  // 读取迁移SQL文件
  const migrationSQL = readFileSync(
    join(__dirname, '002_add_room_enhancements.sql'),
    'utf-8'
  );

  // 直接执行整个迁移脚本（SQLite支持多语句执行）
  try {
    db.exec(migrationSQL);
    console.log('✓ 迁移脚本执行成功');
  } catch (error) {
    // 忽略"列已存在"的错误
    if (error.message.includes('duplicate column name')) {
      console.log('⊙ 部分列已存在，继续执行');
    } else {
      throw error;
    }
  }

  console.log('\n✓ 数据库迁移完成！');
  console.log('\n房间表结构:');

  // 显示rooms表的列信息
  const columns = db.prepare('PRAGMA table_info(rooms)').all();
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });

} catch (error) {
  console.error('✗ 迁移失败:', error.message);
  process.exit(1);
} finally {
  db.close();
}
