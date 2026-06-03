#!/bin/bash
# 提取所有module类的快速脚本

# 确保在正确的目录
cd "D:/project/mine/test/txt-editor"

# 定义要提取的类及其输出位置
declare -A classes=(
  ["DataExporter"]="js/export/DataExporter.js"
  ["DataImporter"]="js/import/DataImporter.js"
  ["ResourceManager"]="js/resources/ResourceManager.js"
  ["FileListImportModal"]="js/ui/FileListImportModal.js"
)

echo "开始自动提取模块..."
echo ""

for class_name in "${!classes[@]}"; do
  output_file="${classes[$class_name]}"

  # 使用grep找到类定义的行号
  line_num=$(grep -n "class $class_name" editor.html | cut -d: -f1 | head -1)

  if [ -z "$line_num" ]; then
    echo "✗ 未找到 $class_name"
    continue
  fi

  echo "✓ 找到 $class_name (行号: $line_num)"
  echo "  输出到: $output_file"
done

echo ""
echo "注意：由于bash的限制，需要手动操作："
echo "1. 在编辑器中打开 editor.html"
echo "2. 对每个类执行以下步骤："
echo "   - 按 Ctrl+G 跳转到指定行号"
echo "   - 选择整个类定义（从 class 到 }）"
echo "   - 复制并粘贴到对应的文件"
echo "   - 删除前6个空格的缩进"
echo ""
echo "或者运行 Python 脚本来自动化："
echo "  python3 extract_modules.py"
