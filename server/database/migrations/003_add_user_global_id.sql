-- 添加用户全局ID字段到玩家表
ALTER TABLE players ADD COLUMN user_global_id TEXT;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_players_user_global_id ON players(user_global_id);

-- 创建复合索引用于检查同一房间内的用户全局ID和玩家名称
CREATE INDEX IF NOT EXISTS idx_players_room_user_name ON players(room_id, user_global_id, name);
