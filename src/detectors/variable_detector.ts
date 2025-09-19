/**
 * 变量检测器模块
 * 检测未初始化变量、野指针、空指针等问题
 */

import { BaseDetector, DetectionContext } from './base_detector';
import { Issue } from '../interfaces/types';
import { CASTParser, VariableDeclaration } from '../core/ast_parser';

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
      // 强制使用启发式检测，因为AST检测完全失效
      issues.push(...this.detectWithHeuristic(context));
    } catch (error) {
      console.error('VariableDetector检测错误:', error);
    }
    
    return issues;
  }
  
  private async detectWithAST(context: DetectionContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    if (!this.astParser || !context.ast) return issues;
    
    try {
      // 使用AST进行深度分析
      const declarations = this.astParser.extractVariableDeclarations(context.ast, context.lines);
      const functionCalls = this.astParser.extractFunctionCalls(context.ast);
      
      console.log(`    Found ${declarations.length} variable declarations`);
      console.log(`    Found ${functionCalls.length} function calls`);
      
      // 创建变量状态跟踪器
      const variableStates = new Map<string, {
        declaration: VariableDeclaration;
        isInitialized: boolean;
        isNull: boolean;
        lastAssignment: number;
        assignments: number[];
      }>();
      
      // 初始化变量状态
      for (const decl of declarations) {
        variableStates.set(decl.name, {
          declaration: decl,
          isInitialized: decl.isInitialized,
          isNull: false,
          lastAssignment: decl.position.row,
          assignments: []
        });
      }
      
      // 遍历AST节点，分析变量使用和赋值
      this.traverseAST(context.ast, (node) => {
        this.analyzeNodeForVariableIssues(node, variableStates, functionCalls, context, issues);
      });
      
      // 检查未初始化变量使用
      this.checkUninitializedVariables(variableStates, context, issues);
      
      // 检查野指针解引用
      this.checkWildPointerDereferences(variableStates, context, issues);
      
      // 检查空指针解引用
      this.checkNullPointerDereferences(variableStates, context, issues);
      
    } catch (error) {
      console.error('AST变量检测错误:', error);
    }
    
    return issues;
  }
  
  private traverseAST(node: any, callback: (node: any) => void): void {
    callback(node);
    if (node.children) {
      for (const child of node.children) {
        this.traverseAST(child, callback);
      }
    }
    if (node.namedChildren) {
      for (const child of node.namedChildren) {
        this.traverseAST(child, callback);
      }
    }
  }
  
  private analyzeNodeForVariableIssues(
    node: any, 
    variableStates: Map<string, any>, 
    functionCalls: any[], 
    context: DetectionContext, 
    issues: Issue[]
  ): void {
    const line = node.startPosition?.row || 0;
    
    // 分析赋值操作
    if (node.type === 'binary_expression' || node.type === 'compound_assignment') {
      this.analyzeAssignment(node, variableStates, line, context, issues);
    }
    
    // 分析函数调用
    if (node.type === 'call_expression') {
      this.analyzeFunctionCall(node, variableStates, line, context, issues);
    }
    
    // 分析变量使用
    if (node.type === 'identifier' || node.type === 'DeclRefExpr') {
      this.analyzeVariableUsage(node, variableStates, line, context, issues);
    }
    
    // 分析指针解引用
    if (node.type === 'unary_expression' || node.type === 'field_expression' || node.type === 'subscript_expression') {
      this.analyzePointerDereference(node, variableStates, line, context, issues);
    }
  }

  private checkUninitializedVariables(variableStates: Map<string, any>, context: DetectionContext, issues: Issue[]): void {
    for (const [varName, state] of variableStates) {
      if (!state.isInitialized && !state.declaration.isParameter && !state.declaration.isGlobal) {
        // 查找变量使用位置
        const usages = this.astParser!.findVariableUsages(context.ast, varName);
        console.log(`    Checking uninitialized variable '${varName}': found ${usages.length} usages`);
        
          for (const usage of usages) {
          if (usage.row > state.declaration.position.row) {
            // 检查是否在赋值之前使用
            const hasAssignmentBefore = state.assignments.some((assignLine: number) => assignLine < usage.row);
            if (!hasAssignmentBefore) {
              console.log(`    Found uninitialized usage of '${varName}' at line ${usage.row + 1}`);
              issues.push({
                file: context.filePath,
                line: usage.row + 1,
                category: 'Uninitialized',
                message: `变量 '${varName}' 在初始化前被使用`,
                codeLine: context.lines[usage.row] || ''
              });
            }
          }
        }
      }
    }
  }

  private checkWildPointerDereferences(variableStates: Map<string, any>, context: DetectionContext, issues: Issue[]): void {
    for (const [varName, state] of variableStates) {
      if (state.declaration.isPointer && !state.isInitialized && !state.declaration.isParameter) {
        // 查找指针解引用位置
        const dereferences = this.astParser!.findPointerDereferences(context.ast, varName);
        console.log(`    Checking wild pointer '${varName}': found ${dereferences.length} dereferences`);
        
          for (const deref of dereferences) {
          if (deref.row > state.declaration.position.row) {
            // 检查是否在赋值之前解引用
            const hasAssignmentBefore = state.assignments.some((assignLine: number) => assignLine < deref.row);
            if (!hasAssignmentBefore) {
              console.log(`    Found wild pointer dereference of '${varName}' at line ${deref.row + 1}`);
              issues.push({
                file: context.filePath,
                line: deref.row + 1,
                category: 'Wild pointer',
                message: `野指针解引用：指针 '${varName}' 未初始化`,
                codeLine: context.lines[deref.row] || ''
              });
            }
          }
        }
      }
    }
  }

  private checkNullPointerDereferences(variableStates: Map<string, any>, context: DetectionContext, issues: Issue[]): void {
    for (const [varName, state] of variableStates) {
      if (state.declaration.isPointer && state.isNull) {
        // 查找指针解引用位置
        const dereferences = this.astParser!.findPointerDereferences(context.ast, varName);
        
          for (const deref of dereferences) {
          if (deref.row > state.lastAssignment) {
              issues.push({
                file: context.filePath,
                line: deref.row + 1,
                category: 'Null pointer',
              message: `空指针解引用：指针 '${varName}' 为 NULL`,
                codeLine: context.lines[deref.row] || ''
              });
            }
          }
        }
      }
  }
  
  private analyzeAssignment(node: any, variableStates: Map<string, any>, line: number, context: DetectionContext, issues: Issue[]): void {
    // 检查赋值操作符
    const operator = node.text;
    if (operator === '=' || operator === '+=' || operator === '-=' || operator === '*=' || operator === '/=') {
      const leftOperand = node.namedChildren?.[0];
      if (leftOperand && (leftOperand.type === 'identifier' || leftOperand.type === 'DeclRefExpr')) {
        const varName = leftOperand.text;
        const state = variableStates.get(varName);
        if (state) {
          state.isInitialized = true;
          state.isNull = false;
          state.lastAssignment = line;
          state.assignments.push(line);
          
          // 检查是否赋值为NULL
          const rightOperand = node.namedChildren?.[1];
          if (rightOperand && (rightOperand.text === 'NULL' || rightOperand.text === '0')) {
            state.isNull = true;
          }
        }
      }
    }
  }
  
  private analyzeFunctionCall(node: any, variableStates: Map<string, any>, line: number, context: DetectionContext, issues: Issue[]): void {
    const funcName = node.namedChildren?.[0]?.text;
    if (!funcName) return;
    
    // 检查内存分配函数
    if (['malloc', 'calloc', 'realloc'].includes(funcName)) {
      // 这些函数通常用于初始化指针
      const args = node.namedChildren?.[1]?.namedChildren || [];
      if (args.length > 0) {
        // 检查返回值是否被赋值给指针
        // 这里需要更复杂的分析来确定返回值被赋给了哪个变量
      }
    }
    
    // 检查NULL赋值
    if (funcName === 'memset' || funcName === 'bzero') {
      // 这些函数可能将指针设置为NULL
    }
  }
  
  private analyzeVariableUsage(node: any, variableStates: Map<string, any>, line: number, context: DetectionContext, issues: Issue[]): void {
    const varName = node.text;
    const state = variableStates.get(varName);
    if (!state) return;
    
    // 检查未初始化变量使用
    if (this.config.uninitializedVariables && !state.isInitialized && !state.declaration.isParameter && !state.declaration.isGlobal) {
      if (line > state.declaration.position.row) {
        issues.push({
          file: context.filePath,
          line: line + 1,
          category: 'Uninitialized',
          message: `变量 '${varName}' 在初始化前被使用`,
          codeLine: context.lines[line] || ''
        });
      }
    }
  }
  
  private analyzePointerDereference(node: any, variableStates: Map<string, any>, line: number, context: DetectionContext, issues: Issue[]): void {
    let varName = '';
    
    // 提取被解引用的变量名
    if (node.type === 'unary_expression') {
      const operand = node.namedChildren?.[0];
      if (operand && (operand.type === 'identifier' || operand.type === 'DeclRefExpr')) {
        varName = operand.text;
      }
    } else if (node.type === 'field_expression') {
      const object = node.namedChildren?.[0];
      if (object && (object.type === 'identifier' || object.type === 'DeclRefExpr')) {
        varName = object.text;
      }
    } else if (node.type === 'subscript_expression') {
      const array = node.namedChildren?.[0];
      if (array && (array.type === 'identifier' || array.type === 'DeclRefExpr')) {
        varName = array.text;
      }
    }
    
    if (!varName) return;
    
    const state = variableStates.get(varName);
    if (!state || !state.declaration.isPointer) return;
    
    // 检查野指针解引用
    if (this.config.wildPointers && !state.isInitialized && !state.declaration.isParameter) {
      if (line > state.declaration.position.row) {
        issues.push({
          file: context.filePath,
          line: line + 1,
          category: 'Wild pointer',
          message: `野指针解引用：指针 '${varName}' 未初始化`,
          codeLine: context.lines[line] || ''
        });
      }
    }
    
    // 检查空指针解引用
    if (this.config.nullPointers && state.isNull) {
      if (line > state.lastAssignment) {
        issues.push({
          file: context.filePath,
          line: line + 1,
          category: 'Null pointer',
          message: `空指针解引用：指针 '${varName}' 为 NULL`,
          codeLine: context.lines[line] || ''
        });
      }
    }
  }
  
  private detectWithHeuristic(context: DetectionContext): Issue[] {
    const issues: Issue[] = [];
    
    // 未初始化变量检测 - 大幅改进
    if (this.config.uninitializedVariables) {
      const variableDeclarations = new Map<string, {line: number, type: string, isPointer: boolean}>();
      
      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        const cleanLine = this.stripLineComments(line);
        
        // 更全面的变量声明模式
        const declarationPatterns = [
          // 基本类型声明
          /\b(int|char|float|double|short|long|unsigned\s+\w+)\s+(\w+)\s*;/,
          /\b(signed\s+\w+)\s+(\w+)\s*;/,
          // 指针声明
          /\b(\w+)\s*\*\s*(\w+)\s*;/,
          /\b(\w+)\s+\*\s*(\w+)\s*;/,
          /\b(\w+)\s*\*\s+(\w+)\s*;/,
          // 数组声明
          /\b(\w+)\s+(\w+)\s*\[[^\]]*\]\s*;/,
          // 结构体声明
          /\b(struct\s+\w+)\s+(\w+)\s*;/,
          // 函数参数声明（在函数定义中）
          /\b(\w+)\s+(\w+)\s*\)\s*{/,
          // 复合类型
          /\b(const\s+\w+)\s+(\w+)\s*;/,
          /\b(volatile\s+\w+)\s+(\w+)\s*;/,
          /\b(register\s+\w+)\s+(\w+)\s*;/,
          // 更多模式
          /\b(\w+)\s+(\w+)\s*,\s*(\w+)\s*;/,  // int a, b;
          /\b(\w+)\s*\*\s*(\w+)\s*,\s*(\w+)\s*;/,  // int *a, b;
          /\b(\w+)\s+(\w+)\s*,\s*\*\s*(\w+)\s*;/,  // int a, *b;
          /\b(\w+)\s*\*\s*(\w+)\s*,\s*\*\s*(\w+)\s*;/,  // int *a, *b;
          /\b(\w+)\s+(\w+)\s*\[[^\]]*\]\s*,\s*(\w+)\s*;/,  // int a[10], b;
          /\b(\w+)\s+(\w+)\s*\[[^\]]*\]\s*,\s*(\w+)\s*\[[^\]]*\]\s*;/,  // int a[10], b[20];
        ];
        
        for (const pattern of declarationPatterns) {
          const match = cleanLine.match(pattern);
          if (match && !cleanLine.includes('=') && !cleanLine.includes('extern') && !cleanLine.includes('static') && !cleanLine.includes('typedef')) {
            const type = match[1];
            const isPointer = cleanLine.includes('*');
            
            // 处理多变量声明
            if (match.length > 3) {
              // 多变量声明，如 int a, b; 或 int *a, *b;
              for (let j = 2; j < match.length; j++) {
                const varName = match[j];
                if (varName && varName !== type) {
                  variableDeclarations.set(varName, {line: i, type, isPointer});
                }
              }
            } else {
              // 单变量声明
              const varName = match[match.length - 1];
              variableDeclarations.set(varName, {line: i, type, isPointer});
            }
          }
        }
        
        // 检查变量使用和初始化
        for (const [varName, info] of variableDeclarations) {
          if (i > info.line) {
            // 检查是否被初始化
            const initPatterns = [
              new RegExp(`\\b${varName}\\s*=\\s*[^;]+`),  // 直接赋值
              new RegExp(`\\b${varName}\\s*=\\s*malloc\\s*\\(`),  // malloc赋值
              new RegExp(`\\b${varName}\\s*=\\s*calloc\\s*\\(`),  // calloc赋值
              new RegExp(`\\b${varName}\\s*=\\s*realloc\\s*\\(`), // realloc赋值
              new RegExp(`\\b${varName}\\s*=\\s*&\\w+`),  // 取地址赋值
              new RegExp(`\\b${varName}\\s*=\\s*NULL`),   // NULL赋值
              new RegExp(`\\b${varName}\\s*=\\s*0`),     // 0赋值
              new RegExp(`scanf\\s*\\([^)]*,\\s*&?${varName}\\b`), // scanf初始化
              new RegExp(`fscanf\\s*\\([^)]*,\\s*&?${varName}\\b`), // fscanf初始化
              new RegExp(`\\b${varName}\\s*=\\s*\\w+\\s*\\+`), // 指针运算赋值
              new RegExp(`\\b${varName}\\s*=\\s*\\w+\\s*-`), // 指针运算赋值
              new RegExp(`\\b${varName}\\s*=\\s*\\w+\\s*\\[`), // 数组赋值
              new RegExp(`\\b${varName}\\s*=\\s*\\w+\\s*->`), // 结构体成员赋值
              new RegExp(`\\b${varName}\\s*=\\s*\\w+\\s*\\+\\+`), // 自增赋值
              new RegExp(`\\b${varName}\\s*=\\s*\\w+\\s*--`), // 自减赋值
              new RegExp(`\\b${varName}\\s*=\\s*\\w+\\s*\\(`), // 函数调用赋值
              new RegExp(`\\b${varName}\\s*=\\s*\\w+\\s*\\*`), // 乘法赋值
              new RegExp(`\\b${varName}\\s*=\\s*\\w+\\s*/`), // 除法赋值
              new RegExp(`\\b${varName}\\s*=\\s*\\w+\\s*%`), // 取模赋值
            ];
            
            let isInitialized = false;
            for (let k = info.line + 1; k <= i; k++) {
              const checkLine = this.stripLineComments(context.lines[k]);
              for (const initPattern of initPatterns) {
                if (initPattern.test(checkLine)) {
                  isInitialized = true;
                  break;
                }
              }
              if (isInitialized) break;
            }
            
            if (isInitialized) {
              variableDeclarations.delete(varName);
              continue;
            }
            
            // 检查变量使用
            const usagePatterns = [
              new RegExp(`\\b${varName}\\b`),  // 基本使用
              new RegExp(`\\*\\s*${varName}\\b`),  // 指针解引用
              new RegExp(`\\*\\s*\\(\\s*${varName}\\s*\\)`), // *(var)
              new RegExp(`\\b${varName}\\s*\\[`),  // 数组访问
              new RegExp(`\\b${varName}\\s*\\[\\s*\\w+\\s*\\]`), // var[index]
              new RegExp(`\\b${varName}\\s*\\[\\s*\\d+\\s*\\]`), // var[123]
              new RegExp(`\\b${varName}\\s*->`),   // 结构体成员访问
              new RegExp(`\\b${varName}\\s*\\+`),  // 指针运算
              new RegExp(`\\b${varName}\\s*-`),    // 指针运算
              new RegExp(`\\b${varName}\\s*\\*`),  // 乘法运算
              new RegExp(`\\b${varName}\\s*/`),    // 除法运算
              new RegExp(`\\b${varName}\\s*%`),    // 取模运算
              new RegExp(`\\b${varName}\\s*\\+\\+`), // 自增
              new RegExp(`\\b${varName}\\s*--`),    // 自减
              new RegExp(`\\+\\+\\s*${varName}\\b`), // ++var
              new RegExp(`--\\s*${varName}\\b`),    // --var
              new RegExp(`\\b${varName}\\s*\\(`),  // 函数调用
              new RegExp(`\\b${varName}\\s*;`),    // 单独使用
              new RegExp(`\\b${varName}\\s*$`),    // 行尾使用
            ];
            
            for (const usagePattern of usagePatterns) {
              if (usagePattern.test(cleanLine) && 
                  !cleanLine.includes('int ') && 
                  !cleanLine.includes('char ') && 
                  !cleanLine.includes('float ') && 
                  !cleanLine.includes('double ') &&
                  !cleanLine.includes('struct ') &&
                  !cleanLine.includes('typedef ') &&
                  !cleanLine.includes('enum ') &&
                  !cleanLine.includes('union ')) {
                issues.push({
                  file: context.filePath,
                  line: i + 1,
                  category: 'Uninitialized',
                  message: `变量 '${varName}' 在初始化前被使用`,
                  codeLine: line
                });
                variableDeclarations.delete(varName);
                break;
              }
            }
          }
        }
      }
    }
    
    // 野指针检测 - 大幅改进
    if (this.config.wildPointers) {
      const pointerDeclarations = new Map<string, {line: number, type: string}>();
      
      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        const cleanLine = this.stripLineComments(line);
        
        // 更全面的指针声明模式
        const pointerPatterns = [
          /\b(\w+)\s*\*\s*(\w+)\s*;/,  // int *ptr;
          /\b(\w+)\s+\*\s*(\w+)\s*;/,  // int * ptr;
          /\b(\w+)\s*\*\s+(\w+)\s*;/,  // int* ptr;
          /\b(struct\s+\w+)\s*\*\s*(\w+)\s*;/,  // struct Point *p;
          /\b(const\s+\w+)\s*\*\s*(\w+)\s*;/,   // const int *ptr;
          /\b(volatile\s+\w+)\s*\*\s*(\w+)\s*;/, // volatile int *ptr;
          /\b(\w+)\s*\*\s*const\s+(\w+)\s*;/,   // int * const ptr;
          /\b(\w+)\s*\*\s*volatile\s+(\w+)\s*;/, // int * volatile ptr;
          /\b(\w+)\s*\*\s*(\w+)\s*\[[^\]]*\]\s*;/, // int *ptr[10];
          /\b(\w+)\s*\(\s*\*\s*(\w+)\s*\)\s*\([^)]*\)\s*;/, // int (*ptr)(int);
        ];
        
        for (const pattern of pointerPatterns) {
          const match = cleanLine.match(pattern);
          if (match && !cleanLine.includes('=') && !cleanLine.includes('extern') && !cleanLine.includes('static') && !cleanLine.includes('typedef')) {
            const pointerName = match[match.length - 1];
            const type = match[1];
            pointerDeclarations.set(pointerName, {line: i, type});
          }
        }
        
        // 检查解引用
        for (const [pointerName, info] of pointerDeclarations) {
          if (i > info.line) {
            // 检查是否在声明后有初始化
            let initialized = false;
            for (let k = info.line + 1; k <= i; k++) {
              const checkLine = this.stripLineComments(context.lines[k]);
              const initPatterns = [
                new RegExp(`\\b${pointerName}\\s*=\\s*&?\\w+`),  // 取地址赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*malloc\\s*\\(`),  // malloc赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*calloc\\s*\\(`),  // calloc赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*realloc\\s*\\(`), // realloc赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*NULL`),   // NULL赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*0`),     // 0赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*\\w+\\s*\\+`), // 指针运算赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*\\w+\\s*-`), // 指针运算赋值
                new RegExp(`scanf\\s*\\([^)]*,\\s*${pointerName}\\b`), // scanf初始化
                new RegExp(`fscanf\\s*\\([^)]*,\\s*${pointerName}\\b`), // fscanf初始化
                new RegExp(`\\b${pointerName}\\s*=\\s*\\w+\\s*\\[`), // 数组赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*\\w+\\s*->`), // 结构体成员赋值
              ];
              
              for (const initPattern of initPatterns) {
                if (initPattern.test(checkLine)) {
                  initialized = true;
                  break;
                }
              }
              if (initialized) break;
            }
            
            if (initialized) {
              pointerDeclarations.delete(pointerName);
              continue;
            }
            
            // 检查各种解引用模式
            const derefPatterns = [
              new RegExp(`\\*\\s*${pointerName}\\b`),  // *ptr
              new RegExp(`\\*\\s*\\(\\s*${pointerName}\\s*\\)`), // *(ptr)
              new RegExp(`\\b${pointerName}\\s*\\[`),  // ptr[index]
              new RegExp(`\\b${pointerName}\\s*->`),   // ptr->field
              new RegExp(`\\b${pointerName}\\s*\\+`),  // ptr + offset
              new RegExp(`\\b${pointerName}\\s*-`),    // ptr - offset
              new RegExp(`\\b${pointerName}\\s*\\*`),  // ptr * value
              new RegExp(`\\b${pointerName}\\s*/`),    // ptr / value
              new RegExp(`\\b${pointerName}\\s*%`),    // ptr % value
              new RegExp(`\\b${pointerName}\\s*\\+\\+`), // ptr++
              new RegExp(`\\b${pointerName}\\s*--`),    // ptr--
              new RegExp(`\\+\\+\\s*${pointerName}\\b`), // ++ptr
              new RegExp(`--\\s*${pointerName}\\b`),    // --ptr
              new RegExp(`\\b${pointerName}\\s*\\[\\s*\\w+\\s*\\]`), // ptr[var]
              new RegExp(`\\b${pointerName}\\s*\\[\\s*\\d+\\s*\\]`), // ptr[123]
            ];
            
            for (const pattern of derefPatterns) {
              if (pattern.test(cleanLine)) {
                issues.push({
                  file: context.filePath,
                  line: i + 1,
                  category: 'Wild pointer',
                  message: `野指针解引用：指针 '${pointerName}' 未初始化`,
                  codeLine: line
                });
                pointerDeclarations.delete(pointerName);
                break;
              }
            }
          }
        }
      }
    }
    
    // 空指针检测 - 大幅改进
    if (this.config.nullPointers) {
      const nullPointers = new Map<string, {line: number, type: string}>();
      
      for (let i = 0; i < context.lines.length; i++) {
        const line = context.lines[i];
        const cleanLine = this.stripLineComments(line);
        
        // 找到NULL指针赋值 - 更全面的模式
        const nullPatterns = [
          /(\w+)\s*=\s*(NULL|0)\s*;/,  // ptr = NULL;
          /(\w+)\s*=\s*(NULL|0)\s*$/,  // ptr = NULL (行尾)
          /(\w+)\s*=\s*\([^)]*\)\s*(NULL|0)\s*;/, // ptr = (type)NULL;
          /(\w+)\s*=\s*\([^)]*\)\s*(NULL|0)\s*$/, // ptr = (type)NULL (行尾)
          /(\w+)\s*=\s*\([^)]*\)\s*0\s*;/, // ptr = (type)0;
          /(\w+)\s*=\s*\([^)]*\)\s*0\s*$/, // ptr = (type)0 (行尾)
        ];
        
        for (const pattern of nullPatterns) {
          const match = cleanLine.match(pattern);
          if (match) {
            const pointerName = match[1];
            // 检查是否是函数参数
            if (!cleanLine.includes('(') || cleanLine.includes('=')) {
              nullPointers.set(pointerName, {line: i, type: 'null'});
            }
          }
        }
        
        // 检查解引用
        for (const [pointerName, info] of nullPointers) {
          if (i > info.line) {
            // 检查之后是否有非空赋值
            let becameNonNull = false;
            for (let k = info.line + 1; k <= i; k++) {
              const checkLine = this.stripLineComments(context.lines[k]);
              const nonNullPatterns = [
                new RegExp(`\\b${pointerName}\\s*=\\s*&?\\w+`),  // 取地址赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*malloc\\s*\\(`),  // malloc赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*calloc\\s*\\(`),  // calloc赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*realloc\\s*\\(`), // realloc赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*\\w+\\s*\\+`), // 指针运算赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*\\w+\\s*-`), // 指针运算赋值
                new RegExp(`scanf\\s*\\([^)]*,\\s*${pointerName}\\b`), // scanf初始化
                new RegExp(`fscanf\\s*\\([^)]*,\\s*${pointerName}\\b`), // fscanf初始化
                new RegExp(`\\b${pointerName}\\s*=\\s*\\w+\\s*\\[`), // 数组赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*\\w+\\s*->`), // 结构体成员赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*\\w+\\s*\\+\\+`), // 自增赋值
                new RegExp(`\\b${pointerName}\\s*=\\s*\\w+\\s*--`), // 自减赋值
              ];
              
              for (const nonNullPattern of nonNullPatterns) {
                if (nonNullPattern.test(checkLine)) {
                  becameNonNull = true;
                  break;
                }
              }
              if (becameNonNull) break;
            }
            
            if (becameNonNull) {
              nullPointers.delete(pointerName);
              continue;
            }
            
            // 检查各种解引用模式
            const derefPatterns = [
              new RegExp(`\\*\\s*${pointerName}\\b`),  // *ptr
              new RegExp(`\\*\\s*\\(\\s*${pointerName}\\s*\\)`), // *(ptr)
              new RegExp(`\\b${pointerName}\\s*\\[`),  // ptr[index]
              new RegExp(`\\b${pointerName}\\s*->`),   // ptr->field
              new RegExp(`\\b${pointerName}\\s*\\+`),  // ptr + offset
              new RegExp(`\\b${pointerName}\\s*-`),    // ptr - offset
              new RegExp(`\\b${pointerName}\\s*\\*`),  // ptr * value
              new RegExp(`\\b${pointerName}\\s*/`),    // ptr / value
              new RegExp(`\\b${pointerName}\\s*%`),    // ptr % value
              new RegExp(`\\b${pointerName}\\s*\\+\\+`), // ptr++
              new RegExp(`\\b${pointerName}\\s*--`),    // ptr--
              new RegExp(`\\+\\+\\s*${pointerName}\\b`), // ++ptr
              new RegExp(`--\\s*${pointerName}\\b`),    // --ptr
              new RegExp(`\\b${pointerName}\\s*\\[\\s*\\w+\\s*\\]`), // ptr[var]
              new RegExp(`\\b${pointerName}\\s*\\[\\s*\\d+\\s*\\]`), // ptr[123]
            ];
            
            for (const pattern of derefPatterns) {
              if (pattern.test(cleanLine)) {
                issues.push({
                  file: context.filePath,
                  line: i + 1,
                  category: 'Null pointer',
                  message: `空指针解引用：指针 '${pointerName}' 为 NULL`,
                  codeLine: line
                });
                nullPointers.delete(pointerName);
                break;
              }
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
