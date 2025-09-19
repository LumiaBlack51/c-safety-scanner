/**
 * 变量检测器模块
 * 检测未初始化变量、野指针、空指针等问题
 */

import { BaseDetector, DetectionContext } from './base_detector';
import { Issue } from '../interfaces/types';
import { CASTParser } from '../core/ast_parser';

export class VariableDetector extends BaseDetector {
  private astParser: CASTParser | null = null;
  
  constructor(config: any, enabled: boolean = true) {
    super(config, enabled);
  }
  
  getName(): string {
    return 'VariableDetector';
  }
  
  getDescription(): string {
    return '检测未初始化变量、野指针、空指针等问题';
  }
  
  async detect(context: DetectionContext): Promise<Issue[]> {
    if (!this.enabled) return [];
    
    const issues: Issue[] = [];
    
    try {
      // 初始化AST解析器
      if (!this.astParser) {
        this.astParser = await CASTParser.create();
      }
      
      // 使用AST进行检测
      if (context.ast && this.astParser) {
        issues.push(...await this.detectWithAST(context));
      } else {
        // 回退到启发式检测
        issues.push(...this.detectWithHeuristic(context));
      }
    } catch (error) {
      console.error('VariableDetector检测错误:', error);
      // 回退到启发式检测
      issues.push(...this.detectWithHeuristic(context));
    }
    
    return issues;
  }
  
  private async detectWithAST(context: DetectionContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    if (!this.astParser || !context.ast) return issues;
    
    try {
      const declarations = this.astParser.extractVariableDeclarations(context.ast, context.lines);
      
      for (const decl of declarations) {
        // 未初始化变量检测
        if (this.config.uninitializedVariables && !decl.isInitialized && !decl.isParameter && !decl.isGlobal) {
          const usages = this.astParser.findVariableUsages(context.ast, decl.name);
          for (const usage of usages) {
            if (usage.row > decl.position.row) {
              issues.push({
                file: context.filePath,
                line: decl.position.row + 1,
                category: 'Uninitialized',
                message: `变量 '${decl.name}' 声明后未初始化`,
                codeLine: context.lines[decl.position.row] || ''
              });
              break;
            }
          }
        }
        
        // 野指针检测
        if (this.config.wildPointers && decl.isPointer && !decl.isInitialized && !decl.isParameter) {
          const dereferences = this.astParser.findPointerDereferences(context.ast, decl.name);
          for (const deref of dereferences) {
            if (deref.row > decl.position.row) {
              issues.push({
                file: context.filePath,
                line: deref.row + 1,
                category: 'Wild pointer',
                message: `野指针解引用：指针 '${decl.name}' 未初始化`,
                codeLine: context.lines[deref.row] || ''
              });
            }
          }
        }
        
        // 空指针检测
        if (this.config.nullPointers && decl.isPointer && context.lines[decl.position.row].includes('NULL')) {
          const dereferences = this.astParser.findPointerDereferences(context.ast, decl.name);
          for (const deref of dereferences) {
            if (deref.row > decl.position.row) {
              issues.push({
                file: context.filePath,
                line: deref.row + 1,
                category: 'Null pointer',
                message: `空指针解引用：指针 '${decl.name}' 为 NULL`,
                codeLine: context.lines[deref.row] || ''
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('AST变量检测错误:', error);
    }
    
    return issues;
  }
  
  private detectWithHeuristic(context: DetectionContext): Issue[] {
    const issues: Issue[] = [];
    
    // 未初始化变量检测
    if (this.config.uninitializedVariables) {
      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        
        if (/\b(int|char|float|double|short|long)\s+\w+\s*;/.test(line) && 
            !line.includes('=') && 
            !line.includes('extern')) {
          issues.push({
            file: context.filePath,
            line: i + 1,
            category: 'Uninitialized',
            message: '变量声明后未初始化',
            codeLine: line
          });
        }
      }
    }
    
    // 野指针检测
    if (this.config.wildPointers) {
      const pointerDeclarations = new Map<string, number>();
      
      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        
        // 找到指针声明
        const pointerMatch = line.match(/\b(\w+)\s*\*\s*(\w+)\s*;/);
        if (pointerMatch) {
          const pointerName = pointerMatch[2];
          if (!line.includes('=')) {
            pointerDeclarations.set(pointerName, i);
          }
        }
        
        // 检查解引用
        for (const [pointerName, declLine] of pointerDeclarations) {
          if (i > declLine) {
            const seg = this.stripLineComments(context.lines[i]);
            // 检查是否在声明后有初始化
            let initialized = false;
            for (let k = declLine + 1; k < i; k++) {
              const mid = this.stripLineComments(context.lines[k]);
              if (new RegExp(`\\b${pointerName}\\s*=\\s*&?\\w+`).test(mid)) { 
                initialized = true; 
                break; 
              }
              if (new RegExp(`\\b${pointerName}\\s*=\\s*malloc\\s*\\(`).test(mid)) { 
                initialized = true; 
                break; 
              }
            }
            if (initialized) continue;
            
            if (seg.includes(`*${pointerName}`)) {
              issues.push({
                file: context.filePath,
                line: i + 1,
                category: 'Wild pointer',
                message: `野指针解引用：指针 '${pointerName}' 未初始化`,
                codeLine: context.lines[i]
              });
            }
          }
        }
      }
    }
    
    // 空指针检测
    if (this.config.nullPointers) {
      const nullPointers = new Map<string, number>();
      
      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        
        // 找到NULL指针赋值
        const nullMatch = line.match(/(\w+)\s*=\s*(NULL|0)\s*;/);
        if (nullMatch) {
          nullPointers.set(nullMatch[1], i);
        }
        
        // 检查解引用
        for (const [pointerName, declLine] of nullPointers) {
          if (i > declLine) {
            // 检查之后是否有非空赋值
            let becameNonNull = false;
            for (let k = declLine + 1; k < i; k++) {
              const mid = this.stripLineComments(context.lines[k]);
              if (new RegExp(`\\b${pointerName}\\s*=\\s*&?\\w+`).test(mid)) { 
                becameNonNull = true; 
                break; 
              }
              if (new RegExp(`\\b${pointerName}\\s*=\\s*malloc\\s*\\(`).test(mid)) { 
                becameNonNull = true; 
                break; 
              }
            }
            if (becameNonNull) continue;
            
            const seg = this.stripLineComments(context.lines[i]);
            if (seg.includes(`*${pointerName}`)) {
              issues.push({
                file: context.filePath,
                line: i + 1,
                category: 'Null pointer',
                message: `空指针解引用：指针 '${pointerName}' 为 NULL`,
                codeLine: context.lines[i]
              });
            }
          }
        }
      }
    }
    
    return issues;
  }
  
  private stripLineComments(s: string): string {
    const idx = s.indexOf('//');
    return idx >= 0 ? s.slice(0, idx) : s;
  }
}
