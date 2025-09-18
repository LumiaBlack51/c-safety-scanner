// bug_43.c - 测试库函数头文件包含检查
// 这个文件故意包含一些缺少头文件包含的库函数调用

#include <stdio.h>
// 故意漏掉一些头文件

int main() {
    // 正确：printf 包含了 stdio.h
    printf("Hello, World!\n");
    
    // 错误：使用 malloc 但没有包含 stdlib.h
    int *ptr = malloc(sizeof(int) * 10);
    
    // 错误：使用 strlen 但没有包含 string.h
    char str[] = "test";
    int len = strlen(str);
    
    // 错误：使用 sqrt 但没有包含 math.h
    double result = sqrt(16.0);
    
    // 错误：使用内存拷贝函数但没有包含 string.h
    char dest[20];
    strcpy(dest, "hello");
    
    // 错误：使用字符判断函数但没有包含 ctype.h
    char c = 'A';
    if (isalpha(c)) {
        printf("Is alpha\n");
    }
    
    // 错误：使用 exit 但没有包含 stdlib.h
    exit(0);
}

// 第二个函数测试更多情况
void testMoreFunctions() {
    // 错误：时间函数但没有包含 time.h
    time_t now = time(NULL);
    
    // 错误：随机数函数但没有包含 stdlib.h
    int random = rand();
    srand(123);
    
    // 错误：字符串比较但没有包含 string.h
    char *s1 = "abc";
    char *s2 = "def";
    int cmp = strcmp(s1, s2);
    
    // 错误：内存分配但没有包含 stdlib.h
    void *mem = calloc(5, sizeof(int));
    free(mem); // 也需要 stdlib.h
}

// 测试格式化函数
void testFormatFunctions() {
    char buffer[100];
    
    // 错误：sprintf 需要 stdio.h（这里已经包含了，所以应该不报错）
    sprintf(buffer, "Number: %d", 42);
    
    // 错误：scanf 需要 stdio.h（已包含，不应报错）
    int num;
    scanf("%d", &num);
}

// 测试头文件拼写错误
// 注意：这些 include 应该在文件顶部，但为了测试放在这里注释
/*
#include <stdoi.h>  // 拼写错误：应该是 stdio.h
#include <stdllib.h> // 拼写错误：应该是 stdlib.h
#include <stirng.h>  // 拼写错误：应该是 string.h
#include <mth.h>     // 拼写错误：应该是 math.h
*/

// 测试自定义函数（不应该报错）
void myCustomFunction() {
    printf("This is a custom function\n");
}

// 测试使用但没有定义的函数（可能是用户定义的，不应该报库函数错误）
void callUndefinedFunction() {
    // 假设这是用户定义的函数，不在标准库中
    someUserFunction();
    
    // 但这个是标准库函数，应该报错
    int val = atoi("123"); // 需要 stdlib.h
}