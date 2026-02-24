import { customAlphabet } from 'nanoid';

// 使用大写字母和数字，排除容易混淆的字符（0, O, I, 1）
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nanoid = customAlphabet(alphabet, 6);

/**
 * 生成6位房间码
 * @returns {string} 房间码，如 "ABC123"
 */
export function generateRoomCode() {
  return nanoid();
}
