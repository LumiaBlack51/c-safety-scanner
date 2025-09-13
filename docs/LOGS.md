## 运行日志与对比

每次运行记录识别结果（文件:行:类型 + 建议）与标准答案（tests 中带 `// BUG` 的行）。
注意：仅统计“可识别任务清单”且非“仅声明行”的 BUG（声明即未初始化/未分配指针只作为提示，不计入评测），与当前检测逻辑保持一致。

### 模板
```
[时间] 运行目标: tests/graphs/buggy
统计: 总预置错误=..., 报告=..., TP=..., FP=..., FN=...
差异:
- 误报 FP: file:line [type] -> 建议: ...
- 漏报 FN: file:line [预置类型]
修正计划:
- ...
```

### 样例（首轮）
```
[R1] 目标: buggy
总预置错误=368, 报告=306, TP=303, FP=3, FN=166
差异:
- FP: correct/graph.c 中 while/for 的指针遍历被误判为死循环
修正计划:
- 识别 cv=cv->next / cv=&(*cv)->next 等指针推进
```

### 样例（第二轮）
```
[R2] 目标: buggy
总预置错误=368, 报告=304, TP=302, FP=2, FN=166
差异:
- FP 降低；仍需处理复杂跨行更新
修正计划:
- 加强跨行与多语句更新匹配
```



