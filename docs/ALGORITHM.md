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

### 5. 死循环检测

**算法**: 通过模拟循环执行来检测潜在的死循环

```pseudocode
function detectDeadLoop(line, lineNum):
  loopInfo = extractLoopInfo(line, lineNum)
  if not loopInfo: return false
  
  // 检查循环体内是否有break或return
  loopEnd = findLoopEnd(lines, lineNum)
  hasBreak = checkForBreakOrReturn(lines, lineNum, loopEnd)
  if hasBreak: return false
  
  // 模拟循环执行
  return simulateLoopExecution(loopInfo)

function extractLoopInfo(line, lineNum):
  // 检测明显的死循环
  if matches(line, "for(;;)") or matches(line, "while(1)"):
    return {type: "for/while", condition: "true", line: lineNum}
  
  // 检测for循环
  if match = line.match("for\\(([^;]*);([^;]*);([^)]*)\\)"):
    return {type: "for", init: match[1], condition: match[2], update: match[3], line: lineNum}
  
  // 检测while循环
  if match = line.match("while\\(([^)]+)\\)"):
    return {type: "while", condition: match[1], line: lineNum}

function simulateLoopExecution(loopInfo):
  // 明显的死循环
  if loopInfo.condition == "true" or loopInfo.condition == "1":
    return true
  
  // 分析for循环
  if loopInfo.type == "for":
    return analyzeForLoop(loopInfo.init, loopInfo.condition, loopInfo.update)
  
  // 分析while循环
  if loopInfo.type == "while":
    return analyzeWhileLoop(loopInfo.condition)

function analyzeForLoop(init, condition, update):
  // 提取循环变量和初始值
  initMatch = init.match("([a-zA-Z_]\\w*)\\s*=\\s*([+-]?\\d+(?:\\.\\d+)?)")
  if not initMatch: return false
  
  varName = initMatch[1]
  initValue = parseFloat(initMatch[2])
  
  // 解析条件
  condMatch = condition.match(varName + "\\s*([<>=!]+)\\s*([+-]?\\d+(?:\\.\\d+)?)")
  if not condMatch: return false
  
  operator = condMatch[1]
  targetValue = parseFloat(condMatch[2])
  
  // 解析更新表达式
  step = extractStep(update, varName)
  if step == null: return false
  
  // 模拟迭代
  return simulateIterations(initValue, operator, targetValue, step)

function simulateIterations(initValue, operator, targetValue, step):
  currentValue = initValue
  maxIterations = 100000
  
  for i = 0 to maxIterations:
    if checkExitCondition(currentValue, operator, targetValue):
      return false  // 不是死循环
    
    currentValue += step
    
    // 检查溢出
    if abs(currentValue) > 1e10:
      return true  // 可能是死循环
  
  return true  // 超过最大迭代次数，认为是死循环
```

**检测类型**:
- **明显死循环**: `for(;;)`, `while(1)`, `while(true)`
- **循环条件错误**: 循环变量永远不会满足退出条件
- **步长问题**: 循环变量步长过大或过小，跳过或无法达到退出条件
- **浮点精度问题**: 浮点数循环由于精度问题无法达到目标值

**检测规则**:
- 如果循环体内有`break`、`return`或`exit()`，不报告为死循环
- 模拟最多10万次迭代来检查循环是否能退出
- 支持常见的循环变量更新模式：`i++`, `i--`, `i += n`, `i -= n`
- 检查循环条件中的比较操作符：`<`, `<=`, `>`, `>=`, `==`, `!=`

### 6. 作用域管理

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

### 6. 内存泄漏检测

**算法**: 跟踪内存分配和释放

```pseudocode
function detectMemoryAllocation(line, lineNum):
  // 检测 malloc, calloc, realloc
  if match = line.match("([a-zA-Z_]\\w*)\\s*=\\s*(?:\\()?\\s*(malloc|calloc|realloc)\\s*\\("):
    varName = match[1]
    allocType = match[2]
    size = extractSize(line)
    return {line: lineNum, variable: varName, size: size, isFreed: false, reported: false}

function detectMemoryFree(line, allocations):
  // 检测 free 调用
  if match = line.match("free\\s*\\(\\s*([a-zA-Z_]\\w*)\\s*\\)"):
    varName = match[1]
    for alloc in allocations:
      if alloc.variable == varName and not alloc.isFreed:
        alloc.isFreed = true
        break

function checkMemoryLeaks(allocations):
  for alloc in allocations:
    if not alloc.isFreed and not alloc.reported:
      reportError("内存泄漏：变量" + alloc.variable + "分配的内存未释放")
      alloc.reported = true
```

**检测规则**:
- 跟踪所有 `malloc`, `calloc`, `realloc` 调用
- 检测对应的 `free` 调用
- 在函数结束时检查未释放的内存
- 支持变量重赋值的情况

### 7. printf/scanf 格式字符串检查

**算法**: 检查格式说明符与参数类型匹配

```pseudocode
function checkFormatString(line):
  if matches(line, "\\b(printf|scanf)\\s*\\("):
    args = getArgsFromCall(line)
    if args.length >= 1:
      fmt = args[0]
      fmtStr = extractFormatString(fmt)
      specCount = countFormatSpecifiers(fmtStr)
      provided = max(0, args.length - 1)
      
      // 检查参数数量
      if provided < specCount:
        reportError("参数少于格式化占位数")
      if provided > specCount:
        reportError("参数多于格式化占位数")
      
      // 检查类型匹配
      for i = 0 to min(specCount, provided):
        spec = extractFormatSpec(fmtStr, i)
        argType = getArgumentType(args[i + 1])
        if not isFormatSpecCompatible(spec, argType):
          reportError("格式字符串不匹配：" + spec + " 与 " + argType + " 类型不兼容")

function isFormatSpecCompatible(spec, argType):
  specType = spec.toLowerCase()
  
  // 整数类型
  if specType in ["%d", "%i", "%o", "%u", "%x", "%x"]:
    return argType in ["int", "char", "short", "long", "unsigned", "signed"]
  
  // 浮点类型
  if specType in ["%f", "%e", "%e", "%g", "%g", "%a", "%a"]:
    return argType in ["float", "double"]
  
  // 字符类型
  if specType == "%c":
    return "char" in argType and "*" not in argType
  
  // 字符串类型
  if specType == "%s":
    return "char" in argType and "*" in argType
  
  // 指针类型
  if specType == "%p":
    return "*" in argType
  
  return true  // 默认兼容，避免误报
```

