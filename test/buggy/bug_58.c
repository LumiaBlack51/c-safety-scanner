#include <stdio.h>
#include <stdlib.h>

// BUG: printf和scanf的通配符与变量数量和类型不一致测试
int main() {
    // 测试1: printf格式字符串与参数数量不匹配
    int a = 10;
    int b = 20;
    printf("%d %d %d\n", a, b); // BUG: format mismatch - 格式字符串有3个%d但只有2个参数
    
    // 测试2: printf格式字符串与参数类型不匹配
    int c = 30;
    float d = 3.14f;
    char e = 'A';
    printf("%d %f %c %s\n", c, d, e); // BUG: format mismatch - 格式字符串有%s但没有字符串参数
    
    // 测试3: printf参数数量多于格式字符串
    int f = 40;
    int g = 50;
    printf("%d\n", f, g); // BUG: format mismatch - 格式字符串只有1个%d但有2个参数
    
    // 测试4: printf长度修饰符不匹配
    long h = 100L;
    short i = 200;
    printf("%d %d\n", h, i); // BUG: format mismatch - 应该使用%ld和%hd
    
    // 测试5: printf无符号类型不匹配
    unsigned int j = 300U;
    unsigned long k = 400UL;
    printf("%d %d\n", j, k); // BUG: format mismatch - 应该使用%u和%lu
    
    // 测试6: printf指针类型不匹配
    int *ptr = &a;
    printf("%d\n", ptr); // BUG: format mismatch - 应该使用%p
    
    // 测试7: scanf格式字符串与参数数量不匹配
    int l, m;
    scanf("%d", &l, &m); // BUG: format mismatch - 格式字符串只有1个%d但有2个参数
    
    // 测试8: scanf格式字符串与参数类型不匹配
    int n;
    float o;
    scanf("%d %f %s", &n, &o); // BUG: format mismatch - 格式字符串有%s但没有字符串参数
    
    // 测试9: scanf参数数量多于格式字符串
    int p, q;
    scanf("%d", &p, &q); // BUG: format mismatch - 格式字符串只有1个%d但有2个参数
    
    // 测试10: scanf长度修饰符不匹配
    long r;
    short s;
    scanf("%d %d", &r, &s); // BUG: format mismatch - 应该使用%ld和%hd
    
    // 测试11: scanf无符号类型不匹配
    unsigned int t;
    unsigned long u;
    scanf("%d %d", &t, &u); // BUG: format mismatch - 应该使用%u和%lu
    
    // 测试12: scanf指针类型不匹配
    int *ptr2 = &a;
    scanf("%d", ptr2); // BUG: format mismatch - 应该使用%p
    
    // 测试13: fprintf格式字符串与参数不匹配
    FILE *file = fopen("test.txt", "w");
    if (file) {
        int v = 500;
        float w = 2.5f;
        fprintf(file, "%d %f %s\n", v, w); // BUG: format mismatch - 格式字符串有%s但没有字符串参数
        fclose(file);
    }
    
    // 测试14: fscanf格式字符串与参数不匹配
    file = fopen("test.txt", "r");
    if (file) {
        int x;
        float y;
        fscanf(file, "%d %f %s", &x, &y); // BUG: format mismatch - 格式字符串有%s但没有字符串参数
        fclose(file);
    }
    
    // 测试15: sprintf格式字符串与参数不匹配
    char buffer[100];
    int z = 600;
    float aa = 1.5f;
    sprintf(buffer, "%d %f %s", z, aa); // BUG: format mismatch - 格式字符串有%s但没有字符串参数
    
    // 测试16: sscanf格式字符串与参数不匹配
    char input[] = "700 3.5";
    int bb;
    float cc;
    sscanf(input, "%d %f %s", &bb, &cc); // BUG: format mismatch - 格式字符串有%s但没有字符串参数
    
    // 测试17: printf八进制和十六进制格式不匹配
    int dd = 255;
    printf("%d %d\n", dd, dd); // BUG: format mismatch - 应该使用%o和%x
    
    // 测试18: scanf八进制和十六进制格式不匹配
    int ee, ff;
    scanf("%d %d", &ee, &ff); // BUG: format mismatch - 如果输入是八进制和十六进制，应该使用%o和%x
    
    // 测试19: printf科学计数法格式不匹配
    double gg = 1.23e10;
    printf("%d\n", gg); // BUG: format mismatch - 应该使用%e或%g
    
    // 测试20: scanf科学计数法格式不匹配
    double hh;
    scanf("%d", &hh); // BUG: format mismatch - 如果输入是科学计数法，应该使用%e或%g
    
    // 测试21: printf字符数组格式不匹配
    char str[] = "Hello";
    printf("%c\n", str); // BUG: format mismatch - 应该使用%s
    
    // 测试22: scanf字符数组格式不匹配
    char str2[20];
    scanf("%c", str2); // BUG: format mismatch - 应该使用%s
    
    // 测试23: printf布尔值格式不匹配
    int bool_val = 1;
    printf("%d\n", bool_val); // BUG: format mismatch - 布尔值应该使用专门的格式
    
    // 测试24: scanf布尔值格式不匹配
    int bool_val2;
    scanf("%d", &bool_val2); // BUG: format mismatch - 布尔值应该使用专门的格式
    
    // 测试25: printf浮点数精度不匹配
    float ii = 3.14159f;
    printf("%.2f\n", ii); // 正确：指定了精度
    
    // 测试26: printf字段宽度不匹配
    int jj = 123;
    printf("%5d\n", jj); // 正确：指定了字段宽度
    
    // 测试27: printf左对齐不匹配
    int kk = 456;
    printf("%-5d\n", kk); // 正确：指定了左对齐
    
    // 测试28: printf填充字符不匹配
    int ll = 789;
    printf("%05d\n", ll); // 正确：指定了填充字符
    
    // 测试29: printf符号显示不匹配
    int mm = -100;
    printf("%+d\n", mm); // 正确：指定了符号显示
    
    // 测试30: printf空格填充不匹配
    int nn = 200;
    printf("% d\n", nn); // 正确：指定了空格填充
    
    printf("printf和scanf格式字符串测试完成\n");
    return 0;
}
