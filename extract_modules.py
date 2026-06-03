#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动提取 editor.html 中的类定义到独立文件
Markdown 编辑器 v3.1.1 模块化重构工具
"""

import re
import os
from pathlib import Path

class HTMLExtractor:
    def __init__(self, html_file):
        self.html_file = html_file
        self.content = None
        self.load_content()

    def load_content(self):
        """加载HTML文件"""
        with open(self.html_file, 'r', encoding='utf-8') as f:
            self.content = f.read()
        print(f"✓ 已加载 {self.html_file}")

    def find_class_boundaries(self, class_name):
        """查找class的开始和结束位置"""
        pattern = rf'class {class_name}\s*\{{'
        match = re.search(pattern, self.content)
        if not match:
            return None

        start = match.start()
        brace_count = 0
        pos = match.end() - 1

        # 找到匹配的闭合括号
        while pos < len(self.content):
            if self.content[pos] == '{':
                brace_count += 1
            elif self.content[pos] == '}':
                brace_count -= 1
                if brace_count == 0:
                    return start, pos + 1

            pos += 1

        return None

    def extract_class(self, class_name, output_file, description=None):
        """提取一个类定义"""
        boundaries = self.find_class_boundaries(class_name)
        if not boundaries:
            print(f"✗ 未找到 class {class_name}")
            return False

        start, end = boundaries
        class_code = self.content[start:end]

        # 移除缩进
        class_code = self._remove_indent(class_code, 6)

        # 创建输出文件
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        with open(output_file, 'w', encoding='utf-8') as f:
            # 写入文件头
            f.write('/**\n')
            f.write(f' * {class_name} 类\n')
            if description:
                f.write(f' * {description}\n')
            f.write(' * Markdown 编辑器 v3.1.1\n')
            f.write(' */\n\n')

            # 写入类定义
            f.write(class_code)
            f.write('\n')

        print(f"✓ 已提取 {class_name} 到 {output_file}")
        return True

    @staticmethod
    def _remove_indent(text, spaces):
        """移除指定数量的缩进"""
        lines = text.split('\n')
        result = []
        for line in lines:
            if line.startswith(' ' * spaces):
                result.append(line[spaces:])
            else:
                result.append(line)
        return '\n'.join(result)

    def extract_function(self, func_name, output_file):
        """提取一个函数定义"""
        pattern = rf'^\s*(?:async\s+)?function {func_name}\s*\([^)]*\)\s*\{{'
        match = re.search(pattern, self.content, re.MULTILINE)

        if not match:
            print(f"✗ 未找到 function {func_name}")
            return False

        start = match.start()
        brace_count = 0
        pos = match.end() - 1

        # 找到匹配的闭合括号
        while pos < len(self.content):
            if self.content[pos] == '{':
                brace_count += 1
            elif self.content[pos] == '}':
                brace_count -= 1
                if brace_count == 0:
                    break
            pos += 1

        if brace_count != 0:
            print(f"✗ 无法找到 {func_name} 的闭合括号")
            return False

        func_code = self.content[start:pos + 1]
        func_code = self._remove_indent(func_code, 6)

        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        with open(output_file, 'a', encoding='utf-8') as f:
            f.write('\n' + func_code + '\n')

        print(f"✓ 已提取 function {func_name}")
        return True


def main():
    """主函数"""
    extractor = HTMLExtractor('editor.html')

    # 定义要提取的类
    classes_to_extract = [
        ('FileManager', 'js/core/FileManager.js', '文件管理系统'),
        ('ImageCacheManager', 'js/core/ImageCacheManager.js', '图片缓存管理'),
        ('ResourceManager', 'js/resources/ResourceManager.js', '资源管理系统'),
        ('DataExporter', 'js/export/DataExporter.js', '数据导出系统'),
        ('DataImporter', 'js/import/DataImporter.js', '数据导入系统'),
        ('FileListImportModal', 'js/ui/FileListImportModal.js', '文件列表导入对话框'),
    ]

    print("开始提取类定义...\n")

    for class_name, output_file, description in classes_to_extract:
        extractor.extract_class(class_name, output_file, description)

    print("\n✓ 提取完成！")
    print("\n已创建的文件：")
    for _, output_file, _ in classes_to_extract:
        if os.path.exists(output_file):
            size = os.path.getsize(output_file)
            print(f"  - {output_file} ({size} bytes)")


if __name__ == '__main__':
    main()
