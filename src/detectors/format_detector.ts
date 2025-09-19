/**
 * 格式字符串检测器模块
 * 检测printf/scanf格式字符串问题
 */

import { BaseDetector, DetectionContext } from './base_detector';
import { Issue } from '../interfaces/types';

export class FormatDetector extends BaseDetector {
  constructor(config: any, enabled: boolean = true) {
    super(config, enabled);
  }
  
  getName(): string {
    return 'FormatDetector';
  }
  
  getDescription(): string {
    return '检测printf/scanf格式字符串问题';
  }
  
  async detect(context: DetectionContext): Promise<Issue[]> {
    if (!this.enabled || !this.config.formatStrings) return [];
    
    const issues: Issue[] = [];
    
    try {
      issues.push(...this.detectFormatStrings(context));
    } catch (error) {
      console.error('FormatDetector检测错误:', error);
    }
    
    return issues;
  }
  
  private detectFormatStrings(context: DetectionContext): Issue[] {
    const issues: Issue[] = [];
    const lines = context.lines;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = this.stripLineComments(line);
      
      // 检查printf格式不匹配
      this.checkPrintfFormat(cleanLine, i, context, issues);
      
      // 检查scanf格式问题
      this.checkScanfFormat(cleanLine, i, context, issues);
      
      // 检查sprintf/snprintf格式问题
      this.checkSprintfFormat(cleanLine, i, context, issues);
      
      // 检查fprintf格式问题
      this.checkFprintfFormat(cleanLine, i, context, issues);
    }
    
