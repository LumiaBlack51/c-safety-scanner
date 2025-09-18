import * as vscode from 'vscode';
import { CASTParser, FunctionCall, IncludeDirective } from '../core/ast_parser';

/**
 * C 标准库函数到头文件的映射
 */
const STANDARD_LIBRARY_FUNCTIONS: { [key: string]: string[] } = {
  // stdio.h
  'printf': ['stdio.h'],
  'scanf': ['stdio.h'],
  'fprintf': ['stdio.h'],
  'fscanf': ['stdio.h'],
  'sprintf': ['stdio.h'],
  'sscanf': ['stdio.h'],
  'fopen': ['stdio.h'],
  'fclose': ['stdio.h'],
  'fread': ['stdio.h'],
  'fwrite': ['stdio.h'],
  'fgets': ['stdio.h'],
  'fputs': ['stdio.h'],
  'getchar': ['stdio.h'],
  'putchar': ['stdio.h'],
  'fgetc': ['stdio.h'],
  'fputc': ['stdio.h'],
  'fseek': ['stdio.h'],
  'ftell': ['stdio.h'],
  'rewind': ['stdio.h'],
  'feof': ['stdio.h'],
  'ferror': ['stdio.h'],
  'perror': ['stdio.h'],

  // stdlib.h
  'malloc': ['stdlib.h'],
  'calloc': ['stdlib.h'],
  'realloc': ['stdlib.h'],
  'free': ['stdlib.h'],
  'exit': ['stdlib.h'],
  'abort': ['stdlib.h'],
  'atexit': ['stdlib.h'],
  'atoi': ['stdlib.h'],
  'atof': ['stdlib.h'],
  'atol': ['stdlib.h'],
  'strtol': ['stdlib.h'],
  'strtod': ['stdlib.h'],
  'rand': ['stdlib.h'],
  'srand': ['stdlib.h'],
  'system': ['stdlib.h'],
  'getenv': ['stdlib.h'],
  'qsort': ['stdlib.h'],
  'bsearch': ['stdlib.h'],
  'abs': ['stdlib.h'],
  'labs': ['stdlib.h'],
  'div': ['stdlib.h'],
  'ldiv': ['stdlib.h'],

  // string.h
  'strlen': ['string.h'],
  'strcpy': ['string.h'],
  'strncpy': ['string.h'],
  'strcat': ['string.h'],
  'strncat': ['string.h'],
  'strcmp': ['string.h'],
  'strncmp': ['string.h'],
  'strchr': ['string.h'],
  'strrchr': ['string.h'],
  'strstr': ['string.h'],
  'strtok': ['string.h'],
  'memcpy': ['string.h'],
  'memmove': ['string.h'],
  'memcmp': ['string.h'],
  'memchr': ['string.h'],
  'memset': ['string.h'],

  // math.h
  'sin': ['math.h'],
  'cos': ['math.h'],
  'tan': ['math.h'],
  'asin': ['math.h'],
  'acos': ['math.h'],
  'atan': ['math.h'],
  'atan2': ['math.h'],
  'sinh': ['math.h'],
  'cosh': ['math.h'],
  'tanh': ['math.h'],
  'exp': ['math.h'],
  'log': ['math.h'],
  'log10': ['math.h'],
  'pow': ['math.h'],
  'sqrt': ['math.h'],
  'ceil': ['math.h'],
  'floor': ['math.h'],
  'fabs': ['math.h'],
  'ldexp': ['math.h'],
  'frexp': ['math.h'],
  'modf': ['math.h'],
  'fmod': ['math.h'],

  // ctype.h
  'isalpha': ['ctype.h'],
  'isdigit': ['ctype.h'],
  'isalnum': ['ctype.h'],
  'isspace': ['ctype.h'],
  'islower': ['ctype.h'],
  'isupper': ['ctype.h'],
  'isprint': ['ctype.h'],
  'iscntrl': ['ctype.h'],
  'ispunct': ['ctype.h'],
  'isxdigit': ['ctype.h'],
  'tolower': ['ctype.h'],
  'toupper': ['ctype.h'],

  // time.h
  'time': ['time.h'],
  'clock': ['time.h'],
  'ctime': ['time.h'],
  'asctime': ['time.h'],
  'localtime': ['time.h'],
  'gmtime': ['time.h'],
  'mktime': ['time.h'],
  'strftime': ['time.h'],
  'difftime': ['time.h'],

  // assert.h
  'assert': ['assert.h'],

  // limits.h (constants, no functions)
  
  // float.h (constants, no functions)
  
  // stdarg.h
  'va_start': ['stdarg.h'],
  'va_arg': ['stdarg.h'],
  'va_end': ['stdarg.h'],
  'va_copy': ['stdarg.h'],

  // setjmp.h
  'setjmp': ['setjmp.h'],
  'longjmp': ['setjmp.h'],

  // signal.h
  'signal': ['signal.h'],
  'raise': ['signal.h'],

  // errno.h (mainly errno variable, few functions)
  'strerror': ['string.h'], // Note: strerror is in string.h in many implementations

  // locale.h
  'setlocale': ['locale.h'],
  'localeconv': ['locale.h'],
};

