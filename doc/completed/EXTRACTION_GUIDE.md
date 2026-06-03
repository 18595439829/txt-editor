# 模块化重构执行指南

## 快速执行方法

### 方式一：使用脚本自动提取（推荐）

运行以下 Python 脚本来自动化提取类和函数：

```python
#!/usr/bin/env python3
import re

def extract_class(html_file, class_name, output_file):
    """从HTML提取一个完整的class定义"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 查找 class 定义
    pattern = rf'(class {class_name} \{{{{[\s\S]*?^      \}}}})'
    match = re.search(pattern, content, re.MULTILINE)

    if match:
        class_code = match.group(1)
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('/**\n')
            f.write(f' * {class_name} 类\n')
            f.write(' * Markdown 编辑器 v3.1.1\n')
            f.write(' */\n\n')
            f.write(class_code)
            f.write('\n')
        print(f'✓ 已提取 {class_name} 到 {output_file}')
    else:
        print(f'✗ 未找到 {class_name}')

# 使用示例
extract_class('editor.html', 'ImageCacheManager', 'js/core/ImageCacheManager.js')
extract_class('editor.html', 'DataExporter', 'js/export/DataExporter.js')
extract_class('editor.html', 'DataImporter', 'js/import/DataImporter.js')
extract_class('editor.html', 'ResourceManager', 'js/resources/ResourceManager.js')
```

### 方式二：手动分段提取

按照以下步骤手动提取代码：

#### Step 1: 提取 ImageCacheManager

在 editor.html 中查找 `class ImageCacheManager`，通常在第 ~2370 行
- 复制从 `class ImageCacheManager {` 到 `}` 的全部代码
- 保存为 `js/core/ImageCacheManager.js`
- 添加文件头注释

#### Step 2: 提取 DataExporter

在 editor.html 中查找 `class DataExporter`，通常在第 ~350 行
- 复制整个 DataExporter 类定义
- 保存为 `js/export/DataExporter.js`

#### Step 3: 提取 DataImporter

在 editor.html 中查找 `class DataImporter`，通常在第 ~819 行
- 复制整个 DataImporter 类定义
- 保存为 `js/import/DataImporter.js`

#### Step 4: 提取 ResourceManager

在 editor.html 中查找 `class ResourceManager`，通常在第 ~1442 行
- 复制整个 ResourceManager 类定义
- 保存为 `js/resources/ResourceManager.js`

#### Step 5: 提取 FileListImportModal

在 editor.html 中查找 `class FileListImportModal`，通常在第 ~1507 行
- 复制整个 FileListImportModal 类定义
- 保存为 `js/ui/FileListImportModal.js`

---

## 文件清单（需要创建/修改）

### 已创建 ✓
- [x] js/constants.js - 常量定义
- [x] js/utils/helpers.js - 通用工具
- [x] js/utils/toast.js - 提示函数
- [x] js/core/FileManager.js - 文件管理
- [x] REFACTOR.md - 本文档

### 待创建 □
- [ ] js/core/ImageCacheManager.js
- [ ] js/export/DataExporter.js
- [ ] js/import/DataImporter.js
- [ ] js/resources/ResourceManager.js
- [ ] js/ui/FileListImportModal.js
- [ ] js/ui/ImageModal.js
- [ ] js/ui/SyntaxPopup.js
- [ ] js/ui/CachePopup.js
- [ ] js/events/fileEvents.js
- [ ] js/events/exportImportEvents.js
- [ ] js/events/editorEvents.js
- [ ] js/events/uiEvents.js
- [ ] js/app.js

### 需要修改 ◎
- [ ] editor.html - 简化并添加脚本加载

---

## 提取后的修改要点

### 在每个提取的模块中，需要做以下修改：

#### 1. 移除 `class` 前面的缩进（从 6 空格改为 0）

```javascript
// 修改前：
      class ImageCacheManager {
        constructor() {

// 修改后：
class ImageCacheManager {
  constructor() {
```

#### 2. 修改内部缩进（从 8 空格改为 2 空间）

使用编辑器全局替换：
- 查找：`^        ` (8个空格)
- 替换：`  ` (2个空格)

#### 3. 添加文件头注释

```javascript
/**
 * [模块名称]
 * Markdown 编辑器 v3.1.1
 */
```

#### 4. 处理全局变量引用

在提取的代码中，如果引用了其他全局变量（如 `fileManager`, `imageCache`），需要确保：
- 在 app.js 中正确初始化这些实例
- 在依赖的模块中添加注释说明依赖关系

---

## HTML 更新步骤

修改 editor.html：

1. **保留 HTML 结构**（<html>, <head>, <body>, 容器等）

2. **删除所有嵌入的 <script>** 标签内容（第 ~200-3500 行）

3. **在 </body> 前添加脚本加载**：

```html
    <!-- 应用脚本 -->
    <!-- 工具和常量 -->
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

    <!-- UI 组件 -->
    <script src="js/ui/FileListImportModal.js"></script>
    <script src="js/ui/ImageModal.js"></script>
    <script src="js/ui/SyntaxPopup.js"></script>
    <script src="js/ui/CachePopup.js"></script>

    <!-- 事件处理 -->
    <script src="js/events/fileEvents.js"></script>
    <script src="js/events/exportImportEvents.js"></script>
    <script src="js/events/editorEvents.js"></script>
    <script src="js/events/uiEvents.js"></script>

    <!-- 应用初始化 -->
    <script src="js/app.js"></script>
  </body>
</html>
```

---

## 验证检查清单

完成提取后，使用以下检查确保没有问题：

### 1. 文件加载顺序
```javascript
// 在浏览器控制台运行
console.log('FileManager:', typeof FileManager);
console.log('ImageCacheManager:', typeof ImageCacheManager);
console.log('DataExporter:', typeof DataExporter);
console.log('showToast:', typeof showToast);
```

### 2. 功能测试
- [ ] 创建文件
- [ ] 编辑文件
- [ ] 保存文件
- [ ] 导出为JSON
- [ ] 导出为ZIP
- [ ] 导入单文件
- [ ] 插入图片
- [ ] 查看缓存

### 3. 控制台检查
- [ ] 无 console 错误
- [ ] Service Worker 注册成功
- [ ] IndexedDB 初始化成功

---

## 常见问题

**Q: 提取后出现"xxx is not defined"错误？**
A: 检查脚本加载顺序，确保依赖的模块在使用前已加载。

**Q: 修改editor.html后，功能不工作？**
A: 检查脚本路径是否正确，确保文件都存在。

**Q: 需要多久完成？**
A: 手动提取 ~2-3 小时，使用脚本 ~15 分钟

---

## 下一步

完成模块化后：
1. 运行功能测试
2. 检查浏览器兼容性
3. 优化加载性能
4. 考虑使用模块打包工具 (Webpack/Rollup)
5. 添加构建流程

---

**文档版本**：1.0
**最后更新**：2026-04-01
