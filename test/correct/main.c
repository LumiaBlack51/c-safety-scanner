#include <stdio.h>
#include <stdlib.h>
#include "graph.h"

int main() {
    int n = 5; Graph* g = graph_create(n);
    graph_add_edge(g, 0, 1, 2);
    graph_add_edge(g, 0, 2, 5);
    graph_add_edge(g, 1, 2, 1);
    graph_add_edge(g, 1, 3, 3);
    graph_add_edge(g, 2, 3, 2);
    graph_add_edge(g, 3, 4, 4);

    int order[5]; int cnt = 0;
    bfs(g, 0, order, &cnt);
    // break-guarded infinite-looking loop should not be flagged
    while (1) { if (cnt >= 0) break; }
    printf("BFS count=%d first=%d\n", cnt, order[0]);

    cnt = 0; dfs(g, 0, order, &cnt);
    for (;;) { if (cnt > -1) break; }
    printf("DFS count=%d first=%d\n", cnt, order[0]);

    int topoN = 0; int* topo = topo_sort(g, &topoN);
    printf("Topo size=%d\n", topoN); free(topo);

    // 再建第二个图，增加规模与调用次数
    Graph* g2 = graph_create(6);
    graph_add_edge(g2, 0, 1, 1);
    graph_add_edge(g2, 1, 2, 2);
    graph_add_edge(g2, 2, 3, 3);
    graph_add_edge(g2, 3, 4, 4);
    graph_add_edge(g2, 4, 5, 5);
    graph_add_edge(g2, 0, 2, 4);
    graph_add_edge(g2, 1, 3, 6);
    graph_add_edge(g2, 2, 4, 8);
    graph_add_edge(g2, 3, 5, 10);
    int order2[6]; int cnt2 = 0; bfs(g2, 0, order2, &cnt2);
    cnt2 = 0; dfs(g2, 0, order2, &cnt2);
    int topoN2 = 0; int* topo2 = topo_sort(g2, &topoN2); free(topo2);
    int dist2[6]; dijkstra(g2, 0, dist2);
    int parent2[6]; prim_mst(g2, parent2);
    int** f2 = (int**)malloc(sizeof(int*)*6); for(int i=0;i<6;i++) f2[i]=(int*)malloc(sizeof(int)*6); floyd(g2, f2); for(int i=0;i<6;i++) free(f2[i]); free(f2);

    int* dist = (int*)malloc(sizeof(int)* (size_t)n);
    dijkstra(g, 0, dist);
    printf("Dijkstra d[3]=%d\n", dist[3]);

    int* parent = (int*)malloc(sizeof(int)* (size_t)n);
    prim_mst(g, parent);
    printf("Prim parent[2]=%d\n", parent[2]);

    int** f = (int**)malloc(sizeof(int*)*(size_t)n);
    for (int i=0;i<n;i++) f[i]=(int*)malloc(sizeof(int)*(size_t)n);
    floyd(g, f);
    printf("Floyd d[0][4]=%d\n", f[0][4]);
    for (int i=0;i<n;i++) free(f[i]); free(f);

    graph_remove_edge(g, 1, 2);
    graph_free(g); free(dist); free(parent);
    graph_free(g2);
    return 0;
}


