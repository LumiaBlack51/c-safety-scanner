#include <stdio.h>
#include <stdlib.h>

// BUG: 赋值超出对应的类型范围测试
int main() {
    // 测试1: char类型范围溢出
    char c1 = 128;        // BUG: range overflow - char范围是-128到127
    char c2 = -200;       // BUG: range overflow - char范围是-128到127
    char c3 = 300;        // BUG: range overflow - char范围是-128到127
    char c4 = -300;       // BUG: range overflow - char范围是-128到127
    
    // 测试2: unsigned char类型范围溢出
    unsigned char uc1 = 300;  // BUG: range overflow - unsigned char范围是0到255
    unsigned char uc2 = -1;   // BUG: range overflow - unsigned char范围是0到255
    unsigned char uc3 = 500;  // BUG: range overflow - unsigned char范围是0到255
    
    // 测试3: short类型范围溢出
    short s1 = 40000;     // BUG: range overflow - short范围是-32768到32767
    short s2 = -40000;    // BUG: range overflow - short范围是-32768到32767
    short s3 = 50000;     // BUG: range overflow - short范围是-32768到32767
    short s4 = -50000;    // BUG: range overflow - short范围是-32768到32767
    
    // 测试4: unsigned short类型范围溢出
    unsigned short us1 = 70000;  // BUG: range overflow - unsigned short范围是0到65535
    unsigned short us2 = -1;     // BUG: range overflow - unsigned short范围是0到65535
    unsigned short us3 = 100000; // BUG: range overflow - unsigned short范围是0到65535
    
    // 测试5: int类型范围溢出
    int i1 = 3000000000;  // BUG: range overflow - int范围是-2147483648到2147483647
    int i2 = -3000000000; // BUG: range overflow - int范围是-2147483648到2147483647
    int i3 = 4000000000;  // BUG: range overflow - int范围是-2147483648到2147483647
    int i4 = -4000000000; // BUG: range overflow - int范围是-2147483648到2147483647
    
    // 测试6: unsigned int类型范围溢出
    unsigned int ui1 = 5000000000;  // BUG: range overflow - unsigned int范围是0到4294967295
    unsigned int ui2 = -1;         // BUG: range overflow - unsigned int范围是0到4294967295
    unsigned int ui3 = 6000000000; // BUG: range overflow - unsigned int范围是0到4294967295
    
    // 测试7: long类型范围溢出
    long l1 = 1000000000000000000L;  // BUG: range overflow - 可能超出long范围
    long l2 = -1000000000000000000L; // BUG: range overflow - 可能超出long范围
    
    // 测试8: unsigned long类型范围溢出
    unsigned long ul1 = -1;                    // BUG: range overflow - unsigned long不能为负
    unsigned long ul2 = 2000000000000000000UL; // BUG: range overflow - 可能超出unsigned long范围
    
    // 测试9: 十六进制数值范围溢出
    char c5 = 0x100;      // BUG: range overflow - 0x100 = 256，超出char范围
    char c6 = 0xFFF;      // BUG: range overflow - 0xFFF = 4095，超出char范围
    int i5 = 0xFFFFFFFF;  // BUG: range overflow - 0xFFFFFFFF = 4294967295，超出int范围
    short s5 = 0x10000;   // BUG: range overflow - 0x10000 = 65536，超出short范围
    
    // 测试10: 八进制数值范围溢出
    char c7 = 0400;       // BUG: range overflow - 0400 = 256，超出char范围
    char c8 = 0777;       // BUG: range overflow - 0777 = 511，超出char范围
    short s6 = 0100000;   // BUG: range overflow - 0100000 = 32768，超出short范围
    int i6 = 040000000000; // BUG: range overflow - 040000000000 = 4294967296，超出int范围
    
    // 测试11: 二进制数值范围溢出
    char c9 = 0b100000000;  // BUG: range overflow - 0b100000000 = 256，超出char范围
    short s7 = 0b10000000000000000; // BUG: range overflow - 超出short范围
    
    // 测试12: 浮点数范围溢出
    float f1 = 3.4e38f;     // BUG: range overflow - 超出float范围
    float f2 = -3.4e38f;    // BUG: range overflow - 超出float范围
    double d1 = 1.7e308;    // BUG: range overflow - 超出double范围
    double d2 = -1.7e308;   // BUG: range overflow - 超出double范围
    
    // 测试13: 变量赋值中的范围溢出
    int base = 100;
    char c10 = base + 200;  // BUG: range overflow - 300超出char范围
    short s8 = base * 500; // BUG: range overflow - 50000超出short范围
    
    // 测试14: 函数参数中的范围溢出
    void test_range_param(char param) {
        printf("param = %d\n", param);
    }
    test_range_param(300); // BUG: range overflow - 300超出char范围
    
    // 测试15: 数组索引中的范围溢出
    int arr[10];
    int index = 15;
    arr[index] = 100; // BUG: range overflow - 数组索引超出范围
    
    // 测试16: 循环中的范围溢出
    for (char i = 0; i < 200; i++) { // BUG: range overflow - 200超出char范围
        printf("i = %d\n", i);
    }
    
    // 测试17: 条件语句中的范围溢出
    char cond_var = 300; // BUG: range overflow - 300超出char范围
    if (cond_var > 100) {
        printf("cond_var is large\n");
    }
    
    // 测试18: 结构体成员中的范围溢出
    struct Test {
        char member1;
        short member2;
        int member3;
    };
    struct Test test;
    test.member1 = 300;  // BUG: range overflow - 300超出char范围
    test.member2 = 50000; // BUG: range overflow - 50000超出short范围
    test.member3 = 5000000000; // BUG: range overflow - 超出int范围
    
    // 测试19: 指针算术中的范围溢出
    int *ptr = malloc(sizeof(int) * 10);
    int offset = 20;
    ptr[offset] = 100; // BUG: range overflow - 指针偏移超出分配范围
    free(ptr);
    
    // 测试20: 复合赋值中的范围溢出
    char comp_var = 100;
    comp_var += 200; // BUG: range overflow - 300超出char范围
    comp_var *= 3;   // BUG: range overflow - 可能超出char范围
    
    printf("赋值范围溢出测试完成\n");
    return 0;
}
