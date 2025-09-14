# C Safety Scanner 项目状态清单

## 项目概述
这是一个基于启发式分析的C代码安全扫描器，用于检测未初始化变量、野指针、死循环、内存泄漏、格式字符串错误等问题。

## 当前技术架构
- **核心方法**: 启发式行级解析 + 模块化架构
- **主要文件**: 
  - `src/scanner_cli.ts` - 主扫描逻辑
  - `src/types.ts` - 类型定义
  - `src/segmented_table.ts` - 分段哈希表
  - `src/range_checker.ts` - 数值范围检查
  - `src/format_checker.ts` - 格式字符串检查
  - `src/header_checker.ts` - 头文件检查
  - `src/function_header_map.ts` - 库函数映射
- **检测类型**: 9种主要检测类型，包括新增的数值范围检查、格式字符串检查、头文件检查
- **已实现**: 所有主要检测功能

## 测试方法

### 1. 基础测试命令
```bash
# 编译项目
npm run compile

# 扫描故障集
npm run scan:buggy

# 扫描正确集  
npm run scan:correct

# 生成报告
npm run report:buggy
npm run report:correct
```

### 2. 当前测试文件结构
```
tests/graphs/
├── buggy/           # 故障测试集
│   ├── bug_0.c      # 基础测试用例
│   ├── bug_44.c     # 结构体指针测试
│   ├── bug_45.c     # 野指针和空指针测试
│   ├── bug_46.c     # 内存泄漏测试
│   ├── bug_47.c     # 数值范围溢出测试
│   ├── bug_48.c     # 死循环测试
│   ├── bug_49.c     # 函数参数测试
│   ├── bug_50.c     # static/const变量测试
│   ├── graph.c      # 图操作函数（含多个BUG）
│   ├── graph.h      # 头文件
│   └── main.c       # 主程序
└── correct/         # 正确测试集
    ├── avl_tree.c   # AVL树实现（复杂正确代码）
    ├── graph.c      # 正确的图操作
    ├── graph.h      # 头文件
    └── main.c       # 主程序
```

## 当前测试结果

### 检测到的BUG类型 (9种)
1. **[Header]**: 头文件拼写错误、库函数缺少头文件
2. **[Uninitialized]**: 未初始化变量使用
3. **[Wild pointer]**: 野指针解引用
4. **[Null pointer]**: 空指针解引用
5. **[Memory leak]**: 内存泄漏
6. **[Dead loop]**: 死循环检测
7. **[Format]**: printf/scanf格式字符串错误
8. **[Range overflow]**: 数值范围溢出
9. **[Scanf]**: scanf参数错误

### Bug组检测结果
- **bug_0.c**: 头文件拼写、未初始化变量、野指针、格式错误
- **bug_44.c**: 结构体指针识别、内存泄漏
- **bug_45.c**: 野指针、空指针解引用
- **bug_46.c**: 内存泄漏检测
- **bug_47.c**: 数值范围溢出（包括unsigned类型）
- **bug_48.c**: 死循环检测
- **bug_49.c**: 未初始化static变量
- **bug_50.c**: 未初始化static变量和指针
- **graph.c**: 野指针、内存泄漏、格式错误
- **main.c**: 死循环、格式错误

### Correct组检测结果
- **avl_tree.c**: 复杂AVL树实现，存在一定误报（函数参数处理）
- **graph.c**: 正确的图操作，检测到内存泄漏（实际存在）
- **main.c**: 正确的程序，检测到死循环（实际存在）

### 性能指标
- **Bug组**: 能够检测到大部分预置的bug
- **Correct组**: 在复杂代码中存在一定误报，主要是函数参数和递归调用
- **检测类型**: 支持9种主要检测类型
- **模块化程度**: 高度模块化，易于维护和扩展

## 如何添加新的测试用例

### 1. 创建新的bug文件
```bash
# 在 tests/graphs/buggy/ 目录下创建新文件
# 命名格式: bug_XX.c (XX为数字)
```

