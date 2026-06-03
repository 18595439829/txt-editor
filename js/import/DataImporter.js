/**
 * DataImporter - 数据导入系统
 * Markdown 编辑器 v3.1.1
 */

class DataImporter {
  /**
   * 导入 JSON 文件
   */
  async importFromJson(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const validation = this.validateData(data);
          if (!validation.valid) {
            alert("数据格式错误: " + validation.error);
            reject(validation.error);
            return;
          }

          let result = { filesCount: 0, imagesCount: 0 };

          if (data.exportType === "full") {
            // 导入全部文件
            for (const fileData of data.files || []) {
              // 检查同名文件
              const existingFile = (await fileManager.getAllFiles()).find(
                (f) => f.name === fileData.name
              );
              if (existingFile) {
                // 覆盖现有文件
                await fileManager.saveFile(
                  existingFile.id,
                  fileData.content
                );
                // 更新时间戳
                await this.updateFileTimestamp(existingFile.id, fileData);
              } else {
                // 创建新文件
                const newFile = await fileManager.createFile(
                  fileData.name
                );
                await fileManager.saveFile(newFile.id, fileData.content);
                // 更新时间戳
                await this.updateFileTimestamp(newFile.id, fileData);
              }
              result.filesCount++;
            }

            // 导入图片
            for (const imgData of data.images || []) {
              try {
                await imageCache.addImage(
                  { name: imgData.fileName },
                  imgData.dataUrl,
                  imgData.fileId
                );
                result.imagesCount++;
              } catch (err) {
                console.error("导入图片失败:", imgData.fileName, err);
              }
            }
          } else if (data.exportType === "single") {
            // 导入单个文件
            const fileData = data.file;
            const existingFile = (await fileManager.getAllFiles()).find(
              (f) => f.name === fileData.name
            );
            if (existingFile) {
              // 覆盖现有文件
              await fileManager.saveFile(
                existingFile.id,
                fileData.content
              );
              await this.updateFileTimestamp(existingFile.id, fileData);
            } else {
              // 创建新文件
              const newFile = await fileManager.createFile(
                fileData.name
              );
              await fileManager.saveFile(newFile.id, fileData.content);
              await this.updateFileTimestamp(newFile.id, fileData);
            }
            result.filesCount++;

            // 导入该文件的图片
            for (const imgData of data.images || []) {
              try {
                await imageCache.addImage(
                  { name: imgData.fileName },
                  imgData.dataUrl,
                  imgData.fileId
                );
                result.imagesCount++;
              } catch (err) {
                console.error("导入图片失败:", imgData.fileName, err);
              }
            }
          }

          alert(
            `导入成功！\n文件: ${result.filesCount}\n图片: ${result.imagesCount}`
          );
          resolve(result);
        } catch (err) {
          alert("导入失败: " + err.message);
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }

  /**
   * 导入 ZIP 文件
   */
  async importFromZip(file) {
    try {
      const zip = await JSZip.loadAsync(file);
      const result = { filesCount: 0, imagesCount: 0 };

      // 读取 metadata
      let metadata = {};
      if (zip.files["metadata.json"]) {
        const metadataStr = await zip.files["metadata.json"].async(
          "text"
        );
        metadata = JSON.parse(metadataStr);
      }

      // 读取文件列表
      let files = [];
      if (zip.files["files.json"]) {
        const filesStr = await zip.files["files.json"].async("text");
        files = JSON.parse(filesStr);
      }

      // 导入文件
      for (const fileData of files) {
        const existingFile = (await fileManager.getAllFiles()).find(
          (f) => f.name === fileData.name
        );
        if (existingFile) {
          // 覆盖现有文件
          await fileManager.saveFile(existingFile.id, fileData.content);
          await this.updateFileTimestamp(existingFile.id, fileData);
        } else {
          // 创建新文件
          const newFile = await fileManager.createFile(fileData.name);
          await fileManager.saveFile(newFile.id, fileData.content);
          await this.updateFileTimestamp(newFile.id, fileData);
        }
        result.filesCount++;
      }

      // 读取图片元数据
      let imagesMetadata = [];
      if (zip.files["images.json"]) {
        const imagesStr = await zip.files["images.json"].async("text");
        imagesMetadata = JSON.parse(imagesStr);
      }

      // 导入图片文件
      for (const imgMeta of imagesMetadata) {
        try {
          const imgFile = zip.files[`images/${imgMeta.id}.img`];
          if (imgFile) {
            const base64Data = await imgFile.async("base64");
            const dataUrl = `data:${imgMeta.mimeType};base64,${base64Data}`;
            await imageCache.addImage(
              { name: imgMeta.fileName },
              dataUrl,
              imgMeta.fileId
            );
            result.imagesCount++;
          }
        } catch (err) {
          console.error("导入图片失败:", imgMeta.fileName, err);
        }
      }

      alert(
        `导入成功！\n文件: ${result.filesCount}\n图片: ${result.imagesCount}`
      );
      return result;
    } catch (err) {
      alert("导入 ZIP 失败: " + err.message);
      throw err;
    }
  }

