/**
 * 控制流检测器模块
 * 检测死循环等问题
 */

import { BaseDetector, DetectionContext } from './base_detector';
import { Issue } from '../interfaces/types';

export class ControlFlowDetector extends BaseDetector {
  constructor(config: any, enabled: boolean = true) {
    super(config, enabled);
  }
  
  getName(): string {
    return 'ControlFlowDetector';
  }
  
  getDescription(): string {
    return '检测死循环等控制流问题';
  }
  
  async detect(context: DetectionContext): Promise<Issue[]> {
    if (!this.enabled || !this.config.deadLoops) return [];
    
    const issues: Issue[] = [];
    
    try {
      // 使用启发式方法检测死循环
      issues.push(...this.detectDeadLoops(context));
    } catch (error) {
      console.error('ControlFlowDetector检测错误:', error);
    }
    
    return issues;
  }
  
  private detectDeadLoops(context: DetectionContext): Issue[] {
    const issues: Issue[] = [];
    
    for (let i = 0; i < context.lines.length; i++) {
      const line = context.lines[i];
      const cleanLine = this.stripLineComments(line);
      
      // 检测各种死循环模式
      const loopPatterns = [
        // for循环死循环
        /for\s*\(\s*;\s*;\s*\)/,  // for(;;)
        /for\s*\(\s*;\s*;\s*\)\s*{/,  // for(;;) {
        /for\s*\(\s*;\s*;\s*\)\s*$/,  // for(;;) (行尾)
        
        // while循环死循环
        /while\s*\(\s*1\s*\)/,  // while(1)
        /while\s*\(\s*1\s*\)\s*{/,  // while(1) {
        /while\s*\(\s*1\s*\)\s*$/,  // while(1) (行尾)
        /while\s*\(\s*true\s*\)/,  // while(true)
        /while\s*\(\s*true\s*\)\s*{/,  // while(true) {
        /while\s*\(\s*true\s*\)\s*$/,  // while(true) (行尾)
        
        // do-while循环死循环
        /do\s*{/,  // do {
        /do\s*$/,  // do (行尾)
      ];
      
      let foundLoop = false;
      let loopType = '';
      
      for (const pattern of loopPatterns) {
        if (pattern.test(cleanLine)) {
          foundLoop = true;
          if (pattern.source.includes('for')) {
            loopType = 'for';
          } else if (pattern.source.includes('while')) {
            loopType = 'while';
          } else if (pattern.source.includes('do')) {
            loopType = 'do-while';
          }
          break;
        }
      }
      
      if (!foundLoop) continue;
      
      // 检查循环体中是否有退出条件
      const hasExitCondition = this.loopBodyHasExitCondition(context.lines, i, loopType);
      if (hasExitCondition) continue;
      
      issues.push({
        file: context.filePath,
        line: i + 1,
        category: 'Dead loop',
        message: '检测到可能的死循环',
        codeLine: line
      });
    }
    
    return issues;
  }
  
  private loopBodyHasExitCondition(lines: string[], loopStartIndex: number, loopType: string): boolean {
    let i = loopStartIndex;
    let braceDepth = 0;
    let started = false;
    
    // 扫描最多200行作为上限，避免极端文件
    const LIMIT = Math.min(lines.length, loopStartIndex + 200);
    
    // 退出条件模式
    const exitPatterns = [
      /\bbreak\s*;/,  // break;
      /\breturn\b/,   // return
      /\bexit\s*\(/,  // exit(
      /\bgoto\s+\w+/, // goto label
      /\bcontinue\s*;/, // continue;
    ];
    
    // 如果当前行或后续行出现 '{' 则进入块扫描模式；否则尝试一行语句模式
    for (; i < LIMIT; i++) {
      const line = this.stripLineComments(lines[i]);
      
      if (!started) {
        if (line.includes('{')) {
          started = true;
          braceDepth += this.countChar(line, '{');
          braceDepth -= this.countChar(line, '}');
          
          // 检查当前行是否有退出条件
          for (const pattern of exitPatterns) {
            if (pattern.test(line)) return true;
          }
          
          if (braceDepth === 0) break; // 单行块
        } else if (i === loopStartIndex) {
          // 可能是无花括号的单语句循环体，检查下一行及之后连续非空行直至分号结束
          const nextIdx = i + 1;
          if (nextIdx < lines.length) {
            const nextLine = this.stripLineComments(lines[nextIdx]);
            for (const pattern of exitPatterns) {
              if (pattern.test(nextLine)) return true;
            }
          }
          return false;
        }
      } else {
        // 已进入块
        for (const pattern of exitPatterns) {
          if (pattern.test(line)) return true;
        }
        
        braceDepth += this.countChar(line, '{');
        braceDepth -= this.countChar(line, '}');
        if (braceDepth <= 0) break;
      }
    }
    
    return false;
  }
  
  private countChar(s: string, ch: string): number {
    let c = 0;
    for (let i = 0; i < s.length; i++) if (s[i] === ch) c++;
    return c;
  }
  
  private stripLineComments(s: string): string {
    const idx = s.indexOf('//');
    return idx >= 0 ? s.slice(0, idx) : s;
  }
}
