#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

// 正确代码示例1：良好的编程实践
int main() {
    // 正确初始化变量
    int init_var = 0;
    printf("Value: %d\n", init_var);
    
    // 正确的指针使用
    int *ptr = malloc(sizeof(int));
    if (ptr != NULL) {
        *ptr = 42;
        printf("Pointer value: %d\n", *ptr);
        free(ptr);
    }
    
    // 正确的数值范围
    char valid_char = 100; // 在char范围内
    
    // 正确的printf格式
    printf("Number: %d\n", 42);
    
    // 正确的scanf使用
    int input;
    scanf("%d", &input);
    
    // 正确的循环
    for (int i = 0; i < 10; i++) {
        printf("Iteration %d\n", i);
    }
    
    return 0;
}
