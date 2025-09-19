# 代码关系与模块依赖图

## 🔗 核心模块依赖关系

### 1. 解析引擎层 (Core Layer)

```
┌─────────────────────────────────────────────────────────────┐
│                    ast_parser.ts                           │
│                  (主解析引擎)                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Native Tree-  │  │  Web Tree-      │  │  Clang AST   │ │
│  │  sitter        │  │  sitter WASM    │  │  JSON        │ │
│  │  (优先)        │  │  (回退)         │  │  (最终回退)  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ast_scanner.ts                           │
│                  (扫描协调器)                               │
├─────────────────────────────────────────────────────────────┤
│  • 文件遍历管理                                             │
│  • 检测器调度                                               │
│  • 结果聚合                                                 │
└─────────────────────────────────────────────────────────────┘
```

### 2. 检测器层 (Detector Layer)

```
┌─────────────────────────────────────────────────────────────┐
│                    ast_scanner.ts                           │
│                  (扫描协调器)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    检测器分发                                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ ast_variable_   │  │ ast_library_    │  │ ast_advanced │ │
│  │ detector.ts     │  │ detector.ts     │  │ detector.ts  │ │
│  │                │  │                │  │              │ │
│  │ • 未初始化检测  │  │ • 头文件检查    │  │ • 死循环检测 │ │
│  │ • 野指针检测    │  │ • 拼写检查      │  │ • 数值范围   │ │
│  │ • 空指针检测    │  │ • 库函数检查    │  │ • 内存泄漏   │ │
│  └─────────────────┘  └─────────────────┘  │ • 格式检查   │ │
│                                           └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    启发式回退检测器                          │
├─────────────────────────────────────────────────────────────┤
│  • checkUninitializedVariablesFallback()                   │
│  • checkWildPointersFallback()                             │
│  • checkNullPointersFallback()                             │
│  • checkDeadLoopsFallback()                                │
│  • checkMemoryLeaksFallback()                              │
│  • checkFormatStringsFallback()                            │
└─────────────────────────────────────────────────────────────┘
```

### 3. 接口层 (Interface Layer)

```
┌─────────────────────────────────────────────────────────────┐
│                  cli_standalone.ts                         │
│                  (主入口接口)                               │
├─────────────────────────────────────────────────────────────┤
│  • 命令行参数解析                                           │
│  • 引擎模式选择 (auto/ast/heuristic)                       │
│  • 评测模式支持 (--eval)                                    │
│  • 混合检测模式实现                                         │
│  • 智能回退机制                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    其他接口                                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │     cli.ts      │  │   dev-run.ts    │  │ extension.ts │ │
│  │  (CLI接口)      │  │  (开发运行)     │  │ (VSCode扩展) │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4. 工具层 (Utility Layer)

```
┌─────────────────────────────────────────────────────────────┐
│                    工具模块                                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ function_header │  │ segmented_table │                  │
│  │ _map.ts         │  │ .ts             │                  │
│  │                │  │                │                  │
│  │ • 函数-头文件   │  │ • 分段表管理    │                  │
│  │   映射关系      │  │ • 变量状态跟踪  │                  │
│  │ • 库函数识别    │  │ • 作用域管理    │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 数据流图

### 1. AST 解析流程

```
源码文件 → cli_standalone.ts → CASTParser.create()
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                三层解析引擎选择                               │
├─────────────────────────────────────────────────────────────┤
│  1. 尝试原生 tree-sitter                                    │
│     ↓ 失败                                                  │
│  2. 尝试 web-tree-sitter WASM                              │
│     ↓ 失败                                                  │
│  3. 使用 clang AST JSON                                     │
│     ├── 智能 JSON 修复                                      │
│     ├── 节点类型映射                                        │
│     └── AST 树构建                                         │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                            AST 根节点返回
```

### 2. 检测流程

```
AST 根节点 → 检测器分发
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                    混合检测模式                              │
├─────────────────────────────────────────────────────────────┤
│  AST 成功:                                                  │
│  ├── 变量检测 (AST) → 失败 → 启发式回退                     │
│  ├── 指针检测 (AST) → 失败 → 启发式回退                     │
│  ├── 循环检测 (AST) → 失败 → 启发式回退                     │
│  ├── 内存检测 (AST) → 失败 → 启发式回退                     │
│  ├── 格式检测 (AST) → 失败 → 启发式回退                     │
│  └── 头文件检测 (启发式) ← AST不适合                        │
│                                                             │
│  AST 失败:                                                  │
│  └── 完全启发式检测                                         │
└─────────────────────────────────────────────────────────────┘
                │
                ▼
            检测结果聚合
```

### 3. 评测流程