### 2. 测试用例模板
```c
#include <stdio.h>
#include <stdlib.h>

int main() {
    // 测试未初始化变量
    int x; // BUG: 未初始化
    printf("%d", x); // 应该报错
    
    // 测试野指针
    int *p; // BUG: 未初始化指针
    *p = 1; // 应该报错
    
    // 测试static变量
    static int static_var; // BUG: 未初始化
    if (static_var > 0) { // 应该报错
        // ...
    }
    
    return 0;
}
```

### 3. 运行测试
```bash
# 扫描单个文件（需要创建临时目录）
mkdir temp_test
cp tests/graphs/buggy/bug_XX.c temp_test/
node ./out/cli.js temp_test
rm -rf temp_test
```

## 当前实现的功能

### ✅ 已实现
1. **未初始化变量检测**: 检测变量在赋值前使用
2. **野指针检测**: 检测未初始化指针的解引用
3. **空指针检测**: 检测NULL指针的解引用
4. **头文件拼写检查**: 检测非标准头文件名
5. **库函数头文件检查**: 检查使用的库函数是否包含对应头文件
6. **存储类说明符识别**: 支持`static`、`const`、`extern`、`unsigned`、`signed`等
7. **函数参数处理**: 函数参数在函数体内不被误报为未初始化
8. **作用域管理**: 全局变量和局部变量的正确跟踪
9. **死循环检测**: `for(;;)`、`while(1)`等明显死循环
10. **内存泄漏检测**: `malloc`/`free`配对检查
11. **printf/scanf格式检查**: 参数类型匹配和数量检查
12. **数值范围检查**: 检查数值是否超出类型范围
13. **结构体指针识别**: 支持各种结构体指针声明语法
14. **模块化架构**: 代码按功能模块化，易于维护

### ⚠️ 部分实现
1. **函数返回值检查**: 基础实现，复杂场景需要改进
2. **复杂循环分析**: 基础死循环检测，复杂循环条件分析需要改进
3. **跨函数数据流**: 基础实现，复杂数据流分析需要改进

## 代码结构

### 核心文件
- `src/scanner_cli.ts`: 主要扫描逻辑
- `src/types.ts`: 类型定义
- `src/segmented_table.ts`: 分段哈希表实现
- `src/range_checker.ts`: 数值范围检查
- `src/format_checker.ts`: 格式字符串检查
- `src/header_checker.ts`: 头文件检查
- `src/function_header_map.ts`: 库函数头文件映射
- `src/cli.ts`: 命令行接口
- `src/report.ts`: 报告生成
- `src/extension.ts`: VS Code扩展

### 关键数据结构
```typescript
interface VariableInfo {
    name: string;           // 变量名
    typeName: string;       // 类型名（包含存储类说明符）
    isPointer: boolean;     // 是否为指针
    isInitialized: boolean; // 是否已初始化
    isArray: boolean;       // 是否为数组
    pointerMaybeNull: boolean; // 指针可能为null
}
```

### 关键函数
- `parseDecl()`: 解析变量声明
- `analyzeDir()`: 分析目录中的所有C文件
- `checkUninitialized()`: 检查未初始化变量使用
- `checkWildPointer()`: 检查野指针解引用

## 开发注意事项

1. **不要修改AST相关代码**: 已完全移除tree-sitter依赖
2. **保持启发式方法**: 当前基于正则表达式和行级分析
3. **测试驱动开发**: 每次修改后运行测试验证
4. **文档同步**: 修改算法后更新`docs/ALGORITHM.md`

## 下一步开发建议

1. **智能函数参数处理**: 改进函数调用和递归的检测逻辑，减少误报
2. **抽象语法树支持**: 集成AST分析提高准确性
3. **数据流分析**: 实现跨函数的数据流跟踪
4. **配置化检测**: 允许用户配置检测规则和阈值
5. **性能优化**: 优化大文件的处理性能

## 快速开始命令
```bash
# 1. 编译
npm run compile

# 2. 运行测试
npm run scan:buggy

# 3. 查看结果
npm run report:buggy

# 4. 查看日志
cat docs/LOGS.md
```
