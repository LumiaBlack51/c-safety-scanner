# Graph Tests

本目录包含两组 C 示例：

- correct/：实现有向图与算法（Dijkstra、Prim、Floyd、DFS、BFS、拓扑排序、插入、删除），应无报警。
- buggy/：同样功能但植入典型错误（未初始化、野指针、死循环、printf/scanf 错误等），每处以 `// BUG:` 标注。

运行扫描：

```
npm run compile
node ./out/cli.js tests/graphs/correct
node ./out/cli.js tests/graphs/buggy
```

测试记录见 `TESTPLAN.md`。


