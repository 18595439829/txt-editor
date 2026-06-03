/**
 * 应用常量定义
 * Markdown 编辑器 v3.1.1
 */

// ========== 存储键 ==========
const STORAGE_KEYS = {
  DB_NAME: 'md_editor_db',
  STORE_NAME: 'files',
  IMAGE_STORE_NAME: 'images',
  CACHE_NAME: 'md_editor_v1'
};

// ========== UI 元素 ID ==========
const UI_IDS = {
  // 编辑器主体
  EDITOR: 'editor',
  PREVIEW: 'preview',
  CURRENT_FILE_NAME: 'currentFileName',

  // 按钮
  NEW_FILE_BTN: 'newFileBtn',
  RENAME_FILE_BTN: 'renameFileBtn',
  DELETE_FILE_BTN: 'deleteFileBtn',
  INSERT_IMAGE_BTN: 'insertImageBtn',
  TOGGLE_BTN: 'toggleBtn',

  // 头部按钮
  SYNTAX_HELP_BTN: 'syntaxHelpBtn',
  CACHE_BTN: 'cacheBtn',
  FILE_CACHE_BTN: 'fileCacheBtn',
  FILE_LIST_EXPORT_BTN: 'fileListExportBtn',
  FILE_LIST_IMPORT_BTN: 'fileListImportBtn',

  // 导出导入新增按钮
  FILE_LIST_EXPORT_AS_ZIP_BTN: 'fileListExportAsZipBtn',
  FILE_LIST_IMPORT_FROM_ZIP_BTN: 'fileListImportFromZipBtn',

  // 文件列表
  FILES_LIST: 'filesList',
  FILE_INPUT: 'fileInput',
  IMPORT_SINGLE_FILE_INPUT: 'importSingleFileInput',

  // 弹窗
  SYNTAX_POPUP: 'syntaxPopup',
  SYNTAX_POPUP_CLOSE: 'syntaxPopupClose',
  IMAGE_MODAL: 'imageModal',
  CACHE_MODAL: 'cacheModal',
  FILE_CACHE_MODAL: 'fileCacheModal',
  FILE_LIST_IMPORT_MODAL: 'fileListImportModal',

  // 图片对话框相关
  IMAGE_TABS: 'imageTabBtn',
  IMAGE_LINK_TAB: 'linkTab',
  IMAGE_UPLOAD_TAB: 'uploadTab',
  IMAGE_URL_INPUT: 'imageUrl',
  IMAGE_DESC_INPUT: 'imageDesc',
  IMAGE_MODAL_BTN: 'imageModalBtn',
  IMAGE_MODAL_CANCEL: 'imageModalCancel',

  // 缓存相关
  CACHE_COUNT: 'cacheCount',
  FILE_CACHE_COUNT: 'fileCacheCount',
  CACHE_LIST: 'cacheList',
  FILE_CACHE_LIST: 'fileCacheList',
  CACHE_CLOSE_BTN: 'cacheCloseBtn',
  FILE_CACHE_CLOSE_BTN: 'fileCacheCloseBtn',
  CLEAR_CACHE_BTN: 'clearCacheBtn',
  CLEAR_FILE_CACHE_BTN: 'clearFileCacheBtn'
};

// ========== 文件操作 ==========
const FILE_OPERATIONS = {
  CREATE: 'create',
  RENAME: 'rename',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import'
};

// ========== 导入策略 ==========
const IMPORT_STRATEGIES = {
  MERGE: 'merge',      // 覆盖现有文件
  SKIP: 'skip',        // 跳过现有文件
  RENAME: 'rename'     // 重命名导入文件
};

// ========== 导出类型 ==========
const EXPORT_TYPES = {
  FULL: 'full',
  SINGLE: 'single',
  FILELIST: 'filelist',
  FILELIST_ZIP: 'filelist-zip',
  SINGLE_FILE_ZIP: 'single-file-zip'
};

// ========== 资源过滤 ==========
const RESOURCE_FILTERS = {
  ALL: 'all',      // 包含所有资源
  USED: 'used',    // 仅包含使用的资源
  NONE: 'none'     // 不包含资源
};

// ========== 版本信息 ==========
const VERSION = {
  APP: '3.1.1',
  EXPORT_FORMAT: '3.1'
};

// ========== 常规配置 ==========
const CONFIG = {
  PREVIEW_MAX_LENGTH: 200,
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 500,
  AUTO_SAVE_DELAY: 1000
};
