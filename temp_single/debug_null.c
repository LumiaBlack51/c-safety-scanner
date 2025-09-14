#include <stdio.h>

int main() {
    int *ptr = NULL;  // 初始化为NULL
    *ptr = 42;        // 应该检测到空指针解引用
    return 0;
}

