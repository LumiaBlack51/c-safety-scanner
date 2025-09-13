# C Safety Scanner 算法设计文档

## 概述

C Safety Scanner 是一个基于启发式分析的 C 代码安全扫描工具，使用行级正则表达式解析和分段哈希表来检测常见的编程错误。

## 核心架构

### 1. 解析策略
- **启发式解析**: 使用基于正则表达式的行级解析，稳定可靠
- **分段哈希表**: 使用4段哈希表优化变量查找性能 (a-f, g-m, n-s, t-z)
- **作用域管理**: 支持全局和函数局部作用域的变量管理

### 2. 数据结构

```typescript
type VariableInfo = {
  name: string;           // 变量名
  typeName: string;       // 类型名（支持存储类说明符）
  isPointer: boolean;     // 是否为指针
  isInitialized: boolean; // 是否已初始化
  isArray?: boolean;      // 是否为数组
  pointerMaybeNull?: boolean; // 指针是否可能为NULL
};

type SegmentedTable = Array<Map<string, VariableInfo>>; // 4段哈希表
```

## 检测算法

### 1. 变量声明识别

**算法**: `parseDecl(line: string)`

```pseudocode
function parseDecl(line):
  // 支持存储类说明符的正则表达式
  pattern = /^\s*((?:static|const|extern|register|volatile|restrict)\s+)?([a-zA-Z_][\w\s\*]*?)\s+(.+)$/
  match = line.match(pattern)
  if not match: return []
  
  storageClass = match[1] ? match[1].trim() : ''
  baseType = match[2].trim()
  declarations = match[3]
  
  // 组合完整的类型名
  fullType = storageClass ? storageClass + " " + baseType : baseType
  
  for each declaration in declarations.split(','):
    // 解析变量名、指针状态、初始化状态
    name = extractVariableName(declaration)
    isPointer = checkPointerSyntax(declaration, baseType)
    isInitialized = checkInitialization(declaration)
    
    result.add({name, typeName: fullType, isPointer, isInitialized})
  
  return result
```

**支持的类型**:
- 基本类型: `int`, `char`, `float`, `double`, `void`, `short`, `long`, `signed`, `unsigned`, `bool`, `size_t`
- 存储类说明符: `static`, `const`, `extern`, `register`, `volatile`, `restrict`
- 组合类型: `static int`, `const char*`, `static const int` 等

### 2. 未初始化变量检测

**算法**: 变量使用前检查初始化状态

```pseudocode
function checkUninitializedUse(line, variableName):
  var = getVariable(variableName)
  if not var or var.isInitialized:
    return false
  
  // 检查是否在赋值左侧
  if isAssignmentLeftSide(line, variableName):
    return false
  
  // 检查是否为函数参数
  if isFunctionParameter(variableName):
    return false
  
  return true
```

**检测规则**:
- 变量在首次使用前必须显式初始化
- 函数参数视为已初始化
- 赋值左侧的变量不报错
- 支持按址传递参数的识别

### 3. 野指针检测

**算法**: 指针解引用前检查初始化状态

```pseudocode
function checkWildPointer(line, pointerName):
  var = getVariable(pointerName)
  if not var or not var.isPointer:
    return false
  
  if not var.isInitialized:
    return true
  
  // 检查指针是否可能为NULL
  if var.pointerMaybeNull and isDereference(line, pointerName):
    return true
  
  return false
```

**检测模式**:
- `*pointer` - 直接解引用
- `pointer->field` - 结构体成员访问
- `pointer[index]` - 数组访问

**指针初始化识别**:
- `= NULL` 或 `= 0` → `pointerMaybeNull = true`
- `= &variable` → `pointerMaybeNull = false`
- `= malloc/calloc/realloc(...)` → `pointerMaybeNull = false`
- `= function_call(...)` → `pointerMaybeNull = false`

### 4. 头文件拼写检查

**算法**: 检查非标准头文件名称

```pseudocode
function checkHeaderSpelling(line):
  if line.startsWith('#include <'):
    header = extractHeaderName(line)
    if header not in standardHeaders:
      reportError("可疑标准头文件: " + header)
```

**标准头文件列表**:
`assert.h`, `complex.h`, `ctype.h`, `errno.h`, `fenv.h`, `float.h`, `inttypes.h`, `iso646.h`, `limits.h`, `locale.h`, `math.h`, `setjmp.h`, `signal.h`, `stdalign.h`, `stdarg.h`, `stdatomic.h`, `stdbool.h`, `stddef.h`, `stdint.h`, `stdio.h`, `stdlib.h`, `stdnoreturn.h`, `string.h`, `tgmath.h`, `threads.h`, `time.h`, `uchar.h`, `wchar.h`, `wctype.h`

### 5. 作用域管理

**算法**: 使用函数栈和作用域表管理变量可见性

```pseudocode
function manageScope():
  funcStack = []  // 函数调用栈
  braceDepth = 0  // 大括号深度
  
  for each line in file:
    // 更新大括号深度
    for each char in line:
      if char == '{': braceDepth++
      if char == '}': 
        braceDepth = max(0, braceDepth - 1)
        if braceDepth < funcStack.length:
          funcStack.pop()
    
    // 检测函数定义
    if isFunctionDefinition(line):
      funcName = extractFunctionName(line)
      funcStack.push(funcName)
    
    // 变量声明处理
    if isVariableDeclaration(line):
      variables = parseDecl(line)
      scope = getCurrentScope(braceDepth, funcStack)
      for var in variables:
        scope.add(var)
```

## 性能优化

### 1. 分段哈希表
- 将变量名按首字母分为4段: a-f, g-m, n-s, t-z
- 减少哈希冲突，提高查找效率

### 2. 正则表达式优化
- 预编译常用正则表达式
- 使用高效的模式匹配

### 3. 作用域缓存
- 缓存当前作用域的变量表
- 避免重复查找

## 当前限制

### 1. 未实现的检测
- **死循环检测**: `for(;;)`, `while(1)` 等
- **内存泄漏检测**: malloc/free 配对检查
- **printf/scanf格式检查**: 参数类型和数量匹配
- **函数返回值检查**: 未检查函数调用的返回值

### 2. 误报原因
- 按址传递参数的复杂场景识别不完整
- 函数调用返回值的使用场景
- 复杂表达式的变量使用检测

### 3. 漏报原因
- 仅在使用时检测，不在声明时检测
- 缺少高级控制流分析
- 缺少跨函数的数据流分析

## 性能指标

当前版本性能指标:
- **Precision**: 61.1%
- **Recall**: 50%
- **F1**: 55%
- **总检测**: 18个问题
- **预置BUG**: 22个

## 改进方向

1. **增强死循环检测**: 实现 `for(;;)`, `while(1)` 检测
2. **内存泄漏检测**: 实现 malloc/free 配对检查
3. **格式字符串检查**: 实现 printf/scanf 参数匹配
4. **函数返回值检查**: 检查函数调用的返回值使用
5. **改进按址传递识别**: 减少函数调用相关的误报