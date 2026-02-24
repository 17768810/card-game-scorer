import socket from '../socket.js';

export function renderScoreBoard(stats) {
  if (!stats || stats.length === 0) {
    return '<p class="text-secondary">暂无统计数据</p>';
  }

  return `
    <table class="scoreboard-table">
      <thead>
        <tr>
          <th>玩家</th>
          <th>总分</th>
          <th>局数</th>
          <th>胜局</th>
          <th>最高分</th>
          <th>最低分</th>
          <th>平均分</th>
        </tr>
      </thead>
      <tbody>
        ${stats.map(stat => `
          <tr>
            <td><strong>${stat.player_name}</strong></td>
            <td class="${getScoreClass(stat.total_score || 0)}">
              ${formatScore(stat.total_score || 0)}
            </td>
            <td>${stat.rounds_played || 0}</td>
            <td>${stat.rounds_won || 0}</td>
            <td class="${getScoreClass(stat.highest_round_score || 0)}">
              ${formatScore(stat.highest_round_score || 0)}
            </td>
            <td class="${getScoreClass(stat.lowest_round_score || 0)}">
              ${formatScore(stat.lowest_round_score || 0)}
            </td>
            <td class="${getScoreClass(stat.average_score || 0)}">
              ${(stat.average_score || 0).toFixed(1)}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

export function renderRoundHistory(rounds, currentPlayerId, players, page = 1, pageSize = 10) {
  if (!rounds || rounds.length === 0) {
    return '<p class="text-secondary">暂无历史记录</p>';
  }

  // 判断当前玩家是否是房主
  const creator = players?.find(p => p.is_creator);
  const isCreator = creator && creator.id === currentPlayerId;

  // 按时间倒序排列（最新的在前）
  const sortedRounds = [...rounds].reverse();

  // 分页
  const totalPages = Math.ceil(sortedRounds.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRounds = sortedRounds.slice(startIndex, endIndex);

  return `
    <div class="rounds-history" data-current-page="${page}" data-total-pages="${totalPages}">
      ${paginatedRounds.map((round, index) => {
        // 检查是否是最新的一局（在原始数组中是最后一个）
        const isLatestRound = round.round_number === Math.max(...rounds.map(r => r.round_number));

        return `
          <div class="round-item">
            <div class="round-header">
              <span class="round-number">第 ${round.round_number} 局</span>
              <div style="display: flex; align-items: center; gap: 1rem;">
                <span style="font-size: 0.875rem; color: var(--text-secondary);">
                  ${new Date(round.created_at).toLocaleString('zh-CN')}
                </span>
                ${isCreator && isLatestRound ? `
                  <button
                    class="btn btn-danger btn-sm delete-round-btn"
                    data-round-id="${round.id}"
                    data-round-number="${round.round_number}"
                    style="padding: 0.25rem 0.5rem; font-size: 0.875rem;"
                  >
                    删除
                  </button>
                ` : ''}
              </div>
            </div>
            <div class="round-scores">
              ${round.scores.map(score => `
                <div class="round-score-item">
                  <span>${score.player_name}</span>
                  <span class="${getScoreClass(score.score)}">
                    ${formatScore(score.score)}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
      ${totalPages > 1 ? `
        <div class="pagination-controls">
          ${page < totalPages ? `
            <button class="btn btn-secondary btn-sm load-more-btn" data-next-page="${page + 1}">
              加载更多 (${page}/${totalPages})
            </button>
          ` : `
            <p class="text-secondary" style="text-align: center; margin: 1rem 0;">已显示全部记录</p>
          `}
        </div>
      ` : ''}
    </div>
  `;
}

export function updateScoreBoard(stats) {
  const container = document.getElementById('scoreboard-container');
  if (container) {
    container.innerHTML = renderScoreBoard(stats);
  }
}

export function updateRoundHistory(rounds, roomCode, currentPlayerId, players) {
  const container = document.getElementById('round-history-container');
  if (container) {
    // 保持当前页码
    const historyEl = container.querySelector('.rounds-history');
    const currentPage = historyEl ? parseInt(historyEl.dataset.currentPage) || 1 : 1;

    container.innerHTML = renderRoundHistory(rounds, currentPlayerId, players, currentPage);
    setupDeleteHandlers(roomCode);
    setupPaginationHandlers(rounds, roomCode, currentPlayerId, players);
  }
}

export function setupRoundHistoryHandlers(roomCode, currentPlayerId, players, rounds) {
  setupDeleteHandlers(roomCode);
  setupPaginationHandlers(rounds, roomCode, currentPlayerId, players);
}

function setupPaginationHandlers(rounds, roomCode, currentPlayerId, players) {
  const loadMoreBtn = document.querySelector('.load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      const nextPage = parseInt(loadMoreBtn.dataset.nextPage);
      const container = document.getElementById('round-history-container');
      if (container) {
        container.innerHTML = renderRoundHistory(rounds, currentPlayerId, players, nextPage);
        setupDeleteHandlers(roomCode);
        setupPaginationHandlers(rounds, roomCode, currentPlayerId, players);
      }
    });
  }
}

function setupDeleteHandlers(roomCode) {
  const deleteButtons = document.querySelectorAll('.delete-round-btn');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const roundId = parseInt(btn.dataset.roundId);
      const roundNumber = parseInt(btn.dataset.roundNumber);

      if (confirm(`确定要删除第 ${roundNumber} 局的记录吗？此操作不可恢复。`)) {
        socket.emit('delete-round', { roomCode, roundId, roundNumber });

        // 禁用按钮
        btn.disabled = true;
        btn.textContent = '删除中...';
      }
    });
  });
}

