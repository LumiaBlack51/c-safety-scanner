#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

// 正确代码示例3：高级但正确的实现
static int global_init = 0; // 正确初始化的全局变量

// 正确的数学函数使用
void test_math_functions() {
    double result = sqrt(16.0); // 正确包含math.h
    printf("Square root: %f\n", result);
    
    time_t now = time(NULL); // 正确包含time.h
    printf("Current time: %ld\n", now);
}

// 正确的复杂指针操作
void complex_pointer_operations() {
    int **double_ptr = malloc(sizeof(int*));
    int *single_ptr = malloc(sizeof(int));
    
    if (double_ptr != NULL && single_ptr != NULL) {
        *double_ptr = single_ptr;
        **double_ptr = 100;
        printf("Double pointer value: %d\n", **double_ptr);
        
        free(single_ptr);
        free(double_ptr);
    }
}

// 正确的复杂内存管理
void complex_memory_management() {
    char **string_array = malloc(10 * sizeof(char*));
    
    if (string_array != NULL) {
        for (int i = 0; i < 10; i++) {
            string_array[i] = malloc(20);
            if (string_array[i] != NULL) {
                sprintf(string_array[i], "String %d", i);
            }
        }
        
        // 正确释放所有内存
        for (int i = 0; i < 10; i++) {
            if (string_array[i] != NULL) {
                free(string_array[i]);
            }
        }
        free(string_array);
    }
}

// 正确的数值计算
void complex_numeric_operations() {
    char a = 50;
    char b = 30;
    char result = a + b; // 80，在char范围内
    
    unsigned char ua = 100;
    unsigned char ub = 50;
    unsigned char uresult = ua + ub; // 150，在unsigned char范围内
    
    printf("Results: %d, %d\n", result, uresult);
}

// 正确的复杂格式字符串
void complex_format_strings() {
    int num1 = 10, num2 = 20;
    char str[] = "test";
    double dbl = 3.14;
    
    printf("Numbers: %d %d, String: %s, Double: %f\n", num1, num2, str, dbl);
    
    FILE *file = fopen("test.txt", "w");
    if (file != NULL) {
        fprintf(file, "Data: %d %s %f\n", num1, str, dbl);
        fclose(file);
    }
}

// 正确的循环结构
void complex_loops() {
    // 正确的for循环
    for (int i = 0; i < 10; i++) {
        printf("Loop iteration %d\n", i);
    }
    
    // 正确的while循环
    int j = 0;
    while (j < 10) {
        printf("j = %d\n", j);
        j++; // 正确递增
    }
}

int main() {
    printf("Global init: %d\n", global_init);
    
    test_math_functions();
    complex_pointer_operations();
    complex_memory_management();
    complex_numeric_operations();
    complex_format_strings();
    complex_loops();
    
    return 0;
}
