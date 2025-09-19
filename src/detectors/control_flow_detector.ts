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
      
      // 检测明显的死循环模式
      const isForInfinite = /for\s*\(\s*;\s*;\s*\)/.test(line);
      const isWhileInfinite = /while\s*\(\s*1\s*\)/.test(line);
      
      if (!(isForInfinite || isWhileInfinite)) continue;
      
      // 如果循环体中存在 break; 则不报告
      const hasBreak = this.loopBodyHasBreak(context.lines, i);
      if (hasBreak) continue;
      
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
  
  private loopBodyHasBreak(lines: string[], loopStartIndex: number): boolean {
    const startLine = lines[loopStartIndex];
    let i = loopStartIndex;
    let braceDepth = 0;
    let started = false;
    
    // 扫描最多200行作为上限，避免极端文件
    const LIMIT = Math.min(lines.length, loopStartIndex + 200);
    
    // 如果当前行或后续行出现 '{' 则进入块扫描模式；否则尝试一行语句模式
    for (; i < LIMIT; i++) {
      const line = this.stripLineComments(lines[i]);
      if (!started) {
        if (line.includes('{')) {
          started = true;
          braceDepth += this.countChar(line, '{');
          braceDepth -= this.countChar(line, '}');
          if (/(\bbreak\s*;|\breturn\b|\bexit\s*\(|\bgoto\s+\w+)/.test(line)) return true;
          if (braceDepth === 0) break; // 单行块
        } else if (i === loopStartIndex) {
          // 可能是无花括号的单语句循环体，检查下一行及之后连续非空行直至分号结束
          const nextIdx = i + 1;
          if (nextIdx < lines.length) {
            const nextLine = this.stripLineComments(lines[nextIdx]);
            if (/(\bbreak\s*;|\breturn\b|\bexit\s*\(|\bgoto\s+\w+)/.test(nextLine)) return true;
          }
          return false;
        }
      } else {
        // 已进入块
        if (/(\bbreak\s*;|\breturn\b|\bexit\s*\(|\bgoto\s+\w+)/.test(line)) return true;
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
