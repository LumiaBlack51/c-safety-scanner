/**
 * 内存管理检测器模块
 * 检测内存泄漏等问题
 */

import { BaseDetector, DetectionContext } from './base_detector';
import { Issue } from '../interfaces/types';

export class MemoryDetector extends BaseDetector {
  constructor(config: any, enabled: boolean = true) {
    super(config, enabled);
  }
  
  getName(): string {
    return 'MemoryDetector';
  }
  
  getDescription(): string {
    return '检测内存泄漏等内存管理问题';
  }
  
  async detect(context: DetectionContext): Promise<Issue[]> {
    if (!this.enabled || !this.config.memoryLeaks) return [];
    
    const issues: Issue[] = [];
    
    try {
      issues.push(...this.detectMemoryLeaks(context));
    } catch (error) {
      console.error('MemoryDetector检测错误:', error);
    }
    
    return issues;
  }
  
  private detectMemoryLeaks(context: DetectionContext): Issue[] {
    const issues: Issue[] = [];
    const content = context.content;
    const lines = context.lines;
    
    // 更全面的内存分配函数检测
    const allocationPatterns = [
      /(\w+)\s*=\s*malloc\s*\(/g,
      /(\w+)\s*=\s*calloc\s*\(/g,
      /(\w+)\s*=\s*realloc\s*\(/g,
      /(\w+)\s*=\s*strdup\s*\(/g,
      /(\w+)\s*=\s*strndup\s*\(/g,
    ];
    
    const allocatedVars = new Map<string, {line: number, type: string}>();
    
    // 收集所有内存分配
    for (const pattern of allocationPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const varName = match[1];
        const allocationType = match[0].includes('malloc') ? 'malloc' :
                             match[0].includes('calloc') ? 'calloc' :
                             match[0].includes('realloc') ? 'realloc' :
                             match[0].includes('strdup') ? 'strdup' : 'strndup';
        
        // 找到分配的行号
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(match[0])) {
            allocatedVars.set(varName, {line: i, type: allocationType});
            break;
          }
        }
      }
    }
    
    // 检查每个分配的内存是否有对应的释放
    for (const [varName, info] of allocatedVars) {
      // 检查是否存在合法的所有权转移
      if (this.hasValidOwnershipTransfer(content, varName)) {
        continue; // 认为不构成当前函数内的泄漏
      }
      
      // 检查是否有对应的free调用
      if (!this.hasMatchingFree(content, varName)) {
        issues.push({
          file: context.filePath,
          line: info.line + 1,
          category: 'Memory leak',
          message: `内存泄漏：变量 '${varName}' 分配内存后未释放`,
          codeLine: lines[info.line]
        });
      }
    }
    
    return issues;
  }
  
  private hasValidOwnershipTransfer(content: string, varName: string): boolean {
    // 1. 函数返回值转移：return varName; 或 return (varName);
    const returnPatterns = [
      new RegExp(`\\breturn\\s+${varName}\\s*;`),
      new RegExp(`\\breturn\\s*\\(\\s*${varName}\\s*\\)\\s*;`),
      new RegExp(`\\breturn\\s+\\*?${varName}\\s*;`),
      new RegExp(`\\breturn\\s*\\(\\s*\\*?${varName}\\s*\\)\\s*;`)
    ];
    
    for (const pattern of returnPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    // 2. 输出参数转移：*out = varName; 或 out->ptr = varName;
    const outputPatterns = [
      new RegExp(`\\*\\w+\\s*=\\s*${varName}\\b`),
      new RegExp(`\\w+->\\w+\\s*=\\s*${varName}\\b`),
      new RegExp(`\\w+\\.\\w+\\s*=\\s*${varName}\\b`)
    ];
    
    for (const pattern of outputPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    // 3. 结构体成员赋值：struct.member = varName;
    const structPatterns = [
      new RegExp(`\\w+\\.\\w+\\s*=\\s*${varName}\\b`),
      new RegExp(`\\w+->\\w+\\s*=\\s*${varName}\\b`)
    ];
    
    for (const pattern of structPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    // 4. 数组赋值：array[index] = varName;
    const arrayPatterns = [
      new RegExp(`\\w+\\[\\d+\\]\\s*=\\s*${varName}\\b`),
      new RegExp(`\\w+\\[\\w+\\]\\s*=\\s*${varName}\\b`)
    ];
    
    for (const pattern of arrayPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    // 5. 函数调用参数传递：func(varName) 或 func(..., varName, ...)
    const functionCallPatterns = [
      new RegExp(`\\w+\\s*\\([^)]*\\b${varName}\\b[^)]*\\)`),
      new RegExp(`\\w+\\s*\\(\\s*${varName}\\s*\\)`)
    ];
    
    for (const pattern of functionCallPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    // 6. 全局变量赋值：global_var = varName;
    const globalPatterns = [
      new RegExp(`\\w+\\s*=\\s*${varName}\\s*;`),
      new RegExp(`\\w+\\s*=\\s*${varName}\\s*$`)
    ];
    
    for (const pattern of globalPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    // 7. 条件赋值：if (condition) { varName = malloc(...); } else { return varName; }
    // 这种情况比较复杂，暂时不处理
    
    return false;
  }
  
  private hasMatchingFree(content: string, varName: string): boolean {
    // 检查是否有对应的free调用
    const freePatterns = [
      new RegExp(`free\\s*\\(\\s*${varName}\\s*\\)`),
      new RegExp(`free\\s*\\(\\s*&?${varName}\\s*\\)`),
      new RegExp(`free\\s*\\(\\s*\\([^)]*\\)\\s*${varName}\\s*\\)`), // free((type)varName)
      new RegExp(`free\\s*\\(\\s*${varName}\\s*\\([^)]*\\)\\s*\\)`), // free(varName(...))
    ];
    
    for (const pattern of freePatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    return false;
  }
}
