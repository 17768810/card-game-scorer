import socket from './socket.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.currentRoomCode = null;

    // 监听浏览器前进/后退
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });
  }

  register(path, handler) {
    this.routes.set(path, handler);
  }

  navigate(path, state = {}) {
    // 如果离开房间页面，发送leave-room事件
    if (this.currentRoomCode && !path.startsWith('/room/')) {
      socket.emit('leave-room', { roomCode: this.currentRoomCode });
      this.currentRoomCode = null;
    }

    window.history.pushState(state, '', path);
    this.handleRoute();
  }

  handleRoute() {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    // 如果离开房间页面，发送leave-room事件
    const previousRoomCode = this.currentRoomCode;
    const isRoomRoute = path.startsWith('/room/');

    if (previousRoomCode && !isRoomRoute) {
      socket.emit('leave-room', { roomCode: previousRoomCode });
      this.currentRoomCode = null;
    }

    // 匹配路由
    if (path === '/' || path === '/index.html') {
      this.executeRoute('lobby');  // 默认跳转到游戏大厅
    } else if (path === '/lobby') {
      this.executeRoute('lobby', { searchParams });
    } else if (path === '/create-room') {
      this.executeRoute('create-room', { searchParams });
    } else if (path === '/create-custom') {
      this.executeRoute('create-custom', { searchParams });
    } else if (isRoomRoute) {
      const roomCode = path.split('/')[2];
      this.currentRoomCode = roomCode;
      this.executeRoute('room', { roomCode, searchParams });
    } else if (path === '/join') {
      this.executeRoute('join', { searchParams });
    } else {
      this.executeRoute('404');
    }
  }

  async executeRoute(routeName, params = {}) {
    const handler = this.routes.get(routeName);
    if (handler) {
      this.currentRoute = routeName;
      await handler(params);
    } else {
      console.error('路由未找到:', routeName);
    }
  }

  start() {
    this.handleRoute();
  }
}

export default new Router();
export { Router };
