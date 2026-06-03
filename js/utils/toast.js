/**
 * 提示通知系统
 * Markdown 编辑器 v3.1.1
 */

/**
 * 显示 Toast 提示
 * @param {string} message - 提示信息
 * @param {string} type - 类型：'success' | 'error' | 'info' | 'warning'
 * @param {number} duration - 显示时长（毫秒）
 */
function showToast(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
  // 创建提示容器（如果不存在）
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(toastContainer);
  }

  // 创建 Toast 元素
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    background-color: ${getToastColor(type)};
    color: white;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 10px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    font-size: 14px;
    word-break: break-word;
    animation: slideIn 0.3s ease-out;
  `;

  toast.textContent = message;
  toastContainer.appendChild(toast);

  // 自动移除
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      toast.remove();
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  }, duration);
}

/**
 * 获取 Toast 背景色
 * @param {string} type - 类型
 * @returns {string} 颜色值
 */
function getToastColor(type) {
  const colors = {
    success: '#52c41a',
    error: '#f5222d',
    info: '#1890ff',
    warning: '#faad14'
  };
  return colors[type] || colors.info;
}

// 添加 CSS 动画（只添加一次）
if (!document.getElementById('toastStyles')) {
  const style = document.createElement('style');
  style.id = 'toastStyles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}
