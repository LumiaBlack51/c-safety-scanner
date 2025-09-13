# C Safety Scanner 项目状态清单

## 项目概述
这是一个基于启发式分析的C代码安全扫描器，用于检测未初始化变量、野指针、死循环、内存泄漏等问题。

## 当前技术架构
- **核心方法**: 启发式行级解析（已放弃AST方法）
- **主要文件**: `src/scanner_cli.ts` - 核心扫描逻辑
- **检测类型**: 未初始化变量、野指针、头文件拼写错误
- **未实现**: 死循环检测、内存泄漏检测、printf/scanf格式检查

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
│   ├── bug_49.c     # 函数参数测试
│   ├── bug_50.c     # static/const变量测试
│   ├── graph.c      # 图操作函数（含多个BUG）
│   ├── graph.h      # 头文件
│   └── main.c       # 主程序
└── correct/         # 正确测试集
    ├── graph.c      # 正确的图操作
    ├── graph.h      # 头文件
    └── main.c       # 主程序
```

## 当前测试结果

### 检测到的BUG (11个)
1. `bug_0.c:1` - [Header] 头文件拼写错误 `stdiox.h`
2. `bug_0.c:5` - [Uninitialized] `printf`中使用未初始化变量`x`
3. `bug_0.c:6` - [Uninitialized] `scanf`中使用未初始化变量`x`
4. `bug_0.c:7` - [Uninitialized] `for`循环中使用未初始化变量`x`
5. `bug_0.c:8` - [Wild pointer] 解引用未初始化指针`p`
6. `bug_49.c:22` - [Uninitialized] 使用未初始化的`static_flag`
7. `bug_50.c:22` - [Uninitialized] 使用未初始化的`static_flag`
8. `bug_50.c:26` - [Wild pointer] 解引用未初始化的`static_ptr`
9. `graph.c:7` - [Wild pointer] 解引用未初始化指针`g`
10. `graph.c:8` - [Wild pointer] 解引用未初始化指针`g`
11. `graph.c:23` - [Wild pointer] 解引用未初始化指针`e`

### 真正的漏报 (6个)
1. `graph.c:9` - 返回未初始化的指针
2. `graph.c:18` - 内存泄漏（忘记free）
3. `graph.c:28` - 死循环 `for(;;)`
4. `graph.c:53` - printf格式错误 `%s`与`int`不匹配
5. `main.c:5` - 函数返回值检查
6. `main.c:7` - 死循环检测

### 性能指标
- **Precision**: 100% (11/11，无真正误报)
- **Recall**: 64.7% (11/17，有6个漏报)
- **F1**: 78.6%

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
3. **头文件拼写检查**: 检测非标准头文件名
4. **存储类说明符识别**: 支持`static`、`const`、`extern`等
5. **函数参数处理**: 函数参数在函数体内不被误报为未初始化
6. **作用域管理**: 全局变量和局部变量的正确跟踪

### ❌ 未实现
1. **死循环检测**: `for(;;)`、`while(1)`等
2. **内存泄漏检测**: `malloc`/`free`配对检查
3. **printf/scanf格式检查**: 参数类型匹配检查
4. **函数返回值检查**: 函数调用返回值的使用检查

## 代码结构

### 核心文件
- `src/scanner_cli.ts`: 主要扫描逻辑
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

1. **实现死循环检测**: 分析循环条件和更新语句
2. **实现内存泄漏检测**: 跟踪malloc/free配对
3. **实现格式检查**: 分析printf/scanf参数匹配
4. **优化检测精度**: 减少漏报，提高recall

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
