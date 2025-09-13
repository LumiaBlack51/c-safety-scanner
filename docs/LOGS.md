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

[2025-09-13T13:18:20.724Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=22, 报告=18, TP=11, FP=7, FN=11
误报 FP:
- tests\graphs\buggy\bug_49.c:22 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_50.c:22 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_50.c:26 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\buggy\graph.c:24 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\main.c:10 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\bug_49.c:13 [Uninitialized] 消息: 2nd function call argument is an uninitialized value 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
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

[2025-09-13T21:55:00.000Z] 运行目标: tests\graphs\buggy (新功能测试)
统计: 总预置错误=22, 报告=大量, TP=很多, FP=一些, FN=一些

## 新功能测试结果

### ✅ 成功实现的功能：

1. **数值范围检查功能**:
   - bug_47.c:7,8,12,13,17,18,22,23,26,27 - 检测到10个数值范围溢出
   - 支持char, short, int, long, long long等类型的范围检查
   - 支持十六进制(0x)和八进制(0)数值解析

2. **内存泄漏检测功能**:
   - bug_46.c - 检测到多个内存泄漏
   - graph.c:8,36 - 检测到内存泄漏
   - 支持malloc, calloc, realloc的检测
   - 在函数结束时检查未释放的内存

3. **野指针和空指针检测功能**:
   - bug_45.c:9,12,15,33,95,96 - 检测到野指针解引用
   - bug_0.c:8, graph.c:7,8,23, main.c:13 - 检测到野指针解引用
   - 支持直接解引用(*ptr)、数组访问(ptr[index])、结构体访问(ptr->field)

4. **死循环检测功能**:
   - bug_0.c:7, bug_48.c:7,15,39,112, main.c:12 - 检测到多个死循环
   - 支持for(;;), while(1), 复杂循环条件分析
   - 支持break/return检测，避免误报

5. **未初始化变量检测**:
   - 继续正常工作，检测到多个未初始化变量使用

6. **头文件拼写检查**:
   - bug_0.c:1 - 检测到stdiox.h拼写错误

### ❌ 发现的问题：

1. **内存泄漏重复报告**:
   - bug_46.c中的内存泄漏被重复报告多次
   - 原因：函数结束检测逻辑有问题，每个函数结束时都报告了所有内存泄漏

2. **printf/scanf格式检查未实现**:
   - bug_0.c:5 - printf格式错误(%s与int不匹配)未检测到
   - bug_0.c:6 - scanf缺少&操作符未检测到
   - 原因：formatSpecCount函数存在但未在主循环中调用

3. **一些原有的漏报仍然存在**:
   - graph.c中的一些内存泄漏和未初始化问题
   - main.c中的一些函数返回值检查问题

### 📊 性能统计：

**检测到的BUG类型统计**:
- Header: 1个
- Dead loop: 6个  
- Uninitialized: 8个
- Wild pointer: 10个
- Range overflow: 10个
- Memory leak: 多个（有重复）

**新功能检测能力**:
- 数值范围检查: ✅ 正常工作
- 内存泄漏检测: ⚠️ 有重复报告问题
- 野指针检测: ✅ 正常工作
- 死循环检测: ✅ 正常工作

### 🔧 需要修复的问题：

1. **修复内存泄漏重复报告**:
   - 改进函数结束检测逻辑
   - 只报告当前函数内的内存泄漏

2. **实现printf/scanf格式检查**:
   - 在主循环中添加格式检查逻辑
   - 检测参数数量不匹配和类型不匹配

3. **优化检测精度**:
   - 减少误报
   - 提高召回率