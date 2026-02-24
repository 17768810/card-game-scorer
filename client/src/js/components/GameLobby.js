/**
 * 游戏大厅组件
 * 显示所有可用游戏类型，支持选择和创建自定义游戏
 */

import { API } from '../api.js';
import router from '../router.js';
import { getRoomHistory, removeFromRoomHistory } from '../roomHistory.js';

export class GameLobby {
  constructor() {
    this.gameTypes = [];
    this.roomHistory = [];
  }

  async render() {
    const container = document.createElement('div');
    container.className = 'game-lobby';

    // 加载游戏类型和房间历史
    await this.loadGameTypes();
    this.loadRoomHistory();

    container.innerHTML = `
      <div class="lobby-header">
        <h1>选择游戏类型</h1>
        <p class="lobby-subtitle">选择一个游戏开始计分</p>
      </div>

      ${this.renderRoomHistory()}

      <div class="game-grid">
        ${this.renderGameCards()}
      </div>

      <div class="lobby-actions">
        <button class="btn btn-secondary btn-create-custom">
          <span class="btn-icon">➕</span>
          创建自定义游戏
        </button>
      </div>
    `;

    // 绑定事件
    this.bindEvents(container);

    return container;
  }

  async loadGameTypes() {
    try {
      const response = await API.get('/game-types');
      if (response.success) {
        this.gameTypes = response.data;
      }
    } catch (error) {
      console.error('加载游戏类型失败:', error);
      this.gameTypes = [];
    }
  }

  loadRoomHistory() {
    this.roomHistory = getRoomHistory();
  }

  renderRoomHistory() {
    if (this.roomHistory.length === 0) {
      return '';
    }

    return `
      <div class="room-history-section">
        <h2 class="section-title">我的房间</h2>
        <div class="room-history-list">
          ${this.roomHistory.map(room => `
            <div class="room-history-item" data-room-code="${room.code}">
              <div class="room-history-info">
                <div class="room-history-name">${room.name}</div>
                <div class="room-history-meta">
                  <span class="room-history-code">${room.code}</span>
                  <span class="room-history-type">${room.gameType}</span>
                  ${room.isCreator ? '<span class="room-history-badge">创建者</span>' : ''}
                </div>
              </div>
              <div class="room-history-actions">
                <button class="btn-icon-small btn-enter-room" data-room-code="${room.code}" title="进入房间">
                  →
                </button>
                <button class="btn-icon-small btn-remove-room" data-room-code="${room.code}" title="移除">
                  ×
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderGameCards() {
    if (this.gameTypes.length === 0) {
      return '<div class="empty-state">暂无可用游戏</div>';
    }

    return this.gameTypes.map(game => `
      <div class="game-card" data-game-id="${game.id}">
        <div class="game-icon">${game.icon}</div>
        <div class="game-name">${game.display_name}</div>
        <div class="game-players">${game.min_players === game.max_players ? game.min_players : `${game.min_players}-${game.max_players}`}人</div>
        ${game.is_custom ? '<div class="game-badge">自定义</div>' : ''}
      </div>
    `).join('');
  }

  bindEvents(container) {
    // 游戏卡片点击事件
    const gameCards = container.querySelectorAll('.game-card');
    gameCards.forEach(card => {
      card.addEventListener('click', () => {
        const gameId = card.dataset.gameId;
        router.navigate(`/create-room?gameTypeId=${gameId}`);
      });
    });

    // 创建自定义游戏按钮
    const createCustomBtn = container.querySelector('.btn-create-custom');
    createCustomBtn?.addEventListener('click', () => {
      router.navigate('/create-custom');
    });

    // 进入房间按钮
    const enterRoomBtns = container.querySelectorAll('.btn-enter-room');
    enterRoomBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roomCode = btn.dataset.roomCode;
        router.navigate(`/room/${roomCode}`);
      });
    });

    // 移除房间按钮
    const removeRoomBtns = container.querySelectorAll('.btn-remove-room');
    removeRoomBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roomCode = btn.dataset.roomCode;
        if (confirm('确定要从历史记录中移除这个房间吗？')) {
          removeFromRoomHistory(roomCode);
          // 重新渲染
          router.handleRoute();
        }
      });
    });
  }
}
