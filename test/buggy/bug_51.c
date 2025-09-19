#include <stdio.h>
#include <stdlib.h>

// BUG: 野指针解引用测试
int main() {
    // 测试1: 基本野指针解引用
    int *ptr1; // BUG: wild pointer dereference
    *ptr1 = 42;
    
    // 测试2: 结构体指针野指针
    struct Point {
        int x;
        int y;
    };
    struct Point *p; // BUG: wild pointer dereference
    p->x = 10;
    p->y = 20;
    
    // 测试3: 数组指针野指针
    int *arr_ptr; // BUG: wild pointer dereference
    arr_ptr[0] = 100;
    arr_ptr[1] = 200;
    
    // 测试4: 字符串指针野指针
    char *str_ptr; // BUG: wild pointer dereference
    str_ptr[0] = 'A';
    str_ptr[1] = 'B';
    
    // 测试5: 双重指针野指针
    int **double_ptr; // BUG: wild pointer dereference
    **double_ptr = 999;
    
    // 测试6: 函数参数中的野指针
    void test_wild_param(int *param) {
        *param = 123; // BUG: wild pointer dereference
    }
    int *wild_param; // BUG: wild pointer dereference
    test_wild_param(wild_param);
    
    // 测试7: 循环中的野指针
    int *loop_ptr; // BUG: wild pointer dereference
    for (int i = 0; i < 5; i++) {
        loop_ptr[i] = i * 10; // BUG: wild pointer dereference
    }
    
    // 测试8: 条件语句中的野指针
    int *cond_ptr; // BUG: wild pointer dereference
    if (1) {
        *cond_ptr = 456; // BUG: wild pointer dereference
    }
    
    // 测试9: 嵌套结构体中的野指针
    struct Nested {
        int value;
        struct Point *point_ptr;
    };
    struct Nested *nested_ptr; // BUG: wild pointer dereference
    nested_ptr->point_ptr->x = 30; // BUG: wild pointer dereference
    
    // 测试10: 函数返回的野指针
    int* get_wild_pointer() {
        int *local_ptr; // BUG: wild pointer dereference
        return local_ptr; // BUG: wild pointer dereference
    }
    int *returned_ptr = get_wild_pointer();
    *returned_ptr = 789; // BUG: wild pointer dereference
    
    return 0;
}