/**
 * 基于 AST 的库函数检测器
 * 检测使用的库函数是否包含对应的头文件
 */
export class ASTLibraryDetector {
  private parser: CASTParser;

  constructor() {
    try {
      this.parser = new CASTParser();
    } catch {
      this.parser = {} as any;
    }
  }

  /**
   * 分析文件并返回诊断信息
   */
  async analyzeFile(uri: vscode.Uri): Promise<vscode.Diagnostic[]> {
    const document = await vscode.workspace.openTextDocument(uri);
    const sourceCode = document.getText();
    
    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
      const ast = this.parser.parse(sourceCode);
      
      // 提取所有 include 指令
      const includes = this.parser.extractIncludeDirectives(ast);
      const includedHeaders = new Set(includes.map(inc => inc.headerName));
      
      // 提取所有函数调用
      const functionCalls = this.parser.extractFunctionCalls(ast);
      
      // 检查每个函数调用
      for (const call of functionCalls) {
        const requiredHeaders = STANDARD_LIBRARY_FUNCTIONS[call.name];
        if (requiredHeaders) {
          // 检查是否包含了必需的头文件
          const hasRequiredHeader = requiredHeaders.some(header => 
            includedHeaders.has(header)
          );
          
          if (!hasRequiredHeader) {
            const range = new vscode.Range(
              new vscode.Position(call.position.row, call.position.column),
              new vscode.Position(call.position.row, call.position.column + call.name.length)
            );
            
            const suggestedHeaders = requiredHeaders.join(' 或 ');
            diagnostics.push(new vscode.Diagnostic(
              range,
              `函数 '${call.name}' 需要包含头文件: ${suggestedHeaders}`,
              vscode.DiagnosticSeverity.Warning
            ));
          }
        }
      }
      
    } catch (error) {
      console.error('AST parsing error in library detector:', error);
    }
    
