/**
 * DataExporter - 数据导出系统
 * Markdown 编辑器 v3.1.1
 */

class DataExporter {
  /**
   * 导出所有文件和缓存为 JSON
   */
  async exportAsJson() {
    const files = await fileManager.getAllFiles();
    const images = await imageCache.getAllImages();

    const exportData = {
      version: "3.0",
      exportTime: new Date().toISOString(),
      exportType: "full",
      filesCount: files.length,
      imagesCount: images.length,
      files: files,
      images: images,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    this.downloadFile(
      dataStr,
      `markdown-editor-backup-${new Date().getTime()}.json`,
      "application/json"
    );
  }

  /**
   * 导出所有文件和缓存为 ZIP
   */
  async exportAsZip() {
    const files = await fileManager.getAllFiles();
    const images = await imageCache.getAllImages();

    const zip = new JSZip();

    // 添加 metadata.json
    zip.file(
      "metadata.json",
      JSON.stringify(
        {
          version: "3.0",
          exportTime: new Date().toISOString(),
          filesCount: files.length,
          imagesCount: images.length,
        },
        null,
        2
      )
    );

    // 添加 files.json
    zip.file("files.json", JSON.stringify(files, null, 2));

    // 添加 images.json 和图片文件
    const imagesMetadata = images.map((img) => ({
      id: img.id,
      fileId: img.fileId,
      fileName: img.fileName,
      size: img.size,
      createTime: img.createTime,
      mimeType: img.mimeType,
    }));
    zip.file("images.json", JSON.stringify(imagesMetadata, null, 2));

    // 添加图片文件
    const imagesFolder = zip.folder("images");
    for (const img of images) {
      const base64Data = img.dataUrl.split(",")[1];
      imagesFolder.file(img.id + ".img", base64Data, { base64: true });
    }

    // 生成 ZIP 并下载
    const zipData = await zip.generateAsync({ type: "blob" });
    saveAs(zipData, `markdown-editor-backup-${new Date().getTime()}.zip`);
  }

  /**
   * 导出单个文件及其缓存
   */
  async exportSingleFile(fileId) {
    const file = await fileManager.getFile(fileId);
    if (!file) {
      alert("文件不存在");
      return;
    }

    const fileImages = await imageCache.getFileImages(fileId);

    const exportData = {
      version: "3.0",
      exportTime: new Date().toISOString(),
      exportType: "single",
      file: file,
      images: fileImages,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const filename =
      file.name.replace(/[<>:"/\\|?*]/g, "_") +
      `-${new Date().getTime()}.json`;
    this.downloadFile(dataStr, filename, "application/json");
  }

  /**
   * 触发文件下载
   */
  downloadFile(data, filename, mimeType) {
    // 处理 Blob 对象
    let blob;
    if (data instanceof Blob) {
      blob = data;
    } else {
      blob = new Blob([data], { type: mimeType });
    }

    // 优先使用 FileSaver.js 的 saveAs
    if (typeof saveAs !== 'undefined') {
      saveAs(blob, filename);
      return;
    }

    // 备用方案：使用原生 createObjectURL
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 导出文件清单（v3.1 新增）
   * @param {Array<string>} selectedIds - 要导出的文件ID数组，null表示全部
   * @param {Object} options - 导出选项
   * @returns {Promise<void>}
   */
  async exportFileList(selectedIds = null, options = {}) {
    const files = await fileManager.getAllFiles();
    const filesToExport = selectedIds
      ? files.filter(f => selectedIds.includes(f.id))
      : files;

    const enrichedFiles = await Promise.all(
      filesToExport.map(f => this.enrichFileData(f))
    );

    const exportData = {
      version: "3.1",
      exportType: "filelist",
      exportTime: new Date().toISOString(),
      filesCount: enrichedFiles.length,
      totalSize: enrichedFiles.reduce((sum, f) => sum + (f.contentSize || 0), 0),
      statistics: this.calculateTotalStatistics(enrichedFiles),
      files: enrichedFiles,
      options: {
        includePreview: options.includePreview !== false,
        includeStatistics: options.includeStatistics !== false,
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    this.downloadFile(
      dataStr,
      `file-list-${new Date().getTime()}.json`,
      "application/json"
    );
  }

  /**
   * 为文件数据增加统计信息
   * @param {Object} file - 文件对象
   * @returns {Promise<Object>} 增强后的文件对象
   */
  async enrichFileData(file) {
    const lineCount = (file.content || '').split('\n').length;
    const wordCount = (file.content || '').split(/\s+/).filter(w => w).length;
    const preview = this.generatePreview(file.content, 200);

    // 获取文件关联的缓存信息
    let cacheInfo = {
      count: 0,
      size: 0
    };

    try {
      const fileImages = await imageCache.getFileImages(file.id);
      if (fileImages && fileImages.length > 0) {
        cacheInfo.count = fileImages.length;
        cacheInfo.size = fileImages.reduce((sum, img) => sum + (img.size || 0), 0);
      }
    } catch (err) {
      console.warn('获取文件缓存信息失败:', err);
    }

    return {
      ...file,
      contentSize: (file.content || '').length,
      lineCount,
      wordCount,
      charCount: (file.content || '').length,
      preview,
      cacheInfo,
      metadata: {
        createdAgo: this.getTimeDiff(new Date(file.createTime)),
        modifiedAgo: this.getTimeDiff(new Date(file.updateTime)),
      }
    };
  }

  /**
   * 计算总体统计信息
   * @param {Array<Object>} files - 文件数组
   * @returns {Object} 统计信息
   */
  calculateTotalStatistics(files) {
    return {
      totalFiles: files.length,
      totalLines: files.reduce((sum, f) => sum + (f.lineCount || 0), 0),
      totalWords: files.reduce((sum, f) => sum + (f.wordCount || 0), 0),
      totalChars: files.reduce((sum, f) => sum + (f.charCount || 0), 0),
      totalSize: files.reduce((sum, f) => sum + (f.contentSize || 0), 0),
      avgLinesPerFile: files.length > 0
        ? Math.round(files.reduce((sum, f) => sum + (f.lineCount || 0), 0) / files.length)
        : 0,
      createdFiles: files.length,
      lastModified: files.length > 0 ? files[0].updateTime : null,
    };
  }

  /**
   * 生成文件内容预览
   * @param {string} content - 文件内容
   * @param {number} maxLength - 最大长度
   * @returns {string} 预览文本
   */
  generatePreview(content, maxLength = 200) {
    if (!content) return '';
    const preview = content.substring(0, maxLength);
    return preview.length < content.length ? preview + '...' : preview;
  }

  /**
   * 计算时间差
   * @param {Date} date - 日期对象
   * @returns {string} 时间差描述
   */
  getTimeDiff(date) {
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
   * 导出文件列表为压缩包（v3.1.1 新增）
   * @param {string} resourceFilter - 资源过滤策略：'all' | 'used' | 'none'
   * @returns {Promise<void>}
   */
  async exportFileListAsZip(resourceFilter = 'all') {
    const files = await fileManager.getAllFiles();
    if (files.length === 0) {
      showToast('没有文件可导出', 'error');
      return;
    }

    try {
      const zip = new JSZip();

      // 创建文件夹结构
      const filesFolder = zip.folder('files');
      const resourcesFolder = zip.folder('resources');

      // 添加文件内容
      const enrichedFiles = [];
      for (const file of files) {
        filesFolder.file(file.name + '.md', file.content || '');
        const enriched = await this.enrichFileData(file);
        enrichedFiles.push(enriched);
      }

      // 添加元数据
      const metadata = {
        version: "3.1",
        exportType: "filelist-zip",
        exportTime: new Date().toISOString(),
        filesCount: files.length,
        resourceFilter: resourceFilter,
        statistics: this.calculateTotalStatistics(enrichedFiles),
        files: enrichedFiles.map(f => ({
          id: f.id,
          name: f.name,
          createTime: f.createTime,
          updateTime: f.updateTime,
          lineCount: f.lineCount,
          wordCount: f.wordCount,
          charCount: f.charCount,
          contentSize: f.contentSize
        }))
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // 添加资源
      if (resourceFilter !== 'none') {
        const allResources = await resourceManager.getAllResources();
        if (allResources.length > 0) {
          // 获取完整资源数据
          const fullResources = [];
          for (const resource of allResources) {
            const image = await imageCache.getImage(resource.id);
            if (image) {
              fullResources.push({
                ...resource,
                dataUrl: image
              });
            }
          }

          if (fullResources.length > 0) {
            await resourceManager.exportResourcesToZip(resourcesFolder, fullResources, resourceFilter);
            metadata.resourceCount = fullResources.length;
          }
        }
      }

      // 生成ZIP并下载
      const zipData = await zip.generateAsync({ type: 'blob' });
      this.downloadFile(
        zipData,
        `file-list-${new Date().getTime()}.zip`,
        'application/zip'
      );

      showToast('文件列表已导出为压缩包', 'success');
    } catch (error) {
      console.error('导出文件列表ZIP失败:', error);
      showToast('导出失败: ' + error.message, 'error');
    }
  }

  /**
   * 导出单个文件为JSON（v3.1.1 新增）
   * @param {string} fileId - 文件ID
   * @param {boolean} includeResources - 是否包含关联资源
   * @returns {Promise<void>}
   */
  async exportSingleFileAsJson(fileId, includeResources = true) {
    const file = await fileManager.getFile(fileId);
    if (!file) {
      showToast('文件不存在', 'error');
      return;
    }

    try {
      const resources = includeResources
        ? await resourceManager.extractFileResources(fileId)
        : [];

      // 将资源dataUrl从完整URL转为数据
      const resourcesWithData = [];
      for (const resource of resources) {
        const imageData = await imageCache.getImage(resource.id);
        if (imageData) {
          resourcesWithData.push({
            id: resource.id,
            type: resource.type,
            mimeType: resource.mimeType,
            size: resource.size,
            fileName: resource.fileName,
            dataUrl: imageData
          });
        }
      }

      const exportData = {
        version: "3.1",
        type: "single-file",
        exportTime: new Date().toISOString(),
        file: {
          id: file.id,
          name: file.name,
          content: file.content,
          createTime: file.createTime,
          updateTime: file.updateTime
        },
        resourceCount: resourcesWithData.length,
        resources: resourcesWithData
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const filename = file.name.replace(/[<>:"/\\|?*]/g, '_') +
                     `-${new Date().getTime()}.json`;
      this.downloadFile(dataStr, filename, 'application/json');

      showToast('文件已导出为JSON', 'success');
    } catch (error) {
      console.error('导出单文件JSON失败:', error);
      showToast('导出失败: ' + error.message, 'error');
    }
  }

  /**
   * 导出单个文件为压缩包（v3.1.1 新增）
   * @param {string} fileId - 文件ID
   * @param {boolean} includeResources - 是否包含关联资源
   * @returns {Promise<void>}
   */
  async exportSingleFileAsZip(fileId, includeResources = true) {
    const file = await fileManager.getFile(fileId);
    if (!file) {
      showToast('文件不存在', 'error');
      return;
    }

    try {
      const zip = new JSZip();
      const resourcesFolder = zip.folder('resources');

      // 添加文件内容
      zip.file('file.md', file.content || '');

      // 添加文件元数据
      const metadata = {
        version: "3.1",
        type: "single-file-zip",
        exportTime: new Date().toISOString(),
        file: {
          id: file.id,
          name: file.name,
          createTime: file.createTime,
          updateTime: file.updateTime,
          lineCount: (file.content || '').split('\n').length,
          wordCount: (file.content || '').split(/\s+/).filter(w => w).length,
          charCount: (file.content || '').length
        }
      };

      // 添加资源
      if (includeResources) {
        const fileResources = await resourceManager.extractFileResources(fileId);
        if (fileResources.length > 0) {
          // 获取完整资源数据
          const fullResources = [];
          for (const resource of fileResources) {
            const imageData = await imageCache.getImage(resource.id);
            if (imageData) {
              fullResources.push({
                ...resource,
                dataUrl: imageData
              });
            }
          }

          if (fullResources.length > 0) {
            await resourceManager.exportResourcesToZip(resourcesFolder, fullResources, 'all');
            metadata.resourceCount = fullResources.length;
          }
        }
      }

      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // 生成ZIP并下载
      const zipData = await zip.generateAsync({ type: 'blob' });
      const filename = file.name.replace(/[<>:"/\\|?*]/g, '_') +
                     `-${new Date().getTime()}.zip`;
      this.downloadFile(zipData, filename, 'application/zip');

      showToast('文件已导出为压缩包', 'success');
    } catch (error) {
      console.error('导出单文件ZIP失败:', error);
      showToast('导出失败: ' + error.message, 'error');
    }
  }

  /**
   * 显示文件列表选择对话框并导出（项目导出功能）
   * @param {Object} options - 导出选项
   * @returns {Promise<void>}
   */
  async exportSelectedFilesWithModal(options = {}) {
    const files = await fileManager.getAllFiles();
    if (files.length === 0) {
      showToast('没有文件可导出', 'error');
      return;
    }

    // 为文件数据添加统计信息
    const enrichedFiles = await Promise.all(
      files.map(f => this.enrichFileData(f))
    );

    // 创建或获取导出模态框
    const modal = new FileListImportModal();
    modal.setMode('export');

    // 显示文件列表让用户选择
    modal.show(enrichedFiles);

    // 监听确认事件
    modal.onConfirm = async (selectedIds, format) => {
      if (selectedIds.length === 0) {
        showToast('请选择至少一个文件', 'warning');
        return;
      }

      // 根据选择的格式进行导出
      if (format === 'zip') {
        await this.exportSelectedFilesAsZip(selectedIds, options);
      } else {
        await this.exportSelectedFilesAsJson(selectedIds, options);
      }

      modal.close();
    };
  }

  /**
   * 导出选定文件为 ZIP（项目导出功能）
   * @param {Array<string>} selectedIds - 要导出的文件ID数组
   * @param {Object} options - 导出选项
   * @returns {Promise<void>}
   */
  async exportSelectedFilesAsZip(selectedIds, options = {}) {
    try {
      const allFiles = await fileManager.getAllFiles();
      const filesToExport = allFiles.filter(f => selectedIds.includes(f.id));

      if (filesToExport.length === 0) {
        showToast('没有文件可导出', 'error');
        return;
      }

      const zip = new JSZip();

      // 创建文件夹结构
      const filesFolder = zip.folder('files');
      const resourcesFolder = zip.folder('resources');

      // 添加文件内容
      const enrichedFiles = [];
      const usedResourceIds = new Set();

      for (const file of filesToExport) {
        filesFolder.file(file.name + '.md', file.content || '');
        const enriched = await this.enrichFileData(file);
        enrichedFiles.push(enriched);

        // 收集该文件使用的资源ID
        const fileResources = await resourceManager.extractFileResources(file.id);
        fileResources.forEach(r => usedResourceIds.add(r.id));
      }

      // 添加元数据
      const metadata = {
        version: "3.2",
        exportType: "project-backup",
        exportTime: new Date().toISOString(),
        selectedCount: filesToExport.length,
        statistics: this.calculateTotalStatistics(enrichedFiles),
        files: enrichedFiles.map(f => ({
          id: f.id,
          name: f.name,
          createTime: f.createTime,
          updateTime: f.updateTime,
          lineCount: f.lineCount,
          wordCount: f.wordCount,
          charCount: f.charCount,
          contentSize: f.contentSize
        }))
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // 添加关联的资源
      const allResources = await resourceManager.getAllResources();
      const resourcesToExport = allResources.filter(r => usedResourceIds.has(r.id));

      if (resourcesToExport.length > 0) {
        const fullResources = [];
        for (const resource of resourcesToExport) {
          const imageData = await imageCache.getImage(resource.id);
          if (imageData) {
            fullResources.push({
              ...resource,
              dataUrl: imageData
            });
          }
        }

        if (fullResources.length > 0) {
          await resourceManager.exportResourcesToZip(resourcesFolder, fullResources, 'all');
          metadata.resourceCount = fullResources.length;
        }
      }

      // 生成ZIP并下载
      const zipData = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      this.downloadFile(
        zipData,
        `project-backup-${timestamp}.zip`,
        'application/zip'
      );

      showToast(`已导出 ${filesToExport.length} 个文件`, 'success');
    } catch (error) {
      console.error('导出选定文件ZIP失败:', error);
      showToast('导出失败: ' + error.message, 'error');
    }
  }

  /**
   * 导出选定文件为 JSON（项目导出功能）
   * @param {Array<string>} selectedIds - 要导出的文件ID数组
   * @param {Object} options - 导出选项
   * @returns {Promise<void>}
   */
  async exportSelectedFilesAsJson(selectedIds, options = {}) {
    try {
      const allFiles = await fileManager.getAllFiles();
      const filesToExport = allFiles.filter(f => selectedIds.includes(f.id));

      if (filesToExport.length === 0) {
        showToast('没有文件可导出', 'error');
        return;
      }

      const usedResourceIds = new Set();
      const enrichedFiles = [];

      // 收集所有使用的资源
      for (const file of filesToExport) {
        const enriched = await this.enrichFileData(file);
        enrichedFiles.push(enriched);

        const fileResources = await resourceManager.extractFileResources(file.id);
        fileResources.forEach(r => usedResourceIds.add(r.id));
      }

      // 获取关联的资源数据
      const allResources = await resourceManager.getAllResources();
      const resourcesToExport = allResources.filter(r => usedResourceIds.has(r.id));
      const resourcesWithData = [];

      for (const resource of resourcesToExport) {
        const imageData = await imageCache.getImage(resource.id);
        if (imageData) {
          resourcesWithData.push({
            id: resource.id,
            fileId: resource.usedBy?.[0] || null,
            fileName: resource.fileName,
            mimeType: resource.mimeType,
            size: resource.size,
            dataUrl: imageData
          });
        }
      }

      const exportData = {
        version: "3.2",
        type: "project-backup",
        exportTime: new Date().toISOString(),
        exportType: "selected-files",
        summary: {
          selectedCount: filesToExport.length,
          imagesCount: resourcesWithData.length,
          totalSize: enrichedFiles.reduce((sum, f) => sum + (f.contentSize || 0), 0)
        },
        statistics: this.calculateTotalStatistics(enrichedFiles),
        files: enrichedFiles,
        resources: resourcesWithData
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      this.downloadFile(
        dataStr,
        `project-backup-${timestamp}.json`,
        'application/json'
      );

      showToast(`已导出 ${filesToExport.length} 个文件`, 'success');
    } catch (error) {
      console.error('导出选定文件JSON失败:', error);
      showToast('导出失败: ' + error.message, 'error');
    }
  }
}
