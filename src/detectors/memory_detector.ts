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
    
    // 改进的内存泄漏检测，支持更复杂的所有权转移模式
    const mallocMatches = content.match(/(\w+)\s*=\s*malloc\s*\(/g) || [];
    
    for (const mallocMatch of mallocMatches) {
      const varMatch = mallocMatch.match(/(\w+)\s*=/);
      if (!varMatch) continue;
      const varName = varMatch[1];
      
      // 检查是否存在合法的所有权转移
      if (this.hasValidOwnershipTransfer(content, varName)) {
        continue; // 认为不构成当前函数内的泄漏
      }
      
      // 检查是否有对应的free调用
      if (!this.hasMatchingFree(content, varName)) {
        // 找到malloc出现的第一行
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(mallocMatch)) {
            issues.push({
              file: context.filePath,
              line: i + 1,
              category: 'Memory leak',
              message: `内存泄漏：变量 '${varName}' 分配内存后未释放`,
              codeLine: lines[i]
            });
            break;
          }
        }
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
    
    // 6. 条件赋值：if (condition) { varName = malloc(...); } else { return varName; }
    // 这种情况比较复杂，暂时不处理
    
    return false;
  }
  
  private hasMatchingFree(content: string, varName: string): boolean {
    // 检查是否有对应的free调用
    const freePatterns = [
      new RegExp(`free\\s*\\(\\s*${varName}\\s*\\)`),
      new RegExp(`free\\s*\\(\\s*&?${varName}\\s*\\)`)
    ];
    
    for (const pattern of freePatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }
    
    return false;
  }
}
