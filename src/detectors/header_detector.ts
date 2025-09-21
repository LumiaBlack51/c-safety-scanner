/**
 * 头文件检测器模块
 * 检测库函数头文件包含问题
 */

import { BaseDetector, DetectionContext } from './base_detector';
import { Issue } from '../interfaces/types';

export class HeaderDetector extends BaseDetector {
  private functionHeaders: Record<string, string>;
  
  constructor(config: any, enabled: boolean = true) {
    super(config, enabled);
    
    // 初始化函数头文件映射
    this.functionHeaders = {
      'malloc': 'stdlib.h',
      'free': 'stdlib.h',
      'calloc': 'stdlib.h',
      'realloc': 'stdlib.h',
      'printf': 'stdio.h',
      'scanf': 'stdio.h',
      'fprintf': 'stdio.h',
      'sprintf': 'stdio.h',
      'snprintf': 'stdio.h',
      'strlen': 'string.h',
      'strcpy': 'string.h',
      'strncpy': 'string.h',
      'strcmp': 'string.h',
      'strncmp': 'string.h',
      'strcat': 'string.h',
      'strncat': 'string.h',
      'strchr': 'string.h',
      'strrchr': 'string.h',
      'strstr': 'string.h',
      'strtok': 'string.h',
      'memcpy': 'string.h',
      'memmove': 'string.h',
      'memset': 'string.h',
      'memcmp': 'string.h',
      'sqrt': 'math.h',
      'pow': 'math.h',
      'sin': 'math.h',
      'cos': 'math.h',
      'tan': 'math.h',
      'log': 'math.h',
      'log10': 'math.h',
      'exp': 'math.h',
      'floor': 'math.h',
      'ceil': 'math.h',
      'fabs': 'math.h',
      'isalpha': 'ctype.h',
      'isdigit': 'ctype.h',
      'islower': 'ctype.h',
      'isupper': 'ctype.h',
      'isalnum': 'ctype.h',
      'isspace': 'ctype.h',
      'toupper': 'ctype.h',
      'tolower': 'ctype.h',
      'time': 'time.h',
      'clock': 'time.h',
      'ctime': 'time.h',
      'localtime': 'time.h',
      'gmtime': 'time.h',
      'rand': 'stdlib.h',
      'srand': 'stdlib.h',
      'exit': 'stdlib.h',
      'atoi': 'stdlib.h',
      'atof': 'stdlib.h',
      'atol': 'stdlib.h',
      'strtol': 'stdlib.h',
      'strtod': 'stdlib.h',
      'getchar': 'stdio.h',
      'putchar': 'stdio.h',
      'gets': 'stdio.h',
      'puts': 'stdio.h',
      'fgets': 'stdio.h',
      'fputs': 'stdio.h',
      'fopen': 'stdio.h',
      'fclose': 'stdio.h',
      'fread': 'stdio.h',
      'fwrite': 'stdio.h',
      'fseek': 'stdio.h',
      'ftell': 'stdio.h',
      'rewind': 'stdio.h',
      'feof': 'stdio.h',
      'ferror': 'stdio.h',
      'perror': 'stdio.h'
    };
  }
  
  getName(): string {
    return 'HeaderDetector';
  }
  
  getDescription(): string {
    return '检测库函数头文件包含问题';
  }
  
  async detect(context: DetectionContext): Promise<Issue[]> {
    if (!this.enabled || !this.config.libraryHeaders) return [];
    
    const issues: Issue[] = [];
    
    try {
      // 强制使用启发式检测，因为AST检测完全失效
      issues.push(...this.detectWithHeuristic(context));
    } catch (error) {
      console.error('HeaderDetector检测错误:', error);
    }
    
    return issues;
  }
  
  private async detectWithAST(context: DetectionContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    if (!context.ast) return issues;
    
    try {
      // 提取所有include指令
      const includes = this.extractIncludeDirectives(context.ast);
      const functionCalls = this.extractFunctionCalls(context.ast);
      
      // 创建已包含的头文件集合
      const includedHeaders = new Set<string>();
      for (const include of includes) {
        includedHeaders.add(include.headerName);
      }
      
      // 检查函数调用是否需要头文件
      for (const call of functionCalls) {
        const requiredHeader = this.functionHeaders[call.name];
        if (requiredHeader && !includedHeaders.has(requiredHeader)) {
          issues.push({
            file: context.filePath,
            line: call.position.row + 1,
            category: 'Header',
            message: `使用${call.name}但未包含<${requiredHeader}>`,
            codeLine: context.lines[call.position.row] || ''
          });
        }
      }
      
      // 检查头文件拼写错误
      for (const include of includes) {
        const correctHeader = this.getCorrectHeaderName(include.headerName);
        if (correctHeader && correctHeader !== include.headerName) {
          issues.push({
            file: context.filePath,
            line: include.position.row + 1,
            category: 'Header',
            message: `头文件拼写错误：${include.headerName} 应该是 ${correctHeader}`,
            codeLine: context.lines[include.position.row] || ''
          });
        }
      }
      
    } catch (error) {
      console.error('AST头文件检测错误:', error);
    }
    
    return issues;
  }
  
