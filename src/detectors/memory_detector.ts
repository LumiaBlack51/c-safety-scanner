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
    
    const mallocMatches = content.match(/(\w+)\s*=\s*malloc\s*\(/g) || [];
    
    for (const mallocMatch of mallocMatches) {
      const varMatch = mallocMatch.match(/(\w+)\s*=/);
      if (!varMatch) continue;
      const varName = varMatch[1];
      
      // 所有权返回：return varName; 或 return (varName);
      const returnedOwnership = new RegExp(`\\breturn\\s+\\(?\\*?${varName}\\)?\\s*;`).test(content);
      // 输出参数转移：*out = varName; 或 out->ptr = varName;
      const assignedToOut = new RegExp(`\\*?\\w+\\s*(->\\w+)?\\s*=\\s*${varName}\\b`).test(content);
      
      if (returnedOwnership || assignedToOut) {
        continue; // 认为不构成当前函数内的泄漏
      }
      
      if (!content.includes(`free(${varName})`)) {
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
}
