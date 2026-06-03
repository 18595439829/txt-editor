# Markdown编辑器 - 文件列表导入导出功能增强方案 (v3.1 更新)

**版本号**: v3.1.1 | **最后更新**: 2026-04-01 | **状态**: 新需求集成

---

## 项目概述

为 Markdown 编辑器增强文件列表的导入导出功能，并完善单个文件的导入导出机制。特别是支持压缩包格式和缓存资源同步导入导出。

### 核心目标

1. **文件列表全量操作**
   - 导出：生成包含所有文件元数据、统计信息的JSON文件
   - 导出为压缩包：打包所有文件内容+缓存资源到ZIP
   - 导入：支持JSON或ZIP格式的导入清单
   - 冲突检测与解决策略（覆盖/跳过/重命名）

2. **单个文件独立操作**
   - 单独导出：导出单个文件（含其关联的缓存资源）
   - 单独导入：导入单个文件（含其缓存资源）
   - 支持ZIP或JSON格式

3. **缓存资源同步**
   - 导出时：自动收集并打包该文件关联的所有图片、媒体资源
   - 导入时：自动恢复缓存资源到ImageCacheManager

4. **压缩包支持**
   - 生成标准ZIP格式，包含文件内容和资源清单
   - 支持ZIP中的完整目录结构
   - 自动处理资源路径映射

---

## 当前系统分析

### 现有实现（v3.0-3.1）

#### 已完成的功能（前期实现）
- **DataExporter 类**（第358-530行）
  - `exportAllData()` - 全部导出为JSON/ZIP
  - `exportFileList()` - 导出文件清单（仅元数据）
  - `enrichFileData()` - 添加统计信息
  - `calculateTotalStatistics()` - 汇总统计
  - `generatePreview()` - 生成内容预览
  - `downloadFile()` - 通用下载方法（已修复saveAs问题）

- **DataImporter 类**（第532-767行）
  - `importAllData()` - 导入全部数据
  - `importFileListPreview()` - 导入前预览
  - `detectConflicts()` - 冲突检测
  - `importSelectedFiles()` - 导入选中文件
  - `validateFileListData()` - 数据验证

- **FileListImportModal 类**（第1020-1232行）
  - UI对话框，支持多选和冲突显示
  - 导入策略选择UI
  - 完整的事件处理

- **FileManager 类**（第770-960行）：文件持久化管理
- **ImageCacheManager 类**（第970-1222行）：图片缓存管理
- **UI系统**：导出/导入按钮、上下文菜单、事件绑定

#### 已修复的问题
- ✅ Service Worker 注册失败（修改为相对路径 + Promise.allSettled）
- ✅ 导出清单报错（修复saveAs方法的dual-strategy）

---

## 新增需求详细说明

### 需求1：文件列表全部导入导出支持压缩包

#### 1.1 导出为压缩包
**功能**：一键导出所有文件+缓存资源到ZIP

```javascript
// 新增方法
async exportAsZip(includeResources = true, resourceFilter = 'all')
// 返回：包含文件内容和资源清单的ZIP文件
// 结构：
// ├── files/
// │   ├── file_1.md
// │   ├── file_2.md
// │   └── ...
// ├── resources/
// │   ├── images/
// │   │   ├── img_hash_1.jpg
// │   │   └── ...
// │   └── manifest.json (资源清单)
// └── metadata.json (总清单)
```

**参数说明**：
- `includeResources`: 是否包含缓存资源（默认true）
- `resourceFilter`: 资源过滤策略
  - `'all'` - 包含所有资源
  - `'used'` - 仅包含当前文件使用的资源
  - `'none'` - 不包含资源

#### 1.2 导入压缩包
**功能**：支持导入ZIP格式的清单

```javascript
// 新增方法
async importFromZip(zipFile)
// 返回：{files: [], resourceCount: 0, conflicts: []}
```

**处理流程**：
1. 解析ZIP结构
2. 提取metadata.json和files列表
3. 检测文件冲突
4. 检测资源冲突
5. 返回预览信息供用户确认
6. 用户确认后导入文件和资源