    return diagnostics;
  }

  /**
   * 获取未包含的头文件列表
   */
  async getMissingHeaders(uri: vscode.Uri): Promise<{ function: string; headers: string[] }[]> {
    const document = await vscode.workspace.openTextDocument(uri);
    const sourceCode = document.getText();
    
    const missing: { function: string; headers: string[] }[] = [];
    
    try {
      const ast = this.parser.parse(sourceCode);
      
      // 提取所有 include 指令
      const includes = this.parser.extractIncludeDirectives(ast);
      const includedHeaders = new Set(includes.map(inc => inc.headerName));
      
      // 提取所有函数调用
      const functionCalls = this.parser.extractFunctionCalls(ast);
      
      // 收集缺失的头文件
      for (const call of functionCalls) {
        const requiredHeaders = STANDARD_LIBRARY_FUNCTIONS[call.name];
        if (requiredHeaders) {
          const hasRequiredHeader = requiredHeaders.some(header => 
            includedHeaders.has(header)
          );
          
          if (!hasRequiredHeader) {
            missing.push({
              function: call.name,
              headers: requiredHeaders
            });
          }
        }
      }
      
    } catch (error) {
      console.error('AST parsing error in getMissingHeaders:', error);
    }
    
    return missing;
  }

  /**
   * 检查特定函数是否需要头文件
   */
  checkFunction(functionName: string, includedHeaders: string[]): string[] | null {
    const requiredHeaders = STANDARD_LIBRARY_FUNCTIONS[functionName];
    if (!requiredHeaders) {
      return null; // 不是标准库函数
    }
    
    const includedSet = new Set(includedHeaders);
    const hasRequiredHeader = requiredHeaders.some(header => 
      includedSet.has(header)
    );
    
    return hasRequiredHeader ? null : requiredHeaders;
  }

  /**
   * 获取所有支持的标准库函数列表
   */
  getSupportedFunctions(): string[] {
    return Object.keys(STANDARD_LIBRARY_FUNCTIONS);
  }

  /**
   * 获取某个头文件定义的所有函数
   */
  getFunctionsByHeader(headerName: string): string[] {
    const functions: string[] = [];
    
    for (const [func, headers] of Object.entries(STANDARD_LIBRARY_FUNCTIONS)) {
      if (headers.includes(headerName)) {
        functions.push(func);
      }
    }
    
    return functions;
  }

  /**
   * 检查头文件拼写错误
   */
  async checkHeaderSpelling(uri: vscode.Uri): Promise<vscode.Diagnostic[]> {
    const document = await vscode.workspace.openTextDocument(uri);
    const sourceCode = document.getText();
    
    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
      const ast = this.parser.parse(sourceCode);
      const includes = this.parser.extractIncludeDirectives(ast);
      
      const standardHeaders = new Set([
        'stdio.h', 'stdlib.h', 'string.h', 'math.h', 'ctype.h',
        'time.h', 'assert.h', 'limits.h', 'float.h', 'stdarg.h',
        'setjmp.h', 'signal.h', 'errno.h', 'locale.h', 'stddef.h',
        'stdint.h', 'stdbool.h', 'inttypes.h', 'wchar.h', 'wctype.h',
        'iso646.h', 'complex.h', 'fenv.h', 'tgmath.h'
      ]);
      
      for (const include of includes) {
        // 只检查系统头文件（用 <> 包围的）
        if (include.isSystemHeader && !standardHeaders.has(include.headerName)) {
          // 检查是否是常见的拼写错误
          const suggestion = this.suggestCorrectHeader(include.headerName, standardHeaders);
          
          const range = new vscode.Range(
            new vscode.Position(include.position.row, include.position.column),
            new vscode.Position(include.position.row, include.position.column + include.headerName.length + 2) // 包含 <>
          );
          
          let message = `可疑的头文件名: ${include.headerName}`;
          if (suggestion) {
            message += `，您是否想要 ${suggestion}？`;
          }
          
          diagnostics.push(new vscode.Diagnostic(
            range,
            message,
            vscode.DiagnosticSeverity.Information
          ));
        }
      }
      
    } catch (error) {
      console.error('AST parsing error in header spelling check:', error);
    }
    
    return diagnostics;
  }

  /**
   * 建议正确的头文件名
   */
  private suggestCorrectHeader(headerName: string, standardHeaders: Set<string>): string | null {
    const lowerHeader = headerName.toLowerCase();
    
    // 简单的编辑距离匹配
    let bestMatch: string | null = null;
    let bestDistance = Infinity;
    
    for (const standard of standardHeaders) {
      const distance = this.levenshteinDistance(lowerHeader, standard.toLowerCase());
      if (distance < bestDistance && distance <= 2) { // 最多2个字符差异
        bestDistance = distance;
        bestMatch = standard;
      }
    }
    
    return bestMatch;
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}