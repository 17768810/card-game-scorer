import router from './js/router.js';
import socket from './js/socket.js';
import { GameLobby } from './js/components/GameLobby.js';
import { CustomGameCreator } from './js/components/CustomGameCreator.js';
import { renderRoomCreator } from './js/components/RoomCreator.js';
import { renderRoomJoiner } from './js/components/RoomJoiner.js';
import { renderPlayerList, updatePlayerList, setupPlayerListHandlers } from './js/components/PlayerList.js';
import { renderShareLink, setupShareLinkHandlers } from './js/components/ShareLink.js';
import { renderRoundInput, setupRoundInputHandlers } from './js/components/RoundInput.js';
import { renderScoreBoard, renderRoundHistory, updateScoreBoard, updateRoundHistory, setupRoundHistoryHandlers, setupExportHandlers } from './js/components/ScoreBoard.js';
import { getRoomByCode, getRoomPlayers, getRoomStats, getRoundHistory, getNextRoundNumber } from './js/api.js';

// 初始化Socket.io连接
socket.connect();

// 注册路由
router.register('lobby', renderLobby);
router.register('create-room', renderCreateRoom);
router.register('create-custom', renderCreateCustom);
router.register('join', renderJoin);
router.register('room', renderRoom);
router.register('404', render404);

// 启动路由
router.start();

// 游戏大厅
async function renderLobby() {
  const container = document.getElementById('main-content');
  const lobby = new GameLobby();
  const lobbyElement = await lobby.render();
  container.innerHTML = '';
  container.appendChild(lobbyElement);
}

// 创建房间页面
async function renderCreateRoom() {
  await renderRoomCreator();
}

// 创建自定义游戏页面
async function renderCreateCustom() {
  const container = document.getElementById('main-content');
  const creator = new CustomGameCreator();
  const creatorElement = await creator.render();
  container.innerHTML = '';
  container.appendChild(creatorElement);
}

// 加入房间页面
function renderJoin() {
  renderRoomJoiner();
}

