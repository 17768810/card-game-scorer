/**
 * 房间历史管理
 */

const ROOM_HISTORY_KEY = 'roomHistory';
const MAX_HISTORY_ITEMS = 10;

/**
 * 添加房间到历史记录
 * @param {object} roomInfo - 房间信息
 */
export function addToRoomHistory(roomInfo) {
  const history = getRoomHistory();

  // 检查是否已存在
  const existingIndex = history.findIndex(r => r.code === roomInfo.code);
  if (existingIndex !== -1) {
    // 更新现有记录
    history[existingIndex] = {
      ...history[existingIndex],
      ...roomInfo,
      lastAccessed: Date.now()
    };
  } else {
    // 添加新记录
    history.unshift({
      ...roomInfo,
      lastAccessed: Date.now()
    });
  }

  // 限制历史记录数量
  const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

  localStorage.setItem(ROOM_HISTORY_KEY, JSON.stringify(trimmedHistory));
}

/**
 * 获取房间历史记录
 * @returns {Array} 房间历史列表
 */
export function getRoomHistory() {
  try {
    const data = localStorage.getItem(ROOM_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('获取房间历史失败:', error);
    return [];
  }
}

/**
 * 从历史记录中移除房间
 * @param {string} roomCode - 房间码
 */
export function removeFromRoomHistory(roomCode) {
  const history = getRoomHistory();
  const filtered = history.filter(r => r.code !== roomCode);
  localStorage.setItem(ROOM_HISTORY_KEY, JSON.stringify(filtered));
}

/**
 * 清空房间历史记录
 */
export function clearRoomHistory() {
  localStorage.removeItem(ROOM_HISTORY_KEY);
}
