/**
 * 测试重试辅助工具
 * 提供自动重试机制
 */

/**
 * 重试配置
 * @typedef {Object} RetryOptions
 * @property {number} maxRetries - 最大重试次数
 * @property {number} initialDelay - 初始延迟（毫秒）
 * @property {number} maxDelay - 最大延迟（毫秒）
 * @property {number} backoffMultiplier - 退避倍数
 * @property {Function} onRetry - 重试回调
 */

/**
 * 延迟函数
 * @param {number} ms - 延迟时间（毫秒）
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 计算退避延迟
 * @param {number} attempt - 当前尝试次数
 * @param {number} initialDelay - 初始延迟
 * @param {number} maxDelay - 最大延迟
 * @param {number} backoffMultiplier - 退避倍数
 * @returns {number} 延迟时间
 */
function calculateBackoff(attempt, initialDelay, maxDelay, backoffMultiplier) {
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt);
  return Math.min(exponentialDelay, maxDelay);
}

/**
 * 重试函数
 * @param {Function} fn - 要执行的函数
 * @param {RetryOptions} options - 重试选项
 * @returns {Promise<any>} 函数执行结果
 */
export async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delayMs = calculateBackoff(attempt, initialDelay, maxDelay, backoffMultiplier);

        if (onRetry) {
          onRetry(error, attempt + 1, delayMs);
        }

        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * Socket连接重试
 * @param {Function} connectFn - 连接函数
 * @param {RetryOptions} options - 重试选项
 * @returns {Promise<any>} 连接结果
 */
export async function retrySocketConnect(connectFn, options = {}) {
  return retry(connectFn, {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    onRetry: (error, attempt, delay) => {
      console.log(`Socket连接失败，第${attempt}次重试（延迟${delay}ms）: ${error.message}`);
    },
    ...options
  });
}

/**
 * 数据库操作重试
 * @param {Function} dbFn - 数据库操作函数
 * @param {RetryOptions} options - 重试选项
 * @returns {Promise<any>} 操作结果
 */
export async function retryDbOperation(dbFn, options = {}) {
  return retry(dbFn, {
    maxRetries: 3,
    initialDelay: 100,
    maxDelay = 1000,
    backoffMultiplier: 2,
    onRetry: (error, attempt, delay) => {
      console.log(`数据库操作失败，第${attempt}次重试（延迟${delay}ms）: ${error.message}`);
    },
    ...options
  });
}

/**
 * HTTP请求重试
 * @param {Function} requestFn - 请求函数
 * @param {RetryOptions} options - 重试选项
 * @returns {Promise<any>} 请求结果
 */
export async function retryHttpRequest(requestFn, options = {}) {
  return retry(requestFn, {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    onRetry: (error, attempt, delay) => {
      console.log(`HTTP请求失败，第${attempt}次重试（延迟${delay}ms）: ${error.message}`);
    },
    ...options
  });
}

/**
 * 条件重试（只在特定条件下重试）
 * @param {Function} fn - 要执行的函数
 * @param {Function} shouldRetry - 判断是否应该重试的函数
 * @param {RetryOptions} options - 重试选项
 * @returns {Promise<any>} 函数执行结果
 */
export async function retryIf(fn, shouldRetry, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && shouldRetry(error)) {
        const delayMs = calculateBackoff(attempt, initialDelay, maxDelay, backoffMultiplier);

        if (onRetry) {
          onRetry(error, attempt + 1, delayMs);
        }

        await delay(delayMs);
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * 轮询直到条件满足
 * @param {Function} checkFn - 检查函数
 * @param {Object} options - 选项
 * @returns {Promise<any>} 检查结果
 */
export async function pollUntil(checkFn, options = {}) {
  const {
    timeout = 5000,
    interval = 100,
    timeoutMessage = '轮询超时'
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await checkFn();
      if (result) {
        return result;
      }
    } catch (error) {
      // 忽略错误，继续轮询
    }

    await delay(interval);
  }

  throw new Error(timeoutMessage);
}