// 房间页面
async function renderRoom({ roomCode }) {
  const container = document.getElementById('main-content');

  // 显示加载状态
  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    // 获取房间信息
    const room = await getRoomByCode(roomCode);
    const players = await getRoomPlayers(roomCode);
    const stats = await getRoomStats(roomCode);
    const rounds = await getRoundHistory(roomCode);
    const nextRoundNumber = await getNextRoundNumber(roomCode);

    // 获取当前玩家信息
    const currentPlayerData = localStorage.getItem('currentPlayer');
    let currentPlayer = null;

    if (currentPlayerData) {
      currentPlayer = JSON.parse(currentPlayerData);

      // 检查是否是同一个房间
      if (currentPlayer.roomCode !== roomCode) {
        // 不是同一个房间，检查是否已经在这个房间中
        const existingPlayer = players.find(p => p.name === currentPlayer.playerName);
        if (existingPlayer) {
          // 更新localStorage中的房间信息
          currentPlayer = {
            roomCode,
            playerId: existingPlayer.id,
            playerName: existingPlayer.name,
            roomPassword: currentPlayer.roomPassword
          };
          localStorage.setItem('currentPlayer', JSON.stringify(currentPlayer));
        } else {
          // 不在这个房间中，清空当前玩家信息
          currentPlayer = null;
        }
      }
    }

    // 渲染房间页面
    container.innerHTML = `
      <div class="room-container">
        <!-- 顶部操作栏 -->\n        <div class="room-header">
          ${renderShareLink(roomCode)}
          <button id="back-home-btn" class="btn btn-secondary btn-sm">
            <span>🏠</span> 回到首页
          </button>
        </div>

        <!-- 左侧：玩家列表 -->
        <div class="players-section">
          <div class="card">
            <h2 class="card-title">玩家列表 (${players.length}人)</h2>
            <div id="player-list-container">
              ${renderPlayerList(players, currentPlayer?.playerId, roomCode)}
            </div>
          </div>

          ${room.status === 'waiting' && players.length >= 2 ? `
            <button id="start-game-btn" class="btn btn-success" style="width: 100%;">
              开始游戏
            </button>
          ` : ''}
        </div>

        <!-- 右侧：游戏区域 -->
        <div class="game-section">
          ${room.status === 'active' || rounds.length > 0 ? `
            <!-- 积分输入 -->
            <div id="round-input-container">
              ${renderRoundInput(players, roomCode, nextRoundNumber, currentPlayer?.playerId)}
            </div>

            <!-- 积分榜 -->
            <div class="card">
              <div class="scoreboard-header">
                <h2 class="scoreboard-title">积分榜</h2>
                <button id="export-stats-btn">
                  <span>📊</span> 导出明细
                </button>
              </div>
              <div id="scoreboard-container">
                ${renderScoreBoard(stats)}
              </div>
            </div>

            <!-- 历史记录 -->
            <div class="card">
              <h2 class="card-title">历史记录</h2>
              <div id="round-history-container">
                ${renderRoundHistory(rounds, currentPlayer?.playerId, players)}
              </div>
            </div>
          ` : `
            <div class="card">
              <h2 class="card-title">等待开始</h2>
              <p class="text-secondary">
                ${players.length < 2
                  ? '至少需要2名玩家才能开始游戏'
                  : '人数已满足，房主可以开始游戏'}
              </p>
            </div>
          `}
        </div>
      </div>
    `;

    // 设置分享链接处理器
    setupShareLinkHandlers();

    // 设置玩家列表处理器
    setupPlayerListHandlers(roomCode);

    // 设置积分输入处理器
    if (room.status === 'active' || rounds.length > 0) {
      setupRoundInputHandlers(players, roomCode, nextRoundNumber, currentPlayer?.playerId);
      // 设置历史记录删除处理器
      setupRoundHistoryHandlers(roomCode, currentPlayer?.playerId, players, rounds);
      // 设置导出处理器
      setupExportHandlers(stats, rounds, roomCode);
    }

    // 设置开始游戏按钮
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
      startGameBtn.addEventListener('click', () => {
        socket.emit('start-game', { roomCode });
      });
    }

    // 设置回到首页按钮
    const backHomeBtn = document.getElementById('back-home-btn');
    if (backHomeBtn) {
      backHomeBtn.addEventListener('click', () => {
        router.navigate('/');
      });
    }

    // 加入Socket.io房间
    if (currentPlayer && currentPlayer.roomCode === roomCode) {
      socket.emit('join-room', {
        roomCode,
        playerId: currentPlayer.playerId,
        password: currentPlayer.roomPassword || null
      });
    }

    // 监听Socket.io事件
    setupSocketListeners(roomCode, currentPlayer?.playerId);

    // 监听Socket重连事件
    window.addEventListener('socket-reconnected', () => {
      console.log('Socket重连，刷新房间状态');
      router.handleRoute();
    });

  } catch (error) {
    container.innerHTML = `
      <div class="card">
        <div class="alert alert-error">
          ${error.message}
        </div>
        <button id="back-home-btn" class="btn btn-primary">返回首页</button>
      </div>
    `;

    document.getElementById('back-home-btn').addEventListener('click', () => {
      router.navigate('/');
    });
  }
}

// 清理Socket.io事件监听
function cleanupSocketListeners() {
  socket.removeAllListeners('player-joined');
  socket.removeAllListeners('player-left');
  socket.removeAllListeners('game-started');
  socket.removeAllListeners('stats-updated');
  socket.removeAllListeners('error');
  console.log('Socket listeners cleaned up');
}

// 更新房间UI状态（玩家数、开始按钮、等待消息）
function updateRoomUIState(players, roomStatus, roomCode) {
  // 更新玩家数标题
  const playerListTitle = document.querySelector('.players-section .card-title');
  if (playerListTitle) {
    playerListTitle.textContent = `玩家列表 (${players.length}人)`;
  }

  // 更新开始按钮
  const startButtonContainer = document.querySelector('.players-section');
  const existingStartButton = document.getElementById('start-game-btn');

  if (roomStatus === 'waiting' && players.length >= 2) {
    // 应该显示开始按钮
    if (!existingStartButton) {
      // 创建开始按钮
      const buttonHtml = `
        <button id="start-game-btn" class="btn btn-success" style="width: 100%;">
          开始游戏
        </button>
      `;
      startButtonContainer.insertAdjacentHTML('beforeend', buttonHtml);

      // 添加事件监听 - 使用Socket.io
      document.getElementById('start-game-btn').addEventListener('click', () => {
        socket.emit('start-game', { roomCode });
      });
    }
  } else {
    // 不应该显示开始按钮
    if (existingStartButton) {
      existingStartButton.remove();
    }
  }

  // 更新等待消息
  const waitingCard = document.querySelector('.game-section .card');
  if (waitingCard && roomStatus === 'waiting') {
    const waitingMessage = waitingCard.querySelector('.text-secondary');
    if (waitingMessage) {
      waitingMessage.textContent = players.length < 2
        ? '至少需要2名玩家才能开始游戏'
        : '人数已满足，房主可以开始游戏';
    }
  }
}

