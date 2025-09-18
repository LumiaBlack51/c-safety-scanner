# C Safety Scanner · 项目状态（2025-09-18）

## 一、项目概述
面向 C 语言的静态安全扫描工具，支持命令行与 VS Code 扩展两种形态。当前已实现 9 类检测：
- 未初始化变量、野指针、空指针
- 库函数头文件缺失、头文件拼写
- 死循环
- 数值范围溢出
- 内存泄漏（malloc/free 配对）
- printf/scanf 格式字符串

核心实现正从启发式逻辑迁移到 AST 方案。为适配 Windows/Node 的兼容性，已引入 web-tree-sitter(WASM) 回退路径。

## 二、依赖与环境
- Node.js: 18.x（便携版已接入当前会话）
- TypeScript: 5.5+
- 解析依赖：
  - 原生方案：tree-sitter ^0.22.4 + tree-sitter-c（尝试 0.24.1/0.20.7 均存在本机兼容问题）
  - WASM 方案：web-tree-sitter ^0.24.4 + tree-sitter-c.wasm（需放置于 `assets/grammars/tree-sitter-c.wasm`）
- VS Code 扩展引擎：^1.90.0

## 三、关键目录
- src/core：AST 解析与扫描调度（`ast_parser.ts` 支持原生/wasm 双路径）
- src/detectors：三类 AST 检测器（变量/库函数/高级）
- src/interfaces：CLI、扩展入口、评测与报告
- assets/grammars：WASM 语法包（`tree-sitter-c.wasm`）

## 四、近期进展
1) 新增“评测模式” -- 从源码注释解析标准答案：
   - 标准标签：`BUG: Header|Wild pointer|Null pointer|Uninitialized|Dead loop|Memory leak|Range overflow|Format`
   - 输出“缺失(漏报)/多报(误报)/类别不匹配(逐行)/汇总差值”
2) 误报优化：
   - Header 缺失按头文件去重；
   - Memory leak 支持“所有权返回/输出参数转移”豁免；
   - 死循环：循环体内出现 break/return/exit/goto 不报；
   - 野/空指针：弱数据流覆盖（声明到使用之间若有取址/赋值/malloc 视为已初始化/非空）；
   - printf：过滤 `%%` 并收紧参数计数。
3) AST 方案：
   - 原生绑定（tree-sitter-c）在本机 Windows + OneDrive 路径下构建仍失败；
   - 已接入 web-tree-sitter 回退，需有效的 wasm 包。

## 五、当前指标（buggy 集评测）
- 缺失(漏报)：Uninitialized×2, Wild pointer×7, Null pointer×3
- 多报(误报)：Header×5, Memory leak×8, Dead loop×7, Format×4, Range overflow×6
- 类别不匹配(逐行)：存在（例如 `line 4` 预期 Wild pointer，报告 Dead loop）
- 分类计数差值总和：42（越小越好）

注：在 AST 未启用时仍走启发式，误报/漏报较高。启用 WASM AST 后预期显著下降。

## 六、测试方法
1) 编译：`npm run compile`
2) 扫描：
   - 错误集：`npm run scan:buggy`
   - 正确集：`npm run scan:correct`
3) 评测：
   - 对照标准标签：`node ./out/interfaces/cli_standalone.js tests/graphs/buggy --eval`
   - 输出逐行对比与汇总统计，并报告“类别不匹配”。

## 七、下一步计划
1) 完成 WASM AST 启用：下载/构建 `tree-sitter-c.wasm` 并默认走 AST；
2) 持续降低误报：
   - Header：限定首处调用附近窗口检测；
   - Dead loop：增加条件退出（break in branches）更精准分析；
   - 指针：扩展跨语句、简单跨块的赋值追踪；
   - Format：依据类型关键字/取址符号做更严格匹配；
3) 扩展规则：缓冲区越界、未匹配的 realloc 失败路径、资源泄漏（文件句柄）等。

## 八、已知问题与规避
- 原生 tree-sitter-c 与当前环境的 ABI/路径存在兼容问题；建议优先使用 WASM。
- OneDrive 路径可能导致构建缓存与长度限制问题，已通过忽略 `node_modules.bak/` 规避。

---
维护者：本地开发团队 · 2025-09-18

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
- **avl_tree.c**: 复杂AVL树实现，检测到164个问题（全部为误报）
- **graph.c**: 正确的图操作，检测到6个问题（全部为误报）
- **main.c**: 正确的程序，检测到23个问题（全部为误报）

### 详细测试分析
- **Bug组总计**: 142个问题检测
- **Correct组总计**: 193个误报
- **误报率**: 100% (需要改进)
- **主要误报类型**: 函数参数误判为未初始化(175个)、内存泄漏误报(8个)、野指针误报(6个)
- **错误类型分类**: 大部分错误类型分类准确，但存在uninitialized vs wild pointer的混淆

### 性能指标
- **Bug组**: 能够检测到大部分预置的bug
- **Correct组**: 误报率过高，需要改进上下文分析
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
