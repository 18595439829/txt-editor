# Markdown 编辑器 - 模块化重构方案

**重构时间**：2026-04-01
**目标**：将 editor.html (3507 行) 分割为独立的功能模块，提高可维护性和可读性

---

## 目标目录结构

```
txt-editor/
├── editor.html                  (HTML骨架 - 简化为250行)
├── editor.css                   (样式文件 - 保持不变)
├── sw.js                        (Service Worker)
├── js/
│   ├── app.js                   (应用初始化，~100行)
│   ├── constants.js             (常量定义，~50行)
│   ├── utils/
│   │   ├── helpers.js           (通用工具函数，~150行)
│   │   └── toast.js             (提示通知，~50行)
│   ├── core/
│   │   ├── FileManager.js       (文件管理，~200行)
│   │   └── ImageCacheManager.js (图片缓存，~250行)
│   ├── export/
│   │   └── DataExporter.js      (数据导出，~300行)
│   ├── import/
│   │   └── DataImporter.js      (数据导入，~400行)
│   ├── resources/
│   │   └── ResourceManager.js   (资源管理，~300行)
│   ├── ui/
│   │   ├── FileListImportModal.js     (导入对话框，~200行)
│   │   ├── ImageModal.js              (图片对话框，~150行)
│   │   ├── SyntaxPopup.js             (语法提示，~100行)
│   │   └── CachePopup.js              (缓存提示，~100行)
│   └── events/
│       ├── fileEvents.js         (文件操作事件，~150行)
│       ├── exportImportEvents.js (导出导入事件，~150行)
│       ├── editorEvents.js       (编辑器事件，~100行)
│       └── uiEvents.js           (UI事件，~100行)
└── REFACTOR.md                  (本文档)
```

---

## 模块依赖关系

```
app.js (初始化点)
  ├── constants.js (常量)
  ├── utils/
  │   ├── helpers.js
  │   └── toast.js
  ├── core/
  │   ├── FileManager.js
  │   └── ImageCacheManager.js
  ├── resources/
  │   └── ResourceManager.js (依赖: ImageCacheManager, FileManager)
  ├── export/
  │   └── DataExporter.js (依赖: FileManager, ImageCacheManager, ResourceManager)
  ├── import/
  │   └── DataImporter.js (依赖: FileManager, ImageCacheManager, ResourceManager)
  ├── ui/
  │   ├── FileListImportModal.js
  │   ├── ImageModal.js
  │   ├── SyntaxPopup.js
  │   └── CachePopup.js
  └── events/
      ├── fileEvents.js (依赖: FileManager, UI)
      ├── exportImportEvents.js (依赖: DataExporter, DataImporter)
      ├── editorEvents.js (依赖: FileManager, 预览)
      └── uiEvents.js (依赖: UI组件)
```

---

## 重构步骤

### Step 1: 创建常量和工具文件
- [ ] constants.js - 常量定义（UI ID、Storage Key等）
- [ ] utils/helpers.js - 通用函数（时间格式化、验证等）
- [ ] utils/toast.js - 提示函数

### Step 2: 提取核心数据管理
- [ ] core/FileManager.js - 文件管理类（~200行）
- [ ] core/ImageCacheManager.js - 图片缓存类（~250行）

### Step 3: 提取资源和导出导入
- [ ] resources/ResourceManager.js - 资源管理类（~290行）
- [ ] export/DataExporter.js - 导出类（~220行）
- [ ] import/DataImporter.js - 导入类（~290行）

### Step 4: 提取UI组件
- [ ] ui/FileListImportModal.js - 导入对话框（~200行）
- [ ] ui/ImageModal.js - 图片对话框（~150行）
- [ ] ui/SyntaxPopup.js - 语法提示（~100行）
- [ ] ui/CachePopup.js - 缓存提示（~100行）

### Step 5: 提取事件处理
- [ ] events/fileEvents.js - 文件操作事件（~150行）
- [ ] events/exportImportEvents.js - 导出导入事件（~150行）
- [ ] events/editorEvents.js - 编辑器事件（~100行）
- [ ] events/uiEvents.js - UI事件（~100行）

### Step 6: 创建应用初始化文件
- [ ] app.js - 应用启动逻辑（~100行）

