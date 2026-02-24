/**
 * 测试环境设置
 * 在所有测试运行前执行
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // 使用随机端口避免冲突
process.env.LOG_LEVEL = 'silent'; // 禁用日志输出

// 全局测试超时设置
beforeAll(() => {
  // 测试开始前的全局设置
});

afterAll(() => {
  // 测试结束后的全局清理
});

beforeEach(() => {
  // 每个测试前的设置
});

afterEach(() => {
  // 每个测试后的清理
});
