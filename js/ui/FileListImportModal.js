/**
 * FileListImportModal - 文件列表导入模态框
 * Markdown 编辑器 v3.1.1
 */

class FileListImportModal {
  constructor() {
    this.fileList = [];
    this.conflicts = [];
    this.selectedIds = new Set();
    this.strategy = 'merge';
    this.mode = 'import'; // 'import' 或 'export'
    this.format = 'zip'; // 导出格式：'zip' 或 'json'
    this.modal = null;
    this.onConfirm = null;
  }

  /**
   * 设置模态框模式
   * @param {string} mode - 'import' 或 'export'
   */
  setMode(mode) {
    this.mode = mode;
  }

  /**
   * 创建模态框HTML结构
   */
  create() {
    const isExportMode = this.mode === 'export';
    const title = isExportMode ? '📤 选择要导出的文件' : '📥 导入文件清单';
    const confirmBtnText = isExportMode ? '导出' : '导入';
    const confirmBtnClass = isExportMode ? 'export' : 'import';

    const html = `
      <div class="modal" id="fileListImportModal">
        <div class="modal-content">
          <div class="modal-header">
            <span>${title}</span>
            <button class="modal-close" id="fileListImportModalClose">×</button>
          </div>

          <!-- 文件列表 -->
          <div class="import-file-list">
            <h4>文件列表（<span id="fileListCount">0</span> 个）</h4>
            <div class="file-checklist" id="fileChecklist"></div>
          </div>

          <!-- 冲突提示（仅导入模式显示） -->
          <div class="conflict-notice" id="conflictNotice" style="display:none;">
            <strong>⚠️ 发现 <span id="conflictCount">0</span> 个冲突文件</strong>
            <div class="conflict-strategy">
              <label>
                <input type="radio" name="strategy" value="merge" checked> 覆盖现有文件
              </label>
              <label>
                <input type="radio" name="strategy" value="skip"> 跳过现有文件
              </label>
            </div>
          </div>

          <!-- 导出格式选择（仅导出模式显示） -->
          <div class="export-format-select" id="exportFormatSelect" style="display:none;">
            <strong>选择导出格式</strong>
            <div class="format-options">
              <label>
                <input type="radio" name="exportFormat" value="zip" checked> ZIP 格式
                <span class="format-hint">（推荐）包含目录结构</span>
              </label>
              <label>
                <input type="radio" name="exportFormat" value="json"> JSON 格式
                <span class="format-hint">便于查看和编辑</span>
              </label>
            </div>
          </div>

          <!-- 统计信息 -->
          <div class="import-summary">
            <p>已选择：<strong id="selectedCount">0</strong> 个文件</p>
          </div>

          <div class="modal-footer">
            <button class="modal-btn secondary" id="importCancelBtn">取消</button>
            <button class="modal-btn primary ${confirmBtnClass}" id="importConfirmBtn">${confirmBtnText}</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    this.modal = document.getElementById('fileListImportModal');
    this.bindEvents();

    // 显示/隐藏导出格式选择
    const exportFormatSelect = document.getElementById('exportFormatSelect');
    if (exportFormatSelect) {
      exportFormatSelect.style.display = isExportMode ? 'block' : 'none';
    }
  }

  /**
   * 显示模态框
   * @param {Array<Object>} fileList - 文件列表
   * @param {Array<Object>} conflicts - 冲突列表（仅导入模式）
   */
  show(fileList, conflicts = []) {
    if (!this.modal) {
      this.create();
    }

    this.fileList = fileList;
    this.conflicts = this.mode === 'import' ? conflicts : [];
    this.selectedIds = new Set();

    // 默认选中所有文件
    fileList.forEach(f => this.selectedIds.add(f.id));

    this.renderFileList();
    if (this.mode === 'import' && conflicts.length > 0) {
      this.showConflictNotice();
    }
    this.updateSummary();
    this.modal.classList.add('show');
  }

  /**
   * 渲染文件列表
   */
  renderFileList() {
    const checklist = document.getElementById('fileChecklist');
    const count = document.getElementById('fileListCount');

    count.textContent = this.fileList.length;

    checklist.innerHTML = this.fileList.map(file => {
      const isConflict = this.conflicts.some(c => c.newFile.id === file.id);
      const isSelected = this.selectedIds.has(file.id);
      const cacheInfo = file.cacheInfo || { count: 0, size: 0 };
      const cacheDisplay = cacheInfo.count > 0
        ? `💾 ${cacheInfo.count} 张 (${this.formatSize(cacheInfo.size)})`
        : '无缓存';

      return `
        <div class="file-check-item">
          <input
            type="checkbox"
            class="file-checkbox"
            data-file-id="${file.id}"
            ${isSelected ? 'checked' : ''}
          >
          <div class="file-info">
            <span class="file-name">${file.name}</span>
            <span class="file-stats">
              ${file.lineCount || 0} 行 |
              ${file.wordCount || 0} 字 |
              ${this.formatSize(file.contentSize || 0)}
              ${isConflict ? '<span class="conflict-badge">⚠️ 冲突</span>' : ''}
            </span>
            <span class="file-cache-info" style="color: #666; font-size: 12px; margin-left: 8px;">
              ${cacheDisplay}
            </span>
          </div>
        </div>
      `;
    }).join('');

    // 重新绑定复选框事件
    document.querySelectorAll('.file-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const fileId = e.target.dataset.fileId;
        if (e.target.checked) {
          this.selectedIds.add(fileId);
        } else {
          this.selectedIds.delete(fileId);
        }
        this.updateSummary();
      });
    });
  }

  /**
   * 显示冲突提示
   */
  showConflictNotice() {
    const notice = document.getElementById('conflictNotice');
    const count = document.getElementById('conflictCount');
    count.textContent = this.conflicts.length;
    notice.style.display = 'block';
  }

  /**
   * 更新摘要信息
   */
  updateSummary() {
    const selectedCount = document.getElementById('selectedCount');
    selectedCount.textContent = this.selectedIds.size;
  }

  /**
   * 获取选中的文件ID
   * @returns {Array<string>} 选中的文件ID数组
   */
  getSelectedIds() {
    return Array.from(this.selectedIds);
  }

  /**
   * 获取导入策略
   * @returns {string} 导入策略
   */
  getStrategy() {
    return document.querySelector('input[name="strategy"]:checked')?.value || 'merge';
  }

  /**
   * 获取导出格式
   * @returns {string} 导出格式 ('zip' 或 'json')
   */
  getFormat() {
    return document.querySelector('input[name="exportFormat"]:checked')?.value || 'zip';
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 关闭按钮
    document.getElementById('fileListImportModalClose')?.addEventListener('click', () => this.close());
    document.getElementById('importCancelBtn')?.addEventListener('click', () => this.close());

    // 确认按钮
    document.getElementById('importConfirmBtn')?.addEventListener('click', () => {
      if (this.onConfirm) {
        const selectedIds = this.getSelectedIds();
        if (this.mode === 'export') {
          // 导出模式：传递选中的文件ID和格式
          const format = this.getFormat();
          this.onConfirm(selectedIds, format);
        } else {
          // 导入模式：传递选中的文件ID和策略
          const strategy = this.getStrategy();
          this.onConfirm(selectedIds, strategy);
        }
      }
    });

    // 点击模态框外部关闭
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  /**
   * 关闭模态框
   */
  close() {
    if (this.modal) {
      this.modal.classList.remove('show');
      // 延迟移除DOM，等待动画完成
      setTimeout(() => {
        this.modal?.remove();
        this.modal = null;
      }, 300);
    }
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的大小
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
