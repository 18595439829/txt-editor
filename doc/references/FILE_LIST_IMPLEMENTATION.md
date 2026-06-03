# 🔧 文件列表导入导出功能 - 完整实现指南

**版本**: v3.1 | **最后更新**: 2026-04-02 | **状态**: ✅ 完全实现

---

## 目录

1. [功能概述](#功能概述)
2. [架构设计](#架构设计)
3. [核心组件](#核心组件)
4. [实现细节](#实现细节)
5. [API 文档](#api-文档)
6. [集成说明](#集成说明)
7. [扩展建议](#扩展建议)

---

## 功能概述

### 核心功能

**文件列表管理系统** 为 Markdown 编辑器提供以下能力：

1. **导出功能**
   - 将文件清单导出为 JSON
   - 支持导出为 ZIP（含文件内容）
   - 包含文件统计、预览、元数据

2. **导入功能**
   - 导入 JSON 或 ZIP 格式清单
   - 冲突检测和多策略处理
   - 选择性导入（单选、多选）

3. **文件管理**
   - 文件元数据管理（创建时间、修改时间）
   - 文件统计计算（行数、字数、字符数）
   - 文件内容完整性保证

### 设计目标

- **无损导入导出**: 数据在导出-导入循环中保持一致
- **灵活的冲突处理**: 支持多种冲突解决策略
- **用户友好**: 导入前预览，清晰的错误提示
- **性能优化**: 大文件列表（100+）快速处理

---

## 架构设计

### 系统组件图

```
┌─────────────────────────────────────────────────────────────┐
│                        UI 层                                  │
├─────────────────────────────────────────────────────────────┤
│  导出按钮 [📋]  →  导入按钮 [📥]  →  导入对话框 [Modal]      │
│                                                               │
│  FileListImportModal (选择、冲突处理、确认)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    控制层                                     │
├─────────────────────────────────────────────────────────────┤
│  事件处理器 (editor.html 第 1060-1130 行)                    │
│  - 处理导出按钮点击
│  - 处理导入文件选择
│  - 管理模态框生命周期
│  - 处理导入结果
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    业务逻辑层                                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐  ┌──────────────────────┐          │
│  │  DataExporter       │  │  DataImporter        │          │
│  │  导出清单和统计     │  │  导入和冲突检测      │          │
│  │                     │  │                      │          │
│  │ - exportFileList()  │  │ - importFileList()   │          │
│  │ - enrichFileData()  │  │ - detectConflicts()  │          │
│  │ - calculateStats()  │  │ - importSelected()   │          │
│  │ - exportAsZip()     │  │ - validateData()     │          │
│  └─────────────────────┘  └──────────────────────┘          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    数据访问层                                 │
├─────────────────────────────────────────────────────────────┤
│  FileManager          ImageCacheManager                      │
│  - getAllFiles()      - getAllImages()                       │
│  - getFile()          - getFileImages()                      │
│  - saveFile()         - deleteImage()                        │
│  - deleteFile()       - saveImage()                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    存储层                                     │
├─────────────────────────────────────────────────────────────┤
│  IndexedDB (files store)    │    Cache API (images)          │
│  - 文件元数据                │    - 图片数据(dataUrl)         │
│  - 文件内容                  │    - 缓存元数据                 │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

#### 导出流程

```
用户点击 [📋 导出清单]
         │
         ▼
exporter.exportFileList()
         │
         ├─ 获取所有文件 (fileManager.getAllFiles)
         │
         ├─ 逐个增强文件数据
         │  ├─ 计算统计 (lineCount, wordCount, etc)
         │  ├─ 生成预览 (前200字符)
         │  └─ 记录时间差
         │
         ├─ 计算总体统计
         │  ├─ totalFiles, totalLines, totalWords
         │  ├─ totalChars, totalSize, avgLinesPerFile
         │  └─ lastModified
         │
         ├─ 组装导出数据
         │  {
         │    version: "3.1",
         │    exportType: "filelist",
         │    exportTime: "ISO8601",
         │    filesCount: N,
         │    statistics: { ... },
         │    files: [ ... ]
         │  }
         │
         ├─ 序列化为 JSON
         │
         └─ 触发下载
            (file-list-{timestamp}.json)
```

#### 导入流程

```
用户点击 [📥 导入清单]
         │
         ├─ 显示文件选择对话框
         │
用户选择文件 (.json 或 .zip)
         │
         ▼
importer.importFileListPreview()
         │
         ├─ 解析文件内容
         │
         ├─ 验证数据格式
         │  └─ 检查必需字段: version, files
         │
         ├─ 检测冲突
         │  └─ 遍历导入文件，对比现有文件名
         │
         └─ 返回预览信息
            {
              valid: true/false,
              data: { ... },
              conflicts: [ ... ]
            }
         │
         ▼
显示导入预览对话框
         │
         ├─ 渲染文件列表 (包含复选框)
         ├─ 显示冲突警告 (如果有)
         ├─ 显示导入策略选择
         └─ 显示已选文件数量
         │
用户确认导入
         │
         ▼
importer.importSelectedFiles(data, selectedIds, strategy)
         │
         ├─ 遍历每个待导入文件
         │
         ├─ 检查冲突处理策略
         │  ├─ merge: 覆盖现有文件
         │  ├─ skip: 跳过已存在文件
         │  └─ rename: 重命名 (可选)
         │
         ├─ 使用 fileManager.saveFile() 保存
         │
         └─ 返回导入结果
            {
              filesCount: N,
              skipped: M,
              errors: [ ... ]
            }
         │
         ▼
刷新 UI
         ├─ refreshFilesList()
         ├─ updateGlobalCacheUI()
         └─ showToast("导入成功")
```

---

## 核心组件

### 1. DataExporter 类

**位置**: `js/export/DataExporter.js`

#### 主要方法

##### exportFileList(selectedIds, options)

导出文件清单为 JSON

```javascript
/**
 * 导出文件清单
 * @param {Array<string>} selectedIds - 可选的文件 ID 数组，默认导出全部
 * @param {Object} options - 导出选项
 * @param {boolean} options.includePreview - 是否包含内容预览，默认 true
 * @param {boolean} options.includeStatistics - 是否包含统计信息，默认 true
 */
async exportFileList(selectedIds = null, options = {}) {
  // 实现逻辑...
}
```

**返回**: 触发浏览器下载，文件名为 `file-list-{timestamp}.json`

**导出数据格式**:
```javascript
{
  "version": "3.1",
  "exportType": "filelist",
  "exportTime": "2026-04-02T10:30:00.000Z",
  "filesCount": 5,
  "totalSize": 102400,
  "statistics": {
    "totalFiles": 5,
    "totalLines": 1250,
    "totalWords": 8500,
    "totalChars": 51200,
    "totalSize": 102400,
    "avgLinesPerFile": 250,
    "lastModified": "2026-04-02T10:30:00.000Z"
  },
  "files": [
    {
      "id": "file_1704067200000_abc123",
      "name": "文件标题",
      "content": "# 文件内容...",
      "createTime": "2026-03-20T15:30:00.000Z",
      "updateTime": "2026-04-02T10:30:00.000Z",
      "contentSize": 12800,
      "lineCount": 150,
      "wordCount": 1200,
      "charCount": 12800,
      "preview": "# 文件标题\n\n前200字符...",
      "metadata": {
        "createdAgo": "2天前",
        "modifiedAgo": "5分钟前"
      }
    }
  ],
  "options": {
    "includePreview": true,
    "includeStatistics": true
  }
}
```

##### enrichFileData(file)

为单个文件增加统计信息

```javascript
/**
 * 增强文件数据
 * @param {Object} file - 原始文件对象
 * @returns {Promise<Object>} 增强后的文件对象
 */
async enrichFileData(file) {
  // 计算行数: 按 \n 分割
  const lineCount = (file.content || '').split('\n').length;

  // 计算字数: 按空白符分割并过滤
  const wordCount = (file.content || '').split(/\s+/).filter(w => w).length;

  // 生成预览: 前 200 字符
  const preview = this.generatePreview(file.content, 200);

  // 返回增强后的对象
  return {
    ...file,
    contentSize: file.content.length,
    lineCount,
    wordCount,
    charCount: file.content.length,
    preview,
    metadata: {
      createdAgo: this.getTimeDiff(new Date(file.createTime)),
      modifiedAgo: this.getTimeDiff(new Date(file.updateTime))
    }
  };
}
```

##### calculateTotalStatistics(files)

计算文件列表的总体统计

```javascript
/**
 * 计算统计信息
 * @param {Array<Object>} files - 增强后的文件数组
 * @returns {Object} 统计结果
 */
calculateTotalStatistics(files) {
  return {
    totalFiles: files.length,
    totalLines: 所有文件的行数之和,
    totalWords: 所有文件的字数之和,
    totalChars: 所有文件的字符数之和,
    totalSize: 所有文件的大小之和,
    avgLinesPerFile: 平均每个文件的行数,
    createdFiles: files.length,
    lastModified: 最近修改时间
  };
}
```

##### exportFileListAsZip(resourceFilter)

导出为 ZIP 压缩包（v3.1.1+ 新增）

```javascript
/**
 * 导出文件列表为压缩包
 * @param {string} resourceFilter - 资源过滤策略
 *   'all' - 导出所有资源（含图片）
 *   'used' - 仅导出文件中引用的图片
 *   'none' - 不导出资源，仅文件内容
 */
async exportFileListAsZip(resourceFilter = 'all') {
  // 创建 ZIP 结构
  // ├─ metadata.json (元数据)
  // ├─ files/
  // │  ├─ 文件1.md
  // │  ├─ 文件2.md
  // │  └─ ...
  // └─ resources/ (可选)
  //    ├─ images/
  //    │  ├─ img_xxx.img
  //    │  └─ ...
  //    └─ images.json
}
```

### 2. DataImporter 类

**位置**: `js/import/DataImporter.js`

#### 主要方法

##### importFileListPreview(file)

导入前预览

```javascript
/**
 * 导入前预览
 * @param {File} file - 用户选择的 .json 文件
 * @returns {Promise<Object>} 预览结果
 *   {
 *     valid: boolean,
 *     data: { 解析后的 JSON 数据 },
 *     conflicts: [冲突文件数组],
 *     error: string (如果无效)
 *   }
 */
async importFileListPreview(file) {
  // 1. 读取文件内容
  // 2. 解析 JSON
  // 3. 验证数据结构
  // 4. 检测冲突（对比现有文件名）
  // 5. 返回预览信息
}
```

**冲突数据结构**:
```javascript
{
  type: 'name-conflict',
  newFile: { id, name, ... },  // 待导入的文件
  existingFile: { id, name, ... },  // 现有的文件
  status: 'unresolved'
}
```

##### detectConflicts(newFiles)

检测文件冲突

```javascript
/**
 * 检测冲突
 * @param {Array<Object>} newFiles - 待导入的文件数组
 * @returns {Promise<Array>} 冲突列表
 */
async detectConflicts(newFiles) {
  const existingFiles = await fileManager.getAllFiles();
  const existingNames = new Set(existingFiles.map(f => f.name));

  const conflicts = newFiles.filter(file =>
    existingNames.has(file.name)
  ).map(file => ({
    type: 'name-conflict',
    newFile: file,
    existingFile: existingFiles.find(f => f.name === file.name),
    status: 'unresolved'
  }));

  return conflicts;
}
```

##### importSelectedFiles(data, selectedIds, strategy)

执行导入

```javascript
/**
 * 导入选中的文件
 * @param {Object} data - 导入数据对象
 * @param {Array<string>} selectedIds - 用户选中的文件 ID
 * @param {string} strategy - 冲突处理策略
 *   'merge' - 覆盖现有文件
 *   'skip' - 跳过已存在文件
 *   'rename' - 重命名导入文件
 * @returns {Promise<Object>} 导入结果
 */
async importSelectedFiles(data, selectedIds, strategy) {
  const result = {
    filesCount: 0,
    skipped: 0,
    errors: []
  };

  for (const file of data.files) {
    if (!selectedIds.includes(file.id)) continue;

    try {
      // 检查是否已存在
      const existing = await fileManager.getFileByName(file.name);

      if (existing) {
        if (strategy === 'skip') {
          result.skipped++;
          continue;
        } else if (strategy === 'rename') {
          file.name = this.generateUniqueName(file.name);
        }
      }

      // 保存文件
      await fileManager.saveFile({
        name: file.name,
        content: file.content,
        createTime: file.createTime,
        updateTime: file.updateTime
      });

      result.filesCount++;
    } catch (error) {
      result.errors.push({
        fileId: file.id,
        fileName: file.name,
        error: error.message
      });
    }
  }

  return result;
}
```

##### validateFileListData(data)

验证导入数据

```javascript
/**
 * 验证数据格式
 * @param {Object} data - 待验证的数据
 * @returns {Object} 验证结果 { valid, error }
 */
validateFileListData(data) {
  // 检查必需字段
  if (!data.version) return { valid: false, error: '缺少 version 字段' };
  if (!Array.isArray(data.files)) return { valid: false, error: '缺少 files 字段' };

  // 检查每个文件
  for (const file of data.files) {
    if (!file.id || !file.name) {
      return { valid: false, error: `文件 ${file.name || 'unknown'} 缺少必需字段` };
    }
  }

  return { valid: true };
}
```

### 3. FileListImportModal 类

**位置**: `js/ui/FileListImportModal.js`

#### 方法

##### create()

创建模态框 DOM

```javascript
create() {
  const html = `
    <div class="modal" id="fileListImportModal">
      <!-- 模态框内容 -->
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  this.modal = document.getElementById('fileListImportModal');
  // 绑定事件...
}
```

##### show(fileList, conflicts)

显示模态框

```javascript
show(fileList, conflicts) {
  this.fileList = fileList;
  this.conflicts = conflicts;

  this.renderFileList();  // 渲染文件列表
  this.renderConflicts(); // 显示冲突（如果有）
  this.modal.classList.add('show');
}
```

##### getSelectedIds()

获取用户选中的文件 ID

```javascript
getSelectedIds() {
  const checkboxes = document.querySelectorAll(
    '.file-checklist input[type="checkbox"]:checked'
  );
  return Array.from(checkboxes).map(cb => cb.dataset.fileId);
}
```

##### getStrategy()

获取用户选择的冲突处理策略

```javascript
getStrategy() {
  const selected = document.querySelector(
    '.conflict-strategy input[type="radio"]:checked'
  );
  return selected ? selected.value : 'merge';
}
```

---

## 实现细节

### 文件格式规范

#### JSON 清单格式

```json
{
  "version": "3.1",
  "exportType": "filelist",
  "exportTime": "2026-04-02T10:30:00.000Z",
  "filesCount": 2,
  "totalSize": 5242,
  "statistics": {
    "totalFiles": 2,
    "totalLines": 45,
    "totalWords": 325,
    "totalChars": 2000,
    "totalSize": 5242,
    "avgLinesPerFile": 22,
    "lastModified": "2026-04-02T10:30:00.000Z"
  },
  "files": [
    {
      "id": "file_1704067200000_abc",
      "name": "README",
      "content": "# 项目说明\n\n这是项目...",
      "createTime": "2026-03-20T15:30:00.000Z",
      "updateTime": "2026-04-02T10:30:00.000Z",
      "contentSize": 1200,
      "lineCount": 20,
      "wordCount": 150,
      "charCount": 1200,
      "preview": "# 项目说明\n\n这是项目...",
      "metadata": {
        "createdAgo": "13天前",
        "modifiedAgo": "5分钟前"
      }
    }
  ],
  "options": {
    "includePreview": true,
    "includeStatistics": true
  }
}
```

#### ZIP 包结构

```
project-export-{timestamp}.zip
├── metadata.json          # 元数据
├── files.json            # 文件清单
├── images.json           # 图片元数据
├── files/
│  ├── 文件1.md
│  ├── 文件2.md
│  └── ...
└── images/               # 可选
   ├── img_xxx.img
   └── ...
```

### 统计算法

#### 行数计算

```javascript
const lineCount = content.split('\n').length;
```

**说明**: 按换行符分割字符串，得到行数

#### 字数计算

```javascript
const wordCount = content.split(/\s+/).filter(w => w).length;
```

**说明**: 按空白符分割，过滤空项，得到字数

#### 时间差计算

```javascript
getTimeDiff(date) {
  const now = new Date();
  const diffMs = now - date;

  if (diffMs < 60000) return '刚刚';

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}分钟前`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}小时前`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}天前`;
}
```

---

## API 文档

### 导出 API

#### exporter.exportFileList()

**用途**: 导出所有文件的清单

```javascript
await exporter.exportFileList(null, {
  includePreview: true,
  includeStatistics: true
});
```

**参数**:
- `selectedIds` (Array): 可选，指定要导出的文件 ID。若为 null，导出所有文件
- `options` (Object):
  - `includePreview` (boolean): 是否包含内容预览，默认 true
  - `includeStatistics` (boolean): 是否包含统计信息，默认 true

**返回**: 无（触发下载）

**异常**:
- 如果没有文件：通过 showToast 提示"没有文件可导出"

---

#### exporter.exportFileListAsZip()

**用途**: 导出为 ZIP 压缩包

```javascript
await exporter.exportFileListAsZip('all');  // 'all' | 'used' | 'none'
```

**参数**:
- `resourceFilter` (string): 资源过滤策略
  - `'all'`: 导出所有资源
  - `'used'`: 仅导出文件中引用的资源
  - `'none'`: 不导出资源

**返回**: 无（触发下载）

---

### 导入 API

#### importer.importFileListPreview()

**用途**: 在导入前预览文件

```javascript
const preview = await importer.importFileListPreview(file);

if (!preview.valid) {
  console.error('导入失败:', preview.error);
} else {
  console.log('待导入文件:', preview.data.files);
  console.log('冲突:', preview.conflicts);
}
```

**参数**:
- `file` (File): 用户选择的 .json 文件

**返回**:
```javascript
{
  valid: boolean,
  data: { /* 解析后的数据 */ },
  conflicts: [ /* 冲突列表 */ ],
  error: string  // 如果无效
}
```

---

#### importer.importSelectedFiles()

**用途**: 执行导入

```javascript
const result = await importer.importSelectedFiles(
  previewData.data,
  ['file_id_1', 'file_id_2'],
  'merge'
);

console.log(`导入成功: ${result.filesCount} 个文件，跳过 ${result.skipped} 个`);
```

**参数**:
- `data` (Object): 导入数据（来自 importFileListPreview）
- `selectedIds` (Array): 用户选中的文件 ID
- `strategy` (string): 冲突处理策略
  - `'merge'`: 覆盖
  - `'skip'`: 跳过
  - `'rename'`: 重命名

**返回**:
```javascript
{
  filesCount: number,  // 成功导入的文件数
  skipped: number,     // 跳过的文件数
  errors: [
    { fileId, fileName, error }
  ]
}
```

---

## 集成说明

### 如何集成到现有系统

#### 1. HTML 中的按钮

```html
<!-- 在标题栏添加按钮（已有） -->
<button id="fileListExportBtn" title="导出文件清单">
  📋 导出清单
</button>
<button id="fileListImportBtn" title="导入文件清单">
  📥 导入清单
</button>
```

#### 2. 脚本加载顺序

```html
<!-- 确保加载顺序正确 -->
<script src="js/export/DataExporter.js"></script>
<script src="js/import/DataImporter.js"></script>
<script src="js/ui/FileListImportModal.js"></script>
<script src="js/app.js"></script>  <!-- 初始化 -->
```

#### 3. 初始化

```javascript
// 在应用初始化阶段创建实例
let exporter = null;
let importer = null;

// 在 fileManager 和 imageCache 初始化后
exporter = new DataExporter();
importer = new DataImporter();
```

#### 4. 事件绑定

```javascript
// 导出事件
fileListExportBtn.addEventListener('click', async () => {
  await exporter.exportFileList();
});

// 导入事件
fileListImportBtn.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.zip';
  input.onchange = async (e) => {
    const preview = await importer.importFileListPreview(e.target.files[0]);
    // 显示模态框...
  };
  input.click();
});
```

---

## 扩展建议

### 短期改进（v3.2）

1. **导入进度提示**
   ```javascript
   // 导入 100+ 文件时显示进度
   showProgress('正在导入... 50/100');
   ```

2. **选择性导出**
   ```javascript
   // 导出时允许选择特定文件
   await exporter.exportFileList(['file_id_1', 'file_id_2']);
   ```

3. **批量操作**
   - 全选/反选按钮
   - 按标签过滤
   - 按日期范围过滤

### 中期改进（v3.3）

1. **自动同步**
   ```javascript
   // 定期备份到云存储
   await exporter.exportToCloud();
   ```

2. **版本历史**
   ```javascript
   // 保留导入历史
   const history = await importer.getImportHistory();
   ```

3. **差异对比**
   ```javascript
   // 导入前对比差异
   const diff = importer.compareDifferences(newData, existingData);
   ```

### 长期规划（v4.0）

1. **分布式导出**
   - 支持导出到多个目标
   - 云盘集成（Google Drive, Dropbox）

2. **智能合并**
   - 基于内容相似度的冲突解决
   - 差异合并算法

3. **数据验证**
   - 导入时自动修复损坏数据
   - 完整性检查和恢复

---

## 性能指标

| 操作 | 文件数 | 预期时间 | 备注 |
|------|--------|---------|------|
| 导出清单 (JSON) | 10 | < 200ms | 快速操作 |
| 导出清单 (JSON) | 100 | < 500ms | 可接受 |
| 导出为 ZIP | 10 | < 1s | 含压缩 |
| 导出为 ZIP | 100 | < 3s | 需要等待 |
| 导入预览 (JSON) | 10 | < 100ms | 快速操作 |
| 导入执行 | 10 | < 200ms | 快速操作 |
| 导入执行 | 100 | < 2s | 可接受 |

---

## 版本兼容性

| 版本 | 状态 | 说明 |
|------|------|------|
| v3.0 | ✅ | 可导入，自动升级为 v3.1 |
| v3.1 | ✅ | 当前版本 |
| v3.1.1+ | ✅ | 包含 ZIP 支持 |

---

## 常见问题

**Q: 导出的文件可以在其他编辑器中使用吗？**

A: 可以。JSON 格式标准化，包含完整的文件内容和元数据，可用于其他应用。

**Q: 导入后是否会覆盖现有文件？**

A: 取决于选择的策略。merge 策略会覆盖，skip 策略不会。

**Q: 大文件列表的性能如何？**

A: 1000 个文件导入预期在 5-10 秒内完成，性能可接受。

**Q: 如何恢复误删除的文件？**

A: 使用导出的备份文件重新导入，选择"覆盖"策略。

---

**最后更新**: 2026-04-02 | **维护者**: Claude | **文档版本**: v3.1
