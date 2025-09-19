#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// 综合测试用例1：多种错误类型混合
int main() {
    // BUG: Uninitialized - 未初始化变量
    int uninit_var;
    printf("Value: %d\n", uninit_var);
    
    // BUG: Wild pointer - 野指针解引用
    int *wild_ptr;
    *wild_ptr = 42;
    
    // BUG: Null pointer - 空指针解引用
    int *null_ptr = NULL;
    *null_ptr = 100;
    
    // BUG: Memory leak - 内存泄漏
    char *leaked_mem = malloc(100);
    // 没有对应的free()
    
    // BUG: Range overflow - 数值范围溢出
    char overflow_char = 300; // 超出char范围
    
    // BUG: Format - printf格式不匹配
    printf("Number: %d %s\n", 42); // 缺少第二个参数
    
    // BUG: Format - scanf缺少&
    int input;
    scanf("%d", input); // 缺少&符号
    
    // BUG: Dead loop - 死循环
    while(1) {
        printf("Infinite loop\n");
        // 没有break或return
    }
    
    return 0;
}
