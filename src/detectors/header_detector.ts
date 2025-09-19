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
      issues.push(...this.detectLibraryHeaders(context));
    } catch (error) {
      console.error('HeaderDetector检测错误:', error);
    }
    
    return issues;
  }
  
  private detectLibraryHeaders(context: DetectionContext): Issue[] {
    const issues: Issue[] = [];
    const content = context.content;
    const lines = context.lines;
    
    // 去重：每个缺失的头文件仅报告一次（按头文件维度）
    const missingHeaderOnce = new Set<string>();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const [func, header] of Object.entries(this.functionHeaders)) {
        if (new RegExp(`\\b${func}\\s*\\(`).test(line)) {
          if (!content.includes(`#include <${header}>`)) {
            if (missingHeaderOnce.has(header)) continue;
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