### 8. 数值范围检查

**算法**: 检查数值是否超出类型范围

```pseudocode
function checkValueRange(value, typeName):
  range = getTypeRange(typeName)
  if not range: return true  // 未知类型，不检查
  
  return value >= range.min and value <= range.max

function getTypeRange(typeName):
  ranges = {
    'char': {min: -128, max: 127, isSigned: true},
    'unsigned char': {min: 0, max: 255, isSigned: false},
    'short': {min: -32768, max: 32767, isSigned: true},
    'unsigned short': {min: 0, max: 65535, isSigned: false},
    'int': {min: -2147483648, max: 2147483647, isSigned: true},
    'unsigned int': {min: 0, max: 4294967295, isSigned: false},
    'long': {min: -2147483648, max: 2147483647, isSigned: true},
    'unsigned long': {min: 0, max: 4294967295, isSigned: false},
    'long long': {min: -9223372036854775808, max: 9223372036854775807, isSigned: true},
    'unsigned long long': {min: 0, max: 18446744073709551615, isSigned: false}
  }
  return ranges[normalizeType(typeName)]

function extractNumericValue(expr):
  expr = expr.trim()
  
  // 处理十六进制
  if expr.startsWith("0x") or expr.startsWith("0X"):
    return parseInt(expr, 16)
  
  // 处理八进制
  if expr.startsWith("0") and expr.length > 1 and not expr.includes("."):
    return parseInt(expr, 8)
  
  // 处理十进制
  return parseFloat(expr)
```

**支持的类型**:
- 所有基本整数类型及其 unsigned 变体
- 十六进制数值 (0x...)
- 八进制数值 (0...)
- 十进制数值

### 9. 库函数头文件检查

**算法**: 检查使用的库函数是否包含对应头文件

```pseudocode
function checkLibraryFunctionHeaders(line, includedHeaders):
  functionCalls = extractFunctionCalls(line)
  warnings = []
  
  for call in functionCalls:
    functionName = extractFunctionName(call)
    requiredHeader = functionHeaderMap[functionName]
    
    if requiredHeader and requiredHeader not in includedHeaders:
      warnings.add("函数 " + functionName + " 需要包含头文件 " + requiredHeader)
  
  return warnings

function extractIncludedHeaders(lines):
  headers = Set()
  for line in lines:
    if match = line.match("#\\s*include\\s*[<\"]([^>\"]+)[>\"]"):
      headers.add(match[1])
  return headers
```

**支持的库函数**:
- **stdio.h**: printf, scanf, fopen, fclose, fgets, fputs 等
- **stdlib.h**: malloc, free, exit, atoi, rand 等
- **string.h**: strcpy, strlen, strcmp, memcpy 等
- **math.h**: sin, cos, sqrt, pow 等
- **ctype.h**: isalpha, isdigit, toupper 等
- **time.h**: time, clock, localtime 等
- **assert.h**: assert
- **errno.h**: perror
- **limits.h**: INT_MAX, INT_MIN 等常量

## 模块化架构

### 1. 文件结构

```
src/
├── types.ts              # 类型定义
├── segmented_table.ts    # 分段哈希表实现
├── function_header_map.ts # 库函数头文件映射
├── range_checker.ts      # 数值范围检查
├── format_checker.ts     # 格式字符串检查
├── header_checker.ts     # 头文件检查
└── scanner_cli.ts        # 主扫描器逻辑
```

### 2. 模块职责

- **types.ts**: 定义所有接口和类型
- **segmented_table.ts**: 分段哈希表的实现和操作
- **function_header_map.ts**: 库函数与头文件的映射关系
- **range_checker.ts**: 数值范围检查和类型范围定义
- **format_checker.ts**: printf/scanf 格式字符串检查
- **header_checker.ts**: 库函数头文件依赖检查
- **scanner_cli.ts**: 主扫描逻辑，协调各模块

## 当前限制

### 1. 误报原因
- 函数参数和递归调用的处理不够智能
- 复杂表达式的变量使用检测
- 按址传递参数的复杂场景识别不完整

### 2. 漏报原因
- 缺少高级控制流分析
- 缺少跨函数的数据流分析
- 复杂指针运算的检测

### 3. 性能限制
- 基于行级分析，缺少全局数据流分析
- 正则表达式解析的局限性
- 缺少抽象语法树支持

## 性能指标

当前版本性能指标:
- **Bug组检测**: 能够检测到大部分预置的bug
- **Correct组误报**: 在复杂代码中存在一定误报
- **检测类型**: 支持9种主要检测类型
- **模块化程度**: 高度模块化，易于维护和扩展

## 改进方向

1. **智能函数参数处理**: 改进函数调用和递归的检测逻辑
2. **抽象语法树支持**: 集成AST分析提高准确性
3. **数据流分析**: 实现跨函数的数据流跟踪
4. **配置化检测**: 允许用户配置检测规则和阈值
5. **性能优化**: 优化大文件的处理性能