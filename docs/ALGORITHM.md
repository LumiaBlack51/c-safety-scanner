## C Safety Scanner - 算法设计与伪代码

本工具采用轻量级启发式的行级解析与符号跟踪，构建分段哈希表（全局、按函数局部），在不引入完整 AST/编译器前端的前提下覆盖常见的 C 代码缺陷场景。

### 核心数据结构
- 分段哈希表（a-f, g-m, n-s, t-z）
  - `globals[4] : Map<string, Var>`
  - `localsByFunc: Map<string, SegmentedTable>`
- `Var`：`{ name, typeName, isPointer, isInitialized }`

### 通用流程（伪代码）
```
for file in files:
  lines = read(file)
  funcStack = []
  globals = segmentedTable()
  localsByFunc = {}
  for i, raw in enumerate(lines):
    line = trim(remove_line_comment(raw))
    if in_multiline_define: handle_continue; continue
    if line startswith #include: check_std_header(line)
    if line startswith #define: set in_multiline_define if endswith '\\'; continue
    update_brace_and_function_stack(raw)

    if is_decl(line):
      for dec in parse_decl(line):
        tab = (funcStack.top ? localsByFunc[func] : globals)
        tab.set(dec.name, Var(dec.name, dec.type, isPtr(dec), dec.inited))
      continue

    if matches for(...): analyze_for_header(update_block)
    if matches while(...): analyze_while_body_lookahead(window=20)

    names = all_names(globals, localsByFunc[funcStack.top])
    for name in names:
      if assignment_to(line, name): mark_initialized(name)

    if is_function_call(line):
      for arg in args(line):
        name = extract_name(arg)
        if startswith '&' or is_pointer(name): mark_initialized(name)

    for name in names:
      if used_in(line, name) and not initialized(name):
        if is_pointer(name) and deref_in(line, name): warn(WildPointer)
        else warn(Uninitialized)

    if printf/scanf call: check_format_args(line)
```

### 关键检测

#### 1) 未初始化（Initialization）
- 检测点：出现 `name` 的 token、但未见 `name = ...`/`name += ...` 等写入。
- 传播：
  - 函数调用中 `&name` 或 `name` 为指针形参 → 视作“可能写入”后置为已初始化。
  - 常见写入 API 可加入白名单扩展（memset/read/fread/strcpy...）。

伪代码：
```
if tokenContains(line, name):
  if looksAssignmentTo(line, name): set init(name)=true
  else if isCall(line) and (&name in args or isPointer(name)): set init(name)=true
  else if not init(name): warn(Uninitialized)
```

修改建议：
- 在首次使用前显式赋值；对需要在函数中写入的变量按址传递；数组/缓冲区可在写入后再使用。

#### 2) 野指针（Wild pointer）/ 空指针
- 条件：`isPointer(name) && not init(name) && deref_in(line, name)`。
- 空指针：若最近一次赋值为 `NULL/0` 且解引用，则提示空指针解引用。

伪代码：
```
if isPointer(name) and not init(name) and (
   match("*name") or match("name->") or match("name[")
): warn(WildPointer)
```

修改建议：
- 声明即初始化或置 NULL 并检查；动态内存申请后检查返回值；遍历时推进指针。

#### 3) 死循环（Infinite loop）
- for：解析 `(init; cond; update)`，若 `condVar` 存在但 `update` 未包含 `condVar` 的 `++/--/赋值`，或 `for(;;)` 则报警。
- while：提取条件变量 `cv`，在后 20 行窗口中查找 `cv++/cv--/cv op= .../cv = cv->next/cv = cv ± k` 等更新；`while(1|true)` 直接报警。

伪代码：
```
if match("for(..)"):
  cv = extract_cond_var(cond)
  if for(;;): warn(InfLoop)
  else if cv and not updates(cv, update): warn(InfLoop)

if match("while(cv ..)"):
  win = next_lines(20)
  if not updates(cv, win): warn(InfLoop)
```

修改建议：
- 确保条件变量更新；链表遍历中推进指针；忙等加入 break/超时。

#### 4) 格式化（printf/scanf）
修改建议：
- 参数数量与占位相符；scanf 非字符串参数添加 &；为 %s 使用 char* 或字符数组。

- 统计 `%` 数，与实参数对比；
- scanf：非字符串/数组需 `&`；
- 可扩展：`%d/%f/%s/%p` 与变量表的类型比对，输出 `expected` vs `actual`。

伪代码：
```
cnt = count_specifiers(fmt)
if args-1 != cnt: warn(FormatCount)
if is_scanf:
  for arg in args[1:]: if not startswith('&') and not is_char_array(arg): warn(NeedAddress)
```

### 误报控制
- 忽略：预处理指令、宏多行、行内注释。
- 指针遍历更新：识别 `cv = cv->next`、`cv = cv ± k`。
- 调用按址写入：将 `&name` 和指针实参视为“可能写入”。

### 后续增强方向
- 更精细的数据流分析（基本块/支配关系/SSA 简化）；
- 类型系统与格式化占位更严格匹配；
- VS Code 侧提供 CodeAction 快速修复建议（自动加 `&`、初始化模板等）。


