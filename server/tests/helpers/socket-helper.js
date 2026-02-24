/**
 * Socket.io测试辅助工具
 * 提供Socket客户端连接和事件等待方法
 */

import { io } from 'socket.io-client';

export class TestSocketClient {
  constructor(serverUrl = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
    this.clients = [];
  }

  /**
   * 创建Socket客户端连接
   * @param {Object} options - 连接选项
   * @returns {Promise<Socket>} Socket客户端实例
   */
  async connect(options = {}) {
    return new Promise((resolve, reject) => {
      const client = io(this.serverUrl, {
        transports: ['websocket'],
        forceNew: true,
        ...options
      });

      const timeout = setTimeout(() => {
        reject(new Error('Socket连接超时'));
      }, 5000);

      client.on('connect', () => {
        clearTimeout(timeout);
        this.clients.push(client);
        resolve(client);
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * 创建多个Socket客户端连接
   * @param {number} count - 客户端数量
   * @param {Object} options - 连接选项
   * @returns {Promise<Socket[]>} Socket客户端实例数组
   */
  async connectMultiple(count, options = {}) {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(this.connect(options));
    }
    return Promise.all(promises);
  }

  /**
   * 等待特定事件
   * @param {Socket} client - Socket客户端
   * @param {string} eventName - 事件名称
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<any>} 事件数据
   */
  async waitForEvent(client, eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`等待事件 ${eventName} 超时`));
      }, timeout);

      client.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * 等待多个客户端接收相同事件
   * @param {Socket[]} clients - Socket客户端数组
   * @param {string} eventName - 事件名称
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<any[]>} 事件数据数组
   */
  async waitForEventOnAll(clients, eventName, timeout = 5000) {
    const promises = clients.map(client =>
      this.waitForEvent(client, eventName, timeout)
    );
    return Promise.all(promises);
  }

  /**
   * 发送事件并等待响应
   * @param {Socket} client - Socket客户端
   * @param {string} eventName - 事件名称
   * @param {any} data - 事件数据
   * @param {string} responseEvent - 响应事件名称
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<any>} 响应数据
   */
  async emitAndWait(client, eventName, data, responseEvent, timeout = 5000) {
    const responsePromise = this.waitForEvent(client, responseEvent, timeout);
    client.emit(eventName, data);
    return responsePromise;
  }

  /**
   * 断开单个客户端连接
   * @param {Socket} client - Socket客户端
   */
  disconnect(client) {
    if (client && client.connected) {
      client.disconnect();
      const index = this.clients.indexOf(client);
      if (index > -1) {
        this.clients.splice(index, 1);
      }
    }
  }

  /**
   * 断开所有客户端连接
   */
  disconnectAll() {
    this.clients.forEach(client => {
      if (client && client.connected) {
        client.disconnect();
      }
    });
    this.clients = [];
  }

  /**
   * 获取所有活跃的客户端
   * @returns {Socket[]} 客户端数组
   */
  getClients() {
    return this.clients;
  }

  /**
   * 清理所有资源
   */
  cleanup() {
    this.disconnectAll();
  }
}

/**
 * 创建测试Socket客户端
 * @param {string} serverUrl - 服务器URL
 * @returns {TestSocketClient} 测试Socket客户端实例
 */
export function createTestSocketClient(serverUrl) {
  return new TestSocketClient(serverUrl);
}