[2025-09-11T11:27:49.883Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=368, 报告=304, TP=302, FP=2, FN=166
误报 FP:
- tests\graphs\buggy\graph.c:15 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\graph.c:29 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
漏报 FN:
- tests\graphs\buggy\bug_0.c:3
- tests\graphs\buggy\bug_0.c:4
- tests\graphs\buggy\bug_0.c:8
- tests\graphs\buggy\bug_1.c:3
- tests\graphs\buggy\bug_1.c:4
- tests\graphs\buggy\bug_1.c:8
- tests\graphs\buggy\bug_10.c:3
- tests\graphs\buggy\bug_10.c:4
- tests\graphs\buggy\bug_10.c:8
- tests\graphs\buggy\bug_11.c:3
- tests\graphs\buggy\bug_11.c:4
- tests\graphs\buggy\bug_11.c:8
- tests\graphs\buggy\bug_12.c:3
- tests\graphs\buggy\bug_12.c:4
- tests\graphs\buggy\bug_12.c:8
- tests\graphs\buggy\bug_13.c:3
- tests\graphs\buggy\bug_13.c:4
- tests\graphs\buggy\bug_13.c:8
- tests\graphs\buggy\bug_14.c:3
- tests\graphs\buggy\bug_14.c:4
- tests\graphs\buggy\bug_14.c:8
- tests\graphs\buggy\bug_15.c:3
- tests\graphs\buggy\bug_15.c:4
- tests\graphs\buggy\bug_15.c:8
- tests\graphs\buggy\bug_16.c:3
- tests\graphs\buggy\bug_16.c:4
- tests\graphs\buggy\bug_16.c:8
- tests\graphs\buggy\bug_17.c:3
- tests\graphs\buggy\bug_17.c:4
- tests\graphs\buggy\bug_17.c:8
- tests\graphs\buggy\bug_18.c:3
- tests\graphs\buggy\bug_18.c:4
- tests\graphs\buggy\bug_18.c:8
- tests\graphs\buggy\bug_19.c:3
- tests\graphs\buggy\bug_19.c:4
- tests\graphs\buggy\bug_19.c:8
- tests\graphs\buggy\bug_2.c:3
- tests\graphs\buggy\bug_2.c:4
- tests\graphs\buggy\bug_2.c:8
- tests\graphs\buggy\bug_20.c:3
- tests\graphs\buggy\bug_20.c:4
- tests\graphs\buggy\bug_20.c:8
- tests\graphs\buggy\bug_21.c:3
- tests\graphs\buggy\bug_21.c:4
- tests\graphs\buggy\bug_21.c:8
- tests\graphs\buggy\bug_22.c:3
- tests\graphs\buggy\bug_22.c:4
- tests\graphs\buggy\bug_22.c:8
- tests\graphs\buggy\bug_23.c:3
- tests\graphs\buggy\bug_23.c:4
- tests\graphs\buggy\bug_23.c:8
- tests\graphs\buggy\bug_24.c:3
- tests\graphs\buggy\bug_24.c:4
- tests\graphs\buggy\bug_24.c:8
- tests\graphs\buggy\bug_25.c:3
- tests\graphs\buggy\bug_25.c:4
- tests\graphs\buggy\bug_25.c:8
- tests\graphs\buggy\bug_26.c:3
- tests\graphs\buggy\bug_26.c:4
- tests\graphs\buggy\bug_26.c:8
- tests\graphs\buggy\bug_27.c:3
- tests\graphs\buggy\bug_27.c:4
- tests\graphs\buggy\bug_27.c:8
- tests\graphs\buggy\bug_28.c:3
- tests\graphs\buggy\bug_28.c:4
- tests\graphs\buggy\bug_28.c:8
- tests\graphs\buggy\bug_29.c:3
- tests\graphs\buggy\bug_29.c:4
- tests\graphs\buggy\bug_29.c:8
- tests\graphs\buggy\bug_3.c:3
- tests\graphs\buggy\bug_3.c:4
- tests\graphs\buggy\bug_3.c:8
- tests\graphs\buggy\bug_30.c:3
- tests\graphs\buggy\bug_30.c:4
- tests\graphs\buggy\bug_30.c:8
- tests\graphs\buggy\bug_31.c:3
- tests\graphs\buggy\bug_31.c:4
- tests\graphs\buggy\bug_31.c:8
- tests\graphs\buggy\bug_32.c:3
- tests\graphs\buggy\bug_32.c:4
- tests\graphs\buggy\bug_32.c:8
- tests\graphs\buggy\bug_33.c:3
- tests\graphs\buggy\bug_33.c:4
- tests\graphs\buggy\bug_33.c:8
- tests\graphs\buggy\bug_34.c:3
- tests\graphs\buggy\bug_34.c:4
- tests\graphs\buggy\bug_34.c:8
- tests\graphs\buggy\bug_35.c:3
- tests\graphs\buggy\bug_35.c:4
- tests\graphs\buggy\bug_35.c:8
- tests\graphs\buggy\bug_36.c:3
- tests\graphs\buggy\bug_36.c:4
- tests\graphs\buggy\bug_36.c:8
- tests\graphs\buggy\bug_37.c:3
- tests\graphs\buggy\bug_37.c:4
- tests\graphs\buggy\bug_37.c:8
- tests\graphs\buggy\bug_38.c:3
- tests\graphs\buggy\bug_38.c:4
- tests\graphs\buggy\bug_38.c:8
- tests\graphs\buggy\bug_39.c:3
- ...(其余 66 条省略)

[2025-09-11T11:27:50.299Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=4, TP=0, FP=4, FN=0
误报 FP:
- tests\graphs\correct\graph.c:16 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:29 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:44 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:40 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T11:33:56.990Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=368, 报告=354, TP=352, FP=2, FN=116
误报 FP:
- tests\graphs\buggy\graph.c:15 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\graph.c:29 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
漏报 FN:
- tests\graphs\buggy\bug_0.c:3
- tests\graphs\buggy\bug_0.c:4
- tests\graphs\buggy\bug_1.c:3
- tests\graphs\buggy\bug_1.c:4
- tests\graphs\buggy\bug_10.c:3
- tests\graphs\buggy\bug_10.c:4
- tests\graphs\buggy\bug_11.c:3
- tests\graphs\buggy\bug_11.c:4
- tests\graphs\buggy\bug_12.c:3
- tests\graphs\buggy\bug_12.c:4
- tests\graphs\buggy\bug_13.c:3
- tests\graphs\buggy\bug_13.c:4
- tests\graphs\buggy\bug_14.c:3
- tests\graphs\buggy\bug_14.c:4
- tests\graphs\buggy\bug_15.c:3
- tests\graphs\buggy\bug_15.c:4
- tests\graphs\buggy\bug_16.c:3
- tests\graphs\buggy\bug_16.c:4
- tests\graphs\buggy\bug_17.c:3
- tests\graphs\buggy\bug_17.c:4
- tests\graphs\buggy\bug_18.c:3
- tests\graphs\buggy\bug_18.c:4
- tests\graphs\buggy\bug_19.c:3
- tests\graphs\buggy\bug_19.c:4
- tests\graphs\buggy\bug_2.c:3
- tests\graphs\buggy\bug_2.c:4
- tests\graphs\buggy\bug_20.c:3
- tests\graphs\buggy\bug_20.c:4
- tests\graphs\buggy\bug_21.c:3
- tests\graphs\buggy\bug_21.c:4
- tests\graphs\buggy\bug_22.c:3
- tests\graphs\buggy\bug_22.c:4
- tests\graphs\buggy\bug_23.c:3
- tests\graphs\buggy\bug_23.c:4
- tests\graphs\buggy\bug_24.c:3
- tests\graphs\buggy\bug_24.c:4
- tests\graphs\buggy\bug_25.c:3
- tests\graphs\buggy\bug_25.c:4
- tests\graphs\buggy\bug_26.c:3
- tests\graphs\buggy\bug_26.c:4
- tests\graphs\buggy\bug_27.c:3
- tests\graphs\buggy\bug_27.c:4
- tests\graphs\buggy\bug_28.c:3
- tests\graphs\buggy\bug_28.c:4
- tests\graphs\buggy\bug_29.c:3
- tests\graphs\buggy\bug_29.c:4
- tests\graphs\buggy\bug_3.c:3
- tests\graphs\buggy\bug_3.c:4
- tests\graphs\buggy\bug_30.c:3
- tests\graphs\buggy\bug_30.c:4
- tests\graphs\buggy\bug_31.c:3
- tests\graphs\buggy\bug_31.c:4
- tests\graphs\buggy\bug_32.c:3
- tests\graphs\buggy\bug_32.c:4
- tests\graphs\buggy\bug_33.c:3
- tests\graphs\buggy\bug_33.c:4
- tests\graphs\buggy\bug_34.c:3
- tests\graphs\buggy\bug_34.c:4
- tests\graphs\buggy\bug_35.c:3
- tests\graphs\buggy\bug_35.c:4
- tests\graphs\buggy\bug_36.c:3
- tests\graphs\buggy\bug_36.c:4
- tests\graphs\buggy\bug_37.c:3
- tests\graphs\buggy\bug_37.c:4
- tests\graphs\buggy\bug_38.c:3
- tests\graphs\buggy\bug_38.c:4
- tests\graphs\buggy\bug_39.c:3
- tests\graphs\buggy\bug_39.c:4
- tests\graphs\buggy\bug_4.c:3
- tests\graphs\buggy\bug_4.c:4
- tests\graphs\buggy\bug_40.c:3
- tests\graphs\buggy\bug_40.c:4
- tests\graphs\buggy\bug_41.c:3
- tests\graphs\buggy\bug_41.c:4
- tests\graphs\buggy\bug_42.c:3
- tests\graphs\buggy\bug_42.c:4
- tests\graphs\buggy\bug_43.c:3
- tests\graphs\buggy\bug_43.c:4
- tests\graphs\buggy\bug_44.c:3
- tests\graphs\buggy\bug_44.c:4
- tests\graphs\buggy\bug_45.c:3
- tests\graphs\buggy\bug_45.c:4
- tests\graphs\buggy\bug_46.c:3
- tests\graphs\buggy\bug_46.c:4
- tests\graphs\buggy\bug_47.c:3
- tests\graphs\buggy\bug_47.c:4
- tests\graphs\buggy\bug_48.c:3
- tests\graphs\buggy\bug_48.c:4
- tests\graphs\buggy\bug_49.c:3
- tests\graphs\buggy\bug_49.c:4
- tests\graphs\buggy\bug_5.c:3
- tests\graphs\buggy\bug_5.c:4
- tests\graphs\buggy\bug_6.c:3
- tests\graphs\buggy\bug_6.c:4
- tests\graphs\buggy\bug_7.c:3
- tests\graphs\buggy\bug_7.c:4
- tests\graphs\buggy\bug_8.c:3
- tests\graphs\buggy\bug_8.c:4
- tests\graphs\buggy\bug_9.c:3
- tests\graphs\buggy\bug_9.c:4
- ...(其余 16 条省略)

[2025-09-11T11:33:57.426Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=4, TP=0, FP=4, FN=0
误报 FP:
- tests\graphs\correct\graph.c:16 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:29 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:44 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:40 [Infinite loop] 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T11:42:05.040Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=368, 报告=354, TP=352, FP=2, FN=116
误报 FP:
- tests\graphs\buggy\graph.c:15 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\graph.c:29 [Infinite loop] 消息: 潜在死循环（for(;;)） 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
漏报 FN:
- tests\graphs\buggy\bug_0.c:3
- tests\graphs\buggy\bug_0.c:4
- tests\graphs\buggy\bug_1.c:3
- tests\graphs\buggy\bug_1.c:4
- tests\graphs\buggy\bug_10.c:3
- tests\graphs\buggy\bug_10.c:4
- tests\graphs\buggy\bug_11.c:3
- tests\graphs\buggy\bug_11.c:4
- tests\graphs\buggy\bug_12.c:3
- tests\graphs\buggy\bug_12.c:4
- tests\graphs\buggy\bug_13.c:3
- tests\graphs\buggy\bug_13.c:4
- tests\graphs\buggy\bug_14.c:3
- tests\graphs\buggy\bug_14.c:4
- tests\graphs\buggy\bug_15.c:3
- tests\graphs\buggy\bug_15.c:4
- tests\graphs\buggy\bug_16.c:3
- tests\graphs\buggy\bug_16.c:4
- tests\graphs\buggy\bug_17.c:3
- tests\graphs\buggy\bug_17.c:4
- tests\graphs\buggy\bug_18.c:3
- tests\graphs\buggy\bug_18.c:4
- tests\graphs\buggy\bug_19.c:3
- tests\graphs\buggy\bug_19.c:4
- tests\graphs\buggy\bug_2.c:3
- tests\graphs\buggy\bug_2.c:4
- tests\graphs\buggy\bug_20.c:3
- tests\graphs\buggy\bug_20.c:4
- tests\graphs\buggy\bug_21.c:3
- tests\graphs\buggy\bug_21.c:4
- tests\graphs\buggy\bug_22.c:3
- tests\graphs\buggy\bug_22.c:4
- tests\graphs\buggy\bug_23.c:3
- tests\graphs\buggy\bug_23.c:4
- tests\graphs\buggy\bug_24.c:3
- tests\graphs\buggy\bug_24.c:4
- tests\graphs\buggy\bug_25.c:3
- tests\graphs\buggy\bug_25.c:4
- tests\graphs\buggy\bug_26.c:3
- tests\graphs\buggy\bug_26.c:4
- tests\graphs\buggy\bug_27.c:3
- tests\graphs\buggy\bug_27.c:4
- tests\graphs\buggy\bug_28.c:3
- tests\graphs\buggy\bug_28.c:4
- tests\graphs\buggy\bug_29.c:3
- tests\graphs\buggy\bug_29.c:4
- tests\graphs\buggy\bug_3.c:3
- tests\graphs\buggy\bug_3.c:4
- tests\graphs\buggy\bug_30.c:3
- tests\graphs\buggy\bug_30.c:4
- tests\graphs\buggy\bug_31.c:3
- tests\graphs\buggy\bug_31.c:4
- tests\graphs\buggy\bug_32.c:3
- tests\graphs\buggy\bug_32.c:4
- tests\graphs\buggy\bug_33.c:3
- tests\graphs\buggy\bug_33.c:4
- tests\graphs\buggy\bug_34.c:3
- tests\graphs\buggy\bug_34.c:4
- tests\graphs\buggy\bug_35.c:3
- tests\graphs\buggy\bug_35.c:4
- tests\graphs\buggy\bug_36.c:3
- tests\graphs\buggy\bug_36.c:4
- tests\graphs\buggy\bug_37.c:3
- tests\graphs\buggy\bug_37.c:4
- tests\graphs\buggy\bug_38.c:3
- tests\graphs\buggy\bug_38.c:4
- tests\graphs\buggy\bug_39.c:3
- tests\graphs\buggy\bug_39.c:4
- tests\graphs\buggy\bug_4.c:3
- tests\graphs\buggy\bug_4.c:4
- tests\graphs\buggy\bug_40.c:3
- tests\graphs\buggy\bug_40.c:4
- tests\graphs\buggy\bug_41.c:3
- tests\graphs\buggy\bug_41.c:4
- tests\graphs\buggy\bug_42.c:3
- tests\graphs\buggy\bug_42.c:4
- tests\graphs\buggy\bug_43.c:3
- tests\graphs\buggy\bug_43.c:4
- tests\graphs\buggy\bug_44.c:3
- tests\graphs\buggy\bug_44.c:4
- tests\graphs\buggy\bug_45.c:3
- tests\graphs\buggy\bug_45.c:4
- tests\graphs\buggy\bug_46.c:3
- tests\graphs\buggy\bug_46.c:4
- tests\graphs\buggy\bug_47.c:3
- tests\graphs\buggy\bug_47.c:4
- tests\graphs\buggy\bug_48.c:3
- tests\graphs\buggy\bug_48.c:4
- tests\graphs\buggy\bug_49.c:3
- tests\graphs\buggy\bug_49.c:4
- tests\graphs\buggy\bug_5.c:3
- tests\graphs\buggy\bug_5.c:4
- tests\graphs\buggy\bug_6.c:3
- tests\graphs\buggy\bug_6.c:4
- tests\graphs\buggy\bug_7.c:3
- tests\graphs\buggy\bug_7.c:4
- tests\graphs\buggy\bug_8.c:3
- tests\graphs\buggy\bug_8.c:4
- tests\graphs\buggy\bug_9.c:3
- tests\graphs\buggy\bug_9.c:4
- ...(其余 16 条省略)

[2025-09-11T11:42:05.680Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=4, TP=0, FP=4, FN=0
误报 FP:
- tests\graphs\correct\graph.c:16 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:29 [Infinite loop] 消息: 循环条件变量 pp 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T11:51:56.556Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=368, 报告=354, TP=352, FP=2, FN=116
误报 FP:
- tests\graphs\buggy\graph.c:15 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\graph.c:29 [Infinite loop] 消息: 潜在死循环（for(;;)） 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
漏报 FN:
- tests\graphs\buggy\bug_0.c:3
- tests\graphs\buggy\bug_0.c:4
- tests\graphs\buggy\bug_1.c:3
- tests\graphs\buggy\bug_1.c:4
- tests\graphs\buggy\bug_10.c:3
- tests\graphs\buggy\bug_10.c:4
- tests\graphs\buggy\bug_11.c:3
- tests\graphs\buggy\bug_11.c:4
- tests\graphs\buggy\bug_12.c:3
- tests\graphs\buggy\bug_12.c:4
- tests\graphs\buggy\bug_13.c:3
- tests\graphs\buggy\bug_13.c:4
- tests\graphs\buggy\bug_14.c:3
- tests\graphs\buggy\bug_14.c:4
- tests\graphs\buggy\bug_15.c:3
- tests\graphs\buggy\bug_15.c:4
- tests\graphs\buggy\bug_16.c:3
- tests\graphs\buggy\bug_16.c:4
- tests\graphs\buggy\bug_17.c:3
- tests\graphs\buggy\bug_17.c:4
- tests\graphs\buggy\bug_18.c:3
- tests\graphs\buggy\bug_18.c:4
- tests\graphs\buggy\bug_19.c:3
- tests\graphs\buggy\bug_19.c:4
- tests\graphs\buggy\bug_2.c:3
- tests\graphs\buggy\bug_2.c:4
- tests\graphs\buggy\bug_20.c:3
- tests\graphs\buggy\bug_20.c:4
- tests\graphs\buggy\bug_21.c:3
- tests\graphs\buggy\bug_21.c:4
- tests\graphs\buggy\bug_22.c:3
- tests\graphs\buggy\bug_22.c:4
- tests\graphs\buggy\bug_23.c:3
- tests\graphs\buggy\bug_23.c:4
- tests\graphs\buggy\bug_24.c:3
- tests\graphs\buggy\bug_24.c:4
- tests\graphs\buggy\bug_25.c:3
- tests\graphs\buggy\bug_25.c:4
- tests\graphs\buggy\bug_26.c:3
- tests\graphs\buggy\bug_26.c:4
- tests\graphs\buggy\bug_27.c:3
- tests\graphs\buggy\bug_27.c:4
- tests\graphs\buggy\bug_28.c:3
- tests\graphs\buggy\bug_28.c:4
- tests\graphs\buggy\bug_29.c:3
- tests\graphs\buggy\bug_29.c:4
- tests\graphs\buggy\bug_3.c:3
- tests\graphs\buggy\bug_3.c:4
- tests\graphs\buggy\bug_30.c:3
- tests\graphs\buggy\bug_30.c:4
- tests\graphs\buggy\bug_31.c:3
- tests\graphs\buggy\bug_31.c:4
- tests\graphs\buggy\bug_32.c:3
- tests\graphs\buggy\bug_32.c:4
- tests\graphs\buggy\bug_33.c:3
- tests\graphs\buggy\bug_33.c:4
- tests\graphs\buggy\bug_34.c:3
- tests\graphs\buggy\bug_34.c:4
- tests\graphs\buggy\bug_35.c:3
- tests\graphs\buggy\bug_35.c:4
- tests\graphs\buggy\bug_36.c:3
- tests\graphs\buggy\bug_36.c:4
- tests\graphs\buggy\bug_37.c:3
- tests\graphs\buggy\bug_37.c:4
- tests\graphs\buggy\bug_38.c:3
- tests\graphs\buggy\bug_38.c:4
- tests\graphs\buggy\bug_39.c:3
- tests\graphs\buggy\bug_39.c:4
- tests\graphs\buggy\bug_4.c:3
- tests\graphs\buggy\bug_4.c:4
- tests\graphs\buggy\bug_40.c:3
- tests\graphs\buggy\bug_40.c:4
- tests\graphs\buggy\bug_41.c:3
- tests\graphs\buggy\bug_41.c:4
- tests\graphs\buggy\bug_42.c:3
- tests\graphs\buggy\bug_42.c:4
- tests\graphs\buggy\bug_43.c:3
- tests\graphs\buggy\bug_43.c:4
- tests\graphs\buggy\bug_44.c:3
- tests\graphs\buggy\bug_44.c:4
- tests\graphs\buggy\bug_45.c:3
- tests\graphs\buggy\bug_45.c:4
- tests\graphs\buggy\bug_46.c:3
- tests\graphs\buggy\bug_46.c:4
- tests\graphs\buggy\bug_47.c:3
- tests\graphs\buggy\bug_47.c:4
- tests\graphs\buggy\bug_48.c:3
- tests\graphs\buggy\bug_48.c:4
- tests\graphs\buggy\bug_49.c:3
- tests\graphs\buggy\bug_49.c:4
- tests\graphs\buggy\bug_5.c:3
- tests\graphs\buggy\bug_5.c:4
- tests\graphs\buggy\bug_6.c:3
- tests\graphs\buggy\bug_6.c:4
- tests\graphs\buggy\bug_7.c:3
- tests\graphs\buggy\bug_7.c:4
- tests\graphs\buggy\bug_8.c:3
- tests\graphs\buggy\bug_8.c:4
- tests\graphs\buggy\bug_9.c:3
- tests\graphs\buggy\bug_9.c:4
- ...(其余 16 条省略)

[2025-09-11T11:51:57.173Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=4, TP=0, FP=4, FN=0
误报 FP:
- tests\graphs\correct\graph.c:16 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:29 [Infinite loop] 消息: 循环条件变量 pp 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T11:56:35.876Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=368, 报告=354, TP=352, FP=2, FN=116
误报 FP:
- tests\graphs\buggy\graph.c:15 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\graph.c:29 [Infinite loop] 消息: 潜在死循环（for(;;)） 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
漏报 FN:
- tests\graphs\buggy\bug_0.c:3
- tests\graphs\buggy\bug_0.c:4
- tests\graphs\buggy\bug_1.c:3
- tests\graphs\buggy\bug_1.c:4
- tests\graphs\buggy\bug_10.c:3
- tests\graphs\buggy\bug_10.c:4
- tests\graphs\buggy\bug_11.c:3
- tests\graphs\buggy\bug_11.c:4
- tests\graphs\buggy\bug_12.c:3
- tests\graphs\buggy\bug_12.c:4
- tests\graphs\buggy\bug_13.c:3
- tests\graphs\buggy\bug_13.c:4
- tests\graphs\buggy\bug_14.c:3
- tests\graphs\buggy\bug_14.c:4
- tests\graphs\buggy\bug_15.c:3
- tests\graphs\buggy\bug_15.c:4
- tests\graphs\buggy\bug_16.c:3
- tests\graphs\buggy\bug_16.c:4
- tests\graphs\buggy\bug_17.c:3
- tests\graphs\buggy\bug_17.c:4
- tests\graphs\buggy\bug_18.c:3
- tests\graphs\buggy\bug_18.c:4
- tests\graphs\buggy\bug_19.c:3
- tests\graphs\buggy\bug_19.c:4
- tests\graphs\buggy\bug_2.c:3
- tests\graphs\buggy\bug_2.c:4
- tests\graphs\buggy\bug_20.c:3
- tests\graphs\buggy\bug_20.c:4
- tests\graphs\buggy\bug_21.c:3
- tests\graphs\buggy\bug_21.c:4
- tests\graphs\buggy\bug_22.c:3
- tests\graphs\buggy\bug_22.c:4
- tests\graphs\buggy\bug_23.c:3
- tests\graphs\buggy\bug_23.c:4
- tests\graphs\buggy\bug_24.c:3
- tests\graphs\buggy\bug_24.c:4
- tests\graphs\buggy\bug_25.c:3
- tests\graphs\buggy\bug_25.c:4
- tests\graphs\buggy\bug_26.c:3
- tests\graphs\buggy\bug_26.c:4
- tests\graphs\buggy\bug_27.c:3
- tests\graphs\buggy\bug_27.c:4
- tests\graphs\buggy\bug_28.c:3
- tests\graphs\buggy\bug_28.c:4
- tests\graphs\buggy\bug_29.c:3
- tests\graphs\buggy\bug_29.c:4
- tests\graphs\buggy\bug_3.c:3
- tests\graphs\buggy\bug_3.c:4
- tests\graphs\buggy\bug_30.c:3
- tests\graphs\buggy\bug_30.c:4
- tests\graphs\buggy\bug_31.c:3
- tests\graphs\buggy\bug_31.c:4
- tests\graphs\buggy\bug_32.c:3
- tests\graphs\buggy\bug_32.c:4
- tests\graphs\buggy\bug_33.c:3
- tests\graphs\buggy\bug_33.c:4
- tests\graphs\buggy\bug_34.c:3
- tests\graphs\buggy\bug_34.c:4
- tests\graphs\buggy\bug_35.c:3
- tests\graphs\buggy\bug_35.c:4
- tests\graphs\buggy\bug_36.c:3
- tests\graphs\buggy\bug_36.c:4
- tests\graphs\buggy\bug_37.c:3
- tests\graphs\buggy\bug_37.c:4
- tests\graphs\buggy\bug_38.c:3
- tests\graphs\buggy\bug_38.c:4
- tests\graphs\buggy\bug_39.c:3
- tests\graphs\buggy\bug_39.c:4
- tests\graphs\buggy\bug_4.c:3
- tests\graphs\buggy\bug_4.c:4
- tests\graphs\buggy\bug_40.c:3
- tests\graphs\buggy\bug_40.c:4
- tests\graphs\buggy\bug_41.c:3
- tests\graphs\buggy\bug_41.c:4
- tests\graphs\buggy\bug_42.c:3
- tests\graphs\buggy\bug_42.c:4
- tests\graphs\buggy\bug_43.c:3
- tests\graphs\buggy\bug_43.c:4
- tests\graphs\buggy\bug_44.c:3
- tests\graphs\buggy\bug_44.c:4
- tests\graphs\buggy\bug_45.c:3
- tests\graphs\buggy\bug_45.c:4
- tests\graphs\buggy\bug_46.c:3
- tests\graphs\buggy\bug_46.c:4
- tests\graphs\buggy\bug_47.c:3
- tests\graphs\buggy\bug_47.c:4
- tests\graphs\buggy\bug_48.c:3
- tests\graphs\buggy\bug_48.c:4
- tests\graphs\buggy\bug_49.c:3
- tests\graphs\buggy\bug_49.c:4
- tests\graphs\buggy\bug_5.c:3
- tests\graphs\buggy\bug_5.c:4
- tests\graphs\buggy\bug_6.c:3
- tests\graphs\buggy\bug_6.c:4
- tests\graphs\buggy\bug_7.c:3
- tests\graphs\buggy\bug_7.c:4
- tests\graphs\buggy\bug_8.c:3
- tests\graphs\buggy\bug_8.c:4
- tests\graphs\buggy\bug_9.c:3
- tests\graphs\buggy\bug_9.c:4
- ...(其余 16 条省略)

[2025-09-11T11:56:36.487Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=4, TP=0, FP=4, FN=0
误报 FP:
- tests\graphs\correct\graph.c:16 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:29 [Infinite loop] 消息: 循环条件变量 pp 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T12:02:00.869Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=368, 报告=356, TP=353, FP=3, FN=116
误报 FP:
- tests\graphs\buggy\graph.c:15 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\graph.c:29 [Infinite loop] 消息: 潜在死循环（for(;;)） 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\main.c:10 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
漏报 FN:
- tests\graphs\buggy\bug_0.c:3
- tests\graphs\buggy\bug_0.c:4
- tests\graphs\buggy\bug_1.c:3
- tests\graphs\buggy\bug_1.c:4
- tests\graphs\buggy\bug_10.c:3
- tests\graphs\buggy\bug_10.c:4
- tests\graphs\buggy\bug_11.c:3
- tests\graphs\buggy\bug_11.c:4
- tests\graphs\buggy\bug_12.c:3
- tests\graphs\buggy\bug_12.c:4
- tests\graphs\buggy\bug_13.c:3
- tests\graphs\buggy\bug_13.c:4
- tests\graphs\buggy\bug_14.c:3
- tests\graphs\buggy\bug_14.c:4
- tests\graphs\buggy\bug_15.c:3
- tests\graphs\buggy\bug_15.c:4
- tests\graphs\buggy\bug_16.c:3
- tests\graphs\buggy\bug_16.c:4
- tests\graphs\buggy\bug_17.c:3
- tests\graphs\buggy\bug_17.c:4
- tests\graphs\buggy\bug_18.c:3
- tests\graphs\buggy\bug_18.c:4
- tests\graphs\buggy\bug_19.c:3
- tests\graphs\buggy\bug_19.c:4
- tests\graphs\buggy\bug_2.c:3
- tests\graphs\buggy\bug_2.c:4
- tests\graphs\buggy\bug_20.c:3
- tests\graphs\buggy\bug_20.c:4
- tests\graphs\buggy\bug_21.c:3
- tests\graphs\buggy\bug_21.c:4
- tests\graphs\buggy\bug_22.c:3
- tests\graphs\buggy\bug_22.c:4
- tests\graphs\buggy\bug_23.c:3
- tests\graphs\buggy\bug_23.c:4
- tests\graphs\buggy\bug_24.c:3
- tests\graphs\buggy\bug_24.c:4
- tests\graphs\buggy\bug_25.c:3
- tests\graphs\buggy\bug_25.c:4
- tests\graphs\buggy\bug_26.c:3
- tests\graphs\buggy\bug_26.c:4
- tests\graphs\buggy\bug_27.c:3
- tests\graphs\buggy\bug_27.c:4
- tests\graphs\buggy\bug_28.c:3
- tests\graphs\buggy\bug_28.c:4
- tests\graphs\buggy\bug_29.c:3
- tests\graphs\buggy\bug_29.c:4
- tests\graphs\buggy\bug_3.c:3
- tests\graphs\buggy\bug_3.c:4
- tests\graphs\buggy\bug_30.c:3
- tests\graphs\buggy\bug_30.c:4
- tests\graphs\buggy\bug_31.c:3
- tests\graphs\buggy\bug_31.c:4
- tests\graphs\buggy\bug_32.c:3
- tests\graphs\buggy\bug_32.c:4
- tests\graphs\buggy\bug_33.c:3
- tests\graphs\buggy\bug_33.c:4
- tests\graphs\buggy\bug_34.c:3
- tests\graphs\buggy\bug_34.c:4
- tests\graphs\buggy\bug_35.c:3
- tests\graphs\buggy\bug_35.c:4
- tests\graphs\buggy\bug_36.c:3
- tests\graphs\buggy\bug_36.c:4
- tests\graphs\buggy\bug_37.c:3
- tests\graphs\buggy\bug_37.c:4
- tests\graphs\buggy\bug_38.c:3
- tests\graphs\buggy\bug_38.c:4
- tests\graphs\buggy\bug_39.c:3
- tests\graphs\buggy\bug_39.c:4
- tests\graphs\buggy\bug_4.c:3
- tests\graphs\buggy\bug_4.c:4
- tests\graphs\buggy\bug_40.c:3
- tests\graphs\buggy\bug_40.c:4
- tests\graphs\buggy\bug_41.c:3
- tests\graphs\buggy\bug_41.c:4
- tests\graphs\buggy\bug_42.c:3
- tests\graphs\buggy\bug_42.c:4
- tests\graphs\buggy\bug_43.c:3
- tests\graphs\buggy\bug_43.c:4
- tests\graphs\buggy\bug_44.c:3
- tests\graphs\buggy\bug_44.c:4
- tests\graphs\buggy\bug_45.c:3
- tests\graphs\buggy\bug_45.c:4
- tests\graphs\buggy\bug_46.c:3
- tests\graphs\buggy\bug_46.c:4
- tests\graphs\buggy\bug_47.c:3
- tests\graphs\buggy\bug_47.c:4
- tests\graphs\buggy\bug_48.c:3
- tests\graphs\buggy\bug_48.c:4
- tests\graphs\buggy\bug_49.c:3
- tests\graphs\buggy\bug_49.c:4
- tests\graphs\buggy\bug_5.c:3
- tests\graphs\buggy\bug_5.c:4
- tests\graphs\buggy\bug_6.c:3
- tests\graphs\buggy\bug_6.c:4
- tests\graphs\buggy\bug_7.c:3
- tests\graphs\buggy\bug_7.c:4
- tests\graphs\buggy\bug_8.c:3
- tests\graphs\buggy\bug_8.c:4
- tests\graphs\buggy\bug_9.c:3
- tests\graphs\buggy\bug_9.c:4
- ...(其余 16 条省略)

[2025-09-11T12:02:01.496Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=9, TP=0, FP=9, FN=0
误报 FP:
- tests\graphs\correct\graph.c:16 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:29 [Infinite loop] 消息: 循环条件变量 pp 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:15 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:16 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:18 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:19 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:36 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T12:15:11.513Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=317, 报告=356, TP=353, FP=3, FN=65
误报 FP:
- tests\graphs\buggy\graph.c:15 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\graph.c:29 [Infinite loop] 消息: 潜在死循环（for(;;)） 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\main.c:10 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
漏报 FN:
- tests\graphs\buggy\bug_0.c:4
- tests\graphs\buggy\bug_1.c:4
- tests\graphs\buggy\bug_10.c:4
- tests\graphs\buggy\bug_11.c:4
- tests\graphs\buggy\bug_12.c:4
- tests\graphs\buggy\bug_13.c:4
- tests\graphs\buggy\bug_14.c:4
- tests\graphs\buggy\bug_15.c:4
- tests\graphs\buggy\bug_16.c:4
- tests\graphs\buggy\bug_17.c:4
- tests\graphs\buggy\bug_18.c:4
- tests\graphs\buggy\bug_19.c:4
- tests\graphs\buggy\bug_2.c:4
- tests\graphs\buggy\bug_20.c:4
- tests\graphs\buggy\bug_21.c:4
- tests\graphs\buggy\bug_22.c:4
- tests\graphs\buggy\bug_23.c:4
- tests\graphs\buggy\bug_24.c:4
- tests\graphs\buggy\bug_25.c:4
- tests\graphs\buggy\bug_26.c:4
- tests\graphs\buggy\bug_27.c:4
- tests\graphs\buggy\bug_28.c:4
- tests\graphs\buggy\bug_29.c:4
- tests\graphs\buggy\bug_3.c:4
- tests\graphs\buggy\bug_30.c:4
- tests\graphs\buggy\bug_31.c:4
- tests\graphs\buggy\bug_32.c:4
- tests\graphs\buggy\bug_33.c:4
- tests\graphs\buggy\bug_34.c:4
- tests\graphs\buggy\bug_35.c:4
- tests\graphs\buggy\bug_36.c:4
- tests\graphs\buggy\bug_37.c:4
- tests\graphs\buggy\bug_38.c:4
- tests\graphs\buggy\bug_39.c:4
- tests\graphs\buggy\bug_4.c:4
- tests\graphs\buggy\bug_40.c:4
- tests\graphs\buggy\bug_41.c:4
- tests\graphs\buggy\bug_42.c:4
- tests\graphs\buggy\bug_43.c:4
- tests\graphs\buggy\bug_44.c:4
- tests\graphs\buggy\bug_45.c:4
- tests\graphs\buggy\bug_46.c:4
- tests\graphs\buggy\bug_47.c:4
- tests\graphs\buggy\bug_48.c:4
- tests\graphs\buggy\bug_49.c:4
- tests\graphs\buggy\bug_5.c:4
- tests\graphs\buggy\bug_6.c:4
- tests\graphs\buggy\bug_7.c:4
- tests\graphs\buggy\bug_8.c:4
- tests\graphs\buggy\bug_9.c:4
- tests\graphs\buggy\graph.c:6
- tests\graphs\buggy\graph.c:7
- tests\graphs\buggy\graph.c:8
- tests\graphs\buggy\graph.c:9
- tests\graphs\buggy\graph.c:18
- tests\graphs\buggy\graph.c:22
- tests\graphs\buggy\graph.c:23
- tests\graphs\buggy\graph.c:28
- tests\graphs\buggy\graph.c:43
- tests\graphs\buggy\graph.c:51
- tests\graphs\buggy\graph.c:53
- tests\graphs\buggy\main.c:5
- tests\graphs\buggy\main.c:6
- tests\graphs\buggy\main.c:7
- tests\graphs\buggy\main.c:13

[2025-09-11T12:15:12.093Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=9, TP=0, FP=9, FN=0
误报 FP:
- tests\graphs\correct\graph.c:16 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:29 [Infinite loop] 消息: 循环条件变量 pp 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:15 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:16 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:18 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:19 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:36 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T12:18:49.094Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=9, TP=0, FP=9, FN=0
误报 FP:
- tests\graphs\correct\graph.c:16 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:29 [Infinite loop] 消息: 循环条件变量 pp 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:15 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:16 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:18 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:19 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:36 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T12:18:49.768Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=317, 报告=356, TP=353, FP=3, FN=65
误报 FP:
- tests\graphs\buggy\graph.c:15 [Infinite loop] 消息: 循环条件变量 e 可能未更新 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\graph.c:29 [Infinite loop] 消息: 潜在死循环（for(;;)） 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\main.c:10 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
漏报 FN:
- tests\graphs\buggy\bug_0.c:4
- tests\graphs\buggy\bug_1.c:4
- tests\graphs\buggy\bug_10.c:4
- tests\graphs\buggy\bug_11.c:4
- tests\graphs\buggy\bug_12.c:4
- tests\graphs\buggy\bug_13.c:4
- tests\graphs\buggy\bug_14.c:4
- tests\graphs\buggy\bug_15.c:4
- tests\graphs\buggy\bug_16.c:4
- tests\graphs\buggy\bug_17.c:4
- tests\graphs\buggy\bug_18.c:4
- tests\graphs\buggy\bug_19.c:4
- tests\graphs\buggy\bug_2.c:4
- tests\graphs\buggy\bug_20.c:4
- tests\graphs\buggy\bug_21.c:4
- tests\graphs\buggy\bug_22.c:4
- tests\graphs\buggy\bug_23.c:4
- tests\graphs\buggy\bug_24.c:4
- tests\graphs\buggy\bug_25.c:4
- tests\graphs\buggy\bug_26.c:4
- tests\graphs\buggy\bug_27.c:4
- tests\graphs\buggy\bug_28.c:4
- tests\graphs\buggy\bug_29.c:4
- tests\graphs\buggy\bug_3.c:4
- tests\graphs\buggy\bug_30.c:4
- tests\graphs\buggy\bug_31.c:4
- tests\graphs\buggy\bug_32.c:4
- tests\graphs\buggy\bug_33.c:4
- tests\graphs\buggy\bug_34.c:4
- tests\graphs\buggy\bug_35.c:4
- tests\graphs\buggy\bug_36.c:4
- tests\graphs\buggy\bug_37.c:4
- tests\graphs\buggy\bug_38.c:4
- tests\graphs\buggy\bug_39.c:4
- tests\graphs\buggy\bug_4.c:4
- tests\graphs\buggy\bug_40.c:4
- tests\graphs\buggy\bug_41.c:4
- tests\graphs\buggy\bug_42.c:4
- tests\graphs\buggy\bug_43.c:4
- tests\graphs\buggy\bug_44.c:4
- tests\graphs\buggy\bug_45.c:4
- tests\graphs\buggy\bug_46.c:4
- tests\graphs\buggy\bug_47.c:4
- tests\graphs\buggy\bug_48.c:4
- tests\graphs\buggy\bug_49.c:4
- tests\graphs\buggy\bug_5.c:4
- tests\graphs\buggy\bug_6.c:4
- tests\graphs\buggy\bug_7.c:4
- tests\graphs\buggy\bug_8.c:4
- tests\graphs\buggy\bug_9.c:4
- tests\graphs\buggy\graph.c:6
- tests\graphs\buggy\graph.c:7
- tests\graphs\buggy\graph.c:8
- tests\graphs\buggy\graph.c:9
- tests\graphs\buggy\graph.c:18
- tests\graphs\buggy\graph.c:22
- tests\graphs\buggy\graph.c:23
- tests\graphs\buggy\graph.c:28
- tests\graphs\buggy\graph.c:43
- tests\graphs\buggy\graph.c:51
- tests\graphs\buggy\graph.c:53
- tests\graphs\buggy\main.c:5
- tests\graphs\buggy\main.c:6
- tests\graphs\buggy\main.c:7
- tests\graphs\buggy\main.c:13

[2025-09-11T12:23:43.354Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=7, TP=0, FP=7, FN=0
误报 FP:
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:15 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:16 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:18 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:19 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:36 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T12:23:43.965Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=317, 报告=355, TP=353, FP=2, FN=65
误报 FP:
- tests\graphs\buggy\graph.c:29 [Infinite loop] 消息: 潜在死循环（for(;;)） 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\main.c:10 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
漏报 FN:
- tests\graphs\buggy\bug_0.c:4
- tests\graphs\buggy\bug_1.c:4
- tests\graphs\buggy\bug_10.c:4
- tests\graphs\buggy\bug_11.c:4
- tests\graphs\buggy\bug_12.c:4
- tests\graphs\buggy\bug_13.c:4
- tests\graphs\buggy\bug_14.c:4
- tests\graphs\buggy\bug_15.c:4
- tests\graphs\buggy\bug_16.c:4
- tests\graphs\buggy\bug_17.c:4
- tests\graphs\buggy\bug_18.c:4
- tests\graphs\buggy\bug_19.c:4
- tests\graphs\buggy\bug_2.c:4
- tests\graphs\buggy\bug_20.c:4
- tests\graphs\buggy\bug_21.c:4
- tests\graphs\buggy\bug_22.c:4
- tests\graphs\buggy\bug_23.c:4
- tests\graphs\buggy\bug_24.c:4
- tests\graphs\buggy\bug_25.c:4
- tests\graphs\buggy\bug_26.c:4
- tests\graphs\buggy\bug_27.c:4
- tests\graphs\buggy\bug_28.c:4
- tests\graphs\buggy\bug_29.c:4
- tests\graphs\buggy\bug_3.c:4
- tests\graphs\buggy\bug_30.c:4
- tests\graphs\buggy\bug_31.c:4
- tests\graphs\buggy\bug_32.c:4
- tests\graphs\buggy\bug_33.c:4
- tests\graphs\buggy\bug_34.c:4
- tests\graphs\buggy\bug_35.c:4
- tests\graphs\buggy\bug_36.c:4
- tests\graphs\buggy\bug_37.c:4
- tests\graphs\buggy\bug_38.c:4
- tests\graphs\buggy\bug_39.c:4
- tests\graphs\buggy\bug_4.c:4
- tests\graphs\buggy\bug_40.c:4
- tests\graphs\buggy\bug_41.c:4
- tests\graphs\buggy\bug_42.c:4
- tests\graphs\buggy\bug_43.c:4
- tests\graphs\buggy\bug_44.c:4
- tests\graphs\buggy\bug_45.c:4
- tests\graphs\buggy\bug_46.c:4
- tests\graphs\buggy\bug_47.c:4
- tests\graphs\buggy\bug_48.c:4
- tests\graphs\buggy\bug_49.c:4
- tests\graphs\buggy\bug_5.c:4
- tests\graphs\buggy\bug_6.c:4
- tests\graphs\buggy\bug_7.c:4
- tests\graphs\buggy\bug_8.c:4
- tests\graphs\buggy\bug_9.c:4
- tests\graphs\buggy\graph.c:6
- tests\graphs\buggy\graph.c:7
- tests\graphs\buggy\graph.c:8
- tests\graphs\buggy\graph.c:9
- tests\graphs\buggy\graph.c:18
- tests\graphs\buggy\graph.c:22
- tests\graphs\buggy\graph.c:23
- tests\graphs\buggy\graph.c:28
- tests\graphs\buggy\graph.c:43
- tests\graphs\buggy\graph.c:51
- tests\graphs\buggy\graph.c:53
- tests\graphs\buggy\main.c:5
- tests\graphs\buggy\main.c:6
- tests\graphs\buggy\main.c:7
- tests\graphs\buggy\main.c:13

[2025-09-11T12:34:35.040Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=268, 报告=359, TP=356, FP=3, FN=13
误报 FP:
- tests\graphs\buggy\graph.c:24 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\graph.c:29 [Infinite loop] 消息: 潜在死循环（for(;;)） 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\main.c:10 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
漏报 FN:
- tests\graphs\buggy\bug_0.c:4
- tests\graphs\buggy\graph.c:6
- tests\graphs\buggy\graph.c:9
- tests\graphs\buggy\graph.c:18
- tests\graphs\buggy\graph.c:22
- tests\graphs\buggy\graph.c:28
- tests\graphs\buggy\graph.c:43
- tests\graphs\buggy\graph.c:51
- tests\graphs\buggy\graph.c:53
- tests\graphs\buggy\main.c:5
- tests\graphs\buggy\main.c:6
- tests\graphs\buggy\main.c:7
- tests\graphs\buggy\main.c:13

[2025-09-11T12:34:35.703Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=7, TP=0, FP=7, FN=0
误报 FP:
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:15 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:16 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:18 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:19 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:36 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T12:42:37.353Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=267, 报告=359, TP=356, FP=3, FN=12
误报 FP:
- tests\graphs\buggy\graph.c:24 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\graph.c:29 [Infinite loop] 消息: 潜在死循环（for(;;)） 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\main.c:10 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
漏报 FN:
- tests\graphs\buggy\graph.c:6
- tests\graphs\buggy\graph.c:9
- tests\graphs\buggy\graph.c:18
- tests\graphs\buggy\graph.c:22
- tests\graphs\buggy\graph.c:28
- tests\graphs\buggy\graph.c:43
- tests\graphs\buggy\graph.c:51
- tests\graphs\buggy\graph.c:53
- tests\graphs\buggy\main.c:5
- tests\graphs\buggy\main.c:6
- tests\graphs\buggy\main.c:7
- tests\graphs\buggy\main.c:13

[2025-09-11T12:42:37.919Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=7, TP=0, FP=7, FN=0
误报 FP:
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:15 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:16 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:18 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:19 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:36 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T12:45:44.310Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=7, TP=0, FP=7, FN=0
误报 FP:
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:15 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:16 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:18 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:19 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:36 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T12:45:44.959Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=267, 报告=359, TP=356, FP=3, FN=12
误报 FP:
- tests\graphs\buggy\graph.c:24 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\graph.c:29 [Infinite loop] 消息: 潜在死循环（for(;;)） 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\buggy\main.c:10 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
漏报 FN:
- tests\graphs\buggy\graph.c:6
- tests\graphs\buggy\graph.c:9
- tests\graphs\buggy\graph.c:18
- tests\graphs\buggy\graph.c:22
- tests\graphs\buggy\graph.c:28
- tests\graphs\buggy\graph.c:43
- tests\graphs\buggy\graph.c:51
- tests\graphs\buggy\graph.c:53
- tests\graphs\buggy\main.c:5
- tests\graphs\buggy\main.c:6
- tests\graphs\buggy\main.c:7
- tests\graphs\buggy\main.c:13

[2025-09-11T12:47:57.117Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=2, TP=0, FP=2, FN=0
误报 FP:
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T12:57:45.428Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=2, TP=0, FP=2, FN=0
误报 FP:
- tests\graphs\correct\graph.c:44 [Infinite loop] 消息: 循环条件变量 e 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
- tests\graphs\correct\main.c:40 [Infinite loop] 消息: 循环条件变量 i 未在更新段修改 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时

[2025-09-11T12:57:46.128Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=267, 报告=357, TP=355, FP=2, FN=12
误报 FP:
- tests\graphs\buggy\graph.c:24 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\graph.c:29 [Infinite loop] 消息: 潜在死循环（for(;;)） 建议: 确保条件变量在迭代中更新，或加入退出条件/break/超时
漏报 FN:
- tests\graphs\buggy\graph.c:6
- tests\graphs\buggy\graph.c:9
- tests\graphs\buggy\graph.c:18
- tests\graphs\buggy\graph.c:22
- tests\graphs\buggy\graph.c:28
- tests\graphs\buggy\graph.c:43
- tests\graphs\buggy\graph.c:51
- tests\graphs\buggy\graph.c:53
- tests\graphs\buggy\main.c:5
- tests\graphs\buggy\main.c:6
- tests\graphs\buggy\main.c:7
- tests\graphs\buggy\main.c:13

[2025-09-11T13:30:36.785Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=267, 报告=258, TP=256, FP=2, FN=11
误报 FP:
- tests\graphs\buggy\graph.c:24 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\main.c:10 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
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
- tests\graphs\buggy\main.c:13

[2025-09-11T13:30:41.387Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=5, TP=0, FP=5, FN=0
误报 FP:
- tests\graphs\correct\main.c:15 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:16 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:18 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:19 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:36 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用

[2025-09-11T13:38:40.428Z] 运行目标: tests\graphs\buggy
统计: 总预置错误=267, 报告=258, TP=256, FP=2, FN=11
误报 FP:
- tests\graphs\buggy\graph.c:24 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\buggy\main.c:10 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
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

[2025-09-11T13:38:47.628Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=5, TP=0, FP=5, FN=0
误报 FP:
- tests\graphs\correct\main.c:15 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:18 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:20 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:22 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:39 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用

[2025-09-11T13:55:57.189Z] 运行目标: tests\graphs\correct
统计: 总预置错误=0, 报告=5, TP=0, FP=5, FN=0
误报 FP:
- tests\graphs\correct\main.c:15 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:18 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:20 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用
- tests\graphs\correct\main.c:22 [Wild pointer] 消息: 潜在野指针解引用（指针未初始化） 建议: 为指针分配/指向有效内存或置 NULL 并在解引用前检查
- tests\graphs\correct\main.c:39 [Uninitialized] 消息: 变量使用前未初始化 建议: 在首次使用前显式赋值，或按址传递让被写入后再使用

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
