# API 文档

## 基础信息

- 基础URL: `/api`
- 数据格式: JSON
- 字符编码: UTF-8

## 响应格式

所有API响应遵循统一格式：

```json
{
  "success": true,
  "data": {},
  "error": "错误信息（仅在失败时）"
}
```

## REST API

### 健康检查

**GET** `/health`

检查服务器状态。

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": 1706284800000,
  "uptime": 3600
}
```

---

### 创建房间

**POST** `/rooms`

创建新房间。

**请求体：**
```json
{
  "gameType": "shisanshui",
  "creatorName": "玩家1",
  "settings": {}
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "ABC123",
    "gameType": "shisanshui",
    "status": "waiting",
    "maxPlayers": 4,
    "createdAt": 1706284800000,
    "creatorId": 1,
    "settings": {}
  }
}
```

---

### 获取房间信息

**GET** `/rooms/:code`

根据房间码获取房间信息。

**路径参数：**
- `code`: 房间码（6位）

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "ABC123",
    "game_type": "shisanshui",
    "creator_id": 1,
    "status": "active",
    "max_players": 4,
    "created_at": 1706284800000,
    "started_at": 1706285000000,
    "finished_at": null,
    "settings": {}
  }
}
```

---

### 获取玩家列表

**GET** `/rooms/:code/players`

获取房间内所有玩家。

**路径参数：**
- `code`: 房间码

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "room_id": 1,
      "name": "玩家1",
      "position": 1,
      "is_creator": true,
      "joined_at": 1706284800000,
      "last_active": 1706285000000
    }
  ]
}
```

---

### 加入房间

**POST** `/rooms/:code/players`

加入指定房间。

**路径参数：**
- `code`: 房间码

**请求体：**
```json
{
  "playerName": "玩家2"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "roomId": 1,
    "name": "玩家2",
    "position": 2,
    "isCreator": false,
    "joinedAt": 1706285000000,
    "lastActive": 1706285000000
  }
}
```

---

### 更新玩家名称

**PATCH** `/rooms/:code/players/:playerId`

更新玩家名称。

**路径参数：**
- `code`: 房间码
- `playerId`: 玩家ID

**请求体：**
```json
{
  "name": "新名称"
}
```

**响应示例：**
```json
{
  "success": true
}
```

---

### 移除玩家

**DELETE** `/rooms/:code/players/:playerId`

移除玩家（不能移除房主）。

**路径参数：**
- `code`: 房间码
- `playerId`: 玩家ID

**响应示例：**
```json
{
  "success": true
}
```

---

### 获取局次历史

**GET** `/rooms/:code/rounds`

获取所有局次及积分记录。

**路径参数：**
- `code`: 房间码

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "round_number": 1,
      "created_at": 1706285000000,
      "completed_at": 1706285100000,
      "scores": [
        {
          "player_id": 1,
          "player_name": "玩家1",
          "score": 3
        },
        {
          "player_id": 2,
          "player_name": "玩家2",
          "score": -1
        }
      ]
    }
  ]
}
```

---

### 获取统计信息

**GET** `/rooms/:code/stats`

获取所有玩家的统计数据。

