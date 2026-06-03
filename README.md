# 📝 Markdown 文本编辑器

基于浏览器的 Markdown 编辑器，支持多文件管理、实时预览、图片缓存，纯前端实现。

## 功能特性

- **Markdown 编辑与实时预览** — 左侧编辑，右侧即时渲染，支持拖拽调整分栏宽度
- **多文件管理** — 基于 IndexedDB 的文件系统，支持新建、重命名、删除文件
- **图片缓存** — 粘贴或上传的图片自动存入 IndexedDB 缓存，支持全局/文件级缓存管理
- **导入导出** — 单文件或批量导出为 JSON / ZIP，支持从 JSON / ZIP 导入文件及图片资源
- **离线可用** — 通过 Service Worker 实现离线访问
- **语法帮助** — 内置 Markdown 语法速查弹窗
- **快捷键** — `Ctrl+S` 保存，支持拖拽/粘贴图片

## 技术栈

| 类别 | 技术 |
|------|------|
| 渲染 | [marked.js](https://github.com/markedjs/marked) |
| 压缩 | [JSZip](https://stuk.github.io/jszip/) |
| 文件下载 | [FileSaver.js](https://github.com/eligrey/FileSaver.js/) |
| 数据存储 | IndexedDB |
| 离线缓存 | Service Worker |

## 项目结构

```
txt-editor/
├── index.html          # 主页面（结构与内联逻辑）
├── editor.css          # 样式
├── sw.js               # Service Worker
├── package.json
├── js/
│   ├── app.js          # 应用入口
│   ├── constants.js    # 常量定义
│   ├── core/
│   │   ├── FileManager.js         # 文件管理（IndexedDB）
│   │   └── ImageCacheManager.js   # 图片缓存管理（IndexedDB）
│   ├── export/
│   │   └── DataExporter.js        # 导出（JSON / ZIP）
│   ├── import/
│   │   └── DataImporter.js        # 导入（JSON / ZIP）
│   ├── resources/
│   │   └── ResourceManager.js     # 资源处理
│   ├── ui/
│   │   └── FileListImportModal.js # 导入弹窗
│   └── utils/
│       ├── helpers.js             # 工具函数
│       └── toast.js               # Toast 提示
└── doc/                # 文档
```

## 使用方式

直接用浏览器打开 `index.html`，或通过任意静态服务器托管：

```bash
npx serve .
```

## 开发

```bash
# Node.js 版本要求
node >= 18.20.8
```
