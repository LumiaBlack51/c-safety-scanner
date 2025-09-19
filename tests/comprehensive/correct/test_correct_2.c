#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>

// 正确代码示例2：复杂但正确的实现
struct Node {
    int data;
    struct Node* next;
};

// 正确的结构体操作
struct Node* create_node(int value) {
    struct Node* node = malloc(sizeof(struct Node));
    if (node != NULL) {
        node->data = value;
        node->next = NULL;
    }
    return node;
}

// 正确的内存管理
char* get_string() {
    char* str = malloc(50);
    if (str != NULL) {
        strcpy(str, "Hello World");
    }
    return str;
}

// 正确的数值操作
void test_valid_numbers() {
    unsigned char uchar_val = 200; // 在unsigned char范围内
    short short_val = 1000; // 在short范围内
    unsigned short ushort_val = 50000; // 在unsigned short范围内
}

// 正确的格式字符串
void test_valid_formats() {
    int num = 42;
    char str[] = "test";
    double dbl = 3.14;
    
    printf("Number: %d, String: %s, Double: %f\n", num, str, dbl);
    
    char buffer[100];
    sprintf(buffer, "Value: %d %s", num, str);
    
    int input1, input2;
    scanf("%d %d", &input1, &input2);
}

// 正确的循环结构
void valid_processing() {
    int count = 0;
    while (count < 10) {
        printf("Processing %d\n", count++);
    }
}

int main() {
    struct Node* head = create_node(10);
    char* message = get_string();
    
    test_valid_numbers();
    test_valid_formats();
    valid_processing();
    
    // 清理内存
    if (head != NULL) {
        free(head);
    }
    if (message != NULL) {
        free(message);
    }
    
    return 0;
}