### Step 7: 简化HTML并更新脚本引入
- [ ] editor.html - 简化为HTML骨架，添加脚本加载

### Step 8: 测试和验证
- [ ] 测试所有功能正常工作
- [ ] 验证模块加载顺序正确
- [ ] 性能检查

---

## 文件预期大小

| 文件 | 预期行数 | 说明 |
|------|---------|------|
| editor.html | 250 | HTML骨架 |
| editor.css | 1364 | 样式（保持不变） |
| js/constants.js | 50 | 常量 |
| js/utils/helpers.js | 150 | 工具函数 |
| js/utils/toast.js | 50 | 提示函数 |
| js/core/FileManager.js | 200 | 文件管理 |
| js/core/ImageCacheManager.js | 250 | 图片缓存 |
| js/resources/ResourceManager.js | 290 | 资源管理 |
| js/export/DataExporter.js | 220 | 数据导出 |
| js/import/DataImporter.js | 290 | 数据导入 |
| js/ui/FileListImportModal.js | 200 | 导入对话框 |
| js/ui/ImageModal.js | 150 | 图片对话框 |
| js/ui/SyntaxPopup.js | 100 | 语法提示 |
| js/ui/CachePopup.js | 100 | 缓存提示 |
| js/events/fileEvents.js | 150 | 文件事件 |
| js/events/exportImportEvents.js | 150 | 导出导入事件 |
| js/events/editorEvents.js | 100 | 编辑器事件 |
| js/events/uiEvents.js | 100 | UI事件 |
| js/app.js | 100 | 应用初始化 |
| **总计** | **~4000** | 代码总行数 |

> 注：总行数维持不变，但分散到18个文件中，每个文件聚焦一个功能

---

## 全局作用域管理

为保证模块间通信，使用 `window` 对象作为全局命名空间：

```javascript
// 在 window 对象上挂载应用实例
window.mdEditor = {
  // 核心管理器
  fileManager: null,
  imageCache: null,
  resourceManager: null,

  // 导出导入
  exporter: null,
  importer: null,

  // UI模态框
  fileListImportModal: null,
  imageModal: null,
  syntaxPopup: null,
  cachePopup: null,

  // 通用函数
  showToast: null,
  refreshFilesList: null,
  updatePreview: null,

  // 当前状态
  currentFileId: null
};
```

---

## 脚本加载顺序（在 HTML 中）

```html
<!-- 通用工具和常量 -->
<script src="js/constants.js"></script>
<script src="js/utils/helpers.js"></script>
<script src="js/utils/toast.js"></script>

<!-- 核心数据管理 -->
<script src="js/core/FileManager.js"></script>
<script src="js/core/ImageCacheManager.js"></script>

<!-- 功能扩展 -->
<script src="js/resources/ResourceManager.js"></script>
<script src="js/export/DataExporter.js"></script>
<script src="js/import/DataImporter.js"></script>

<!-- UI组件 -->
<script src="js/ui/FileListImportModal.js"></script>
<script src="js/ui/ImageModal.js"></script>
<script src="js/ui/SyntaxPopup.js"></script>
<script src="js/ui/CachePopup.js"></script>

<!-- 事件处理 -->
<script src="js/events/fileEvents.js"></script>
<script src="js/events/exportImportEvents.js"></script>
<script src="js/events/editorEvents.js"></script>
<script src="js/events/uiEvents.js"></script>

<!-- 应用初始化（最后） -->
<script src="js/app.js"></script>
```

---

## 重构的好处

✅ **可维护性**
- 每个文件职责单一，易于理解
- 减少代码冗余
- 易于定位问题

✅ **可扩展性**
- 添加新功能时，创建新模块即可
- 不需要修改现有模块
- 清晰的依赖关系

✅ **可测试性**
- 每个模块可独立测试
- 易于模拟依赖
- 便于单元测试

✅ **性能**
- 按需加载（如果使用模块打包工具）
- 缓存优化
- 减少内存占用

✅ **团队协作**
- 多人可并行开发不同模块
- 减少代码冲突
- 代码审查更容易

---

## 版本信息

- **重构版本**：v3.1.1-refactor
- **目标完成**：2026-04-01
- **兼容性**：完全向后兼容，功能不变
- **计划状态**：规划完成，待执行
