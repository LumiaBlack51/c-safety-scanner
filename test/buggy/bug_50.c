#include <stdio.h>
#include <stdbool.h>

int main() {
    // 测试 static 变量识别
    static int static_counter = 0;        // 应该识别为 static int，已初始化
    static bool static_flag;              // 应该识别为 static bool，未初始化
    static char *static_ptr;              // 应该识别为 static char*，未初始化指针
    
    // 测试 const 变量识别
    const int const_val = 42;             // 应该识别为 const int，已初始化
    const char *const_str = "hello";      // 应该识别为 const char*，已初始化
    
    // 测试 extern 变量识别
    extern int extern_var;                // 应该识别为 extern int，未初始化
    
    // 测试组合存储类说明符
    static const int static_const = 100;  // 应该识别为 static const int，已初始化
    
    // 使用测试 - 应该不会误报
    static_counter++;                     // 使用已初始化的 static 变量
    if (static_flag) {                    // 使用未初始化的 static 变量 - 应该报错
        printf("flag is true\n");
    }
    
    *static_ptr = 'a';                    // 解引用未初始化的 static 指针 - 应该报错
    
    printf("const_val = %d\n", const_val); // 使用已初始化的 const 变量
    printf("const_str = %s\n", const_str); // 使用已初始化的 const 指针
    
    extern_var = 10;                      // 使用 extern 变量 - 可能报错（取决于是否在其他文件定义）
    
    printf("static_const = %d\n", static_const); // 使用已初始化的 static const 变量
    
    return 0;
}
