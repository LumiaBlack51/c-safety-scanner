## C Safety Scanner - 预置 BUG 清单与修复建议

本文件列出 tests/ 中预先设置的 BUG 点（带 `// BUG` 标注的行），并汇总"错误类型 + 修改建议"。

### tests/graphs/buggy

- graph.c:
  - `graph_create`: 未初始化使用、野指针
    - 类型：Uninitialized / Wild pointer
    - 建议：为 `Graph* g` 分配内存并清零：`g = calloc(1, sizeof(Graph));`
  - `graph_add_edge`: 未初始化指针 `e` 被写入
    - 类型：Uninitialized / Wild pointer
    - 建议：`e = malloc(sizeof(Edge));` 后再赋值
  - `bfs`: `n` 未初始化即用于分配
    - 类型：Uninitialized
    - 建议：`int n = g->n;`

- main.c:
  - `printf("%d %d %d\n", dist[0], dist[1]);` 少参数
    - 类型：Format（参数计数）
    - 建议：补齐第三个参数或减少占位

- bug_0.c, bug_49.c, bug_50.c：
  - 头文件拼写错误 `#include <stdiox.h>`
    - 类型：Header
    - 建议：改为 `<stdio.h>`
  - `printf("%s %d", x, 123);`，`scanf("%d", x);`
    - 类型：Format（类型/取址）
    - 建议：将 `%s` 对应 `char*`；`scanf` 对非字符串加 `&x`
  - `for(;;)` 与 `*p = 1;`
    - 类型：Infinite loop / Wild pointer
    - 建议：添加退出条件；为指针分配内存并检查
  - static 变量未初始化使用
    - 类型：Uninitialized
    - 建议：初始化 static 变量或在使用前检查

### tests/graphs/correct
- 期望无 BUG。若有报警，视为误报并推动算法改进。

### 最新识别结果快照

[2025-09-13] 当前版本检测结果：
- 支持 static、const、extern 等存储类说明符识别
- 函数参数正确识别，避免误报
- 性能指标：Precision 64.7%, Recall 50%, F1 56.4%

### 识别结果快照 (2025-09-13T13:18:20.727Z) - tests\graphs\buggy
- tests\graphs\buggy\bug_0.c:1 [Header] 可疑标准头文件: stdiox.h - 建议: 改为正确的标准头文件名，或私有头使用双引号 include
- tests\graphs\buggy\bug_0.c:5 [Uninitialized] 变量使用前未初始化 - 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_0.c:6 [Uninitialized] 变量使用前未初始化 - 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_0.c:7 [Uninitialized] 变量使用前未初始化 - 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_0.c:8 [Wild pointer] 潜在野指针解引用（指针未初始化） - 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\buggy\bug_49.c:22 [Uninitialized] 变量使用前未初始化 - 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_50.c:22 [Uninitialized] 变量使用前未初始化 - 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_50.c:26 [Wild pointer] 潜在野指针解引用（指针未初始化） - 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\buggy\graph.c:7 [Wild pointer] 潜在野指针解引用（指针未初始化） - 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\buggy\graph.c:8 [Wild pointer] 潜在野指针解引用（指针未初始化） - 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\buggy\graph.c:23 [Wild pointer] 潜在野指针解引用（指针未初始化） - 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\buggy\graph.c:24 [Uninitialized] 变量使用前未初始化 - 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\graph.c:36 [Uninitialized] 变量使用前未初始化 - 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\main.c:10 [Uninitialized] 变量使用前未初始化 - 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\main.c:13 [Wild pointer] 潜在野指针解引用（指针未初始化） - 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\buggy\bug_49.c:13 [Uninitialized] 2nd function call argument is an uninitialized value - 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_50.c:26 [Wild pointer] Dereference of null pointer (loaded from variable 'static_ptr') - 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\buggy\graph.c:53 [Format] format specifies type 'char *' but the argument has type 'int' - 建议: 参数个数与占位匹配，scanf 对非字符串加 &，%s 对应 char*
