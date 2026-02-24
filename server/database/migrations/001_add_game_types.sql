-- 游戏类型定义表
CREATE TABLE IF NOT EXISTS game_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,              -- 游戏类型代码（如 'texas-holdem'）
    name TEXT NOT NULL,                     -- 游戏名称（如 '德州扑克'）
    display_name TEXT NOT NULL,             -- 显示名称（支持自定义）
    is_custom BOOLEAN NOT NULL DEFAULT 0,   -- 是否为自定义游戏
    created_by INTEGER,                     -- 创建者（自定义游戏）
    min_players INTEGER NOT NULL DEFAULT 2,
    max_players INTEGER NOT NULL DEFAULT 10,
    validation_type TEXT NOT NULL DEFAULT 'none',  -- 'sum_equals', 'none', 'custom'
    validation_value INTEGER DEFAULT 0,     -- 验证目标值（如sum=0时为0）
    score_range_min INTEGER DEFAULT -1000,
    score_range_max INTEGER DEFAULT 1000,
    description TEXT,                       -- 游戏说明
    icon TEXT,                              -- 图标（emoji或URL）
    created_at INTEGER NOT NULL,
    FOREIGN KEY (created_by) REFERENCES players(id)
);

-- 插入预置游戏类型
INSERT INTO game_types (code, name, display_name, min_players, max_players, validation_type, validation_value, score_range_min, score_range_max, icon, created_at) VALUES
('shisanshui', '十三水', '十三水', 4, 4, 'sum_equals', 0, -100, 100, '🃏', strftime('%s', 'now') * 1000),
('texas-holdem', '德州扑克', '德州扑克', 2, 10, 'none', 0, -10000, 10000, '♠️', strftime('%s', 'now') * 1000),
('wushik', '五十K', '五十K', 3, 4, 'none', 0, -500, 500, '🎴', strftime('%s', 'now') * 1000),
('sandaier', '3带2', '3带2', 3, 6, 'none', 0, -200, 200, '🎲', strftime('%s', 'now') * 1000),
('paodekuai', '跑得快', '跑得快', 3, 4, 'none', 0, -100, 100, '🏃', strftime('%s', 'now') * 1000),
('zhajinhua', '炸金花', '炸金花', 2, 6, 'none', 0, -500, 500, '💥', strftime('%s', 'now') * 1000),
('niuniu', '牛牛', '牛牛', 2, 10, 'none', 0, -1000, 1000, '🐂', strftime('%s', 'now') * 1000),
('majiang', '麻将', '麻将', 4, 4, 'sum_equals', 0, -500, 500, '🀄', strftime('%s', 'now') * 1000),
('paijiu', '牌九', '牌九', 2, 8, 'none', 0, -1000, 1000, '🎰', strftime('%s', 'now') * 1000);

-- 修改rooms表，添加新字段
ALTER TABLE rooms ADD COLUMN game_type_id INTEGER REFERENCES game_types(id);
ALTER TABLE rooms ADD COLUMN custom_game_name TEXT;
ALTER TABLE rooms ADD COLUMN current_round INTEGER DEFAULT 0;

-- 为现有房间设置game_type_id（向后兼容）
UPDATE rooms
SET game_type_id = (SELECT id FROM game_types WHERE code = 'shisanshui')
WHERE game_type = 'shisanshui' AND game_type_id IS NULL;

-- 设置默认局数
UPDATE rooms SET current_round = 0 WHERE current_round IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_game_types_code ON game_types(code);
CREATE INDEX IF NOT EXISTS idx_game_types_is_custom ON game_types(is_custom);
CREATE INDEX IF NOT EXISTS idx_rooms_game_type_id ON rooms(game_type_id);