```
检测结果 → 评测模式 (--eval)
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    评测分析                                  │
├─────────────────────────────────────────────────────────────┤
│  • 逐行比对 (标准答案 vs 检测结果)                          │
│  • 漏报分析 (缺失的检测)                                   │
│  • 误报分析 (多余的检测)                                   │
│  • 类别不匹配分析                                           │
│  • 汇总统计                                                 │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
        评测报告输出
```

## 📁 文件依赖关系

### 核心依赖链

```
cli_standalone.ts (主入口)
    ├── types.ts (类型定义)
    ├── ast_parser.ts (AST解析)
    │   ├── clang.ts (Clang集成)
    │   └── report.ts (报告生成)
    ├── ast_scanner.ts (扫描协调)
    │   ├── ast_variable_detector.ts
    │   ├── ast_library_detector.ts
    │   └── ast_advanced_detector.ts
    └── utils/
        ├── function_header_map.ts
        └── segmented_table.ts
```

### 检测器依赖

```
ast_variable_detector.ts
    ├── types.ts (VariableInfo, SegmentedTable)
    └── utils/segmented_table.ts

ast_library_detector.ts
    ├── types.ts (Issue)
    └── utils/function_header_map.ts

ast_advanced_detector.ts
    ├── types.ts (MemoryAllocation, LoopInfo, TypeRange)
    └── utils/segmented_table.ts
```

## 🎯 关键接口

### 1. CASTParser 接口

```typescript
class CASTParser {
  static async create(): Promise<CASTParser>
  parse(sourceCode: string): ASTNode
  convertNode(node: any, parent?: any): ASTNode
  traverseNode(node: ASTNode, callback: Function): void
}
```

### 2. 检测器接口

```typescript
// 变量检测器
class ASTVariableDetector {
  analyzeFile(file: vscode.Uri): Promise<vscode.Diagnostic[]>
  checkUninitializedVariables(ast: ASTNode, lines: string[]): Issue[]
  checkWildPointers(ast: ASTNode, lines: string[]): Issue[]
  checkNullPointers(ast: ASTNode, lines: string[]): Issue[]
}

// 库函数检测器
class ASTLibraryDetector {
  analyzeFile(file: vscode.Uri): Promise<vscode.Diagnostic[]>
  checkLibraryHeaders(content: string, lines: string[]): Issue[]
  checkHeaderSpelling(file: vscode.Uri): Promise<vscode.Diagnostic[]>
}

// 高级检测器
class ASTAdvancedDetector {
  analyzeFile(file: vscode.Uri): Promise<vscode.Diagnostic[]>
  checkDeadLoops(ast: ASTNode, lines: string[]): Issue[]
  checkNumericRange(ast: ASTNode, lines: string[]): Issue[]
  checkMemoryLeaks(ast: ASTNode, lines: string[]): Issue[]
  checkFormatStrings(ast: ASTNode, lines: string[]): Issue[]
}
```

### 3. CLI 接口

```typescript
// 引擎模式
type EngineMode = 'auto' | 'ast' | 'heuristic'

// 主分析函数
async function analyzeDir(dir: string, engine: EngineMode): Promise<Issue[]>

// 评测函数
function runEvaluation(dir: string, issues: Issue[]): EvaluationSummary
function runEvaluationDetailed(dir: string, issues: Issue[]): EvaluationDetail
```

## 🔧 配置与扩展点

### 1. 检测器注册

```typescript
// 在 cli_standalone.ts 中的检测器调用顺序
const uninitIssues = await checkUninitializedVariables(ast, lines, filePath)
const wildPointerIssues = await checkWildPointers(ast, lines, filePath)
const nullPointerIssues = await checkNullPointers(ast, lines, filePath)
const deadLoopIssues = checkDeadLoops(ast, lines, filePath)
const rangeIssues = checkNumericRange(ast, lines, filePath)
const memoryLeakIssues = checkMemoryLeaks(ast, lines, filePath)
const formatIssues = checkFormatStrings(ast, lines, filePath)
const headerIssues = checkLibraryHeaders(content, lines, filePath)
```

### 2. 回退机制配置

```typescript
// AST 检测失败时的回退函数映射
const fallbackMap = {
  'Uninitialized': checkUninitializedVariablesFallback,
  'Wild pointer': checkWildPointersFallback,
  'Null pointer': checkNullPointersFallback,
  'Dead loop': checkDeadLoopsFallback,
  'Range overflow': checkNumericRangeFallback,
  'Memory leak': checkMemoryLeaksFallback,
  'Format': checkFormatStringsFallback
}
```

### 3. 评测标准配置

```typescript
// 在评测函数中的类别映射
const categoryMap = {
  'uninitialized': 'Uninitialized',
  'wild pointer': 'Wild pointer',
  'null pointer': 'Null pointer',
  'memory leak': 'Memory leak',
  'dead loop': 'Dead loop',
  'format': 'Format',
  'header': 'Header'
}
```

---

*此文档详细描述了代码模块间的关系和依赖，有助于理解项目架构和进行后续开发。*
