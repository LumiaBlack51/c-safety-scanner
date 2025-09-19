#include <stdio.h>
// BUG: 缺少必要的头文件包含

// BUG: 使用了库函数但没有引用对应的库
int main() {
    // 测试1: 使用malloc但没有包含stdlib.h
    int *ptr = malloc(sizeof(int) * 10); // BUG: missing header - 需要 stdlib.h
    
    // 测试2: 使用strlen但没有包含string.h
    char str[] = "Hello World";
    int len = strlen(str); // BUG: missing header - 需要 string.h
    
    // 测试3: 使用strcpy但没有包含string.h
    char dest[20];
    strcpy(dest, "test"); // BUG: missing header - 需要 string.h
    
    // 测试4: 使用strcmp但没有包含string.h
    char s1[] = "abc";
    char s2[] = "def";
    int cmp = strcmp(s1, s2); // BUG: missing header - 需要 string.h
    
    // 测试5: 使用strcat但没有包含string.h
    char buffer[50] = "Hello";
    strcat(buffer, " World"); // BUG: missing header - 需要 string.h
    
    // 测试6: 使用strstr但没有包含string.h
    char text[] = "This is a test";
    char *found = strstr(text, "test"); // BUG: missing header - 需要 string.h
    
    // 测试7: 使用sqrt但没有包含math.h
    double result = sqrt(16.0); // BUG: missing header - 需要 math.h
    
    // 测试8: 使用sin但没有包含math.h
    double sine = sin(3.14159); // BUG: missing header - 需要 math.h
    
    // 测试9: 使用cos但没有包含math.h
    double cosine = cos(3.14159); // BUG: missing header - 需要 math.h
    
    // 测试10: 使用pow但没有包含math.h
    double power = pow(2.0, 3.0); // BUG: missing header - 需要 math.h
    
    // 测试11: 使用isalpha但没有包含ctype.h
    char ch = 'A';
    if (isalpha(ch)) { // BUG: missing header - 需要 ctype.h
        printf("Is alpha\n");
    }
    
    // 测试12: 使用isdigit但没有包含ctype.h
    char digit = '5';
    if (isdigit(digit)) { // BUG: missing header - 需要 ctype.h
        printf("Is digit\n");
    }
    
    // 测试13: 使用toupper但没有包含ctype.h
    char lower = 'a';
    char upper = toupper(lower); // BUG: missing header - 需要 ctype.h
    
    // 测试14: 使用tolower但没有包含ctype.h
    char upper2 = 'A';
    char lower2 = tolower(upper2); // BUG: missing header - 需要 ctype.h
    
    // 测试15: 使用time但没有包含time.h
    time_t now = time(NULL); // BUG: missing header - 需要 time.h
    
    // 测试16: 使用rand但没有包含stdlib.h
    int random = rand(); // BUG: missing header - 需要 stdlib.h
    
    // 测试17: 使用srand但没有包含stdlib.h
    srand(123); // BUG: missing header - 需要 stdlib.h
    
    // 测试18: 使用exit但没有包含stdlib.h
    // exit(0); // BUG: missing header - 需要 stdlib.h
    
    // 测试19: 使用atoi但没有包含stdlib.h
    char num_str[] = "123";
    int num = atoi(num_str); // BUG: missing header - 需要 stdlib.h
    
    // 测试20: 使用atof但没有包含stdlib.h
    char float_str[] = "3.14";
    double float_num = atof(float_str); // BUG: missing header - 需要 stdlib.h
    
    // 测试21: 使用fopen但没有包含stdio.h (已包含)
    FILE *file = fopen("test.txt", "r"); // 正确：已包含stdio.h
    
    // 测试22: 使用fclose但没有包含stdio.h (已包含)
    if (file) {
        fclose(file); // 正确：已包含stdio.h
    }
    
    // 测试23: 使用fprintf但没有包含stdio.h (已包含)
    fprintf(stdout, "Hello\n"); // 正确：已包含stdio.h
    
    // 测试24: 使用fscanf但没有包含stdio.h (已包含)
    // fscanf(stdin, "%d", &num); // 正确：已包含stdio.h
    
    // 测试25: 使用sprintf但没有包含stdio.h (已包含)
    char buffer2[50];
    sprintf(buffer2, "Number: %d", num); // 正确：已包含stdio.h
    
    // 测试26: 使用sscanf但没有包含stdio.h (已包含)
    int parsed_num;
    sscanf("456", "%d", &parsed_num); // 正确：已包含stdio.h
    
    // 测试27: 使用getchar但没有包含stdio.h (已包含)
    // int c = getchar(); // 正确：已包含stdio.h
    
    // 测试28: 使用putchar但没有包含stdio.h (已包含)
    putchar('A'); // 正确：已包含stdio.h
    
    // 测试29: 使用fgets但没有包含stdio.h (已包含)
    char line[100];
    // fgets(line, sizeof(line), stdin); // 正确：已包含stdio.h
    
    // 测试30: 使用fputs但没有包含stdio.h (已包含)
    fputs("Hello World\n", stdout); // 正确：已包含stdio.h
    
    printf("库函数头文件测试完成\n");
    return 0;
}
