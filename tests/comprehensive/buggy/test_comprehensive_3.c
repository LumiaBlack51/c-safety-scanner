#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// 综合测试用例3：高级错误模式
static int global_uninit; // BUG: Uninitialized - 全局未初始化变量

// BUG: Header - 使用未包含头文件的函数
void test_missing_headers() {
    // 使用math.h中的函数但未包含
    double result = sqrt(16.0); // BUG: Header - 缺少math.h
    
    // 使用time.h中的函数但未包含
    time_t now = time(NULL); // BUG: Header - 缺少time.h
}

// BUG: Wild pointer - 复杂的指针操作
void complex_pointer_operations() {
    int **double_ptr;
    int *single_ptr;
    
    // 双重解引用未初始化的指针
    **double_ptr = 100; // BUG: Wild pointer
    
    // 单指针解引用
    *single_ptr = 200; // BUG: Wild pointer
}

// BUG: Memory leak - 复杂的内存管理
void complex_memory_management() {
    char **string_array = malloc(10 * sizeof(char*));
    
    for (int i = 0; i < 10; i++) {
        string_array[i] = malloc(20);
        sprintf(string_array[i], "String %d", i);
    }
    
    // 只释放了数组本身，没有释放每个字符串
    free(string_array); // BUG: Memory leak - 内部字符串未释放
}

// BUG: Range overflow - 复杂的数值计算
void complex_numeric_operations() {
    char a = 100;
    char b = 200;
    char result = a + b; // BUG: Range overflow - 300超出char范围
    
    unsigned char ua = 150;
    unsigned char ub = 200;
    unsigned char uresult = ua + ub; // BUG: Range overflow - 350超出unsigned char范围
}

// BUG: Format - 复杂的格式字符串
void complex_format_strings() {
    int num1 = 10, num2 = 20;
    char str[] = "test";
    double dbl = 3.14;
    
    // 复杂的printf错误
    printf("Numbers: %d %d, String: %s, Double: %f\n", num1); // BUG: Format - 缺少参数
    
    // fprintf错误
    FILE *file = fopen("test.txt", "w");
    fprintf(file, "Data: %d %s %f\n", num1, str); // BUG: Format - 缺少dbl参数
    fclose(file);
}

// BUG: Dead loop - 复杂的循环结构
void complex_loops() {
    int i = 0;
    
    // for循环死循环
    for (;;) { // BUG: Dead loop
        printf("Loop iteration %d\n", i++);
        if (i > 1000) break; // 有break，但条件可能永远不满足
    }
    
    // while循环死循环
    int j = 0;
    while (j < 10) { // 看起来正常，但j永远不会改变
        printf("j = %d\n", j);
        // BUG: Dead loop - j没有递增
    }
}

int main() {
    printf("Global uninit: %d\n", global_uninit); // BUG: Uninitialized
    
    test_missing_headers();
    complex_pointer_operations();
    complex_memory_management();
    complex_numeric_operations();
    complex_format_strings();
    complex_loops();
    
    return 0;
}