#### 1.3 资源清单格式
```json
{
  "version": "3.1",
  "resources": [
    {
      "hash": "abc123def456",
      "type": "image/jpeg",
      "size": 102400,
      "filename": "img_hash.jpg",
      "usedBy": ["file_id_1", "file_id_2"],
      "lastModified": "2026-04-01T10:30:00.000Z"
    }
  ]
}
```

---

### 需求2：单个文件独立导入导出

#### 2.1 单个文件导出
**功能**：导出单个文件及其关联资源

```javascript
// 扩展 DataExporter 类
async exportSingleFile(fileId, format = 'json', includeResources = true)
// format: 'json' | 'zip'
// 返回：单文件导出数据或ZIP
```

**JSON导出格式**：
```json
{
  "version": "3.1",
  "type": "single-file",
  "exportTime": "2026-04-01T10:30:00.000Z",
  "file": {
    "id": "file_id_abc",
    "name": "文件名",
    "content": "文件内容",
    "createTime": "2026-03-20T15:30:00.000Z",
    "updateTime": "2026-04-01T10:30:00.000Z"
  },
  "resources": [
    {
      "hash": "resource_hash",
      "type": "image/jpeg",
      "data": "base64_encoded_data"
    }
  ]
}
```

**ZIP导出结构**：
```
single-file-{timestamp}.zip
├── file.md (文件内容)
├── metadata.json (文件元数据)
└── resources/
    ├── images/
    │   └── img_1.jpg
    └── manifest.json
```

#### 2.2 单个文件导入
**功能**：导入单个文件并恢复其关联资源

```javascript
// 扩展 DataImporter 类
async importSingleFile(file, strategy = 'merge', importResources = true)
// file: 可以是JSON File对象或ZIP File对象
// strategy: 'merge' | 'skip' | 'rename'
// 返回：导入结果 {success: boolean, filename: string, resourceCount: number}
```

**处理流程**：
1. 检测文件格式（JSON或ZIP）
2. 验证版本和数据完整性
3. 检测与现有文件的冲突
4. 如有冲突，根据strategy处理
5. 导入文件内容
6. 提取并导入关联资源
7. 刷新UI和缓存

#### 2.3 右键菜单扩展
新增菜单项（在原有的导出/导入项基础上）：
```
当前文件操作：
  📥 导出为JSON - 仅导出文件内容（不含资源）
  📦 导出为ZIP - 导出文件+关联资源
  📤 导入文件 - 导入JSON或ZIP格式的单个文件
```

---

## 数据结构设计

### 3.1 文件清单格式（全量导出）

```json
{
  "version": "3.1",
  "exportType": "filelist",
  "exportTime": "2026-04-01T10:30:00.000Z",
  "filesCount": 5,
  "totalSize": 102400,
  "resourceCount": 12,
  "statistics": {
    "totalFiles": 5,
    "totalLines": 1250,
    "totalWords": 8500,
    "totalChars": 51200,
    "avgLinesPerFile": 250,
    "totalResourceSize": 51200,
    "lastModified": "2026-04-01T10:30:00.000Z"
  },
  "files": [
    {
      "id": "file_1704067200000_abc123def",
      "name": "项目计划",
      "createTime": "2026-03-20T15:30:00.000Z",
      "updateTime": "2026-04-01T10:30:00.000Z",
      "contentSize": 25600,
      "lineCount": 150,
      "wordCount": 1200,
      "charCount": 12800,
      "resourceCount": 3,
      "preview": "# 项目计划\n\n## 第一阶段\n设计和规划..."
    }
  ],
  "resources": [
    {
      "hash": "img_hash_1",
      "type": "image/jpeg",
      "size": 25600,
      "usedBy": ["file_1", "file_2"]
    }
  ]
}
```

### 3.2 ZIP内部结构

**全量导出ZIP**：
```
all-files-{timestamp}.zip
├── metadata.json (清单总信息)
├── files/
│   ├── file_1.md
│   ├── file_2.md
│   └── ...
├── resources/
│   ├── images/
│   │   ├── hash_1.jpg
│   │   ├── hash_2.png
│   │   └── ...
│   ├── videos/
│   │   └── ...
│   └── manifest.json (资源清单)
└── resource-mapping.json (文件-资源映射)
```

