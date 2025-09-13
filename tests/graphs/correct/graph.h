#ifndef GRAPH_H
#define GRAPH_H

#include <stddef.h>

typedef struct Edge {
    int to;
    int w;
    struct Edge* next;
} Edge;

typedef struct Graph {
    int n;            // 节点个数
    Edge** head;      // 邻接表
} Graph;

Graph* graph_create(int n);
void graph_free(Graph* g);
void graph_add_edge(Graph* g, int u, int v, int w);
void graph_remove_edge(Graph* g, int u, int v);

// 算法
void bfs(const Graph* g, int s, int* order, int* count);
void dfs(const Graph* g, int s, int* order, int* count);
int* topo_sort(const Graph* g, int* outCount);
void dijkstra(const Graph* g, int s, int* dist);
void prim_mst(const Graph* g, int* parent);
void floyd(const Graph* g, int** dist);

#endif


