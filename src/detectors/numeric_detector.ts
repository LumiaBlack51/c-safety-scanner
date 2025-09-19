/**
 * 数值检测器模块
 * 检测数值范围溢出等问题
 */

import { BaseDetector, DetectionContext } from './base_detector';
import { Issue } from '../interfaces/types';

export class NumericDetector extends BaseDetector {
  constructor(config: any, enabled: boolean = true) {
    super(config, enabled);
  }
  
  getName(): string {
    return 'NumericDetector';
  }
  
  getDescription(): string {
    return '检测数值范围溢出等数值问题';
  }
  
  async detect(context: DetectionContext): Promise<Issue[]> {
    if (!this.enabled || !this.config.numericRange) return [];
    
    const issues: Issue[] = [];
    
    try {
      issues.push(...this.detectNumericRange(context));
    } catch (error) {
      console.error('NumericDetector检测错误:', error);
    }
    
    return issues;
  }
  
  private detectNumericRange(context: DetectionContext): Issue[] {
    const issues: Issue[] = [];
    const lines = context.lines;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查char类型溢出
      if (/char\s+\w+\s*=\s*(\d+)/.test(line)) {
        const match = line.match(/char\s+\w+\s*=\s*(\d+)/);
        if (match) {
          const value = parseInt(match[1]);
          if (value > 127 || value < -128) {
            issues.push({
              file: context.filePath,
              line: i + 1,
              category: 'Range overflow',
              message: `char类型数值溢出：${value} 超出范围(-128到127)`,
              codeLine: line
            });
          }
        }
      }
      
      // 检查unsigned char类型溢出
      if (/unsigned\s+char\s+\w+\s*=\s*(\d+)/.test(line)) {
        const match = line.match(/unsigned\s+char\s+\w+\s*=\s*(\d+)/);
        if (match) {
          const value = parseInt(match[1]);
          if (value > 255 || value < 0) {
            issues.push({
              file: context.filePath,
              line: i + 1,
              category: 'Range overflow',
              message: `unsigned char类型数值溢出：${value} 超出范围(0到255)`,
              codeLine: line
            });
          }
        }
      }
      
      // 检查short类型溢出
      if (/short\s+\w+\s*=\s*(\d+)/.test(line)) {
        const match = line.match(/short\s+\w+\s*=\s*(\d+)/);
        if (match) {
          const value = parseInt(match[1]);
          if (value > 32767 || value < -32768) {
            issues.push({
              file: context.filePath,
              line: i + 1,
              category: 'Range overflow',
              message: `short类型数值溢出：${value} 超出范围(-32768到32767)`,
              codeLine: line
            });
          }
        }
      }
      
      // 检查unsigned short类型溢出
      if (/unsigned\s+short\s+\w+\s*=\s*(\d+)/.test(line)) {
        const match = line.match(/unsigned\s+short\s+\w+\s*=\s*(\d+)/);
        if (match) {
          const value = parseInt(match[1]);
          if (value > 65535 || value < 0) {
            issues.push({
              file: context.filePath,
              line: i + 1,
              category: 'Range overflow',
              message: `unsigned short类型数值溢出：${value} 超出范围(0到65535)`,
              codeLine: line
            });
          }
        }
      }
    }
    
    return issues;
  }
}