    return issues;
  }
  
  private checkPrintfFormat(line: string, lineIndex: number, context: DetectionContext, issues: Issue[]): void {
    // 更精确的printf匹配
    const printfPatterns = [
      /printf\s*\(\s*"([^"]*)"\s*\)/,  // printf("format")
      /printf\s*\(\s*"([^"]*)"\s*,\s*(.+)\)/,  // printf("format", args)
      /printf\s*\(\s*'([^']*)'\s*\)/,  // printf('format')
      /printf\s*\(\s*'([^']*)'\s*,\s*(.+)\)/,  // printf('format', args)
    ];
    
    for (const pattern of printfPatterns) {
      const match = line.match(pattern);
      if (match) {
        const format = match[1];
        const args = match[2] || '';
        
        // 更精确的格式说明符匹配
        const formatSpecifiers = this.extractFormatSpecifiers(format);
        const argCount = this.countArguments(args);
        
        if (formatSpecifiers.length !== argCount) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Format',
            message: `printf格式字符串参数不匹配：需要${formatSpecifiers.length}个参数，提供了${argCount}个`,
            codeLine: context.lines[lineIndex]
          });
        }
        break; // 找到匹配就退出
      }
    }
  }
  
  private checkScanfFormat(line: string, lineIndex: number, context: DetectionContext, issues: Issue[]): void {
    // 更精确的scanf匹配
    const scanfPatterns = [
      /scanf\s*\(\s*"([^"]*)"\s*,\s*(.+)\)/,  // scanf("format", args)
      /scanf\s*\(\s*'([^']*)'\s*,\s*(.+)\)/,  // scanf('format', args)
    ];
    
    for (const pattern of scanfPatterns) {
      const match = line.match(pattern);
      if (match) {
        const format = match[1];
        const args = match[2];
        
        // 检查格式说明符
        const formatSpecifiers = this.extractFormatSpecifiers(format);
        const argCount = this.countArguments(args);
        
        if (formatSpecifiers.length !== argCount) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Format',
            message: `scanf格式字符串参数不匹配：需要${formatSpecifiers.length}个参数，提供了${argCount}个`,
            codeLine: context.lines[lineIndex]
          });
        }
        
        // 检查是否缺少&符号
        this.checkMissingAmpersand(args, lineIndex, context, issues);
        break;
      }
    }
  }
  
  private checkSprintfFormat(line: string, lineIndex: number, context: DetectionContext, issues: Issue[]): void {
    const sprintfPatterns = [
      /sprintf\s*\(\s*[^,]+,\s*"([^"]*)"\s*\)/,  // sprintf(buf, "format")
      /sprintf\s*\(\s*[^,]+,\s*"([^"]*)"\s*,\s*(.+)\)/,  // sprintf(buf, "format", args)
      /snprintf\s*\(\s*[^,]+,\s*[^,]+,\s*"([^"]*)"\s*\)/,  // snprintf(buf, size, "format")
      /snprintf\s*\(\s*[^,]+,\s*[^,]+,\s*"([^"]*)"\s*,\s*(.+)\)/,  // snprintf(buf, size, "format", args)
    ];
    
    for (const pattern of sprintfPatterns) {
      const match = line.match(pattern);
      if (match) {
        const format = match[1];
        const args = match[2] || '';
        
        const formatSpecifiers = this.extractFormatSpecifiers(format);
        const argCount = this.countArguments(args);
        
        if (formatSpecifiers.length !== argCount) {
          const funcName = line.includes('snprintf') ? 'snprintf' : 'sprintf';
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Format',
            message: `${funcName}格式字符串参数不匹配：需要${formatSpecifiers.length}个参数，提供了${argCount}个`,
            codeLine: context.lines[lineIndex]
          });
        }
        break;
      }
    }
  }
  
  private checkFprintfFormat(line: string, lineIndex: number, context: DetectionContext, issues: Issue[]): void {
    const fprintfPatterns = [
      /fprintf\s*\(\s*[^,]+,\s*"([^"]*)"\s*\)/,  // fprintf(file, "format")
      /fprintf\s*\(\s*[^,]+,\s*"([^"]*)"\s*,\s*(.+)\)/,  // fprintf(file, "format", args)
    ];
    
    for (const pattern of fprintfPatterns) {
      const match = line.match(pattern);
      if (match) {
        const format = match[1];
        const args = match[2] || '';
        
        const formatSpecifiers = this.extractFormatSpecifiers(format);
        const argCount = this.countArguments(args);
        
        if (formatSpecifiers.length !== argCount) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Format',
            message: `fprintf格式字符串参数不匹配：需要${formatSpecifiers.length}个参数，提供了${argCount}个`,
            codeLine: context.lines[lineIndex]
          });
        }
        break;
      }
    }
  }
  
  private extractFormatSpecifiers(format: string): string[] {
    // 更精确的格式说明符提取
    const specifiers: string[] = [];
    
    // 匹配各种格式说明符
    const patterns = [
      /%[0-9]*\.[0-9]*[lh]?[sdioxXeEfFgGaAcpn%]/g,  // 带宽度和精度的
      /%[0-9]*[lh]?[sdioxXeEfFgGaAcpn%]/g,  // 带宽度的
      /%[lh]?[sdioxXeEfFgGaAcpn%]/g,  // 基本格式说明符
    ];
    
    for (const pattern of patterns) {
      const matches = format.match(pattern);
      if (matches) {
        for (const match of matches) {
          if (match !== '%%') {  // 排除%%
            specifiers.push(match);
          }
        }
      }
    }
    
    return specifiers;
  }
  
  private countArguments(args: string): number {
    if (!args.trim()) return 0;
    
    // 更精确的参数计数
    let count = 0;
    let depth = 0;
    let inString = false;
    let inChar = false;
    let i = 0;
    
    while (i < args.length) {
      const char = args[i];
      
      if (char === '"' && !inChar) {
        inString = !inString;
      } else if (char === "'" && !inString) {
        inChar = !inChar;
      } else if (!inString && !inChar) {
        if (char === '(') {
          depth++;
        } else if (char === ')') {
          depth--;
        } else if (char === ',' && depth === 0) {
          count++;
        }
      }
      i++;
    }
    
    return count + 1; // 最后一个参数没有逗号
  }
  
  private checkMissingAmpersand(args: string, lineIndex: number, context: DetectionContext, issues: Issue[]): void {
    // 检查scanf参数是否缺少&符号
    const argList = args.split(',').map(arg => arg.trim());
    
    for (const arg of argList) {
      // 检查是否是变量名（不是&var, 不是数组名, 不是字符串字面量）
      if (/^\w+$/.test(arg) && 
          !arg.startsWith('&') && 
          !arg.includes('[') && 
          !arg.includes('"') && 
          !arg.includes("'")) {
        issues.push({
          file: context.filePath,
          line: lineIndex + 1,
          category: 'Format',
          message: `scanf参数缺少地址操作符&`,
          codeLine: context.lines[lineIndex]
        });
        break; // 只报告第一个错误
      }
    }
  }
  
  private stripLineComments(s: string): string {
    const idx = s.indexOf('//');
    return idx >= 0 ? s.slice(0, idx) : s;
  }
}
