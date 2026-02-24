// 游戏类型
export const GAME_TYPES = {
  SHISANSHUI: 'shisanshui'
};

// 房间状态
export const ROOM_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  FINISHED: 'finished'
};

// 默认配置
export const DEFAULT_MAX_PLAYERS = 4;
export const ROOM_CODE_LENGTH = 6;

// Socket.io事件
export const SOCKET_EVENTS = {
  // 客户端 -> 服务器
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  START_GAME: 'start-game',
  SUBMIT_ROUND_SCORES: 'submit-round-scores',
  UPDATE_PLAYER_NAME: 'update-player-name',

  // 服务器 -> 客户端
  ROOM_UPDATED: 'room-updated',
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  GAME_STARTED: 'game-started',
  ROUND_CREATED: 'round-created',
  SCORES_SUBMITTED: 'scores-submitted',
  SCORE_VALIDATION_ERROR: 'score-validation-error',
  STATS_UPDATED: 'stats-updated',
  ERROR: 'error'
};
