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
      
      // 改进的数值范围检测，更精确地识别类型
      this.checkNumericOverflow(context, line, i, issues);
    }
    
    return issues;
  }
  
  private checkNumericOverflow(context: DetectionContext, line: string, lineIndex: number, issues: Issue[]): void {
    // 移除注释部分
    const cleanLine = this.stripLineComments(line);
    
    // 首先检查unsigned类型（优先级最高）
    const unsignedPatterns = [
      {
        regex: /^\s*\bunsigned\s+char\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'unsigned char',
        min: 0,
        max: 255
      },
      {
        regex: /^\s*\bunsigned\s+short\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'unsigned short',
        min: 0,
        max: 65535
      },
      {
        regex: /^\s*\bunsigned\s+int\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'unsigned int',
        min: 0,
        max: 4294967295
      }
    ];
    
    // 检查unsigned类型
    for (const pattern of unsignedPatterns) {
      const match = cleanLine.match(pattern.regex);
      if (match) {
        const varName = match[1];
        const value = parseInt(match[2]);
        
        if (value < pattern.min || value > pattern.max) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Range overflow',
            message: `${pattern.type}类型数值溢出：${value} 超出范围(${pattern.min}到${pattern.max})`,
            codeLine: line
          });
        }
        return; // 找到匹配就返回，避免重复检查
      }
    }
    
    // 然后检查signed类型（确保不匹配unsigned）
    const signedPatterns = [
      {
        regex: /^\s*\bchar\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'char',
        min: -128,
        max: 127
      },
      {
        regex: /^\s*\bshort\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'short',
        min: -32768,
        max: 32767
      },
      {
        regex: /^\s*\bint\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'int',
        min: -2147483648,
        max: 2147483647
      }
    ];
    
    // 检查signed类型
    for (const pattern of signedPatterns) {
      const match = cleanLine.match(pattern.regex);
      if (match) {
        const varName = match[1];
        const value = parseInt(match[2]);
        
        if (value < pattern.min || value > pattern.max) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Range overflow',
            message: `${pattern.type}类型数值溢出：${value} 超出范围(${pattern.min}到${pattern.max})`,
            codeLine: line
          });
        }
        return; // 找到匹配就返回
      }
    }
    
    // 检查八进制和十六进制数值
    this.checkOctalHexOverflow(context, cleanLine, lineIndex, issues);
  }
  
  private checkOctalHexOverflow(context: DetectionContext, line: string, lineIndex: number, issues: Issue[]): void {
    // 检查八进制数值 (0开头)
    const octalPatterns = [
      {
        regex: /^[^=]*\bchar\s+(\w+)\s*=\s*0(\d+)\s*;?\s*$/,
        type: 'char',
        min: -128,
        max: 127,
        isUnsigned: false
      },
      {
        regex: /^[^=]*\bunsigned\s+char\s+(\w+)\s*=\s*0(\d+)\s*;?\s*$/,
        type: 'unsigned char',
        min: 0,
        max: 255,
        isUnsigned: true
      }
    ];
    
    for (const pattern of octalPatterns) {
      const match = line.match(pattern.regex);
      if (match) {
        const varName = match[1];
        const octalStr = match[2];
        const value = parseInt(octalStr, 8);
        
        if (value < pattern.min || value > pattern.max) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Range overflow',
            message: `${pattern.type}类型八进制数值溢出：0${octalStr} (${value}) 超出范围(${pattern.min}到${pattern.max})`,
            codeLine: line
          });
        }
      }
    }
    
    // 检查十六进制数值 (0x开头)
    const hexPatterns = [
      {
        regex: /^[^=]*\bchar\s+(\w+)\s*=\s*0x([0-9a-fA-F]+)\s*;?\s*$/,
        type: 'char',
        min: -128,
        max: 127,
        isUnsigned: false
      },
      {
        regex: /^[^=]*\bunsigned\s+char\s+(\w+)\s*=\s*0x([0-9a-fA-F]+)\s*;?\s*$/,
        type: 'unsigned char',
        min: 0,
        max: 255,
        isUnsigned: true
      }
    ];
    
    for (const pattern of hexPatterns) {
      const match = line.match(pattern.regex);
      if (match) {
        const varName = match[1];
        const hexStr = match[2];
        const value = parseInt(hexStr, 16);
        
        if (value < pattern.min || value > pattern.max) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Range overflow',
            message: `${pattern.type}类型十六进制数值溢出：0x${hexStr} (${value}) 超出范围(${pattern.min}到${pattern.max})`,
            codeLine: line
          });
        }
      }
    }
  }
  
  private stripLineComments(s: string): string {
    const idx = s.indexOf('//');
    return idx >= 0 ? s.slice(0, idx) : s;
  }
}