  private extractIncludeDirectives(ast: any): any[] {
    const includes: any[] = [];
    this.traverseAST(ast, (node) => {
      if (node.type === 'preproc_include') {
        const pathNode = this.findChildByType(node, 'string_literal') ||
                        this.findChildByType(node, 'system_lib_string');
        if (pathNode) {
          const headerName = pathNode.text.replace(/[<>"]/g, '');
          const isSystemHeader = pathNode.text.startsWith('<');
          includes.push({
            headerName,
            isSystemHeader,
            position: node.startPosition
          });
        }
      }
    });
    return includes;
  }
  
  private extractFunctionCalls(ast: any): any[] {
    const calls: any[] = [];
    this.traverseAST(ast, (node) => {
      if (node.type === 'call_expression') {
        const funcIdentifier = node.namedChildren?.[0];
        if (funcIdentifier && funcIdentifier.type === 'identifier') {
          calls.push({
            name: funcIdentifier.text,
            position: node.startPosition
          });
        }
      }
    });
    return calls;
  }
  
  private traverseAST(node: any, callback: (node: any) => void): void {
    callback(node);
    if (node.children) {
      for (const child of node.children) {
        this.traverseAST(child, callback);
      }
    }
    if (node.namedChildren) {
      for (const child of node.namedChildren) {
        this.traverseAST(child, callback);
      }
    }
  }
  
  private findChildByType(node: any, type: string): any {
    if (node.namedChildren) {
      for (const child of node.namedChildren) {
        if (child.type === type) {
          return child;
        }
      }
    }
    return null;
  }
  
  private getCorrectHeaderName(headerName: string): string | null {
    // C标准库头文件白名单
    const standardHeaders = new Set([
      'stdio.h', 'stdlib.h', 'string.h', 'math.h', 'ctype.h', 'time.h',
      'limits.h', 'float.h', 'errno.h', 'assert.h', 'signal.h', 'setjmp.h',
      'stdarg.h', 'stddef.h', 'locale.h', 'wchar.h', 'wctype.h', 'stdbool.h',
      'stdint.h', 'inttypes.h', 'complex.h', 'tgmath.h', 'fenv.h', 'iso646.h',
      'stdalign.h', 'stdatomic.h', 'stdnoreturn.h', 'threads.h', 'uchar.h'
    ]);

    // 如果头文件在白名单中，直接返回
    if (standardHeaders.has(headerName)) {
      return headerName;
    }

    // 使用编辑距离算法找到最相似的标准头文件
    const suggestions = this.findSimilarHeaders(headerName, standardHeaders);
    if (suggestions.length > 0) {
      return suggestions[0]; // 返回最相似的头文件
    }

    // 常见的头文件拼写错误映射（保留作为备用）
    const corrections: Record<string, string> = {
      'stdoi.h': 'stdio.h',
      'stdllib.h': 'stdlib.h',
      'stirng.h': 'string.h',
      'mth.h': 'math.h',
      'ctyp.h': 'ctype.h',
      'tim.h': 'time.h',
      'stdiox.h': 'stdio.h',
      'stdlibx.h': 'stdlib.h',
      'stringx.h': 'string.h',
      'mathx.h': 'math.h',
      'ctypex.h': 'ctype.h',
      'timex.h': 'time.h'
    };
    
    return corrections[headerName] || null;
  }

  /**
   * 使用编辑距离算法找到最相似的标准头文件
   */
  private findSimilarHeaders(headerName: string, standardHeaders: Set<string>): string[] {
    const suggestions: { header: string; distance: number }[] = [];
    
    for (const standardHeader of standardHeaders) {
      const distance = this.calculateEditDistance(headerName, standardHeader);
      // 如果编辑距离小于等于2，认为是可能的拼写错误
      if (distance <= 2) {
        suggestions.push({ header: standardHeader, distance });
      }
    }
    
    // 按编辑距离排序，返回最相似的头文件
    suggestions.sort((a, b) => a.distance - b.distance);
    return suggestions.map(s => s.header);
  }

  /**
   * 计算两个字符串之间的编辑距离（Levenshtein距离）
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // 初始化矩阵
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [];
      matrix[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // 填充矩阵
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,     // 删除
            matrix[i][j - 1] + 1,     // 插入
            matrix[i - 1][j - 1] + 1  // 替换
          );
        }
      }
    }

    return matrix[len1][len2];
  }
  
  private detectWithHeuristic(context: DetectionContext): Issue[] {
    return this.detectLibraryHeaders(context);
  }
  
  private detectLibraryHeaders(context: DetectionContext): Issue[] {
    const issues: Issue[] = [];
    const content = context.content;
    const lines = context.lines;
    
    // 提取所有include指令
    const includedHeaders = new Set<string>();
    const misspelledHeaders = new Set<string>();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检测include指令
      const includeMatch = line.match(/#include\s*[<"]([^>"]+)[>"]/);
      if (includeMatch) {
        const headerName = includeMatch[1];
        includedHeaders.add(headerName);
        
        // 检查拼写错误 - 使用白名单比对
        const correctHeader = this.getCorrectHeaderName(headerName);
        if (correctHeader && correctHeader !== headerName) {
          if (!misspelledHeaders.has(headerName)) {
            misspelledHeaders.add(headerName);
            issues.push({
              file: context.filePath,
              line: i + 1,
              category: 'Header',
              message: `头文件拼写错误：${headerName} 应该是 ${correctHeader}`,
              codeLine: line
            });
          }
        }
      }
    }
    
    // 检测缺失的头文件
    const missingHeaderOnce = new Set<string>();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = this.stripLineComments(line);
      
      // 更全面的函数调用检测
      for (const [func, header] of Object.entries(this.functionHeaders)) {
        // 检测各种函数调用模式
        const funcPatterns = [
          new RegExp(`\\b${func}\\s*\\(`),  // func(
          new RegExp(`\\b${func}\\s*\\[`),  // func[
          new RegExp(`\\b${func}\\s*;`),    // func;
          new RegExp(`\\b${func}\\s*$`),    // func (行尾)
          new RegExp(`\\b${func}\\s*=`),    // func =
          new RegExp(`\\b${func}\\s*\\+`),  // func +
          new RegExp(`\\b${func}\\s*-`),    // func -
          new RegExp(`\\b${func}\\s*\\*`),  // func *
          new RegExp(`\\b${func}\\s*/`),    // func /
          new RegExp(`\\b${func}\\s*%`),    // func %
          new RegExp(`\\b${func}\\s*\\+\\+`), // func++
          new RegExp(`\\b${func}\\s*--`),    // func--
          new RegExp(`\\+\\+\\s*${func}\\b`), // ++func
          new RegExp(`--\\s*${func}\\b`),    // --func
        ];
        
        let foundFunction = false;
        for (const pattern of funcPatterns) {
          if (pattern.test(cleanLine)) {
            foundFunction = true;
            break;
          }
        }
        
        if (foundFunction) {
          // 检查是否包含对应的头文件
          const hasHeader = includedHeaders.has(header) || 
                           content.includes(`#include <${header}>`) ||
                           content.includes(`#include "${header}"`);
          
          if (!hasHeader && !missingHeaderOnce.has(header)) {
            missingHeaderOnce.add(header);
            issues.push({
              file: context.filePath,
              line: i + 1,
              category: 'Header',
              message: `使用${func}但未包含<${header}>`,
              codeLine: line
            });
          }
        }
      }
    }
    
    return issues;
  }
  
  private stripLineComments(s: string): string {
    const idx = s.indexOf('//');
    return idx >= 0 ? s.slice(0, idx) : s;
  }
  
  /**
   * 添加自定义函数头文件映射
   */
  addFunctionHeader(functionName: string, headerName: string): void {
    this.functionHeaders[functionName] = headerName;
  }
  
  /**
   * 移除函数头文件映射
   */
  removeFunctionHeader(functionName: string): void {
    delete this.functionHeaders[functionName];
  }
  
  /**
   * 获取所有函数头文件映射
   */
  getFunctionHeaders(): Record<string, string> {
    return { ...this.functionHeaders };
  }
}