// 更新积分输入区域（当玩家加入/离开时）
async function updateRoundInputArea(roomCode, currentPlayerId, players) {
  const container = document.getElementById('round-input-container');
  if (!container) {
    return; // 如果容器不存在，说明不在游戏页面
  }

  try {
    // 获取下一局次号
    const nextRoundNumber = await getNextRoundNumber(roomCode);

    // 重新渲染积分输入区域
    container.innerHTML = renderRoundInput(players, roomCode, nextRoundNumber, currentPlayerId);

    // 重新设置事件处理器
    setupRoundInputHandlers(players, roomCode, nextRoundNumber, currentPlayerId);

    console.log('积分输入区域已更新，当前玩家数:', players.length);
  } catch (error) {
    console.error('更新积分输入区域失败:', error);
  }
}

// 设置Socket.io事件监听
function setupSocketListeners(roomCode, currentPlayerId) {
  // 先清理旧的监听器
  cleanupSocketListeners();

  // 玩家加入
  socket.on('player-joined', async (data) => {
    updatePlayerList(data.players, currentPlayerId, roomCode);
    updateRoomUIState(data.players, data.room?.status || 'waiting', roomCode);

    // 如果游戏已开始，更新积分输入区域
    if (data.room?.status === 'active') {
      await updateRoundInputArea(roomCode, currentPlayerId, data.players);
    }
  });

  // 玩家离开
  socket.on('player-left', async (data) => {
    updatePlayerList(data.players, currentPlayerId, roomCode);
    updateRoomUIState(data.players, data.room?.status || 'waiting', roomCode);

    // 如果游戏已开始，更新积分输入区域
    if (data.room?.status === 'active') {
      await updateRoundInputArea(roomCode, currentPlayerId, data.players);
    }
  });

  // 游戏开始
  socket.on('game-started', () => {
    // 重新加载页面
    router.handleRoute();
  });

  // 积分更新
  socket.on('stats-updated', (data) => {
    updateScoreBoard(data.stats);
    if (data.players) {
      updateRoundHistory(data.rounds, roomCode, currentPlayerId, data.players);
    }
  });

  // 局次删除
  socket.on('round-deleted', (data) => {
    // 更新局数显示
    const titleEl = document.querySelector('#round-input-container .card-title');
    if (titleEl && data.rounds) {
      // 获取当前最大局数
      const maxRound = data.rounds.length > 0 ? Math.max(...data.rounds.map(r => r.round_number)) : 0;
      // 下一局应该是maxRound + 1
      titleEl.textContent = `第 ${maxRound + 1} 局 - 输入积分`;
    }
  });

  // 玩家被踢
  socket.on('player-kicked', (data) => {
    if (data.playerId === currentPlayerId) {
      // 清除localStorage中的玩家信息
      localStorage.removeItem('currentPlayer');
      alert('您已被房主踢出房间');
      router.navigate('/');
    } else {
      // 显示提示
      const message = `玩家 "${data.playerName}" 已被踢出房间`;
      showNotification(message);
    }
  });

  // 错误处理
  socket.on('error', (data) => {
    alert(`错误: ${data.message}`);
  });
}

// 显示通知消息
function showNotification(message) {
  const container = document.getElementById('main-content');
  const notificationDiv = document.createElement('div');
  notificationDiv.className = 'alert alert-info';
  notificationDiv.textContent = message;
  notificationDiv.style.position = 'fixed';
  notificationDiv.style.top = '20px';
  notificationDiv.style.right = '20px';
  notificationDiv.style.zIndex = '1000';

  container.appendChild(notificationDiv);

  setTimeout(() => {
    notificationDiv.remove();
  }, 3000);
}

// 404页面
function render404() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="card">
      <h2 class="card-title">页面未找到</h2>
      <p class="text-secondary">您访问的页面不存在</p>
      <button id="back-home-btn" class="btn btn-primary">返回首页</button>
    </div>
  `;

  document.getElementById('back-home-btn').addEventListener('click', () => {
    router.navigate('/');
  });
}
