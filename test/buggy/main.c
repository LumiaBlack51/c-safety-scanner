#include <stdio.h>
#include "graph.h"

int main() {
    Graph* g = graph_create(5); // BUGs in create
    graph_add_edge(g, 0, 1, 2); // BUGs in add
    graph_remove_edge(g, 0, 1); // 死循环

    int dist[5];
    dijkstra(g, 0, dist);
    // while(true) without exit should still be flagged
    while (1) { int z = 0; z++; }
    printf("%d %d %d\n", dist[0], dist[1]); // BUG: 少参数

    return 0; // BUG: 内存泄漏未处理
}