**单文件导出ZIP**：
```
single-{filename}-{timestamp}.zip
├── file.md (文件内容)
├── metadata.json (文件元数据)
└── resources/
    ├── images/
    │   └── hash_1.jpg
    ├── videos/
    │   └── ...
    └── manifest.json
```

---

## 实现方案

### Phase 1: 核心数据处理 - 资源导出导入

#### 1.1 ResourceManager 类（新增）
位置：第1223行前

**职责**：管理资源的导出导入和映射

```javascript
class ResourceManager {
  // 提取文件关联的所有资源
  async extractFileResources(fileId)

  // 获取所有资源
  async getAllResources()

  // 资源哈希计算
  calculateResourceHash(data)

  // 导入资源到缓存
  async importResources(resources)

  // 生成资源清单
  generateResourceManifest(resources)

  // 检测资源冲突
  detectResourceConflicts(newResources)

  // 清理未使用的资源
  async cleanupUnusedResources()
}
```

#### 1.2 扩展 DataExporter 类
新增方法：

```javascript
// 导出为压缩包（全量）
async exportAsZip(includeResources = true, resourceFilter = 'all')

// 导出单个文件
async exportSingleFile(fileId, format = 'json', includeResources = true)

// 提取文件资源
async extractFileResources(fileId)

// 生成压缩包
async generateZipPackage(files, resources, structure)

// 验证ZIP完整性
validateZipStructure(zip)
```

#### 1.3 扩展 DataImporter 类
新增方法：

```javascript
// 导入ZIP格式清单
async importFromZip(zipFile)

// 导入单个文件
async importSingleFile(file, strategy = 'merge', importResources = true)

// 解析ZIP结构
async parseZipStructure(zip)

// 验证资源
validateResourceManifest(manifest)

// 恢复资源映射
async restoreResourceMapping(fileId, resources)
```

---

### Phase 2: UI组件和交互

#### 2.1 文件菜单扩展
在右键菜单中添加：
```javascript
// 单个文件导出选项
new MenuItem("📥 导出为JSON", () => {
  await exporter.exportSingleFile(currentFileId, 'json', true);
})

new MenuItem("📦 导出为ZIP", () => {
  await exporter.exportSingleFile(currentFileId, 'zip', true);
})

// 单个文件导入选项
new MenuItem("📤 导入文件", () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.zip';
  input.onchange = async (e) => {
    const result = await importer.importSingleFile(
      e.target.files[0],
      'merge',
      true
    );
  };
  input.click();
})
```

#### 2.2 增强文件列表导出对话框
```javascript
// 扩展 FileListExportModal
new FileListExportModal()
  // 导出格式选择：JSON | ZIP
  // 资源包含选项：All | Used | None
  // 预览统计信息（文件数、总大小、资源数）
```

#### 2.3 增强文件列表导入对话框
```javascript
// 扩展 FileListImportModal
new FileListImportModal()
  // 支持JSON和ZIP格式检测
  // 显示资源冲突信息
  // 资源导入策略选择
```

#### 2.4 CSS样式新增
```css
.resource-stats { /* 资源统计显示 */ }
.resource-conflict-notice { /* 资源冲突提示 */ }
.resource-list { /* 资源列表 */ }
.export-format-selector { /* 导出格式选择器 */ }
.resource-filter-option { /* 资源过滤选项 */ }
.single-file-export-modal { /* 单文件导出对话框 */ }
```

---

### Phase 3: 完整集成和优化

#### 3.1 进度提示和反馈
- 导出大文件时显示进度条
- 导入时显示处理进度
- 资源处理进度提示

#### 3.2 错误处理
- ZIP文件损坏检测和提示
- 资源导入失败恢复
- 部分导入成功提示

#### 3.3 性能优化
- 大文件流式处理
- 资源压缩和去重
- 缓存优化

---

## 关键代码改动点汇总

