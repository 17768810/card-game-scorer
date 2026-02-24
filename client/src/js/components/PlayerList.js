import socket from '../socket.js';

export function renderPlayerList(players, currentPlayerId, roomCode) {
  if (!players || players.length === 0) {
    return '<p class="text-secondary">暂无玩家</p>';
  }

  // 找出房主
  const creator = players.find(p => p.is_creator);
  const isCurrentPlayerCreator = creator && creator.id === currentPlayerId;

  return `
    <ul class="player-list">
      ${players.map(player => `
        <li class="player-item">
          <div class="player-info">
            <div class="player-position">${player.position}</div>
            <span class="player-name">${player.name}</span>
            ${player.is_creator ? '<span class="player-creator-badge">房主</span>' : ''}
            ${player.id === currentPlayerId ? '<span class="player-creator-badge" style="background-color: var(--success-color);">我</span>' : ''}
          </div>
          ${isCurrentPlayerCreator && !player.is_creator ? `
            <button
              class="btn btn-danger btn-sm kick-player-btn"
              data-player-id="${player.id}"
              data-player-name="${player.name}"
              style="padding: 0.25rem 0.5rem; font-size: 0.875rem;"
            >
              踢出
            </button>
          ` : ''}
        </li>
      `).join('')}
    </ul>
  `;
}

export function updatePlayerList(players, currentPlayerId, roomCode) {
  const container = document.getElementById('player-list-container');
  if (container) {
    container.innerHTML = renderPlayerList(players, currentPlayerId, roomCode);
    setupKickHandlers(roomCode);
  }
}

export function setupPlayerListHandlers(roomCode) {
  setupKickHandlers(roomCode);
}

function setupKickHandlers(roomCode) {
  const kickButtons = document.querySelectorAll('.kick-player-btn');
  kickButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const playerId = parseInt(btn.dataset.playerId);
      const playerName = btn.dataset.playerName;

      if (confirm(`确定要踢出玩家 "${playerName}" 吗？`)) {
        socket.emit('kick-player', { roomCode, playerId });

        // 禁用按钮
        btn.disabled = true;
        btn.textContent = '踢出中...';
      }
    });
  });
}