**路径参数：**
- `code`: 房间码

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "player_id": 1,
      "player_name": "玩家1",
      "total_score": 10,
      "rounds_played": 5,
      "rounds_won": 3,
      "highest_round_score": 5,
      "lowest_round_score": -2,
      "average_score": 2.0
    }
  ]
}
```

---

### 创建新局

**POST** `/rooms/:code/rounds`

获取下一个局次号。

**路径参数：**
- `code`: 房间码

**响应示例：**
```json
{
  "success": true,
  "data": {
    "roundNumber": 6
  }
}
```

---

## Socket.io 事件

### 客户端 → 服务器

#### join-room

加入房间。

**数据：**
```json
{
  "roomCode": "ABC123",
  "playerId": 1
}
```

---

#### leave-room

离开房间。

**数据：** 无

---

#### start-game

开始游戏（仅房主）。

**数据：**
```json
{
  "roomCode": "ABC123"
}
```

---

#### submit-round-scores

提交本局积分。

**数据：**
```json
{
  "roomCode": "ABC123",
  "roundNumber": 1,
  "scores": [
    { "playerId": 1, "score": 3 },
    { "playerId": 2, "score": -1 },
    { "playerId": 3, "score": -1 },
    { "playerId": 4, "score": -1 }
  ],
  "enteredBy": 1
}
```

---

#### update-player-name

更新玩家名称。

**数据：**
```json
{
  "playerId": 1,
  "name": "新名称"
}
```

---

### 服务器 → 客户端

#### room-updated

房间信息更新。

**数据：**
```json
{
  "players": [...]
}
```

---

#### player-joined

新玩家加入。

**数据：**
```json
{
  "player": {...},
  "players": [...]
}
```

---

#### player-left

玩家离开。

**数据：**
```json
{
  "playerId": 1,
  "players": [...]
}
```

---

#### game-started

游戏开始。

**数据：**
```json
{
  "roomId": 1,
  "startedAt": 1706285000000
}
```

---

#### round-created

新局开始。

**数据：**
```json
{
  "roundNumber": 1,
  "roundId": 1
}
```

---

#### scores-submitted

积分已提交。

**数据：**
```json
{
  "roundNumber": 1,
  "roundId": 1,
  "scores": [...]
}
```

---

#### score-validation-error

积分验证失败。

**数据：**
```json
{
  "error": "积分总和必须为0，当前总和：2"
}
```

---

#### stats-updated

统计信息更新。

**数据：**
```json
{
  "stats": [...],
  "rounds": [...]
}
```

---

#### error

错误消息。

**数据：**
```json
{
  "message": "错误描述"
}
```

---

## 错误代码

| HTTP状态码 | 说明 |
|-----------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 数据模型

### Room（房间）

```typescript
{
  id: number;
  code: string;              // 6位房间码
  game_type: string;         // 游戏类型
  creator_id: number;        // 创建者ID
  status: string;            // waiting | active | finished
  max_players: number;       // 最大玩家数
  created_at: number;        // 创建时间（毫秒时间戳）
  started_at: number | null; // 开始时间
  finished_at: number | null;// 结束时间
  settings: object;          // 房间设置
}
```

### Player（玩家）

```typescript
{
  id: number;
  room_id: number;
  name: string;              // 玩家名称
  position: number;          // 座位号（1-4）
  is_creator: boolean;       // 是否为房主
  joined_at: number;         // 加入时间
  last_active: number;       // 最后活跃时间
}
```

### Round（局次）

```typescript
{
  id: number;
  room_id: number;
  round_number: number;      // 局次号
  created_at: number;        // 创建时间
  completed_at: number | null; // 完成时间
  notes: string | null;      // 备注
}
```

### Score（积分）

```typescript
{
  id: number;
  round_id: number;
  player_id: number;
  score: number;             // 积分（可正可负）
  entered_by: number | null; // 输入者ID
  entered_at: number;        // 输入时间
}
```

### PlayerStats（玩家统计）

```typescript
{
  id: number;
  player_id: number;
  room_id: number;
  total_score: number;       // 总分
  rounds_played: number;     // 已玩局数
  rounds_won: number;        // 胜局数
  highest_round_score: number; // 最高单局分
  lowest_round_score: number;  // 最低单局分
  average_score: number;     // 平均分
  last_updated: number;      // 最后更新时间
}
```

## 使用示例

### JavaScript (Fetch API)

```javascript
// 创建房间
const response = await fetch('/api/rooms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    gameType: 'shisanshui',
    creatorName: '玩家1'
  })
});

const data = await response.json();
console.log(data.data.code); // 房间码
```

### Socket.io Client

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// 加入房间
socket.emit('join-room', {
  roomCode: 'ABC123',
  playerId: 1
});

// 监听积分更新
socket.on('stats-updated', (data) => {
  console.log('统计更新:', data.stats);
});
```
