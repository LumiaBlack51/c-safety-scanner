#include "graph.h"
#include <stdlib.h>
#include <string.h>

Graph* graph_create(int n) {
    Graph* g = (Graph*)malloc(sizeof(Graph));
    g->n = n;
    g->head = (Edge**)calloc((size_t)n, sizeof(Edge*));
    return g;
}

void graph_free(Graph* g) {
    if (!g) return;
    for (int i = 0; i < g->n; i++) {
        Edge* e = g->head[i];
        while (e) { Edge* nx = e->next; free(e); e = nx; }
    }
    free(g->head);
    free(g);
}

void graph_add_edge(Graph* g, int u, int v, int w) {
    Edge* e = (Edge*)malloc(sizeof(Edge));
    e->to = v; e->w = w; e->next = g->head[u]; g->head[u] = e;
}

void graph_remove_edge(Graph* g, int u, int v) {
    Edge** pp = &g->head[u];
    while (*pp) { if ((*pp)->to == v) { Edge* del = *pp; *pp = del->next; free(del); return; } pp = &(*pp)->next; }
}

void bfs(const Graph* g, int s, int* order, int* count) {
    int n = g->n; int* vis = (int*)calloc((size_t)n, sizeof(int));
    int* q = (int*)malloc(sizeof(int) * (size_t)n); int hh = 0, tt = 0;
    vis[s] = 1; q[tt++] = s; int k = 0;
    while (hh < tt) {
        int u = q[hh++]; order[k++] = u;
        for (Edge* e = g->head[u]; e; e = e->next) { if (!vis[e->to]) { vis[e->to] = 1; q[tt++] = e->to; } }
    }
    *count = k; free(vis); free(q);
}

static void dfs_d(const Graph* g, int u, int* vis, int* order, int* k) {
    vis[u] = 1; order[(*k)++] = u; for (Edge* e = g->head[u]; e; e = e->next) if (!vis[e->to]) dfs_d(g, e->to, vis, order, k);
}

void dfs(const Graph* g, int s, int* order, int* count) {
    int* vis = (int*)calloc((size_t)g->n, sizeof(int)); int k = 0; dfs_d(g, s, vis, order, &k); *count = k; free(vis);
}

int* topo_sort(const Graph* g, int* outCount) {
    int n = g->n; int* indeg = (int*)calloc((size_t)n, sizeof(int));
    for (int u = 0; u < n; u++) for (Edge* e = g->head[u]; e; e = e->next) indeg[e->to]++;
    int* q = (int*)malloc(sizeof(int) * (size_t)n); int hh=0, tt=0;
    for (int i=0;i<n;i++) if (indeg[i]==0) q[tt++] = i;
    int* order = (int*)malloc(sizeof(int)*(size_t)n); int k=0;
    while (hh<tt) { int u=q[hh++]; order[k++]=u; for(Edge* e=g->head[u]; e; e=e->next){ if(--indeg[e->to]==0) q[tt++]=e->to; } }
    free(indeg); free(q); *outCount = k; return order;
}

void dijkstra(const Graph* g, int s, int* dist) {
    const int INF = 1e9; int n=g->n; int* vis=(int*)calloc((size_t)n,sizeof(int));
    for(int i=0;i<n;i++) dist[i]=INF; dist[s]=0;
    for(int it=0; it<n; it++){
        int u=-1; for(int i=0;i<n;i++) if(!vis[i] && (u==-1 || dist[i]<dist[u])) u=i;
        if(u==-1 || dist[u]==INF) break; vis[u]=1;
        for(Edge* e=g->head[u]; e; e=e->next){ if(dist[e->to] > dist[u]+e->w) dist[e->to] = dist[u]+e->w; }
    }
    free(vis);
}

void prim_mst(const Graph* g, int* parent) {
    const int INF = 1e9; int n=g->n; int* key=(int*)malloc(sizeof(int)*(size_t)n); int* inMST=(int*)calloc((size_t)n,sizeof(int));
    for(int i=0;i<n;i++){ key[i]=INF; parent[i]=-1; }
    key[0]=0;
    for(int cnt=0; cnt<n-1; cnt++){
        int u=-1; for(int i=0;i<n;i++) if(!inMST[i] && (u==-1 || key[i]<key[u])) u=i;
        inMST[u]=1;
        for(Edge* e=g->head[u]; e; e=e->next){ if(!inMST[e->to] && e->w < key[e->to]){ key[e->to]=e->w; parent[e->to]=u; } }
    }
    free(key); free(inMST);
}

void floyd(const Graph* g, int** dist) {
    int n=g->n; const int INF = 1e9;
    for(int i=0;i<n;i++) for(int j=0;j<n;j++) dist[i][j] = (i==j?0:INF);
    for(int u=0;u<n;u++) for(Edge* e=g->head[u]; e; e=e->next) if(e->w < dist[u][e->to]) dist[u][e->to]=e->w;
    for(int k=0;k<n;k++) for(int i=0;i<n;i++) for(int j=0;j<n;j++) if(dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
}


