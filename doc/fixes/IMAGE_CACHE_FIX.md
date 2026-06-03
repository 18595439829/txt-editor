# 图片缓存显示问题 - 解决方案

**问题**: 预览时缓存的图片没有加载出来
**原因**: 预览函数没有将缓存的图片ID转换为实际的图片数据URL
**状态**: ✅ 已解决

---

## 🔧 修复内容

### 问题分析

当用户粘贴或插入图片时：
1. ✓ 图片被保存到 IndexedDB 缓存中
2. ✓ 返回一个唯一的图片ID（如 `img_1704067200000_abc123def`）
3. ✗ Markdown 中插入的是这个ID：`![图片](img_xxx)`
4. ✗ 预览时 `marked.js` 直接使用ID作为 src，导致无效的 URL
5. ✗ 图片无法显示

### 解决方案

修改了 `updatePreview()` 函数，实现两步转换：

**步骤 1**: 使用 marked.js 解析 Markdown
```javascript
let html = marked.parse(content);
```

**步骤 2**: 找到所有缓存图片ID，从 IndexedDB 中读取 dataUrl，替换为真实地址
```javascript
const imgRegex = /src="(img_[^"]+)"/g;
while ((match = imgRegex.exec(html)) !== null) {
  const imgId = match[1];
  const dataUrl = await imageCache.getImage(imgId);
  if (dataUrl) {
    html = html.replace(`src="${imgId}"`, `src="${dataUrl}"`);
  }
}
```

---

## 📝 修改的函数

### updatePreview() - 增强版本

```javascript
async function updatePreview() {
  const content = editor.value || "";
  let html = marked.parse(content);

  // 替换缓存中的图片ID为实际的dataUrl
  const imgRegex = /src="(img_[^"]+)"/g;
  const promises = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const imgId = match[1];
    promises.push(
      imageCache.getImage(imgId).then(dataUrl => {
        if (dataUrl) {
          html = html.replace(`src="${imgId}"`, `src="${dataUrl}"`);
        }
      })
    );
  }

  // 等待所有图片加载完成
  await Promise.all(promises);
  preview.innerHTML = html;
}
```

### 更新的调用位置

因为 `updatePreview()` 现在是异步的，所以所有调用都改为：
```javascript
await updatePreview();  // 原来: updatePreview();
```

**更新位置**:
- ✅ `selectFile()` 函数中
- ✅ 初始化函数 `main()` 中

---

## 🧪 工作流程验证

现在的完整流程：

### 1. 粘贴图片
```
粘贴图片
  → fileReader.readAsDataURL()
  → imageCache.addImage(file, dataUrl, fileId)
  → 返回 imgId
  → Markdown: ![图片](img_xxx)
```

### 2. 预览图片
```
updatePreview() 调用
  → marked.parse(content) 生成 HTML: <img src="img_xxx">
  → 正则匹配所有 img_xxx
  → 遍历调用 imageCache.getImage(imgId)
  → 从 IndexedDB 读取 dataUrl
  → 替换 src="img_xxx" → src="data:image/..."
  → 渲染到预览区域
```

### 3. 结果
```
✓ 图片正常显示在预览区域
✓ 图片数据从 IndexedDB 缓存加载
✓ 无需网络请求
```

---

## 📊 性能考虑

- **异步处理**: 使用 `Promise.all()` 并行加载多张图片
- **缓存优先**: 直接从 IndexedDB 读取，无网络延迟
- **正则匹配**: 只替换 `img_` 开头的ID，不影响外链图片

---

## ✅ 现在可以：

1. **粘贴图片** - 图片会自动保存到缓存
2. **预览显示** - 预览区域会显示缓存的图片
3. **编辑文件** - 切换文件时预览同步更新
4. **导出导入** - 图片缓存随文件导出导入

---

## 🔍 测试步骤

1. 打开应用
2. 在编辑器中粘贴一张图片
3. 等待预览区域加载
4. 应该看到图片显示在预览中
5. 编辑文本或切换文件，预览应该正确更新

如果仍有问题，检查浏览器控制台是否有错误信息。
