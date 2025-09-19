// 测试未来文件兼容性 - 包含现代 C 特性
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// 结构体定义
typedef struct {
    int id;
    char* name;
    double value;
} DataStruct;

// 函数指针类型
typedef int (*Comparator)(const void*, const void*);

// 内联函数
static inline int max(int a, int b) {
    return a > b ? a : b;
}

// 变长参数函数
int variadic_sum(int count, ...) {
    // 实现省略
    return 0;
}

// 复杂的数据结构操作
DataStruct* create_data(int id, const char* name, double value) {
    DataStruct* data = malloc(sizeof(DataStruct));
    if (!data) return NULL;
    
    data->id = id;
    data->name = malloc(strlen(name) + 1);
    if (!data->name) {
        free(data);
        return NULL;
    }
    strcpy(data->name, name);
    data->value = value;
    
    return data;
}

// 内存管理
void cleanup_data(DataStruct* data) {
    if (data) {
        free(data->name);
        free(data);
    }
}

// 数组操作
int process_array(int* arr, size_t size) {
    if (!arr || size == 0) return -1;
    
    for (size_t i = 0; i < size; i++) {
        arr[i] = arr[i] * 2;
    }
    
    return 0;
}

// 递归函数
int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// 宏定义
#define SAFE_FREE(ptr) do { \
    if (ptr) { \
        free(ptr); \
        ptr = NULL; \
    } \
} while(0)

int main() {
    printf("Testing future C compatibility\n");
    
    // 动态内存分配
    DataStruct* data = create_data(1, "test", 3.14);
    if (data) {
        printf("Created data: %d, %s, %.2f\n", data->id, data->name, data->value);
        cleanup_data(data);
    }
    
    // 数组操作
    int numbers[] = {1, 2, 3, 4, 5};
    process_array(numbers, sizeof(numbers) / sizeof(numbers[0]));
    
    // 递归调用
    printf("Fibonacci(10) = %d\n", fibonacci(10));
    
    return 0;
}
