/**
 * 应用初始化脚本
 * Markdown 编辑器 v3.1.1
 * 负责全局对象初始化和 Service Worker 注册
 */

// 全局应用对象
window.mdEditor = {
  fileManager: null,
  imageCache: null,
  resourceManager: null,
  exporter: null,
  importer: null,
  version: '3.1.1',
  initialized: false
};

/**
 * 应用初始化函数
 */
async function initApp() {
  try {
    console.log('开始初始化应用...');

    // 等待 FileManager 初始化
    if (!fileManager || !fileManager.db) {
      console.log('等待 FileManager 初始化...');
      await new Promise((resolve) => {
        const maxAttempts = 50;
        let attempts = 0;
        const checkInterval = setInterval(() => {
          if (fileManager && fileManager.db) {
            clearInterval(checkInterval);
            resolve();
          }
          attempts++;
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.warn('FileManager 初始化超时');
            resolve();
          }
        }, 100);
      });
    }

    // 创建全局对象引用
    window.mdEditor.fileManager = fileManager;
    window.mdEditor.imageCache = imageCache;
    window.mdEditor.resourceManager = resourceManager;
    window.mdEditor.exporter = exporter || (typeof DataExporter !== 'undefined' ? new DataExporter() : null);
    window.mdEditor.importer = importer || (typeof DataImporter !== 'undefined' ? new DataImporter() : null);

    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('sw.js', { scope: './' });
        console.log('✓ Service Worker 注册成功:', registration);
      } catch (error) {
        console.warn('⚠️ Service Worker 注册失败:', error);
        // 不中断应用，继续运行
      }
    }

    window.mdEditor.initialized = true;
    console.log('✓ 应用初始化完成');
    console.log('版本:', window.mdEditor.version);
  } catch (error) {
    console.error('✗ 应用初始化失败:', error);
  }
}

/**
 * 刷新预览区域
 */
function refreshPreview() {
  try {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    if (editor && preview) {
      // 使用 marked 库转换 Markdown
      if (typeof marked !== 'undefined') {
        preview.innerHTML = marked.parse(editor.value || '');
      } else {
        preview.innerHTML = '<p>预览库未加载</p>';
      }
    }
  } catch (error) {
    console.error('刷新预览失败:', error);
  }
}

/**
 * 设置主题
 * @param {string} theme - 主题名称：'light' | 'dark'
 */
function setTheme(theme) {
  try {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mdEditor-theme', theme);
  } catch (error) {
    console.error('设置主题失败:', error);
  }
}

/**
 * 获取主题
 * @returns {string} 当前主题
 */
function getTheme() {
  try {
    return localStorage.getItem('mdEditor-theme') || 'light';
  } catch (error) {
    return 'light';
  }
}

/**
 * 页面加载完成后初始化
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM 已加载
  initApp();
}

/**
 * 页面卸载时清理
 */
window.addEventListener('beforeunload', () => {
  // 可以在这里添加清理逻辑
});
