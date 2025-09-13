## 运行日志与对比

每次运行记录识别结果（文件:行:类型 + 建议）与标准答案（tests 中带 `// BUG` 的行）。
注意：仅统计"可识别任务清单"且非"仅声明行"的 BUG（声明即未初始化/未分配指针只作为提示，不计入评测），与当前检测逻辑保持一致。

### 最新运行记录

[2025-09-13T13:00:31.807Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=22, 报告=17, TP=11, FP=6, FN=11
误报 FP:
- tests\graphs\buggy\bug_49.c:21 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_50.c:22 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_50.c:26 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\buggy\graph.c:24 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\main.c:10 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_50.c:26 [Wild pointer] 消息: Dereference of null pointer (loaded from variable 'static_ptr') 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
漏报 FN:
- tests\graphs\buggy\graph.c:6
- tests\graphs\buggy\graph.c:9
- tests\graphs\buggy\graph.c:18
- tests\graphs\buggy\graph.c:22
- tests\graphs\buggy\graph.c:28
- tests\graphs\buggy\graph.c:43
- tests\graphs\buggy\graph.c:51
- tests\graphs\buggy\main.c:5
- tests\graphs\buggy\main.c:6
- tests\graphs\buggy\main.c:7
- tests\graphs\buggy\main.c:15

### 修正计划
- 改进按址传递参数的识别，减少函数调用相关的误报
- 增强复杂表达式的解析能力
- 优化死循环检测逻辑
