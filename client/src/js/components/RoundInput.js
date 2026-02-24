import socket from '../socket.js';

export function renderRoundInput(players, roomCode, currentRoundNumber, currentPlayerId) {
  if (!players || players.length === 0) {
    return '<p class="text-secondary">等待玩家加入...</p>';
  }

  // 判断当前玩家是否是房主
  const creator = players.find(p => p.is_creator);
  const isCreator = creator && creator.id === currentPlayerId;

  return `
    <div class="card">
      <h2 class="card-title">第 ${currentRoundNumber} 局 - 输入积分</h2>
      ${!isCreator ? '<p class="text-secondary" style="margin-bottom: 1rem;">只有房主可以输入积分</p>' : ''}

      <form id="round-input-form">
        <div class="round-input-form">
          ${players.map(player => `
            <div class="round-input-group">
              <label class="round-input-label">${player.name}</label>
              <input
                type="number"
                class="round-input-field score-input"
                data-player-id="${player.id}"
                placeholder="0"
                ${!isCreator ? 'readonly' : 'required'}
              />
              ${!isCreator ? `
                <div class="live-score-indicator" id="live-score-${player.id}" style="display: none;">
                  <span class="live-score-value"></span>
                  <span class="live-score-label">(房主输入)</span>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="round-sum-display" id="round-sum-display">
          总和: <span id="round-sum-value">0</span>
          <span id="round-sum-status"></span>
        </div>

        <div id="score-error-message" class="alert alert-error hidden"></div>

        <button
          type="submit"
          class="btn btn-success"
          style="width: 100%;"
          id="submit-scores-btn"
          ${!isCreator ? 'disabled' : ''}
        >
          ${isCreator ? '提交积分' : '等待房主提交'}
        </button>
      </form>
    </div>
  `;
}

export function setupRoundInputHandlers(players, roomCode, currentRoundNumber, currentPlayerId) {
  const form = document.getElementById('round-input-form');
  const scoreInputs = document.querySelectorAll('.score-input');
  const sumValueEl = document.getElementById('round-sum-value');
  const sumStatusEl = document.getElementById('round-sum-status');
  const sumDisplayEl = document.getElementById('round-sum-display');
  const errorEl = document.getElementById('score-error-message');

  // 判断当前玩家是否是房主
  const creator = players.find(p => p.is_creator);
  const isCreator = creator && creator.id === currentPlayerId;

  // 防抖函数
  let inputDebounceTimer = null;

  // 实时计算总和
  scoreInputs.forEach(input => {
    input.addEventListener('input', () => {
      updateSum();

      // 只有房主才发送实时输入事件
      if (isCreator) {
        clearTimeout(inputDebounceTimer);
        inputDebounceTimer = setTimeout(() => {
          const playerId = parseInt(input.dataset.playerId);
          const score = parseInt(input.value) || 0;

          socket.emit('score-input-change', {
            roomCode,
            roundNumber: currentRoundNumber,
            playerId,
            score,
            enteredBy: currentPlayerId
          });
        }, 300); // 300ms防抖
      }
    });
  });

  function updateSum() {
    let sum = 0;
    scoreInputs.forEach(input => {
      const value = parseInt(input.value) || 0;
      sum += value;
    });

    sumValueEl.textContent = sum;

    if (sum === 0) {
      sumStatusEl.textContent = ' ✓ 有效';
      sumDisplayEl.classList.remove('round-sum-invalid');
      sumDisplayEl.classList.add('round-sum-valid');
    } else {
      sumStatusEl.textContent = ' ✗ 无效（必须为0）';
      sumDisplayEl.classList.remove('round-sum-valid');
      sumDisplayEl.classList.add('round-sum-invalid');
    }
  }

  // 监听房主的输入（非房主玩家）
  if (!isCreator) {
    socket.on('score-input-updated', (data) => {
      if (data.roundNumber === currentRoundNumber) {
        // 更新对应玩家的输入框
        const input = document.querySelector(`.score-input[data-player-id="${data.playerId}"]`);
        if (input) {
          input.value = data.score;
          updateSum();

          // 显示实时提示
          const liveIndicator = document.getElementById(`live-score-${data.playerId}`);
          if (liveIndicator) {
            const valueSpan = liveIndicator.querySelector('.live-score-value');
            valueSpan.textContent = data.score > 0 ? `+${data.score}` : data.score;
            liveIndicator.style.display = 'block';

            // 3秒后隐藏
            setTimeout(() => {
              liveIndicator.style.display = 'none';
            }, 3000);
          }
        }
      }
    });
  }

  // 提交表单
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const scores = [];
    scoreInputs.forEach(input => {
      scores.push({
        playerId: parseInt(input.dataset.playerId),
        score: parseInt(input.value) || 0
      });
    });

    // 验证总和
    const sum = scores.reduce((acc, s) => acc + s.score, 0);
    if (sum !== 0) {
      showError(errorEl, `积分总和必须为0，当前总和：${sum}`);
      return;
    }

    // 通过Socket.io提交
    socket.emit('submit-round-scores', {
      roomCode,
      roundNumber: currentRoundNumber,
      scores,
      enteredBy: currentPlayerId
    });

    // 禁用提交按钮
    const submitBtn = document.getElementById('submit-scores-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';
  });

  // 监听提交成功
  socket.on('scores-submitted', (data) => {
    if (data.roundNumber === currentRoundNumber) {
      // 清空表单
      scoreInputs.forEach(input => {
        input.value = '';
      });
      updateSum();

      // 更新局数显示（currentRound是已完成的局数，下一局应该是currentRound + 1）
      if (data.currentRound !== undefined) {
        const nextRound = data.currentRound + 1;
        const titleEl = document.querySelector('#round-input-container .card-title');
        if (titleEl) {
          titleEl.textContent = `第 ${nextRound} 局 - 输入积分`;
        }
        // 更新当前局数变量
        currentRoundNumber = nextRound;
      }

      // 重新启用按钮
      const submitBtn = document.getElementById('submit-scores-btn');
      submitBtn.disabled = false;
      submitBtn.textContent = '提交积分';

      // 显示成功消息
      showSuccess('积分提交成功！');
    }
  });

  // 监听验证错误
  socket.on('score-validation-error', (data) => {
    const errorMessage = data?.error || data?.message || '积分验证失败，请检查输入';
    showError(errorEl, errorMessage);

    // 重新启用按钮
    const submitBtn = document.getElementById('submit-scores-btn');
    submitBtn.disabled = false;
    submitBtn.textContent = '提交积分';
  });
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');

  setTimeout(() => {
    element.classList.add('hidden');
  }, 5000);
}

function showSuccess(message) {
  const container = document.getElementById('main-content');
  const successDiv = document.createElement('div');
  successDiv.className = 'alert alert-success';
  successDiv.textContent = message;
  successDiv.style.position = 'fixed';
  successDiv.style.top = '20px';
  successDiv.style.right = '20px';
  successDiv.style.zIndex = '1000';

  container.appendChild(successDiv);

  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}
