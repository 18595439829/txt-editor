/**
 * 通用工具函数
 * Markdown 编辑器 v3.1.1
 */

/**
 * 格式化字节大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 计算时间差
 * @param {Date} date - 日期对象
 * @returns {string} 时间差描述
 */
function getTimeDiff(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}小时前`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}天前`;
}

/**
 * 生成文本预览
 * @param {string} content - 原始内容
 * @param {number} maxLength - 最大长度
 * @returns {string} 预览文本
 */
function generatePreview(content, maxLength = 200) {
  if (!content) return '';
  const preview = content.substring(0, maxLength);
  return preview.length < content.length ? preview + '...' : preview;
}

/**
 * 清理文件名（移除特殊字符）
 * @param {string} filename - 原始文件名
 * @returns {string} 清理后的文件名
 */
function sanitizeFilename(filename) {
  return filename.replace(/[<>:"/\\|?*]/g, '_');
}

/**
 * 检查是否为有效的JSON
 * @param {string} jsonString - JSON字符串
 * @returns {boolean} 是否有效
 */
function isValidJSON(jsonString) {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 延迟执行（用于防抖）
 * @param {Function} func - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖函数
 */
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * 节流执行（用于高频事件）
 * @param {Function} func - 要执行的函数
 * @param {number} interval - 时间间隔（毫秒）
 * @returns {Function} 节流函数
 */
function throttle(func, interval) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      func(...args);
      lastTime = now;
    }
  };
}

/**
 * 计算字符统计信息
 * @param {string} content - 文本内容
 * @returns {Object} 统计信息
 */
function calculateStats(content) {
  if (!content) {
    return {
      lineCount: 0,
      wordCount: 0,
      charCount: 0,
      contentSize: 0
    };
  }

  return {
    lineCount: content.split('\n').length,
    wordCount: content.split(/\s+/).filter(w => w).length,
    charCount: content.length,
    contentSize: new Blob([content]).size
  };
}

/**
 * 深拷贝对象
 * @param {Object} obj - 要拷贝的对象
 * @returns {Object} 拷贝后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const cloned = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

/**
 * 生成唯一ID
 * @param {string} prefix - ID前缀
 * @returns {string} 生成的ID
 */
function generateId(prefix = 'id') {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 睡眠（延迟）
 * @param {number} ms - 毫秒数
 * @returns {Promise} 延迟Promise
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 验证数据有效性
 * @param {Object} data - 要验证的数据
 * @param {Array} requiredFields - 必需字段
 * @returns {Object} 验证结果
 */
function validateData(data, requiredFields = []) {
  const errors = [];

  if (!data) {
    return {
      valid: false,
      errors: ['数据为空']
    };
  }

  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`缺少必需字段: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 从对象创建查询字符串
 * @param {Object} obj - 对象
 * @returns {string} 查询字符串
 */
function objectToQueryString(obj) {
  return Object.keys(obj)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
}

/**
 * 获取URL查询参数
 * @param {string} name - 参数名
 * @returns {string|null} 参数值
 */
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}
