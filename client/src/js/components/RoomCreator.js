import { API } from '../api.js';
import router from '../router.js';
import { addToRoomHistory } from '../roomHistory.js';
import { getUserGlobalId } from '../utils/cookies.js';

export async function renderRoomCreator() {
  const container = document.getElementById('main-content');

  // 从URL获取gameTypeId
  const params = new URLSearchParams(window.location.search);
  const gameTypeId = params.get('gameTypeId');

  if (!gameTypeId) {
    // 如果没有gameTypeId，跳转到游戏大厅
    router.navigate('/lobby');
    return;
  }

  // 获取游戏类型信息
  let gameType = null;
  try {
    const response = await API.get(`/game-types/${gameTypeId}`);
    if (response.success) {
      gameType = response.data;
    }
  } catch (error) {
    console.error('获取游戏类型失败:', error);
  }

  if (!gameType) {
    container.innerHTML = '<div class="error-state">游戏类型不存在</div>';
    return;
  }

  container.innerHTML = `
    <div class="home-container">
      <div class="card">
        <button class="btn-back">← 返回游戏大厅</button>
        <h2 class="card-title">创建房间</h2>

        <div class="selected-game">
          <span class="game-icon-large">${gameType.icon}</span>
          <span class="game-name-large">${gameType.display_name}</span>
        </div>

        <form id="create-room-form">
          <div class="form-group">
            <label class="form-label" for="creator-name">您的名称</label>
            <input
              type="text"
              id="creator-name"
              class="form-input"
              placeholder="请输入您的名称"
              required
              maxlength="20"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="custom-game-name">自定义房间名称（可选）</label>
            <input
              type="text"
              id="custom-game-name"
              class="form-input"
              placeholder="例如：周末${gameType.display_name}局"
              maxlength="30"
            />
            <small class="form-hint">为这个房间起个特别的名字</small>
          </div>

          <div class="form-group">
            <label class="form-checkbox">
              <input type="checkbox" id="enable-password" />
              <span>设置房间密码</span>
            </label>
            <small class="form-hint">保护房间隐私，只有知道密码的人才能加入</small>
          </div>

          <div class="form-group hidden" id="password-group">
            <label class="form-label" for="room-password">房间密码</label>
            <input
              type="password"
              id="room-password"
              class="form-input"
              placeholder="请输入密码"
              maxlength="20"
            />
          </div>

          <div id="error-message" class="alert alert-error hidden"></div>

          <button type="submit" class="btn btn-primary" style="width: 100%;">
            创建房间
          </button>
        </form>
      </div>

      <div class="card">
        <h2 class="card-title">或者</h2>
        <button id="join-room-btn" class="btn btn-success" style="width: 100%;">
          加入已有房间
        </button>
      </div>
    </div>
  `;

  // 绑定事件
  const backBtn = container.querySelector('.btn-back');
  backBtn?.addEventListener('click', () => {
    router.navigate('/lobby');
  });

  // 密码开关
  const enablePasswordCheckbox = document.getElementById('enable-password');
  const passwordGroup = document.getElementById('password-group');
  enablePasswordCheckbox?.addEventListener('change', (e) => {
    if (e.target.checked) {
      passwordGroup.classList.remove('hidden');
    } else {
      passwordGroup.classList.add('hidden');
    }
  });

  const form = document.getElementById('create-room-form');
  form.addEventListener('submit', (e) => handleCreateRoom(e, gameTypeId));

  const joinBtn = document.getElementById('join-room-btn');
  joinBtn.addEventListener('click', () => {
    router.navigate('/join');
  });
}

async function handleCreateRoom(e, gameTypeId) {
  e.preventDefault();

  const creatorName = document.getElementById('creator-name').value.trim();
  const customGameName = document.getElementById('custom-game-name').value.trim();
  const enablePassword = document.getElementById('enable-password').checked;
  const password = document.getElementById('room-password').value.trim();
  const errorEl = document.getElementById('error-message');

  if (!creatorName) {
    showError(errorEl, '请输入您的名称');
    return;
  }

  if (enablePassword && !password) {
    showError(errorEl, '请输入房间密码');
    return;
  }

  try {
    // 获取用户全局ID
    const userGlobalId = getUserGlobalId();

    const response = await API.post('/rooms', {
      gameTypeId: parseInt(gameTypeId),
      creatorName,
      customGameName: customGameName || null,
      settings: {},
      password: enablePassword ? password : null,
      customMaxPlayers: null,  // 不限制玩家数
      allowOverflow: true,     // 默认允许无限玩家
      userGlobalId
    });

    if (!response.success) {
      showError(errorEl, response.error);
      return;
    }

    const room = response.data;

    // 保存玩家信息到localStorage
    localStorage.setItem('currentPlayer', JSON.stringify({
      roomCode: room.code,
      playerId: room.creatorId,
      playerName: creatorName,
      roomPassword: enablePassword ? password : null,
      userGlobalId
    }));

    // 添加到房间历史
    addToRoomHistory({
      code: room.code,
      name: customGameName || room.gameTypeName,
      gameType: room.gameTypeName,
      isCreator: true,
      playerName: creatorName
    });

    // 跳转到房间页面
    router.navigate(`/room/${room.code}`);
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
