#include <stdio.h>
#include <stdlib.h>

// 测试数值范围检查功能
int main() {
    // 测试char类型范围溢出
    char c1 = 128;        // BUG: range overflow
    char c2 = -200;       // BUG: range overflow
    unsigned char uc = 300; // BUG: range overflow
    
    // 测试short类型范围溢出
    short s1 = 40000;     // BUG: range overflow
    short s2 = -40000;    // BUG: range overflow
    unsigned short us = 70000; // BUG: range overflow
    
    // 测试int类型范围溢出
    int i1 = 3000000000;  // BUG: range overflow
    int i2 = -3000000000; // BUG: range overflow
    unsigned int ui = 5000000000; // BUG: range overflow
    
    // 测试十六进制数值
    char c3 = 0x100;      // BUG: range overflow
    int i3 = 0xFFFFFFFF;  // BUG: range overflow
    
    // 测试八进制数值
    char c4 = 0400;       // BUG: range overflow
    short s3 = 0100000;   // BUG: range overflow
    
    // 测试正确的赋值（不应该报错）
    char c5 = 100;        // 正确：在char范围内
    char c6 = -100;       // 正确：在char范围内
    unsigned char uc2 = 200; // 正确：在unsigned char范围内
    short s4 = 1000;      // 正确：在short范围内
    int i4 = 1000000;     // 正确：在int范围内
    
    // 测试边界值
    char c7 = 127;        // 正确：char最大值
    char c8 = -128;       // 正确：char最小值
    unsigned char uc3 = 255; // 正确：unsigned char最大值
    unsigned char uc4 = 0;   // 正确：unsigned char最小值
    
    printf("Testing range overflow detection...\n");
    printf("c1=%d, c2=%d, uc=%d\n", c1, c2, uc);
    printf("s1=%d, s2=%d, us=%d\n", s1, s2, us);
    printf("i1=%d, i2=%d, ui=%u\n", i1, i2, ui);
    
    return 0;
}
