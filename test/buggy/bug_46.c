#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// 测试内存泄漏检测功能

// 函数1: 有内存泄漏的函数
void test_memory_leak() {
    // 分配内存但未释放
    int *ptr1 = malloc(sizeof(int) * 10);
    char *str1 = malloc(100);
    double *arr1 = calloc(20, sizeof(double));
    
    // 使用内存
    ptr1[0] = 42;
    strcpy(str1, "Hello World");
    arr1[0] = 3.14;
    
    // BUG: memory leak - 忘记释放内存
    printf("ptr1[0] = %d\n", ptr1[0]);
    printf("str1 = %s\n", str1);
    printf("arr1[0] = %f\n", arr1[0]);
}

// 函数2: 正确释放内存的函数
void test_correct_free() {
    int *ptr2 = malloc(sizeof(int) * 5);
    char *str2 = malloc(50);
    
    if (ptr2 && str2) {
        ptr2[0] = 100;
        strcpy(str2, "Correct");
        
        printf("ptr2[0] = %d\n", ptr2[0]);
        printf("str2 = %s\n", str2);
        
        // 正确释放内存 - 不应该报错
        free(ptr2);
        free(str2);
    }
}

// 函数3: 部分内存泄漏
void test_partial_leak() {
    int *ptr3 = malloc(sizeof(int) * 3);
    char *str3 = malloc(30);
    float *arr3 = malloc(sizeof(float) * 5);
    
    if (ptr3) {
        ptr3[0] = 200;
        free(ptr3); // 正确释放
    }
    
    if (str3) {
        strcpy(str3, "Partial");
        // BUG: memory leak - 忘记释放str3
    }
    
    if (arr3) {
        arr3[0] = 2.5;
        free(arr3); // 正确释放
    }
}

// 函数4: 使用realloc的情况
void test_realloc_leak() {
    int *ptr4 = malloc(sizeof(int) * 10);
    if (ptr4) {
        ptr4[0] = 300;
        
        // 重新分配内存
        ptr4 = realloc(ptr4, sizeof(int) * 20);
        if (ptr4) {
            ptr4[10] = 400;
            // BUG: memory leak - 忘记释放realloc后的内存
        }
    }
}

// 函数5: 嵌套函数调用中的内存泄漏
void helper_function() {
    char *temp = malloc(20);
    if (temp) {
        strcpy(temp, "Helper");
        // BUG: memory leak - 在helper函数中分配但未释放
    }
}

void test_nested_leak() {
    int *ptr5 = malloc(sizeof(int) * 2);
    if (ptr5) {
        ptr5[0] = 500;
        free(ptr5); // 正确释放
        
        // 调用helper函数，其中有内存泄漏
        helper_function();
    }
}

// 函数6: 条件释放
void test_conditional_free() {
    int *ptr6 = malloc(sizeof(int) * 4);
    char *str6 = malloc(40);
    
    if (ptr6 && str6) {
        ptr6[0] = 600;
        strcpy(str6, "Conditional");
        
        // 只在某些条件下释放
        if (ptr6[0] > 500) {
            free(ptr6); // 正确释放
        }
        // BUG: memory leak - str6在某些条件下未释放
    }
}

int main() {
    printf("Testing memory leak detection...\n");
    
    test_memory_leak();
    test_correct_free();
    test_partial_leak();
    test_realloc_leak();
    test_nested_leak();
    test_conditional_free();
    
    return 0;
}