function getScoreClass(score) {
  if (score > 0) return 'score-positive';
  if (score < 0) return 'score-negative';
  return 'score-zero';
}

function formatScore(score) {
  if (score > 0) return `+${score}`;
  return score.toString();
}

// 导出Excel功能
export function setupExportHandlers(stats, rounds, roomCode) {
  const exportBtn = document.getElementById('export-stats-btn');
  console.log('Setting up export handlers', { exportBtn, stats, rounds, roomCode });

  if (exportBtn) {
    // 移除旧的事件监听器
    const newBtn = exportBtn.cloneNode(true);
    exportBtn.parentNode.replaceChild(newBtn, exportBtn);

    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Export button clicked');
      exportToExcel(stats, rounds, roomCode);
    });
  } else {
    console.error('Export button not found');
  }
}

function exportToExcel(stats, rounds, roomCode) {
  console.log('Exporting to Excel', { stats, rounds, roomCode });

  try {
    // 创建CSV内容
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel

    // 汇总数据
    csvContent += '积分汇总\n';
    csvContent += '玩家,总分,局数,胜局,最高分,最低分,平均分\n';
    stats.forEach(stat => {
      csvContent += `${stat.player_name},${stat.total_score || 0},${stat.rounds_played || 0},${stat.rounds_won || 0},${stat.highest_round_score || 0},${stat.lowest_round_score || 0},${(stat.average_score || 0).toFixed(1)}\n`;
    });

    csvContent += '\n\n';

    // 每局明细
    csvContent += '每局明细\n';
    csvContent += '局次,时间,' + stats.map(s => s.player_name).join(',') + '\n';

    // 按局次正序排列
    const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

    sortedRounds.forEach(round => {
      const date = new Date(round.created_at).toLocaleString('zh-CN');
      const scores = stats.map(stat => {
        const score = round.scores.find(s => s.player_name === stat.player_name);
        return score ? score.score : 0;
      });
      csvContent += `第${round.round_number}局,${date},${scores.join(',')}\n`;
    });

    console.log('CSV content created, length:', csvContent.length);

    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${roomCode}_积分明细_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();

    console.log('Download triggered');

    // 延迟清理
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    // 显示成功提示
    alert('导出成功！文件已下载。');
  } catch (error) {
    console.error('Export error:', error);
    alert('导出失败：' + error.message);
  }
}