  /**
   * 导入单个文件 JSON
   */
  async importSingleFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);

          if (!data.file) {
            alert("文件格式错误：缺少 file 字段");
            reject(new Error("Invalid file format"));
            return;
          }

          const fileData = data.file;
          const existingFile = (await fileManager.getAllFiles()).find(
            (f) => f.name === fileData.name
          );
          if (existingFile) {
            // 覆盖现有文件
            await fileManager.saveFile(
              existingFile.id,
              fileData.content
            );
            await this.updateFileTimestamp(existingFile.id, fileData);
          } else {
            // 创建新文件
            const newFile = await fileManager.createFile(fileData.name);
            await fileManager.saveFile(newFile.id, fileData.content);
            await this.updateFileTimestamp(newFile.id, fileData);
          }

          // 导入该文件的图片
          let imagesCount = 0;
          for (const imgData of data.images || []) {
            try {
              await imageCache.addImage(
                { name: imgData.fileName },
                imgData.dataUrl,
                imgData.fileId
              );
              imagesCount++;
            } catch (err) {
              console.error("导入图片失败:", imgData.fileName, err);
            }
          }

          alert(`导入成功！\n图片: ${imagesCount}`);
          resolve({ filesCount: 1, imagesCount: imagesCount });
        } catch (err) {
          alert("导入失败: " + err.message);
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }

  /**
   * 验证导入数据格式
   */
  validateData(data) {
    if (!data.version) {
      return { valid: false, error: "缺少版本信息" };
    }
    if (!data.exportType) {
      return { valid: false, error: "缺少导出类型" };
    }
    if (data.exportType === "full" && !Array.isArray(data.files)) {
      return { valid: false, error: "文件列表格式错误" };
    }
    if (
      data.exportType === "single" &&
      typeof data.file !== "object"
    ) {
      return { valid: false, error: "文件数据格式错误" };
    }
    return { valid: true };
  }

  /**
   * 更新文件时间戳
   */
  async updateFileTimestamp(fileId, sourceData) {
    return new Promise((resolve, reject) => {
      const transaction = fileManager.db.transaction(
        [fileManager.storeName],
        "readwrite"
      );
      const store = transaction.objectStore(fileManager.storeName);
      const request = store.get(fileId);

      request.onsuccess = () => {
        const file = request.result;
        if (file) {
          file.createTime = sourceData.createTime;
          file.updateTime = sourceData.updateTime;
          const updateRequest = store.put(file);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 导入文件清单预览（v3.1 新增）
   * @param {File} file - 要导入的JSON文件
   * @returns {Promise<Object>} 预览数据
   */
  async importFileListPreview(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);

          // 验证数据
          const validation = this.validateFileListData(data);
          if (!validation.valid) {
            reject(new Error(validation.errors.join('; ')));
            return;
          }

          // 检测冲突
          const conflicts = await this.detectConflicts(data.files || []);

          // 返回预览数据
          resolve({
            data,
            conflicts,
            validation,
            summary: {
              fileCount: data.files?.length || 0,
              totalSize: data.files?.reduce((s, f) => s + (f.contentSize || 0), 0) || 0,
            }
          });
        } catch (err) {
          reject(new Error("文件格式错误: " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsText(file);
    });
  }

  /**
   * 检测导入冲突（v3.1 新增）
   * @param {Array<Object>} newFiles - 导入的文件数组
   * @returns {Promise<Array<Object>>} 冲突数组
   */
  async detectConflicts(newFiles) {
    const existingFiles = await fileManager.getAllFiles();
    const existingNames = new Map(existingFiles.map(f => [f.name, f]));

    return newFiles
      .map(newFile => {
        const existing = existingNames.get(newFile.name);
        if (existing) {
          return {
            type: 'name-conflict',
            newFile,
            existingFile: existing,
            status: 'unresolved'
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  /**
   * 导入选中的文件（v3.1 新增）
   * @param {Object} data - 导入的数据对象
   * @param {Array<string>} selectedIds - 选中的文件ID
   * @param {string} strategy - 导入策略：merge、skip、rename
   * @returns {Promise<Object>} 导入结果
   */
  async importSelectedFiles(data, selectedIds, strategy = 'merge') {
    const filesToImport = (data.files || []).filter(f => selectedIds.includes(f.id));
    const result = { filesCount: 0, skipped: 0, errors: [] };

    for (const fileData of filesToImport) {
      try {
        const existingFile = (await fileManager.getAllFiles()).find(
          f => f.name === fileData.name
        );

        if (existingFile && strategy === 'skip') {
          result.skipped++;
          continue;
        }

        if (existingFile && strategy === 'merge') {
          // 合并：覆盖内容但保留时间戳
          await fileManager.saveFile(existingFile.id, fileData.content || '');
          result.filesCount++;
        } else if (!existingFile) {
          // 创建新文件
          const newFile = await fileManager.createFile(fileData.name);
          if (fileData.content) {
            await fileManager.saveFile(newFile.id, fileData.content);
          }
          if (fileData.createTime && fileData.updateTime) {
            await this.updateFileTimestamp(newFile.id, fileData);
          }
          result.filesCount++;
        }
      } catch (err) {
        result.errors.push({
          fileName: fileData.name,
          error: err.message
        });
      }
    }

    return result;
  }

  /**
   * 验证文件清单数据（v3.1 新增）
   * @param {Object} data - 要验证的数据
   * @returns {Object} 验证结果
   */
  validateFileListData(data) {
    const errors = [];
    const warnings = [];

    if (!data.version) errors.push("缺少版本字段");
    if (!data.exportType) errors.push("缺少导出类型");

    if (!Array.isArray(data.files)) {
      errors.push("文件列表格式错误");
    } else {
      data.files.forEach((f, i) => {
        if (!f.name) warnings.push(`文件${i}缺少名称`);
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 从ZIP导入文件列表（v3.1.1 新增）
   * @param {Blob} zipFile - ZIP文件
   * @returns {Promise<Object>} 预览信息
   */
  async importFileListFromZip(zipFile) {
    try {
      const zip = await JSZip.loadAsync(zipFile);

      // 读取metadata.json
      const metadataFile = zip.file('metadata.json');
      if (!metadataFile) {
        throw new Error('无效的ZIP文件：缺少metadata.json');
      }

      const metadataText = await metadataFile.async('text');
      const metadata = JSON.parse(metadataText);

      // 读取files文件夹中的文件
      const files = [];
      const filesFolder = zip.folder('files');
      if (filesFolder) {
        const filePromises = [];
        filesFolder.forEach((relativePath, file) => {
          filePromises.push(
            file.async('text').then(content => {
              files.push({
                name: relativePath.replace(/\.md$/, ''),
                content: content,
                importPath: relativePath
              });
            })
          );
        });
        await Promise.all(filePromises);
      }

      // 读取资源
      const resources = await resourceManager.importResourcesFromZip(zip);

      // 检测冲突
      const conflicts = await this.detectConflicts(files.map(f => ({ name: f.name })));

      return {
        valid: true,
        metadata: metadata,
        data: { files, resources },
        conflicts: conflicts,
        resourceCount: resources.length
      };
    } catch (error) {
      console.error('导入ZIP失败:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * 导入单个文件（v3.1.1 新增）
   * @param {File} file - 要导入的文件（JSON或ZIP）
   * @param {string} strategy - 导入策略：'merge' | 'skip' | 'rename'
   * @param {boolean} importResources - 是否导入关联资源
   * @returns {Promise<Object>} 导入结果
   */
  async importSingleFile(file, strategy = 'merge', importResources = true) {
    const result = {
      success: false,
      fileName: file.name,
      fileId: null,
      resourceCount: 0,
      errors: []
    };

    try {
      // 判断文件类型
      if (file.name.endsWith('.zip')) {
        return await this.importSingleFileFromZip(file, strategy, importResources);
      } else if (file.name.endsWith('.json')) {
        return await this.importSingleFileFromJson(file, strategy, importResources);
      } else {
        throw new Error('不支持的文件格式，请使用JSON或ZIP');
      }
    } catch (error) {
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * 从JSON导入单个文件
   * @param {File} file - JSON文件
   * @param {string} strategy - 导入策略
   * @param {boolean} importResources - 是否导入资源
   * @returns {Promise<Object>} 导入结果
   */
  async importSingleFileFromJson(file, strategy, importResources) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = {
          success: false,
          fileName: file.name,
          fileId: null,
          resourceCount: 0,
          errors: []
        };

        try {
          const data = JSON.parse(e.target.result);

          if (data.type !== 'single-file') {
            throw new Error('不是单文件导出格式');
          }

          const fileData = data.file;
          const existingFiles = await fileManager.getAllFiles();
          let targetFile = existingFiles.find(f => f.name === fileData.name);

          if (targetFile && strategy === 'skip') {
            result.success = true;
            resolve(result);
            return;
          }

          if (targetFile && strategy === 'merge') {
            // 覆盖现有文件
            await fileManager.saveFile(targetFile.id, fileData.content || '');
            result.fileId = targetFile.id;
          } else if (!targetFile) {
            // 创建新文件
            const newFile = await fileManager.createFile(fileData.name);
            await fileManager.saveFile(newFile.id, fileData.content || '');
            result.fileId = newFile.id;
          }

          result.success = true;

          // 导入资源
          if (importResources && data.resources && data.resources.length > 0) {
            const resourceResult = await resourceManager.importResources(
              data.resources,
              strategy,
              result.fileId
            );
            result.resourceCount = resourceResult.success;
            if (resourceResult.errors.length > 0) {
              result.errors.push(...resourceResult.errors);
            }
          }

          resolve(result);
        } catch (error) {
          result.errors.push(error.message);
          resolve(result);
        }
      };
      reader.readAsText(file);
    });
  }

  /**
   * 从ZIP导入单个文件
   * @param {File} file - ZIP文件
   * @param {string} strategy - 导入策略
   * @param {boolean} importResources - 是否导入资源
   * @returns {Promise<Object>} 导入结果
   */
  async importSingleFileFromZip(file, strategy, importResources) {
    const result = {
      success: false,
      fileName: file.name,
      fileId: null,
      resourceCount: 0,
      errors: []
    };

    try {
      const zip = await JSZip.loadAsync(file);

      // 读取metadata.json
      const metadataFile = zip.file('metadata.json');
      if (!metadataFile) {
        throw new Error('无效的ZIP文件：缺少metadata.json');
      }

      const metadataText = await metadataFile.async('text');
      const metadata = JSON.parse(metadataText);

      if (metadata.type !== 'single-file-zip') {
        throw new Error('不是单文件ZIP导出格式');
      }

      // 读取文件内容
      const fileFile = zip.file('file.md');
      if (!fileFile) {
        throw new Error('ZIP中缺少file.md');
      }

      const fileContent = await fileFile.async('text');
      const fileData = {
        name: metadata.file.name,
        content: fileContent
      };

      // 检查冲突
      const existingFiles = await fileManager.getAllFiles();
      let targetFile = existingFiles.find(f => f.name === fileData.name);

      if (targetFile && strategy === 'skip') {
        result.success = true;
        result.fileId = targetFile.id;
        return result;
      }

      if (targetFile && strategy === 'merge') {
        // 覆盖现有文件
        await fileManager.saveFile(targetFile.id, fileData.content);
        result.fileId = targetFile.id;
      } else if (!targetFile) {
        // 创建新文件
        const newFile = await fileManager.createFile(fileData.name);
        await fileManager.saveFile(newFile.id, fileData.content);
        result.fileId = newFile.id;
      }

      result.success = true;

      // 导入资源
      if (importResources) {
        const resources = await resourceManager.importResourcesFromZip(zip);
        if (resources.length > 0) {
          const resourceResult = await resourceManager.importResources(
            resources,
            strategy,
            result.fileId
          );
          result.resourceCount = resourceResult.success;
          if (resourceResult.errors.length > 0) {
            result.errors.push(...resourceResult.errors);
          }
        }
      }

      return result;
    } catch (error) {
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * 全量覆盖导入（项目导入功能）
   * 显示确认对话框，导入时清空现有文件，完全替换为导入内容
   * @param {File} file - 要导入的文件
   * @returns {Promise<Object>} 导入结果
   */
  async importFullProjectWithConfirm(file) {
    try {
      // 先验证文件格式
      const isZip = file.name.endsWith('.zip');
      const isJson = file.name.endsWith('.json');

      if (!isZip && !isJson) {
        showToast('请选择 ZIP 或 JSON 格式的文件', 'error');
        return { success: false, error: '不支持的文件格式' };
      }

      let data;

      if (isZip) {
        // ZIP 格式需要先解析
        const zipData = await this.parseZipFile(file);
        if (!zipData) {
          showToast('ZIP 文件解析失败', 'error');
          return { success: false, error: 'ZIP 文件解析失败' };
        }
        data = zipData;
      } else {
        // JSON 格式直接解析
        const jsonContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        data = JSON.parse(jsonContent);
      }

      // 验证数据格式
      const validation = this.validateData(data);
      if (!validation.valid) {
        showToast('数据格式错误: ' + validation.error, 'error');
        return { success: false, error: validation.error };
      }

      // 显示确认对话框
      return new Promise((resolve) => {
        const confirmDialog = confirm(
          '此操作将删除所有现有文件，确认导入吗？\n\n' +
          '导入内容：' + (data.summary?.selectedCount || data.filesCount || 0) + ' 个文件\n' +
          '包含缓存：' + (data.summary?.imagesCount || data.imagesCount || 0) + ' 张图片'
        );

        if (confirmDialog) {
          // 用户确认，执行全量覆盖导入
          this.clearAllThenImport(data, file).then(resolve);
        } else {
          // 用户取消
          showToast('导入已取消', 'info');
          resolve({ success: false, cancelled: true });
        }
      });
    } catch (error) {
      console.error('导入全量覆盖失败:', error);
      showToast('导入失败: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行全量覆盖导入的核心逻辑
   * @param {Object} data - 导入的数据
   * @param {File} sourceFile - 源文件（用于记录）
   * @returns {Promise<Object>} 导入结果
   */
  async clearAllThenImport(data, sourceFile) {
    const result = {
      filesCount: 0,
      imagesCount: 0,
      errors: [],
      success: false
    };

    try {
      // 步骤 1: 删除所有现有文件
      try {
        const deletedCount = await fileManager.deleteAllFiles();
        console.log(`已删除 ${deletedCount} 个现有文件`);
      } catch (err) {
        console.warn('删除现有文件时出错:', err);
      }

      // 步骤 2: 删除所有现有图片
      try {
        await imageCache.clearCache();
        console.log('已清空所有图片缓存');
      } catch (err) {
        console.warn('清空图片缓存时出错:', err);
      }

      // 步骤 3: 导入新文件
      const filesToImport = data.files || [];
      for (const fileData of filesToImport) {
        try {
          // 创建新文件
          const newFile = await fileManager.createFile(fileData.name);
          await fileManager.saveFile(newFile.id, fileData.content);

          // 更新时间戳（保持原始时间）
          await this.updateFileTimestamp(newFile.id, fileData);

          result.filesCount++;
        } catch (err) {
          console.error('导入文件失败:', fileData.name, err);
          result.errors.push(`文件 "${fileData.name}" 导入失败: ${err.message}`);
        }
      }

      // 步骤 4: 导入关联的图片
      const resourcesToImport = data.resources || [];
      for (const resourceData of resourcesToImport) {
        try {
          // 处理 dataUrl 格式的图片数据
          const dataUrl = resourceData.dataUrl || resourceData.data;
          if (!dataUrl) {
            console.warn('图片数据缺失:', resourceData.id);
            continue;
          }

          await imageCache.addImage(
            { name: resourceData.fileName },
            dataUrl,
            resourceData.fileId
          );
          result.imagesCount++;
        } catch (err) {
          console.error('导入图片失败:', resourceData.fileName, err);
          result.errors.push(`图片 "${resourceData.fileName}" 导入失败: ${err.message}`);
        }
      }

      // 步骤 5: 清理孤立缓存（删除未被引用的图片）
      try {
        const cleanedCount = await imageCache.cleanupUnusedCache();
        console.log(`已清理 ${cleanedCount} 张孤立缓存`);
      } catch (err) {
        console.warn('清理孤立缓存时出错:', err);
      }

      result.success = true;

      // 显示成功提示
      if (result.filesCount > 0 || result.imagesCount > 0) {
        showToast(
          `导入成功：${result.filesCount} 个文件，${result.imagesCount} 张图片`,
          'success'
        );
      }

      // 如果有错误，显示警告
      if (result.errors.length > 0) {
        console.warn('导入过程中的错误:', result.errors);
        showToast(
          `导入完成，但有 ${result.errors.length} 个错误`,
          'warning'
        );
      }

      return result;
    } catch (error) {
      console.error('全量覆盖导入失败:', error);
      result.errors.push(error.message);
      showToast('导入失败: ' + error.message, 'error');
      return result;
    }
  }

  /**
   * 解析 ZIP 文件（辅助方法）
   * @param {File} file - ZIP 文件
   * @returns {Promise<Object|null>} 解析后的数据或 null
   */
  async parseZipFile(file) {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      // 获取 metadata.json
      let metadata = {};
      if (zipContent.files['metadata.json']) {
        const metadataStr = await zipContent.files['metadata.json'].async('text');
        metadata = JSON.parse(metadataStr);
      }

      // 获取文件列表
      const files = [];
      const filesFolder = zipContent.folder('files');
      if (filesFolder) {
        filesFolder.forEach((relativePath, file) => {
          if (!file.dir && relativePath.endsWith('.md')) {
            files.push({
              path: relativePath,
              file: file
            });
          }
        });

        // 读取文件内容
        for (const item of files) {
          const content = await item.file.async('text');
          const fileName = item.path.replace(/\.md$/, '');
          files[files.indexOf(item)] = {
            id: 'imported_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: fileName,
            content: content,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
          };
        }
      }

      // 获取资源
      const resources = [];
      const resourcesFolder = zipContent.folder('resources');
      if (resourcesFolder) {
        // 获取资源 manifest
        let resourceManifest = [];
        if (zipContent.files['resources/manifest.json']) {
          const manifestStr = await zipContent.files['resources/manifest.json'].async('text');
          resourceManifest = JSON.parse(manifestStr);
        }

        // 读取图片文件
        const imagesFolder = resourcesFolder.folder('images');
        if (imagesFolder) {
          for (const resourceItem of resourceManifest) {
            const imgFile = imagesFolder.files[resourceItem.id + '.img'];
            if (imgFile) {
              const base64Data = await imgFile.async('base64');
              const mimeType = resourceItem.mimeType || 'image/png';
              resources.push({
                id: resourceItem.id,
                fileId: resourceItem.fileId,
                fileName: resourceItem.fileName,
                mimeType: mimeType,
                size: resourceItem.size,
                dataUrl: `data:${mimeType};base64,${base64Data}`
              });
            }
          }
        }
      }

      return {
        version: metadata.version || '3.2',
        exportType: metadata.exportType || 'project-backup',
        filesCount: files.length,
        imagesCount: resources.length,
        summary: metadata.summary || {
          selectedCount: files.length,
          imagesCount: resources.length
        },
        files: files,
        resources: resources
      };
    } catch (error) {
      console.error('ZIP 文件解析失败:', error);
      return null;
    }
  }
}
