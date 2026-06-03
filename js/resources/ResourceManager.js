/**
 * ResourceManager - 资源管理系统
 * Markdown 编辑器 v3.1.1
 */

class ResourceManager {
  constructor() {
    this.resourceMap = new Map(); // 资源映射缓存：resourceHash => resourceInfo
  }

  /**
   * 计算资源哈希值（用于去重和识别）
   * @param {string|Blob} data - 资源数据
   * @returns {Promise<string>} 资源哈希
   */
  async calculateResourceHash(data) {
    let buffer;
    if (data instanceof Blob) {
      buffer = await data.arrayBuffer();
    } else if (typeof data === 'string') {
      const encoder = new TextEncoder();
      buffer = encoder.encode(data).buffer;
    } else {
      return '';
    }

    const hashArray = Array.from(new Uint8Array(buffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16); // 取前16个字符作为哈希
  }

  /**
   * 提取单个文件关联的所有资源
   * @param {string} fileId - 文件ID
   * @returns {Promise<Array>} 该文件关联的所有资源
   */
  async extractFileResources(fileId) {
    const file = await fileManager.getFile(fileId);
    if (!file) return [];

    // 从文件内容中提取图片引用
    const usedCacheIds = imageCache.getUsedCacheIds(file.content || '');
    const fileImages = await imageCache.getFileImages(fileId);

    // 返回该文件关联的所有资源
    return fileImages.map(img => ({
      id: img.id,
      hash: img.id, // 使用图片ID作为标识
      type: 'image',
      mimeType: img.mimeType,
      size: img.size,
      fileName: img.fileName,
      dataUrl: img.dataUrl,
      createTime: img.createTime,
      usedBy: [fileId]
    }));
  }

  /**
   * 获取所有资源
   * @returns {Promise<Array>} 所有资源信息（不含实际数据）
   */
  async getAllResources() {
    const images = await imageCache.getAllImages();
    return images.map(img => ({
      id: img.id,
      hash: img.id,
      type: 'image',
      mimeType: img.mimeType,
      size: img.size,
      fileName: img.fileName,
      createTime: img.createTime,
      fileId: img.fileId
    }));
  }

  /**
   * 生成资源清单
   * @param {Array} resources - 资源数组
   * @returns {Object} 清单对象
   */
  generateResourceManifest(resources) {
    return {
      version: "3.1",
      exportTime: new Date().toISOString(),
      resourceCount: resources.length,
      totalSize: resources.reduce((sum, r) => sum + (r.size || 0), 0),
      resources: resources.map(r => ({
        id: r.id,
        hash: r.hash,
        type: r.type,
        mimeType: r.mimeType,
        size: r.size,
        fileName: r.fileName,
        createTime: r.createTime,
        usedBy: r.usedBy || []
      }))
    };
  }

  /**
   * 检测资源冲突
   * @param {Array} newResources - 待导入的资源
   * @returns {Promise<Array>} 冲突信息数组
   */
  async detectResourceConflicts(newResources) {
    const existingImages = await imageCache.getAllImages();
    const existingIds = new Set(existingImages.map(img => img.id));

    const conflicts = [];
    for (const newRes of newResources) {
      if (existingIds.has(newRes.id)) {
        const existingRes = existingImages.find(img => img.id === newRes.id);
        conflicts.push({
          type: 'resource-id-conflict',
          newResource: newRes,
          existingResource: {
            id: existingRes.id,
            fileName: existingRes.fileName,
            size: existingRes.size,
            createTime: existingRes.createTime
          },
          status: 'unresolved'
        });
      }
    }

    return conflicts;
  }

  /**
   * 导入资源到缓存
   * @param {Array} resources - 资源数组（需要包含 dataUrl）
   * @param {string} strategy - 导入策略：'merge' | 'skip' | 'rename'
   * @param {string} targetFileId - 目标文件ID
   * @returns {Promise<Object>} 导入结果 {success: count, skipped: count, errors: []}
   */
  async importResources(resources, strategy = 'merge', targetFileId = null) {
    const result = {
      success: 0,
      skipped: 0,
      renamed: 0,
      errors: []
    };

    for (const resource of resources) {
      try {
        if (resource.type !== 'image') {
          result.skipped++;
          continue;
        }

        const existingImages = await imageCache.getAllImages();
        const existingId = existingImages.find(img => img.id === resource.id);

        if (existingId) {
          if (strategy === 'skip') {
            result.skipped++;
            continue;
          } else if (strategy === 'merge') {
            // 覆盖现有资源
            await imageCache.deleteImage(resource.id);
          } else if (strategy === 'rename') {
            // 重命名新资源
            resource.id = imageCache.generateId();
          }
        }

        // 添加资源到缓存
        const imageData = {
          id: resource.id,
          fileId: targetFileId || resource.fileId || null,
          fileName: resource.fileName,
          dataUrl: resource.dataUrl,
          size: resource.size,
          createTime: resource.createTime || new Date().toISOString(),
          mimeType: resource.mimeType
        };

        await imageCache.saveToIndexedDB(imageData);
        await imageCache.saveToCacheAPI(resource.id, resource.dataUrl, resource.fileName);

        result.success++;
      } catch (error) {
        result.errors.push({
          resourceId: resource.id,
          fileName: resource.fileName,
          error: error.message
        });
      }
    }

    return result;
  }

  /**
   * 清理未使用的资源
   * @returns {Promise<number>} 清理的资源数量
   */
  async cleanupUnusedResources() {
    const files = await fileManager.getAllFiles();
    const allImages = await imageCache.getAllImages();
    let cleanedCount = 0;

    for (const image of allImages) {
      // 检查该资源是否被任何文件使用
      let isUsed = false;
      for (const file of files) {
        const usedIds = imageCache.getUsedCacheIds(file.content || '');
        if (usedIds.has(image.id)) {
          isUsed = true;
          break;
        }
      }

      if (!isUsed) {
        await imageCache.deleteImage(image.id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 从ZIP导入资源清单
   * @param {JSZip} zip - ZIP对象
   * @returns {Promise<Array>} 资源数组
   */
  async importResourcesFromZip(zip) {
    const resources = [];

    try {
      // 读取资源清单
      const manifestFile = zip.file('resources/manifest.json');
      let manifest = null;
      if (manifestFile) {
        const manifestText = await manifestFile.async('text');
        manifest = JSON.parse(manifestText);
      }

      // 读取resources文件夹下的所有文件
      zip.folder('resources').forEach((relativePath, file) => {
        if (relativePath === 'manifest.json') return;

        // 遍历图片
        if (relativePath.startsWith('images/')) {
          file.async('base64').then(data => {
            const fileName = relativePath.split('/').pop();
            resources.push({
              id: 'imported_' + imageCache.generateId(),
              type: 'image',
              fileName: fileName,
              dataUrl: 'data:image/jpeg;base64,' + data,
              size: data.length,
              mimeType: 'image/jpeg'
            });
          });
        }
      });
    } catch (error) {
      console.warn('导入资源清单失败:', error);
    }

    return resources;
  }

  /**
   * 将资源导出到ZIP
   * @param {JSZip} zipFolder - ZIP的resources文件夹
   * @param {Array} resources - 资源数组
   * @param {string} filter - 过滤策略：'all' | 'used' | 'none'
   * @returns {Promise<void>}
   */
  async exportResourcesToZip(zipFolder, resources, filter = 'all') {
    if (filter === 'none' || !resources || resources.length === 0) {
      return;
    }

    const imagesFolder = zipFolder.folder('images');
    const manifest = this.generateResourceManifest(resources);

    for (const resource of resources) {
      if (resource.type === 'image' && resource.dataUrl) {
        // 提取base64数据
        const base64Data = resource.dataUrl.split(',')[1] || resource.dataUrl;
        const fileName = resource.fileName || resource.id + '.jpg';
        imagesFolder.file(fileName, base64Data, { base64: true });
      }
    }

    // 保存清单
    zipFolder.file('manifest.json', JSON.stringify(manifest, null, 2));
  }
}

// 创建全局实例
const resourceManager = new ResourceManager();
