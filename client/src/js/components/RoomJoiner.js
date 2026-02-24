import { joinRoom, getRoomByCode, API } from '../api.js';
import router from '../router.js';
import { addToRoomHistory } from '../roomHistory.js';
import { getUserGlobalId } from '../utils/cookies.js';

export async function renderRoomJoiner() {
  const container = document.getElementById('main-content');

  // 检查URL参数中是否有房间码
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('code') || '';

  // 如果URL中有房间码，检查玩家是否已经加入过这个房间
  if (roomCode) {
    // 显示加载状态
    container.innerHTML = '<div class="loading">正在检查房间信息...</div>';

    const currentPlayerData = localStorage.getItem('currentPlayer');
    if (currentPlayerData) {
      try {
        const currentPlayer = JSON.parse(currentPlayerData);

        // 检查是否是同一个房间
        if (currentPlayer.roomCode === roomCode) {
          // 验证玩家是否仍在房间中
          const room = await getRoomByCode(roomCode);
          const response = await API.get(`/rooms/${roomCode}/players`);
          const players = response.data;

          // 检查玩家是否还在房间中
          const playerStillInRoom = players.some(p => p.id === currentPlayer.playerId);

          if (playerStillInRoom) {
            // 玩家仍在房间中，直接跳转
            container.innerHTML = '<div class="loading">正在进入房间...</div>';
            router.navigate(`/room/${roomCode}`);
            return;
          }
        }
      } catch (error) {
        console.log('Auto-join check failed:', error);
        // 如果检查失败，继续显示加入表单
      }
    }
  }

  container.innerHTML = `
    <div class="home-container">
      <div class="card">
        <h2 class="card-title">加入房间</h2>
        <form id="join-room-form">
          <div class="form-group">
            <label class="form-label" for="room-code">房间码</label>
            <input
              type="text"
              id="room-code"
              class="form-input"
              placeholder="请输入6位房间码"
              required
              maxlength="6"
              value="${roomCode}"
              style="text-transform: uppercase;"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="player-name">您的名称</label>
            <input
              type="text"
              id="player-name"
              class="form-input"
              placeholder="请输入您的名称"
              required
              maxlength="20"
            />
          </div>

          <div class="form-group hidden" id="password-group">
            <label class="form-label" for="room-password">房间密码</label>
            <input
              type="password"
              id="room-password"
              class="form-input"
              placeholder="请输入房间密码"
              maxlength="20"
            />
          </div>

          <div id="error-message" class="alert alert-error hidden"></div>

          <button type="submit" class="btn btn-primary" style="width: 100%;">
            加入房间
          </button>
        </form>

        <div style="margin-top: 1rem; text-align: center;">
          <button id="back-btn" class="btn" style="background-color: #6b7280; color: white;">
            返回首页
          </button>
        </div>
      </div>
    </div>
  `;

  // 绑定事件
  const form = document.getElementById('join-room-form');
  form.addEventListener('submit', handleJoinRoom);

  const backBtn = document.getElementById('back-btn');
  backBtn.addEventListener('click', () => {
    router.navigate('/');
  });

  // 自动转换房间码为大写
  const roomCodeInput = document.getElementById('room-code');
  roomCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
  });

  // 检查房间是否需要密码
  roomCodeInput.addEventListener('blur', async () => {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (code.length === 6) {
      try {
        const room = await getRoomByCode(code);
        const passwordGroup = document.getElementById('password-group');
        if (room.is_password_protected) {
          passwordGroup.classList.remove('hidden');
        } else {
          passwordGroup.classList.add('hidden');
        }
      } catch (error) {
        // 房间不存在，不显示密码字段
        document.getElementById('password-group').classList.add('hidden');
      }
    }
  });
}

async function handleJoinRoom(e) {
  e.preventDefault();

  const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
  const playerName = document.getElementById('player-name').value.trim();
  const password = document.getElementById('room-password').value.trim();
  const errorEl = document.getElementById('error-message');

  if (!roomCode || roomCode.length !== 6) {
    showError(errorEl, '请输入正确的6位房间码');
    return;
  }

  if (!playerName) {
    showError(errorEl, '请输入您的名称');
    return;
  }

  try {
    // 获取用户全局ID
    const userGlobalId = getUserGlobalId();

    // 验证房间是否存在
    const room = await getRoomByCode(roomCode);

    // 如果房间有密码保护，验证密码
    if (room.is_password_protected) {
      if (!password) {
        showError(errorEl, '请输入房间密码');
        return;
      }

      const verifyResponse = await API.post(`/rooms/${roomCode}/verify-password`, { password });
      if (!verifyResponse.success || !verifyResponse.data.isValid) {
        showError(errorEl, '密码错误');
        return;
      }
    }

    // 加入房间，传递用户全局ID
    const player = await joinRoom(roomCode, playerName, userGlobalId);

    // 保存玩家信息到localStorage
    localStorage.setItem('currentPlayer', JSON.stringify({
      roomCode,
      playerId: player.id,
      playerName,
      roomPassword: password || null,
      userGlobalId
    }));

    // 添加到房间历史
    addToRoomHistory({
      code: roomCode,
      name: room.custom_game_name || room.gameTypeInfo?.displayName || '未命名房间',
      gameType: room.gameTypeInfo?.displayName || '未知游戏',
      isCreator: false,
      playerName
    });

    // 跳转到房间页面
    router.navigate(`/room/${roomCode}`);
  } catch (error) {
    showError(errorEl, error.message);
  }
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');

  setTimeout(() => {
    element.classList.add('hidden');
  }, 5000);
}
