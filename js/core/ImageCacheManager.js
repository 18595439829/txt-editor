/**
 * ImageCacheManager - 图片缓存管理
 * Markdown 编辑器 v3.1.1
 */

class ImageCacheManager {
  constructor() {
    this.cacheName = "md_editor_v1";
    this.indexDbName = "md_editor_db";
    this.storeName = "images";
    this.db = null;
  }

  // 获取数据库（复用文件管理器的数据库）
  async getDB() {
    if (!this.db) {
      // 等待 fileManager 初始化
      let retries = 0;
      while (!fileManager || !fileManager.db) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        retries++;
        if (retries > 100) {
          throw new Error("数据库初始化超时");
        }
      }

      this.db = fileManager.db;

      // 确保已创建 images store
      if (this.db && !this.db.objectStoreNames.contains(this.storeName)) {
        // 如果还未创建，等待
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return this.db;
  }

  // 生成简短的图片 ID
  generateId() {
    return (
      "img_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  // 添加图片到缓存
  async addImage(file, dataUrl, fileId) {
    try {
      const id = this.generateId();
      const db = await this.getDB();

      const imageData = {
        id: id,
        fileId: fileId, // 关联的文件 ID
        fileName: file.name,
        dataUrl: dataUrl,
        size: dataUrl.length,
        createTime: new Date().toLocaleString(),
        mimeType: file.type,
      };

      // 保存到 IndexedDB
      await this.saveToIndexedDB(imageData);

      // 同时保存到 Cache API
      await this.saveToCacheAPI(id, dataUrl, file.name);

      return id;
    } catch (error) {
      throw new Error("图片缓存失败: " + error.message);
    }
  }

  // 保存到 IndexedDB
  saveToIndexedDB(imageData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.storeName],
        "readwrite",
      );
      const store = transaction.objectStore(this.storeName);
      const request = store.add(imageData);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // 保存到 Cache API
  async saveToCacheAPI(id, dataUrl, fileName) {
    try {
      const cache = await caches.open(this.cacheName);
      const response = new Response(dataUrl);
      await cache.put(`img/${id}`, response);
    } catch (error) {
      console.warn("Cache API 保存失败:", error);
    }
  }

  // 获取图片
  getImage(id) {
    return (async () => {
      try {
        const db = await this.getDB();
        if (!db) {
          return null;
        }

        return new Promise((resolve) => {
          const transaction = db.transaction(
            [this.storeName],
            "readonly",
          );
          const store = transaction.objectStore(this.storeName);
          const request = store.get(id);

          request.onerror = () => resolve(null);
          request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.dataUrl : null);
          };
        });
      } catch (error) {
        console.error("获取图片失败:", error);
        return null;
      }
    })();
  }

  // 获取所有缓存
  getAllImages() {
    return (async () => {
      try {
        const db = await this.getDB();
        if (!db) {
          return [];
        }

        return new Promise((resolve) => {
          const transaction = db.transaction(
            [this.storeName],
            "readonly",
          );
          const store = transaction.objectStore(this.storeName);
          const request = store.getAll();

          request.onerror = () => resolve([]);
          request.onsuccess = () => resolve(request.result || []);
        });
      } catch (error) {
        console.error("获取所有缓存失败:", error);
        return [];
      }
    })();
  }

  // 获取特定文件的缓存
  async getFileImages(fileId) {
    const allImages = await this.getAllImages();
    return allImages.filter((img) => img.fileId === fileId);
  }

  // 获取缓存大小
  async getCacheSize() {
    const images = await this.getAllImages();
    let size = 0;
    for (const img of images) {
      size += img.size || 0;
    }
    return size;
  }

  // 获取文件的缓存大小
  async getFileCacheSize(fileId) {
    const images = await this.getFileImages(fileId);
    let size = 0;
    for (const img of images) {
      size += img.size || 0;
    }
    return size;
  }

  // 清空所有缓存
  async clearCache() {
    return new Promise((resolve) => {
      const transaction = this.db.transaction(
        [this.storeName],
        "readwrite",
      );
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        caches.delete(this.cacheName);
        resolve(true);
      };
    }).then((success) => {
      if (success) {
        updateGlobalCacheUI();
      }
      return success;
    });
  }

  // 清空特定文件的缓存
  async clearFileCache(fileId) {
    const images = await this.getFileImages(fileId);
    for (const image of images) {
      await this.deleteImage(image.id);
    }
    return images.length;
  }

  // 删除单个缓存
  async deleteImage(id) {
    return new Promise((resolve) => {
      const transaction = this.db.transaction(
        [this.storeName],
        "readwrite",
      );
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onerror = () => resolve(false);
      request.onsuccess = () => {
        caches.open(this.cacheName).then((cache) => {
          cache.delete(`img/${id}`);
        });
        resolve(true);
      };
    });
  }

  // 获取缓存图片数量
  async getImageCount() {
    const images = await this.getAllImages();
    return images.length;
  }

  // 获取编辑器中使用的所有缓存 ID
  getUsedCacheIds(content) {
    const regex = /!\[.*?\]\((img_[^\)]+)\)/g;
    const usedIds = new Set();
    let match;

    while ((match = regex.exec(content)) !== null) {
      usedIds.add(match[1]);
    }

    return usedIds;
  }

  // 清理未使用的缓存（孤立数据）
  async cleanupUnusedCache() {
    const editor = document.getElementById("editor");
    const usedIds = this.getUsedCacheIds(editor.value);
    const images = await this.getAllImages();
    let cleaned = 0;

    for (const image of images) {
      if (!usedIds.has(image.id)) {
        await this.deleteImage(image.id);
        cleaned++;
      }
    }

    return cleaned;
  }

  // 格式化大小显示
  formatSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  }
}

// 创建全局实例
const imageCache = new ImageCacheManager();
