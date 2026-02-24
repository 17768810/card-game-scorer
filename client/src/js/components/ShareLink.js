export function renderShareLink(roomCode) {
  const shareUrl = `${window.location.origin}/join?code=${roomCode}`;

  return `
    <div class="share-section-compact">
      <button class="btn-share-toggle" id="share-toggle-btn">
        <span>📤</span>
        <span>分享房间</span>
        <span class="room-code-badge">${roomCode}</span>
      </button>
      <div class="share-dropdown hidden" id="share-dropdown">
        <h3 style="margin: 0 0 1rem 0; font-size: 1rem; font-weight: 600; color: #374151;">分享房间链接</h3>
        <div class="share-link-container">
          <input
            type="text"
            class="share-link-input"
            value="${shareUrl}"
            readonly
            id="share-link-input"
          />
          <button class="btn-copy" id="copy-link-btn">复制链接</button>
        </div>
        <p id="copy-success-message" class="hidden" style="margin-top: 0.75rem; color: #10b981; font-size: 0.875rem; font-weight: 500;">
          ✓ 链接已复制到剪贴板
        </p>
      </div>
    </div>
  `;
}

export function setupShareLinkHandlers() {
  const toggleBtn = document.getElementById('share-toggle-btn');
  const dropdown = document.getElementById('share-dropdown');
  const copyBtn = document.getElementById('copy-link-btn');
  const input = document.getElementById('share-link-input');
  const successMsg = document.getElementById('copy-success-message');

  // Toggle dropdown
  if (toggleBtn && dropdown) {
    toggleBtn.addEventListener('click', () => {
      dropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!toggleBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // Copy link
  if (copyBtn && input) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(input.value);
        successMsg.classList.remove('hidden');

        setTimeout(() => {
          successMsg.classList.add('hidden');
        }, 3000);
      } catch (error) {
        // 降级方案：选中文本
        input.select();
        document.execCommand('copy');
        successMsg.classList.remove('hidden');

        setTimeout(() => {
          successMsg.classList.add('hidden');
        }, 3000);
      }
    });
  }
}
