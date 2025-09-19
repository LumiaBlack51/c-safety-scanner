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
      
      // 检查printf格式不匹配
      const printfMatch = line.match(/printf\s*\(\s*"([^"]*)"(.*)?\)/);
      if (printfMatch) {
        const format = printfMatch[1];
        const args = printfMatch[2] || '';
        
        const formatSpecifiers = format.match(/%[sdioxXeEfFgGaAcpn%]/g) || [];
        const argCount = args.split(',').filter(arg => arg.trim()).length;
        
        if (formatSpecifiers.length !== argCount) {
          issues.push({
            file: context.filePath,
            line: i + 1,
            category: 'Format',
            message: `printf格式字符串参数不匹配：需要${formatSpecifiers.length}个参数，提供了${argCount}个`,
            codeLine: line
          });
        }
      }
      
      // 检查scanf缺少&符号
      if (/scanf\s*\([^&]*\w+\s*\)/.test(line) && !line.includes('&')) {
        issues.push({
          file: context.filePath,
          line: i + 1,
          category: 'Format',
          message: 'scanf参数缺少地址操作符&',
          codeLine: line
        });
      }
      
      // 检查sprintf/snprintf格式问题
      const sprintfMatch = line.match(/sprintf\s*\(\s*[^,]+,\s*"([^"]*)"(.*)?\)/);
      if (sprintfMatch) {
        const format = sprintfMatch[1];
        const args = sprintfMatch[2] || '';
        
        const formatSpecifiers = format.match(/%[sdioxXeEfFgGaAcpn%]/g) || [];
        const argCount = args.split(',').filter(arg => arg.trim()).length;
        
        if (formatSpecifiers.length !== argCount) {
          issues.push({
            file: context.filePath,
            line: i + 1,
            category: 'Format',
            message: `sprintf格式字符串参数不匹配：需要${formatSpecifiers.length}个参数，提供了${argCount}个`,
            codeLine: line
          });
        }
      }
      
      // 检查fprintf格式问题
      const fprintfMatch = line.match(/fprintf\s*\(\s*[^,]+,\s*"([^"]*)"(.*)?\)/);
      if (fprintfMatch) {
        const format = fprintfMatch[1];
        const args = fprintfMatch[2] || '';
        
        const formatSpecifiers = format.match(/%[sdioxXeEfFgGaAcpn%]/g) || [];
        const argCount = args.split(',').filter(arg => arg.trim()).length;
        
        if (formatSpecifiers.length !== argCount) {
          issues.push({
            file: context.filePath,
            line: i + 1,
            category: 'Format',
            message: `fprintf格式字符串参数不匹配：需要${formatSpecifiers.length}个参数，提供了${argCount}个`,
            codeLine: line
          });
        }
      }
    }
    
    return issues;
  }
}
