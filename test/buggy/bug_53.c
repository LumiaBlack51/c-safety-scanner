#include <stdio.h>
#include <stdlib.h>

// BUG: 死循环测试
int main() {
    // 测试1: 基本死循环 for(;;)
    printf("测试1: 基本死循环\n");
    for(;;) { // BUG: infinite loop
        printf("infinite for loop\n");
    }
    
    // 测试2: while(1) 死循环
    printf("测试2: while(1) 死循环\n");
    while(1) { // BUG: infinite loop
        printf("infinite while loop\n");
    }
    
    // 测试3: 循环条件永远为真
    printf("测试3: 循环条件永远为真\n");
    int flag = 1;
    while(flag) { // BUG: infinite loop
        printf("flag is always true\n");
        // 忘记修改flag
    }
    
    // 测试4: 循环变量永远不会满足退出条件
    printf("测试4: 循环变量永远不会满足退出条件\n");
    for(int i = 10; i >= 10; i++) { // BUG: infinite loop
        printf("i = %d\n", i);
    }
    
    // 测试5: 循环变量递减但条件错误
    printf("测试5: 循环变量递减但条件错误\n");
    for(int j = 0; j < 10; j--) { // BUG: infinite loop
        printf("j = %d\n", j);
    }
    
    // 测试6: 循环变量步长过大，跳过退出条件
    printf("测试6: 循环变量步长过大\n");
    for(int k = 0; k == 10; k += 3) { // BUG: infinite loop
        printf("k = %d\n", k);
    }
    
    // 测试7: 循环变量在循环体内被错误修改
    printf("测试7: 循环变量在循环体内被错误修改\n");
    int m = 0;
    while(m < 10) { // BUG: infinite loop
        printf("m = %d\n", m);
        m = m; // 没有实际变化
    }
    
    // 测试8: 嵌套循环中的死循环
    printf("测试8: 嵌套循环中的死循环\n");
    for(int outer = 0; outer < 5; outer++) {
        for(int inner = 0; inner < 3; inner++) {
            printf("outer=%d, inner=%d\n", outer, inner);
            // 内层循环没有正确的退出条件
            if (inner == 2) {
                inner = 0; // BUG: infinite loop
            }
        }
    }
    
    // 测试9: 浮点数循环的精度问题
    printf("测试9: 浮点数循环的精度问题\n");
    for(float f = 0.0f; f != 1.0f; f += 0.1f) { // BUG: infinite loop
        printf("f = %f\n", f);
    }
    
    // 测试10: 循环条件依赖于外部变量，但外部变量不变
    printf("测试10: 循环条件依赖于外部变量\n");
    int counter = 0;
    while(counter < 100) { // BUG: infinite loop
        printf("counter = %d\n", counter);
        // 忘记递增counter
    }
    
    // 测试11: 循环中的break语句永远不会执行
    printf("测试11: break语句永远不会执行\n");
    int n = 0;
    while(1) { // BUG: infinite loop
        printf("n = %d\n", n);
        n++;
        if (n < 0) { // 这个条件永远不会为真
            break;
        }
    }
    
    // 测试12: 循环中的continue语句导致死循环
    printf("测试12: continue语句导致死循环\n");
    int p = 0;
    while(p < 10) { // BUG: infinite loop
        if (p % 2 == 0) {
            continue; // 跳过后面的p++，导致p永远不变
        }
        p++;
    }
    
    return 0;
}