| 改动项 | 位置 | 类型 | 优先级 | 状态 |
|--------|------|------|--------|------|
| 新增 ResourceManager 类 | 第1223行 | 新增类 | P0 | 待实现 |
| 扩展 DataExporter 类 | 第358-530行 | 扩展方法 | P0 | 待实现 |
| 扩展 DataImporter 类 | 第532-767行 | 扩展方法 | P0 | 待实现 |
| 右键菜单扩展 | 第190-210行 | 扩展菜单 | P0 | 待实现 |
| FileListExportModal 增强 | 第1020-1232行 | 扩展UI | P1 | 待实现 |
| FileListImportModal 增强 | 第1020-1232行 | 扩展UI | P1 | 待实现 |
| CSS 样式扩展 | editor.css | 新增样式 | P1 | 待实现 |
| 事件处理扩展 | 第2400-2530行 | 扩展事件 | P0 | 待实现 |

**优先级说明**：P0=必须完成，P1=可选但推荐

---

## 实现步骤

### Step 1: ResourceManager 核心实现
- [ ] 设计资源管理器的数据结构
- [ ] 实现资源提取逻辑
- [ ] 实现资源导入逻辑
- [ ] 实现资源冲突检测

### Step 2: 导出功能完善
- [ ] 实现 exportAsZip() 方法
- [ ] 实现 exportSingleFile() 方法
- [ ] 实现 ZIP生成和验证
- [ ] 测试导出功能

### Step 3: 导入功能完善
- [ ] 实现 importFromZip() 方法
- [ ] 实现 importSingleFile() 方法
- [ ] 实现 ZIP解析和验证
- [ ] 实现资源恢复逻辑
- [ ] 测试导入功能

### Step 4: UI 交互完善
- [ ] 扩展右键菜单
- [ ] 增强导出对话框
- [ ] 增强导入对话框
- [ ] 添加进度提示

### Step 5: 集成和测试
- [ ] 整体功能测试
- [ ] 边界情况测试
- [ ] 性能测试
- [ ] 用户体验优化

---

## 测试验收清单

### 功能测试
- [ ] 导出全部文件为ZIP：包含所有文件和资源
- [ ] 导入ZIP清单：正确解析和导入
- [ ] 导出单文件为JSON：仅含该文件
- [ ] 导出单文件为ZIP：含文件和关联资源
- [ ] 导入单文件：成功创建或覆盖
- [ ] 资源冲突检测：正确识别重复资源
- [ ] 资源导入：资源正确恢复到缓存

### 交互测试
- [ ] 右键菜单新选项正常显示
- [ ] 导出对话框支持格式选择
- [ ] 导入对话框支持ZIP识别
- [ ] 进度提示正确显示
- [ ] 错误提示准确有意义

### 边界情况
- [ ] 导出空文件列表：生成有效ZIP
- [ ] 导入损坏ZIP：显示错误提示并恢复
- [ ] 大文件导出：不卡顿，进度提示
- [ ] 资源全冲突：可选覆盖或跳过
- [ ] 网络中断恢复：能继续操作

---

## 版本历史

| 版本 | 日期 | 内容 |
|------|------|------|
| v3.0 | 早期 | 基础导出/导入功能，文件管理系统 |
| v3.1 | 2026-04-01 | 增强文件列表导入导出、冲突检测、导入策略 |
| v3.1.1 | 2026-04-01 | 支持ZIP压缩包、单文件导入导出、缓存资源同步 |

---

## 相关文件

- **editor.html** - 主应用文件（2576行）
- **editor.css** - 样式文件（1364行）
- **sw.js** - Service Worker（已修复）
- **PLAN.md** - 本计划文档

---

## 计划状态

**当前状态**：核心功能实现完成，待测试验证

**实现进度**：
- ✅ Phase 1: ResourceManager 核心实现完成
- ✅ Phase 2: DataExporter 扩展完成（支持ZIP和单文件导出）
- ✅ Phase 3: DataImporter 扩展完成（支持ZIP和单文件导入）
- ✅ Phase 4: 事件处理和集成完成

**下一步**：进行功能测试和用户体验优化

---

**计划制定时间**：2026-04-01
**实现完成时间**：2026-04-01
**文档版本**：v3.1.1
**维护者**：Claude Code
