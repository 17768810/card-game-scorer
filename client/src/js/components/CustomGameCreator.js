/**
 * 自定义游戏创建组件
 * 允许用户创建自定义游戏类型
 */

import { API } from '../api.js';
import router from '../router.js';

export class CustomGameCreator {
  constructor() {
    this.formData = {
      name: '',
      displayName: '',
      minPlayers: 2,
      maxPlayers: 10,
      validationType: 'none',
      validationValue: 0,
      scoreRangeMin: -1000,
      scoreRangeMax: 1000,
      icon: '🎮',
      description: ''
    };
  }

  async render() {
    const container = document.createElement('div');
    container.className = 'custom-game-creator';

    container.innerHTML = `
      <div class="creator-header">
        <button class="btn-back">← 返回</button>
        <h1>创建自定义游戏</h1>
      </div>

      <form class="custom-game-form">
        <div class="form-group">
          <label>游戏名称 *</label>
          <input type="text" name="name" class="form-input" placeholder="例如：斗地主" required>
        </div>

        <div class="form-group">
          <label>显示名称 *</label>
          <input type="text" name="displayName" class="form-input" placeholder="例如：欢乐斗地主" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>最少玩家数</label>
            <input type="number" name="minPlayers" class="form-input" value="2" min="2" max="10">
          </div>
          <div class="form-group">
            <label>最多玩家数</label>
            <input type="number" name="maxPlayers" class="form-input" value="10" min="2" max="10">
          </div>
        </div>

        <div class="form-group">
          <label>积分验证规则</label>
          <select name="validationType" class="form-select">
            <option value="none">无验证</option>
            <option value="sum_equals">总和等于指定值</option>
          </select>
        </div>

        <div class="form-group validation-value-group" style="display: none;">
          <label>验证目标值</label>
          <input type="number" name="validationValue" class="form-input" value="0">
          <small class="form-hint">例如：设置为0表示所有玩家积分总和必须为0</small>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>最小积分</label>
            <input type="number" name="scoreRangeMin" class="form-input" value="-1000">
          </div>
          <div class="form-group">
            <label>最大积分</label>
            <input type="number" name="scoreRangeMax" class="form-input" value="1000">
          </div>
        </div>

        <div class="form-group">
          <label>游戏图标</label>
          <div class="icon-selector">
            ${this.renderIconOptions()}
          </div>
        </div>

        <div class="form-group">
          <label>游戏说明（可选）</label>
          <textarea name="description" class="form-textarea" rows="3" placeholder="简单描述游戏规则..."></textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary btn-cancel">取消</button>
          <button type="submit" class="btn btn-primary">创建游戏</button>
        </div>
      </form>
    `;

    this.bindEvents(container);
    return container;
  }

  renderIconOptions() {
    const icons = ['🎮', '🃏', '🎲', '🎴', '🀄', '♠️', '♥️', '♦️', '♣️', '🎰', '🏃', '💥', '🐂', '🎯', '🎪', '🎨'];
    return icons.map(icon => `
      <button type="button" class="icon-option" data-icon="${icon}">${icon}</button>
    `).join('');
  }

  bindEvents(container) {
    const form = container.querySelector('.custom-game-form');
    const validationTypeSelect = form.querySelector('[name="validationType"]');
    const validationValueGroup = form.querySelector('.validation-value-group');
    const iconOptions = container.querySelectorAll('.icon-option');
    const backBtn = container.querySelector('.btn-back');
    const cancelBtn = container.querySelector('.btn-cancel');

    // 返回按钮
    backBtn?.addEventListener('click', () => {
      router.navigate('/lobby');
    });

    // 取消按钮
    cancelBtn?.addEventListener('click', () => {
      router.navigate('/lobby');
    });

    // 验证类型变化
    validationTypeSelect?.addEventListener('change', (e) => {
      if (e.target.value === 'sum_equals') {
        validationValueGroup.style.display = 'block';
      } else {
        validationValueGroup.style.display = 'none';
      }
    });

    // 图标选择
    let selectedIcon = '🎮';
    iconOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        iconOptions.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedIcon = btn.dataset.icon;
      });
    });
    // 默认选中第一个
    iconOptions[0]?.classList.add('selected');

    // 表单提交
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = {
        name: formData.get('name'),
        displayName: formData.get('displayName'),
        minPlayers: parseInt(formData.get('minPlayers')),
        maxPlayers: parseInt(formData.get('maxPlayers')),
        validationType: formData.get('validationType'),
        validationValue: parseInt(formData.get('validationValue') || 0),
        scoreRangeMin: parseInt(formData.get('scoreRangeMin')),
        scoreRangeMax: parseInt(formData.get('scoreRangeMax')),
        icon: selectedIcon,
        description: formData.get('description')
      };

      // 验证
      if (data.minPlayers > data.maxPlayers) {
        alert('最小玩家数不能大于最大玩家数');
        return;
      }

      if (data.scoreRangeMin >= data.scoreRangeMax) {
        alert('最小积分必须小于最大积分');
        return;
      }

      try {
        const response = await API.post('/game-types', data);
        if (response.success) {
          alert('自定义游戏创建成功！');
          router.navigate(`/create-room?gameTypeId=${response.data.id}`);
        } else {
          alert('创建失败：' + response.error);
        }
      } catch (error) {
        console.error('创建游戏失败:', error);
        alert('创建失败，请重试');
      }
    });
  }
}
