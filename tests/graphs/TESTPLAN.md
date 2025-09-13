# 测试计划与记录

## 用例结构
- correct/: 期望 0 报警
- buggy/: 期望指定位置触发报警

## 目标检测项
- 未初始化变量使用
- 野指针解引用
- printf/scanf 误用
- 潜在死循环（for/while）
- 宏与注释忽略不报

## 首轮测试记录
- correct/: 出现误报
  - graph.c:16,29,44 标记为可能死循环（应忽略：循环体中有 e=nx 或指针前进）
  - main.c:15,16,18,19 标记未初始化（应忽略：order/cnt 由 bfs/dfs 写入）
- buggy/: 关键错误均被捕获
  - 未初始化与野指针：graph_create/graph_add_edge/bfs
  - 死循环：graph_remove_edge 的 for(;;)
  - printf 误用与少参数：topo_sort/main

## 需改进项追踪
- 循环分析：
  - while(ptr) 模式，识别形如 ptr=ptr->next 的更新
  - for/while 窗口中跨行更新匹配更稳健
- 数据流：
  - 识别函数按址写入（如 bfs/dfs(order,&cnt)）将目标变量标记为已初始化
  - 扩展“常见写入函数”白名单为基于形参分析

### Buggy 组首轮报告
- 总预置错误: 368
- 报告总数: 306
- TP: 303, FP: 3, FN: 166
- Precision: 0.990, Recall: 0.646, F1: 0.782

### Buggy 组首轮报告
- 总预置错误: 368
- 报告总数: 306
- TP: 303, FP: 3, FN: 166
- Precision: 0.990, Recall: 0.646, F1: 0.782

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 9
- TP: 0, FP: 9, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 368
- 报告总数: 304
- TP: 302, FP: 2, FN: 166
- Precision: 0.993, Recall: 0.645, F1: 0.782

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 4
- TP: 0, FP: 4, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 368
- 报告总数: 304
- TP: 302, FP: 2, FN: 166
- Precision: 0.993, Recall: 0.645, F1: 0.782

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 4
- TP: 0, FP: 4, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 368
- 报告总数: 354
- TP: 352, FP: 2, FN: 116
- Precision: 0.994, Recall: 0.752, F1: 0.856

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 4
- TP: 0, FP: 4, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 368
- 报告总数: 354
- TP: 352, FP: 2, FN: 116
- Precision: 0.994, Recall: 0.752, F1: 0.856

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 4
- TP: 0, FP: 4, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 368
- 报告总数: 354
- TP: 352, FP: 2, FN: 116
- Precision: 0.994, Recall: 0.752, F1: 0.856

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 4
- TP: 0, FP: 4, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 368
- 报告总数: 354
- TP: 352, FP: 2, FN: 116
- Precision: 0.994, Recall: 0.752, F1: 0.856

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 4
- TP: 0, FP: 4, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 368
- 报告总数: 356
- TP: 353, FP: 3, FN: 116
- Precision: 0.992, Recall: 0.753, F1: 0.856

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 9
- TP: 0, FP: 9, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 317
- 报告总数: 356
- TP: 353, FP: 3, FN: 65
- Precision: 0.992, Recall: 0.844, F1: 0.912

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 9
- TP: 0, FP: 9, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 9
- TP: 0, FP: 9, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 317
- 报告总数: 356
- TP: 353, FP: 3, FN: 65
- Precision: 0.992, Recall: 0.844, F1: 0.912

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 7
- TP: 0, FP: 7, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 317
- 报告总数: 355
- TP: 353, FP: 2, FN: 65
- Precision: 0.994, Recall: 0.844, F1: 0.913

### Buggy 组首轮报告
- 总预置错误: 268
- 报告总数: 359
- TP: 356, FP: 3, FN: 13
- Precision: 0.992, Recall: 0.965, F1: 0.978

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 7
- TP: 0, FP: 7, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 267
- 报告总数: 359
- TP: 356, FP: 3, FN: 12
- Precision: 0.992, Recall: 0.967, F1: 0.979

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 7
- TP: 0, FP: 7, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 7
- TP: 0, FP: 7, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 267
- 报告总数: 359
- TP: 356, FP: 3, FN: 12
- Precision: 0.992, Recall: 0.967, F1: 0.979

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 2
- TP: 0, FP: 2, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 2
- TP: 0, FP: 2, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 267
- 报告总数: 357
- TP: 355, FP: 2, FN: 12
- Precision: 0.994, Recall: 0.967, F1: 0.981

### Buggy 组首轮报告
- 总预置错误: 267
- 报告总数: 258
- TP: 256, FP: 2, FN: 11
- Precision: 0.992, Recall: 0.959, F1: 0.975

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 5
- TP: 0, FP: 5, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 267
- 报告总数: 258
- TP: 256, FP: 2, FN: 11
- Precision: 0.992, Recall: 0.959, F1: 0.975

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 5
- TP: 0, FP: 5, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Correct 组首轮报告
- 总预置错误: 0
- 报告总数: 5
- TP: 0, FP: 5, FN: 0
- Precision: 0.000, Recall: 1.000, F1: 0.000

### Buggy 组首轮报告
- 总预置错误: 22
- 报告总数: 17
- TP: 11, FP: 6, FN: 11
- Precision: 0.647, Recall: 0.500, F1: 0.564
