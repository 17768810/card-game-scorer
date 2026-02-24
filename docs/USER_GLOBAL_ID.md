# 用户全局ID和玩家名称验证功能

## 功能概述

实现了两个核心功能：

### 1. 用户全局唯一ID (User Global ID)

每个用户在首次访问时会自动获得一个全局唯一的UUID，保存在浏览器Cookie中，有效期为1年。

**实现细节：**
- Cookie名称：`user_global_id`
- 过期时间：365天
- 自动生成：首次访问时自动创建
- 持久化：保存在浏览器Cookie中

**工具函数：**
```javascript
import { getUserGlobalId } from './utils/cookies.js';

// 获取或创建用户全局ID
const userId = getUserGlobalId();
```

### 2. 房间内玩家名称唯一性验证

基于用户全局ID和玩家名称进行识别，确保同一房间内不允许有相同的玩家名称（不同用户）。

**验证逻辑：**

1. **同一用户重新加入**：
   - 如果用户全局ID匹配，允许重新加入
   - 更新玩家的活跃时间
   - 保留原有的玩家信息和位置

2. **不同用户使用相同名称**：
   - 检测到同名但用户ID不同
   - 返回错误：`该房间内已存在同名玩家，请使用其他名称`
   - 阻止加入房间

3. **新用户加入**：
   - 验证名称在房间内唯一
   - 创建新的玩家记录
   - 关联用户全局ID

## 数据库变更

### 新增字段

在 `players` 表中添加了 `user_global_id` 字段：

```sql
ALTER TABLE players ADD COLUMN user_global_id TEXT;
```

### 新增索引

```sql
-- 单列索引
CREATE INDEX IF NOT EXISTS idx_players_user_global_id ON players(user_global_id);

-- 复合索引（用于快速查询）
CREATE INDEX IF NOT EXISTS idx_players_room_user_name ON players(room_id, user_global_id, name);
```

## API变更

### 创建房间 API

**请求：** `POST /api/rooms`

**新增参数：**
```json
{
  "gameTypeId": 1,
  "creatorName": "玩家1",
  "userGlobalId": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
}
```

### 加入房间 API

**请求：** `POST /api/rooms/:code/players`

**新增参数：**
```json
{
  "playerName": "玩家2",
  "userGlobalId": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
}
```

## 前端变更

### 1. Cookie工具模块

新增文件：`client/src/js/utils/cookies.js`

提供以下功能：
- `setCookie(name, value, days)` - 设置Cookie
- `getCookie(name)` - 获取Cookie
- `deleteCookie(name)` - 删除Cookie
- `generateUUID()` - 生成UUID v4
- `getUserGlobalId()` - 获取或创建用户全局ID

### 2. 组件更新

**RoomCreator.js：**
- 创建房间时自动获取用户全局ID
- 将用户ID发送到后端
- 保存到localStorage

**RoomJoiner.js：**
- 加入房间时自动获取用户全局ID
- 将用户ID发送到后端
- 保存到localStorage

## 使用场景

### 场景1：用户首次创建房间

1. 用户访问网站
2. 系统自动生成UUID并保存到Cookie
3. 用户创建房间，输入名称"张三"
4. 系统记录：用户ID + 玩家名称"张三"

### 场景2：同一用户重新加入

1. 用户关闭浏览器后重新打开
2. 系统从Cookie读取用户ID
3. 用户点击分享链接进入房间
4. 系统识别：用户ID匹配，直接进入房间

### 场景3：不同用户尝试使用相同名称

1. 用户A（ID: aaa-bbb）创建房间，名称"张三"
2. 用户B（ID: ccc-ddd）尝试加入，也输入"张三"
3. 系统检测：名称相同但用户ID不同
4. 返回错误：`该房间内已存在同名玩家，请使用其他名称`

### 场景4：同一用户更换名称

1. 用户A（ID: aaa-bbb）在房间A中名称为"张三"
2. 用户A加入房间B，输入名称"李四"
3. 系统允许：不同房间可以使用不同名称

## 迁移步骤

### 1. 运行数据库迁移

```bash
cd server
node src/scripts/migrate-user-global-id.js
```

### 2. 重启服务器

```bash
cd server
npm run dev
```

### 3. 重新构建前端

```bash
cd client
npm run build
```

## 测试验证

### 测试1：用户ID生成

1. 清除浏览器Cookie
2. 访问网站
3. 打开开发者工具 > Application > Cookies
4. 验证存在 `user_global_id` Cookie
5. 验证过期时间为1年后

### 测试2：重复名称检测

1. 用户A创建房间，名称"测试玩家"
2. 在隐私模式/另一浏览器中打开
3. 用户B尝试加入，输入"测试玩家"
4. 验证显示错误提示

### 测试3：同一用户重新加入

1. 用户A创建房间
2. 关闭浏览器
3. 重新打开，点击分享链接
4. 验证自动进入房间，无需重新输入名称

## 注意事项

1. **Cookie隐私**：用户ID仅用于房间内玩家识别，不涉及个人信息
2. **跨设备**：不同设备会有不同的用户ID
3. **清除Cookie**：用户清除Cookie后会生成新的ID
4. **兼容性**：支持所有现代浏览器的Cookie功能

## 后续优化建议

1. 添加用户ID到数据库查询日志
2. 实现用户ID的统计分析
3. 支持用户ID的手动重置功能
4. 添加用户ID的导出功能（用于数据分析）
