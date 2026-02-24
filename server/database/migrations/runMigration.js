/**
 * 数据库迁移脚本执行器
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'card-game.db');
const db = new Database(dbPath);

console.log('开始执行数据库迁移...');

try {
  // 读取迁移SQL文件
  const migrationSQL = readFileSync(
    join(__dirname, '001_add_game_types.sql'),
    'utf-8'
  );

  // 直接执行整个迁移脚本（SQLite支持多语句执行）
  try {
    db.exec(migrationSQL);
    console.log('✓ 迁移脚本执行成功');
  } catch (error) {
    // 忽略"表已存在"或"列已存在"的错误
    if (error.message.includes('already exists') ||
        error.message.includes('duplicate column')) {
      console.log('⊙ 部分语句已存在，继续执行');
    } else {
      throw error;
    }
  }

  console.log('\n✓ 数据库迁移完成！');
  console.log('\n游戏类型列表:');

  const gameTypes = db.prepare('SELECT code, name, icon FROM game_types').all();
  gameTypes.forEach(gt => {
    console.log(`  ${gt.icon} ${gt.name} (${gt.code})`);
  });

} catch (error) {
  console.error('✗ 迁移失败:', error.message);
  process.exit(1);
} finally {
  db.close();
}
