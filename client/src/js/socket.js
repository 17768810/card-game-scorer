import { io } from 'socket.io-client';

class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  connect(url = '') {
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.updateConnectionStatus(true);
      console.log('Socket连接成功');
    });

    this.socket.on('reconnect', () => {
      console.log('Socket重新连接成功');
      // 尝试重新加入房间
      const currentPlayerData = localStorage.getItem('currentPlayer');
      if (currentPlayerData) {
        try {
          const currentPlayer = JSON.parse(currentPlayerData);
          if (currentPlayer.roomCode && window.location.pathname.startsWith('/room/')) {
            console.log('重新加入房间:', currentPlayer.roomCode);
            this.emit('join-room', {
              roomCode: currentPlayer.roomCode,
              playerId: currentPlayer.playerId,
              password: currentPlayer.roomPassword || null
            });
            // 触发自定义事件通知页面刷新
            window.dispatchEvent(new CustomEvent('socket-reconnected'));
          }
        } catch (error) {
          console.error('重新加入房间失败:', error);
        }
      }
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.updateConnectionStatus(false);
      console.log('Socket断开连接');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket连接错误:', error);
      this.updateConnectionStatus(false);
    });

    return this.socket;
  }

  updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.textContent = connected ? '已连接' : '未连接';
      statusEl.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);

      // 保存监听器以便后续清理
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket未连接，无法发送事件:', event);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
    }
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}

export default new SocketClient();
