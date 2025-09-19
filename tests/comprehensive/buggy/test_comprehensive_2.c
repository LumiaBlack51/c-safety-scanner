#include <stdio.h>
#include <stdlib.h>

// 综合测试用例2：复杂的数据结构和函数调用
struct Node {
    int data;
    struct Node* next;
};

// BUG: Uninitialized - 未初始化的结构体指针
struct Node* create_node(int value) {
    struct Node* node; // 未初始化
    node->data = value; // 使用未初始化的指针
    node->next = NULL;
    return node;
}

// BUG: Memory leak - 内存泄漏
char* get_string() {
    char* str = malloc(50);
    strcpy(str, "Hello World");
    return str; // 返回但调用者可能忘记释放
}

// BUG: Range overflow - 多种类型溢出
void test_overflows() {
    unsigned char uchar_val = 300; // 超出unsigned char范围
    short short_val = 40000; // 超出short范围
    unsigned short ushort_val = 70000; // 超出unsigned short范围
}

// BUG: Format - 多种格式错误
void test_formats() {
    int num = 42;
    char str[] = "test";
    
    // printf参数不匹配
    printf("Number: %d %s %f\n", num); // 缺少str和float参数
    
    // sprintf参数不匹配
    char buffer[100];
    sprintf(buffer, "Value: %d %s", num); // 缺少str参数
    
    // scanf缺少&
    int input1, input2;
    scanf("%d %d", input1, input2); // 两个都缺少&
}

// BUG: Dead loop - 复杂的死循环
void infinite_processing() {
    int count = 0;
    while(1) {
        printf("Processing %d\n", count++);
        // 没有退出条件
    }
}

int main() {
    struct Node* head = create_node(10);
    char* message = get_string();
    
    test_overflows();
    test_formats();
    infinite_processing();
    
    return 0;
}
