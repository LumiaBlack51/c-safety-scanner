#include <stdio.h>
#include <stdlib.h>

// BUG: 头文件名不对测试
int main() {
    // 测试1: 拼写错误的头文件名
    #include <stdoi.h>  // BUG: header misspelling - 应该是 stdio.h
    #include <stdllib.h> // BUG: header misspelling - 应该是 stdlib.h
    #include <stirng.h>  // BUG: header misspelling - 应该是 string.h
    #include <mth.h>     // BUG: header misspelling - 应该是 math.h
    #include <ctyep.h>   // BUG: header misspelling - 应该是 ctype.h
    #include <tmie.h>    // BUG: header misspelling - 应该是 time.h
    #include <errno.h>   // BUG: header misspelling - 应该是 errno.h
    #include <limtis.h>  // BUG: header misspelling - 应该是 limits.h
    #include <flaot.h>   // BUG: header misspelling - 应该是 float.h
    #include <stddef.h>  // BUG: header misspelling - 应该是 stddef.h
    
    // 测试2: 大小写错误的头文件名
    #include <STDIO.H>   // BUG: header case error - 应该是 stdio.h
    #include <Stdlib.H>  // BUG: header case error - 应该是 stdlib.h
    #include <String.H>  // BUG: header case error - 应该是 string.h
    #include <Math.H>    // BUG: header case error - 应该是 math.h
    
    // 测试3: 多余字符的头文件名
    #include <stdio.hh>  // BUG: header extra character - 应该是 stdio.h
    #include <stdlib.hh> // BUG: header extra character - 应该是 stdlib.h
    #include <string.hh> // BUG: header extra character - 应该是 string.h
    #include <math.hh>    // BUG: header extra character - 应该是 math.h
    
    // 测试4: 缺少字符的头文件名
    #include <stdi.h>    // BUG: header missing character - 应该是 stdio.h
    #include <stdli.h>   // BUG: header missing character - 应该是 stdlib.h
    #include <strin.h>   // BUG: header missing character - 应该是 string.h
    #include <mat.h>     // BUG: header missing character - 应该是 math.h
    
    // 测试5: 错误的扩展名
    #include <stdio.c>   // BUG: header wrong extension - 应该是 stdio.h
    #include <stdlib.c>  // BUG: header wrong extension - 应该是 stdlib.h
    #include <string.c>  // BUG: header wrong extension - 应该是 string.h
    #include <math.c>    // BUG: header wrong extension - 应该是 math.h
    
    // 测试6: 不存在的头文件名
    #include <nonexistent.h> // BUG: header nonexistent
    #include <fakeheader.h>  // BUG: header nonexistent
    #include <imaginary.h>   // BUG: header nonexistent
    #include <phantom.h>     // BUG: header nonexistent
    
    // 测试7: 路径错误的头文件名
    #include <stdio/stdio.h> // BUG: header wrong path
    #include <stdlib/stdlib.h> // BUG: header wrong path
    #include <string/string.h> // BUG: header wrong path
    #include <math/math.h>     // BUG: header wrong path
    
    // 测试8: 重复字符的头文件名
    #include <sttdio.h>  // BUG: header duplicate character - 应该是 stdio.h
    #include <stddlib.h> // BUG: header duplicate character - 应该是 stdlib.h
    #include <strring.h> // BUG: header duplicate character - 应该是 string.h
    #include <matth.h>   // BUG: header duplicate character - 应该是 math.h
    
    // 测试9: 字符顺序错误的头文件名
    #include <tsdio.h>   // BUG: header character order - 应该是 stdio.h
    #include <tsdlib.h>  // BUG: header character order - 应该是 stdlib.h
    #include <tsring.h>  // BUG: header character order - 应该是 string.h
    #include <tamh.h>    // BUG: header character order - 应该是 math.h
    
    // 测试10: 混合错误的头文件名
    #include <STDIO.h>   // BUG: header mixed case - 应该是 stdio.h
    #include <StdLib.h>  // BUG: header mixed case - 应该是 stdlib.h
    #include <String.h>  // BUG: header mixed case - 应该是 string.h
    #include <Math.h>    // BUG: header mixed case - 应该是 math.h
    
    printf("头文件名错误测试完成\n");
    return 0;
}
