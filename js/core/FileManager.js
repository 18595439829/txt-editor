/**
 * 文件管理系统
 * Markdown 编辑器 v3.1.1
 */

class FileManager {
  constructor() {
    this.dbName = STORAGE_KEYS.DB_NAME;
    this.storeName = STORAGE_KEYS.STORE_NAME;
    this.db = null;
    this.currentFileId = null;
    this.initDB();
  }

  /**
   * 初始化 IndexedDB
   */
  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2);

      request.onerror = () => {
        console.error('IndexedDB 初始化失败');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建文件存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }

        // 图片存储已在第一版中创建，这里只需创建文件存储
      };
    });
  }

  /**
   * 生成文件 ID
   */
  generateFileId() {
    return generateId('file');
  }

  /**
   * 创建文件
   * @param {string} name - 文件名
   * @returns {Promise<Object>} 创建的文件对象
   */
  async createFile(name = null) {
    try {
      const fileName = name || `未命名文件_${new Date().toLocaleTimeString()}`;
      const fileData = {
        id: this.generateFileId(),
        name: fileName,
        content: '',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.add(fileData);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(fileData);
      });
    } catch (error) {
      throw new Error('文件创建失败: ' + error.message);
    }
  }

  /**
   * 获取所有文件
   * @returns {Promise<Array>} 文件列表
   */
  async getAllFiles() {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => resolve([]);
      request.onsuccess = () => {
        const files = request.result || [];
        // 按更新时间排序（最新的在前）
        files.sort(
          (a, b) => new Date(b.updateTime) - new Date(a.updateTime)
        );
        resolve(files);
      };
    });
  }

  /**
   * 获取单个文件
   * @param {string} fileId - 文件ID
   * @returns {Promise<Object|null>} 文件对象或 null
   */
  async getFile(fileId) {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(fileId);

      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * 保存文件
   * @param {string} fileId - 文件ID
   * @param {string} content - 文件内容
   * @returns {Promise<Object>} 保存后的文件对象
   */
  async saveFile(fileId, content) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(fileId);

      request.onsuccess = () => {
        const file = request.result;
        if (file) {
          file.content = content;
          file.updateTime = new Date().toISOString();

          const updateRequest = store.put(file);
          updateRequest.onerror = () => reject(updateRequest.error);
          updateRequest.onsuccess = () => resolve(file);
        } else {
          reject(new Error('文件不存在'));
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除文件
   * @param {string} fileId - 文件ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteFile(fileId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(fileId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  }

  /**
   * 重命名文件
   * @param {string} fileId - 文件ID
   * @param {string} newName - 新文件名
   * @returns {Promise<Object>} 更新后的文件对象
   */
  async renameFile(fileId, newName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(fileId);

      request.onsuccess = () => {
        const file = request.result;
        if (file) {
          file.name = newName;
          file.updateTime = new Date().toISOString();

          const updateRequest = store.put(file);
          updateRequest.onerror = () => reject(updateRequest.error);
          updateRequest.onsuccess = () => resolve(file);
        } else {
          reject(new Error('文件不存在'));
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除所有文件
   * @returns {Promise<number>} 删除的文件数量
   */
  async deleteAllFiles() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // 先获取所有文件数量
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        const clearRequest = store.clear();
        clearRequest.onerror = () => reject(clearRequest.error);
        clearRequest.onsuccess = () => resolve(count);
      };
      countRequest.onerror = () => reject(countRequest.error);
    });
  }
}

// 创建全局实例
const fileManager = new FileManager();
