/**
 * 变量检测器模块
 * 检测未初始化变量、野指针、空指针等问题
 */

import { BaseDetector, DetectionContext } from './base_detector';
import { Issue } from '../interfaces/types';
import { CASTParser, VariableDeclaration } from '../core/ast_parser';

/**
 * 变量信息接口
 */
interface VariableInfo {
  type: string;
  isPointer: boolean;
  isInitialized: boolean;
  isParameter: boolean;
  line: number;
  // 新增：变量值追踪
  currentValue?: string;  // 当前值（如 "NULL", "malloc", "&var" 等）
  valueHistory: ValueAssignment[];  // 值变更历史
  // 新增：指针空间追踪
  spaceType?: PointerSpaceType;  // 指针指向的空间类型
  targetVariable?: string;  // 指向的目标变量名（用于栈空间追踪）
  stackFrameId?: string;  // 所属栈帧ID
}

/**
 * 值赋值记录
 */
interface ValueAssignment {
  line: number;
  value: string;
  assignmentType: 'direct' | 'malloc' | 'calloc' | 'realloc' | 'address' | 'null' | 'zero' | 'scanf' | 'function_call';
}

/**
 * 栈空间信息
 */
interface StackFrame {
  frameId: string;
  functionName: string;
  startLine: number;
  endLine?: number;
  variables: Map<string, VariableInfo>;
  isActive: boolean;
}

/**
 * 指针空间类型
 */
type PointerSpaceType = 'heap' | 'stack' | 'global' | 'unknown';

/**
 * 全局符号表项
 */
interface GlobalSymbol {
  name: string;
  type: 'function' | 'variable' | 'struct' | 'union' | 'enum';
  filePath: string;
  line: number;
  isDangerous: boolean;
  returnType?: string;
  parameters?: string[];
  isPointer?: boolean;
}

/**
 * 函数摘要
 */
interface FunctionSummary {
  name: string;
  returnType: string;
  parameters: Array<{name: string, type: string, isPointer: boolean}>;
  dangerousOperations: string[];
  returnsLocalAddress: boolean;
  returnsFreedMemory: boolean;
  callsDangerousFunctions: string[];
}

/**
 * 跨函数调用信息
 */
interface CrossFunctionCall {
  caller: string;
  callee: string;
  line: number;
  filePath: string;
  returnAssignment?: string;
}

/**
 * 全局符号表管理器
 */
class GlobalSymbolTable {
  private symbols: Map<string, GlobalSymbol> = new Map();
  private functionSummaries: Map<string, FunctionSummary> = new Map();
  private crossFunctionCalls: CrossFunctionCall[] = [];

  addSymbol(symbol: GlobalSymbol): void {
    this.symbols.set(symbol.name, symbol);
  }

  getSymbol(name: string): GlobalSymbol | undefined {
    return this.symbols.get(name);
  }

  addFunctionSummary(summary: FunctionSummary): void {
    this.functionSummaries.set(summary.name, summary);
  }

  getFunctionSummary(name: string): FunctionSummary | undefined {
    return this.functionSummaries.get(name);
  }

  addCrossFunctionCall(call: CrossFunctionCall): void {
    this.crossFunctionCalls.push(call);
  }

  getCrossFunctionCalls(): CrossFunctionCall[] {
    return this.crossFunctionCalls;
  }

  isDangerousFunction(name: string): boolean {
    const symbol = this.symbols.get(name);
    return symbol ? symbol.isDangerous : false;
  }

  getAllSymbols(): Map<string, GlobalSymbol> {
    return this.symbols;
  }
}

/**
 * 作用域管理器 - 基于哈希表的变量状态追踪
 */
class ScopeManager {
  private variables: Map<string, VariableInfo> = new Map();
  private scopeName: string;

  constructor(scopeName: string) {
    this.scopeName = scopeName;
  }

  /**
   * 声明变量
   */
  declareVariable(varName: string, info: VariableInfo): void {
    // 初始化值历史记录
    if (!info.valueHistory) {
      info.valueHistory = [];
    }
    this.variables.set(varName, info);
  }

  /**
   * 检查变量是否存在
   */
  hasVariable(varName: string): boolean {
    return this.variables.has(varName);
  }

  /**
   * 获取变量信息
   */
  getVariable(varName: string): VariableInfo | undefined {
    return this.variables.get(varName);
  }

  /**
   * 标记变量为已初始化
   */
  markAsInitialized(varName: string): void {
    const varInfo = this.variables.get(varName);
    if (varInfo) {
      varInfo.isInitialized = true;
    }
  }

  /**
   * 更新变量值
   */
  updateVariableValue(varName: string, value: string, assignmentType: ValueAssignment['assignmentType'], line: number): void {
    const varInfo = this.variables.get(varName);
    if (varInfo) {
      varInfo.currentValue = value;
      varInfo.valueHistory.push({
        line,
        value,
        assignmentType
      });
      varInfo.isInitialized = true;
    }
  }

  /**
   * 获取变量当前值
   */
  getVariableValue(varName: string): string | undefined {
    const varInfo = this.variables.get(varName);
    return varInfo?.currentValue;
  }

  /**
   * 获取作用域名称
   */
  getScopeName(): string {
    return this.scopeName;
  }

  /**
   * 获取所有变量
   */
  getAllVariables(): Map<string, VariableInfo> {
    return new Map(this.variables);
  }
}

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
      // 强制使用启发式检测，跳过AST检测
      issues.push(...this.detectWithScopeBasedTracking(context));
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
    
    // 未初始化变量检测 - 基于作用域哈希表的改进版本
    if (this.config.uninitializedVariables) {
      issues.push(...this.detectWithScopeBasedTracking(context));
    }
    
    return issues;
  }

  /**
   * 基于作用域哈希表的变量状态追踪检测
   */
  private detectWithScopeBasedTracking(context: DetectionContext): Issue[] {
    const issues: Issue[] = [];
    const lines = context.lines;
    
    console.log(`[DEBUG] 开始启发式检测，文件: ${context.filePath}, 行数: ${lines.length}`);
    
    // 作用域栈：每个作用域维护一个变量状态表
    const scopeStack: ScopeManager[] = [];
    const globalScope = new ScopeManager('global');
    scopeStack.push(globalScope);
    
    // 函数参数追踪
    const functionParameters = new Map<string, Set<string>>();
    
    // 栈空间追踪系统
    const stackFrames: StackFrame[] = [];
    let currentStackFrame: StackFrame | null = null;
    
    // 全局符号表
    const globalSymbolTable = new GlobalSymbolTable();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
        const cleanLine = this.stripLineComments(line);
      
      // 检测作用域变化
      this.handleScopeChanges(cleanLine, i, scopeStack, functionParameters);
      
      // 检测栈帧变化
      currentStackFrame = this.handleStackFrameChanges(cleanLine, i, stackFrames, currentStackFrame);
      
      // 检测变量声明
      this.detectVariableDeclarations(cleanLine, i, scopeStack, functionParameters);
      
      // 记录局部变量到栈帧
      this.recordLocalVariables(cleanLine, i, currentStackFrame);
      
      // 检测变量初始化和赋值
      this.detectVariableInitialization(cleanLine, i, scopeStack);
      
      // 检测函数返回值（禁止返回局部变量地址）
      this.detectFunctionReturns(cleanLine, i, stackFrames, issues, context);
      
      // 检测变量使用（可能导致未初始化错误）
      this.detectVariableUsage(cleanLine, i, scopeStack, issues, context);
      
      // 构建全局符号表
      this.buildGlobalSymbolTable(cleanLine, i, globalSymbolTable, context);
      
      // 检测跨函数调用
      this.detectCrossFunctionCalls(cleanLine, i, scopeStack, issues, context, globalSymbolTable);
    }
    
    console.log(`[DEBUG] 启发式检测完成，发现问题: ${issues.length}个`);
    return issues;
  }

  /**
   * 处理作用域变化（函数、代码块、循环等）
   */
  private handleScopeChanges(line: string, lineIndex: number, scopeStack: ScopeManager[], functionParameters: Map<string, Set<string>>): void {
    // 函数定义开始
    const functionMatch = line.match(/(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{/);
    if (functionMatch) {
      const functionName = functionMatch[2];
      const params = functionMatch[3];
      
      // 创建函数作用域
      const functionScope = new ScopeManager(`function:${functionName}`);
      scopeStack.push(functionScope);
      
      // 解析函数参数
      if (params.trim()) {
        const paramSet = new Set<string>();
        const paramList = params.split(',').map(p => p.trim());
        
        for (const param of paramList) {
          // 提取参数名（去掉类型）
          const paramMatch = param.match(/(\w+)\s+(\w+)/);
          if (paramMatch) {
            const paramName = paramMatch[2];
            paramSet.add(paramName);
            // 函数参数默认为已初始化
            functionScope.declareVariable(paramName, {
              type: paramMatch[1],
              isPointer: param.includes('*'),
              isInitialized: true,
              isParameter: true,
              line: lineIndex,
              valueHistory: []
            });
          }
        }
        
        functionParameters.set(functionName, paramSet);
      }
      return;
    }
    
    // 代码块开始
    if (line.includes('{') && !line.includes('}')) {
      const blockScope = new ScopeManager(`block:${lineIndex}`);
      scopeStack.push(blockScope);
      return;
    }
    
    // 循环开始
    const loopMatch = line.match(/(for|while|do)\s*\(/);
    if (loopMatch) {
      const loopScope = new ScopeManager(`loop:${lineIndex}`);
      scopeStack.push(loopScope);
      return;
    }
    
    // 作用域结束
    if (line.includes('}')) {
      if (scopeStack.length > 1) {
        scopeStack.pop();
      }
    }
  }

  /**
   * 检测变量声明
   */
  private detectVariableDeclarations(line: string, lineIndex: number, scopeStack: ScopeManager[], functionParameters: Map<string, Set<string>>): void {
    const currentScope = scopeStack[scopeStack.length - 1];
    
    // 跳过函数定义行
    if (line.match(/\w+\s+\w+\s*\([^)]*\)\s*{/)) {
      return;
    }
        
        // 更全面的变量声明模式
        const declarationPatterns = [
          // 基本类型声明
      /\b(int|char|float|double|short|long|unsigned\s+\w+)\s+(\w+)\s*[;=]/,
      /\b(signed\s+\w+)\s+(\w+)\s*[;=]/,
          // 指针声明
      /\b(\w+)\s*\*\s*(\w+)\s*[;=]/,
      /\b(\w+)\s+\*\s*(\w+)\s*[;=]/,
      /\b(\w+)\s*\*\s+(\w+)\s*[;=]/,
          // 数组声明
      /\b(\w+)\s+(\w+)\s*\[[^\]]*\]\s*[;=]/,
          // 结构体声明
      /\b(struct\s+\w+)\s+(\w+)\s*[;=]/,
          // 复合类型
      /\b(const\s+\w+)\s+(\w+)\s*[;=]/,
      /\b(volatile\s+\w+)\s+(\w+)\s*[;=]/,
      /\b(register\s+\w+)\s+(\w+)\s*[;=]/,
        ];
        
        for (const pattern of declarationPatterns) {
      const match = line.match(pattern);
      if (match && !line.includes('extern') && !line.includes('static') && !line.includes('typedef')) {
            const type = match[1];
        const varName = match[2];
        const isPointer = line.includes('*');
        
        // 检查是否在函数参数中（已初始化）
        const isParameter = this.isFunctionParameter(varName, functionParameters);
        
        currentScope.declareVariable(varName, {
          type,
          isPointer,
          isInitialized: isParameter || line.includes('='),
          isParameter,
          line: lineIndex,
          valueHistory: []
        });
      }
    }
  }

  /**
   * 检测变量初始化和赋值 - 增强版，支持值追踪
   */
  private detectVariableInitialization(line: string, lineIndex: number, scopeStack: ScopeManager[]): void {
    // 检测内存释放
    this.detectMemoryFree(line, lineIndex, scopeStack);
    // malloc/calloc/realloc 赋值
    const memoryPatterns = [
      { pattern: /\b(\w+)\s*=\s*malloc\s*\(/, type: 'malloc' as const, value: 'malloc' },
      { pattern: /\b(\w+)\s*=\s*calloc\s*\(/, type: 'calloc' as const, value: 'calloc' },
      { pattern: /\b(\w+)\s*=\s*realloc\s*\(/, type: 'realloc' as const, value: 'realloc' },
    ];
    
    for (const { pattern, type, value } of memoryPatterns) {
      const match = line.match(pattern);
      if (match) {
        const varName = match[1];
        this.updateVariableInScopes(varName, value, type, lineIndex, scopeStack);
        
        // 标记指针空间类型为堆
        this.updatePointerSpaceType(varName, 'heap', undefined, lineIndex, scopeStack);
      }
    }
    
    // NULL 赋值 - 更全面的模式
    const nullPatterns = [
      { pattern: /\b(\w+)\s*=\s*NULL\s*;/, type: 'null' as const, value: 'NULL' },
      { pattern: /\b(\w+)\s*=\s*NULL\s*$/, type: 'null' as const, value: 'NULL' },
      { pattern: /\b(\w+)\s*=\s*0\s*;/, type: 'zero' as const, value: '0' },
      { pattern: /\b(\w+)\s*=\s*0\s*$/, type: 'zero' as const, value: '0' },
      { pattern: /\b(\w+)\s*=\s*\([^)]*\)\s*NULL\s*;/, type: 'null' as const, value: 'NULL' },
      { pattern: /\b(\w+)\s*=\s*\([^)]*\)\s*NULL\s*$/, type: 'null' as const, value: 'NULL' },
      { pattern: /\b(\w+)\s*=\s*\([^)]*\)\s*0\s*;/, type: 'zero' as const, value: '0' },
      { pattern: /\b(\w+)\s*=\s*\([^)]*\)\s*0\s*$/, type: 'zero' as const, value: '0' },
    ];
    
    for (const { pattern, type, value } of nullPatterns) {
      const match = line.match(pattern);
      if (match) {
        const varName = match[1];
        this.updateVariableInScopes(varName, value, type, lineIndex, scopeStack);
      }
    }
    
    // 取地址赋值
    const addressMatch = line.match(/\b(\w+)\s*=\s*&(\w+)/);
    if (addressMatch) {
      const varName = addressMatch[1];
      const targetVar = addressMatch[2];
      this.updateVariableInScopes(varName, `&${targetVar}`, 'address', lineIndex, scopeStack);
      
      // 标记指针空间类型
      this.updatePointerSpaceType(varName, 'stack', targetVar, lineIndex, scopeStack);
    }
    
    // 直接赋值（其他值）- 更全面的检测
    const directMatch = line.match(/\b(\w+)\s*=\s*([^;]+)/);
    if (directMatch && 
        !line.includes('malloc') && 
        !line.includes('calloc') && 
        !line.includes('realloc') && 
        !line.includes('NULL') && 
        !line.includes('&') &&
        !line.includes('scanf') &&
        !line.includes('sizeof')) {
      const varName = directMatch[1];
      const value = directMatch[2].trim();
      this.updateVariableInScopes(varName, value, 'direct', lineIndex, scopeStack);
    }
    
    // scanf初始化
    const scanfMatch = line.match(/scanf\s*\([^)]*,\s*&?(\w+)\b/);
    if (scanfMatch) {
      const varName = scanfMatch[1];
      this.updateVariableInScopes(varName, 'scanf_input', 'scanf', lineIndex, scopeStack);
    }
    
    // 函数调用赋值
    const functionMatch = line.match(/\b(\w+)\s*=\s*(\w+)\s*\(/);
    if (functionMatch) {
      const varName = functionMatch[1];
      const funcName = functionMatch[2];
      this.updateVariableInScopes(varName, `${funcName}()`, 'function_call', lineIndex, scopeStack);
    }
  }

  /**
   * 检测内存释放
   */
  private detectMemoryFree(line: string, lineIndex: number, scopeStack: ScopeManager[]): void {
    // 检测 free() 调用
    const freeMatch = line.match(/free\s*\(\s*(\w+)\s*\)/);
    if (freeMatch) {
      const varName = freeMatch[1];
      this.updateVariableInScopes(varName, 'freed', 'direct', lineIndex, scopeStack);
    }
  }

  /**
   * 更新指针空间类型
   */
  private updatePointerSpaceType(varName: string, spaceType: PointerSpaceType, targetVariable?: string, lineIndex?: number, scopeStack?: ScopeManager[]): void {
    if (scopeStack) {
      for (const scope of scopeStack) {
        if (scope.hasVariable(varName)) {
          const varInfo = scope.getVariable(varName);
          if (varInfo) {
            varInfo.spaceType = spaceType;
            varInfo.targetVariable = targetVariable;
            if (lineIndex) {
              varInfo.stackFrameId = `frame_${lineIndex}`;
            }
          }
                break;
              }
            }
          }
  }

  /**
   * 在作用域中更新变量值
   */
  private updateVariableInScopes(varName: string, value: string, assignmentType: ValueAssignment['assignmentType'], lineIndex: number, scopeStack: ScopeManager[]): void {
    for (const scope of scopeStack) {
      if (scope.hasVariable(varName)) {
        scope.updateVariableValue(varName, value, assignmentType, lineIndex);
        break;
      }
    }
  }

  /**
   * 检测变量使用（可能导致未初始化错误和空指针错误）
   */
  private detectVariableUsage(line: string, lineIndex: number, scopeStack: ScopeManager[], issues: Issue[], context: DetectionContext): void {
    // 变量使用模式
    const usagePatterns = [
      /\b(\w+)\s*\+/,  // 加法运算
      /\b(\w+)\s*-/,   // 减法运算
      /\b(\w+)\s*\*/,  // 乘法运算
      /\b(\w+)\s*\//,  // 除法运算
      /\b(\w+)\s*%/,   // 取模运算
      /\b(\w+)\s*\[/,  // 数组访问
      /\b(\w+)\s*->/,  // 结构体成员访问
      /\*\s*(\w+)\b/,  // 指针解引用 *ptr
      /\*\s*(\w+)\s*=/, // 指针解引用赋值 *ptr =
      /\b(\w+)\s*\)/,  // 函数参数
      /printf\s*\([^)]*%[^)]*,\s*(\w+)\b/, // printf使用
    ];
    
    for (const pattern of usagePatterns) {
      const match = line.match(pattern);
      if (match) {
        const varName = match[1];
        
        // 在所有作用域中查找变量
        for (let i = scopeStack.length - 1; i >= 0; i--) {
          const scope = scopeStack[i];
          if (scope.hasVariable(varName)) {
            const varInfo = scope.getVariable(varName);
            
            if (varInfo && !varInfo.isInitialized) {
              if (varInfo.isPointer && line.includes('*' + varName)) {
                // 野指针解引用
                issues.push({
                  file: context.filePath,
                  line: lineIndex + 1,
                  category: 'Wild pointer',
                  message: `野指针解引用：指针 '${varName}' 未初始化`,
                  codeLine: line
                });
              } else if (!varInfo.isPointer) {
                // 未初始化变量使用
                issues.push({
                  file: context.filePath,
                  line: lineIndex + 1,
                  category: 'Uninitialized variable',
                  message: `未初始化变量使用：变量 '${varName}' 在初始化前被使用`,
                  codeLine: line
                });
              }
            } else if (varInfo && varInfo.isInitialized && varInfo.isPointer) {
              // 检查空指针解引用
              this.checkNullPointerDereference(varName, varInfo, line, lineIndex, issues, context, scopeStack);
              
              // 检查危险状态
              if (varInfo.currentValue === 'dangerous') {
                issues.push({
                  file: context.filePath,
                  line: lineIndex + 1,
                  category: 'Dangerous pointer usage',
                  message: `危险指针使用：变量 '${varName}' 来自危险函数调用`,
                  codeLine: line
                });
              }
            }
                  break;
                }
              }
      }
    }
  }

  /**
   * 检查空指针解引用
   */
  private checkNullPointerDereference(varName: string, varInfo: VariableInfo, line: string, lineIndex: number, issues: Issue[], context: DetectionContext, scopeStack: ScopeManager[]): void {
    const currentValue = varInfo.currentValue;
    // 检查指针解引用模式
            const derefPatterns = [
      new RegExp(`\\*\\s*${varName}\\b`),  // *ptr
      new RegExp(`\\*\\s*\\(\\s*${varName}\\s*\\)`), // *(ptr)
      new RegExp(`\\b${varName}\\s*\\[`),  // ptr[index]
      new RegExp(`\\b${varName}\\s*->`),  // ptr->field
    ];
    
    let isDereferencing = false;
            for (const pattern of derefPatterns) {
      if (pattern.test(line)) {
        isDereferencing = true;
        break;
      }
    }
    
    if (isDereferencing && currentValue) {
      // 检查是否为空值或已释放
      if (currentValue === 'NULL' || currentValue === '0' || currentValue === 'freed') {
                issues.push({
                  file: context.filePath,
          line: lineIndex + 1,
          category: currentValue === 'freed' ? 'Dangling pointer' : 'Null pointer',
          message: currentValue === 'freed' 
            ? `悬空指针解引用：指针 '${varName}' 已释放`
            : `空指针解引用：指针 '${varName}' 当前值为 ${currentValue}`,
                  codeLine: line
                });
      }
      
      // 检查栈空间有效性
      if (varInfo.spaceType === 'stack' && varInfo.targetVariable) {
        // 检查指向的栈变量是否仍然有效
        if (!this.isStackVariableValid(varInfo.targetVariable, varInfo.stackFrameId, scopeStack)) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Stack pointer dereference',
            message: `栈指针解引用：指针 '${varName}' 指向已销毁的栈变量 '${varInfo.targetVariable}'`,
            codeLine: line
          });
        }
      }
    }
  }

  /**
   * 处理栈帧变化
   */
  private handleStackFrameChanges(line: string, lineIndex: number, stackFrames: StackFrame[], currentStackFrame: StackFrame | null): StackFrame | null {
    // 函数定义开始 - 支持返回类型
    const functionMatch = line.match(/(\w+\*?)\s+(\w+)\s*\([^)]*\)\s*{/);
    if (functionMatch) {
      const functionName = functionMatch[2];
      const frameId = `frame_${lineIndex}`;
      const newFrame: StackFrame = {
        frameId,
        functionName,
        startLine: lineIndex,
        variables: new Map(),
        isActive: true
      };
      stackFrames.push(newFrame);
      return newFrame;
    }
    
    // 函数结束
    if (line.includes('}') && stackFrames.length > 0) {
      const lastFrame = stackFrames[stackFrames.length - 1];
      lastFrame.endLine = lineIndex;
      lastFrame.isActive = false;
      return null;
    }
    
    return currentStackFrame;
  }

  /**
   * 检测函数返回值（禁止返回局部变量地址）
   */
  private detectFunctionReturns(line: string, lineIndex: number, stackFrames: StackFrame[], issues: Issue[], context: DetectionContext): void {
    // 检测 return 语句 - 更全面的模式
    const returnPatterns = [
      // 返回地址模式
      /return\s+&(\w+)/,  // return &var
      /return\s+&(\w+)\s*;/,  // return &var;
      /return\s+&(\w+)\s*$/,  // return &var (行尾)
      
      // 直接返回变量模式
      /return\s+(\w+)/,  // return var
      /return\s+(\w+)\s*;/,  // return var;
      /return\s+(\w+)\s*$/,  // return var (行尾)
      
      // 返回数组模式
      /return\s+(\w+)\s*\[/,  // return arr[
      /return\s+(\w+)\s*\[.*\]/,  // return arr[0]
      
      // 返回结构体模式
      /return\s+(\w+)\s*\./,  // return struct.field
      /return\s+(\w+)\s*->/,  // return ptr->field
      
      // 返回复合字面量模式
      /return\s+\([^)]*\)\s*{/,  // return (int[]){1,2,3}
      /return\s+\([^)]*\)\s*{.*}/,  // return (int[]){1,2,3};
      
      // 返回复合字面量模式
      /return\s+\([^)]*\)\s*\{/,  // return (type){...}
      /return\s+\{[^}]*\}/,  // return {...}
      
      // 返回函数调用模式
      /return\s+(\w+)\s*\(/,  // return func(
    ];
    
    for (const pattern of returnPatterns) {
      const returnMatch = line.match(pattern);
      if (returnMatch) {
        const varName = returnMatch[1];
        
        // 检查是否返回局部变量
        if (stackFrames.length > 0) {
          const currentFrame = stackFrames[stackFrames.length - 1];
          
          if (currentFrame.isActive && currentFrame.variables.has(varName)) {
            const varInfo = currentFrame.variables.get(varName);
            if (varInfo && varInfo.spaceType === 'stack') {
              issues.push({
                file: context.filePath,
                line: lineIndex + 1,
                category: 'Stack pointer return',
                message: `禁止返回局部变量：函数返回了局部变量 '${varName}'`,
                codeLine: line
              });
            }
          }
        }
      }
    }
    
    // 检测返回已释放内存的模式
    this.detectReturnFreedMemory(line, lineIndex, stackFrames, issues, context);
    
    // 更新函数摘要
    this.updateFunctionSummary(line, lineIndex, stackFrames, context);
  }

  /**
   * 检测返回已释放内存
   */
  private detectReturnFreedMemory(line: string, lineIndex: number, stackFrames: StackFrame[], issues: Issue[], context: DetectionContext): void {
    // 检测 return 语句中的变量
    const returnMatch = line.match(/return\s+(\w+)/);
    if (returnMatch) {
      const varName = returnMatch[1];
      
      // 检查变量是否已释放
      if (stackFrames.length > 0) {
        const currentFrame = stackFrames[stackFrames.length - 1];
        if (currentFrame.isActive && currentFrame.variables.has(varName)) {
          const varInfo = currentFrame.variables.get(varName);
          if (varInfo && varInfo.currentValue === 'freed') {
            issues.push({
              file: context.filePath,
              line: lineIndex + 1,
              category: 'Dangling pointer return',
              message: `禁止返回已释放内存：函数返回了已释放的指针 '${varName}'`,
              codeLine: line
            });
          }
        }
      }
    }
  }

  /**
   * 更新函数摘要
   */
  private updateFunctionSummary(line: string, lineIndex: number, stackFrames: StackFrame[], context: DetectionContext): void {
    if (stackFrames.length === 0) return;
    
    const currentFrame = stackFrames[stackFrames.length - 1];
    if (!currentFrame.isActive) return;
    
    // 检测返回局部地址
    if (line.includes('return') && (line.includes('&') || line.includes('[') || line.includes('.'))) {
      // 这里需要更新全局符号表中的函数摘要
      // 由于我们无法直接访问globalSymbolTable，这里先记录到栈帧中
      currentFrame.variables.set('_returnsLocalAddress', {
        type: 'boolean',
        isPointer: false,
        isInitialized: true,
        isParameter: false,
        line: lineIndex,
        valueHistory: [],
        currentValue: 'true'
      });
    }
    
    // 检测返回已释放内存
    if (line.includes('return') && line.includes('free')) {
      currentFrame.variables.set('_returnsFreedMemory', {
        type: 'boolean',
        isPointer: false,
        isInitialized: true,
        isParameter: false,
        line: lineIndex,
        valueHistory: [],
        currentValue: 'true'
      });
    }
  }

  /**
   * 记录局部变量到栈帧
   */
  private recordLocalVariables(line: string, lineIndex: number, currentStackFrame: StackFrame | null): void {
    if (!currentStackFrame) return;
    
    // 检测局部变量声明 - 更全面的模式
    const declarationPatterns = [
      // 基本类型
      /\b(int|char|float|double|short|long|unsigned\s+\w+)\s+(\w+)\s*[;=]/,
      /\b(signed\s+\w+)\s+(\w+)\s*[;=]/,
      
      // 指针类型
      /\b(\w+)\s*\*\s*(\w+)\s*[;=]/,
      /\b(\w+)\s+\*\s*(\w+)\s*[;=]/,
      /\b(\w+)\s*\*\s+(\w+)\s*[;=]/,
      
      // 数组类型
      /\b(\w+)\s+(\w+)\s*\[[^\]]*\]\s*[;=]/,
      /\b(\w+)\s*\*\s*(\w+)\s*\[[^\]]*\]\s*[;=]/,
      
      // 结构体类型
      /\b(struct\s+\w+)\s+(\w+)\s*[;=]/,
      /\b(typedef\s+struct[^}]*}\s+\w+)\s+(\w+)\s*[;=]/,
      
      // 联合体类型
      /\b(union\s+\w+)\s+(\w+)\s*[;=]/,
      /\b(typedef\s+union[^}]*}\s+\w+)\s+(\w+)\s*[;=]/,
      
      // 枚举类型
      /\b(enum\s+\w+)\s+(\w+)\s*[;=]/,
      /\b(typedef\s+enum[^}]*}\s+\w+)\s+(\w+)\s*[;=]/,
      
      // 函数指针类型
      /\b(\w+\s*\(\s*\*\s*\w+\s*\)\s*\([^)]*\))\s+(\w+)\s*[;=]/,
      
      // 复杂类型
      /\b(\w+\s*\*\s*\*\s*)\s+(\w+)\s*[;=]/,
      /\b(\w+\s*\(\s*\*\s*\*\s*\w+\s*\)\s*\([^)]*\))\s+(\w+)\s*[;=]/,
    ];
    
    for (const pattern of declarationPatterns) {
      const match = line.match(pattern);
      if (match && !line.includes('extern') && !line.includes('static') && !line.includes('typedef')) {
        const varName = match[match.length - 1];
        const type = match[1];
        const isPointer = line.includes('*');
        
        
        const varInfo: VariableInfo = {
          type,
          isPointer,
          isInitialized: line.includes('='),
          isParameter: false,
          line: lineIndex,
          valueHistory: [],
          spaceType: 'stack'
        };
        
        currentStackFrame.variables.set(varName, varInfo);
      }
    }
  }

  /**
   * 构建全局符号表
   */
  private buildGlobalSymbolTable(line: string, lineIndex: number, globalSymbolTable: GlobalSymbolTable, context: DetectionContext): void {
    // 检测函数定义
    const functionMatch = line.match(/(\w+\*?)\s+(\w+)\s*\([^)]*\)\s*{/);
    if (functionMatch) {
      const returnType = functionMatch[1];
      const functionName = functionMatch[2];
      const isPointer = returnType.includes('*');
      
      // 检查是否是危险函数
      const isDangerous = this.isDangerousFunctionPattern(functionName, line);
      
      const symbol: GlobalSymbol = {
        name: functionName,
        type: 'function',
        filePath: context.filePath,
        line: lineIndex + 1,
        isDangerous,
        returnType,
        isPointer
      };
      
      globalSymbolTable.addSymbol(symbol);
      
      // 创建函数摘要
      const summary: FunctionSummary = {
        name: functionName,
        returnType,
        parameters: [],
        dangerousOperations: [],
        returnsLocalAddress: false,
        returnsFreedMemory: false,
        callsDangerousFunctions: []
      };
      
      globalSymbolTable.addFunctionSummary(summary);
    }
    
    // 检测全局变量定义
    const globalVarMatch = line.match(/^(\w+\*?)\s+(\w+)\s*[;=]/);
    if (globalVarMatch && !line.includes('static') && !line.includes('extern')) {
      const varType = globalVarMatch[1];
      const varName = globalVarMatch[2];
      const isPointer = varType.includes('*');
      
      const symbol: GlobalSymbol = {
        name: varName,
        type: 'variable',
        filePath: context.filePath,
        line: lineIndex + 1,
        isDangerous: false,
        isPointer
      };
      
      globalSymbolTable.addSymbol(symbol);
    }
    
    // 检测结构体定义
    const structMatch = line.match(/typedef\s+struct[^}]*}\s+(\w+)\s*;/);
    if (structMatch) {
      const structName = structMatch[1];
      
      const symbol: GlobalSymbol = {
        name: structName,
        type: 'struct',
        filePath: context.filePath,
        line: lineIndex + 1,
        isDangerous: false
      };
      
      globalSymbolTable.addSymbol(symbol);
    }
  }

  /**
   * 检查函数是否是危险模式
   */
  private isDangerousFunctionPattern(functionName: string, line: string): boolean {
    const dangerousPatterns = [
      /return.*&/,  // 返回地址
      /return.*\w+\[/,  // 返回数组
      /return.*\w+\./,  // 返回结构体字段
      /return.*\w+->/,  // 返回指针字段
      /free\s*\(.*\).*return/,  // 释放后返回
      /return.*local/,  // 返回局部变量
      /return.*stack/,  // 返回栈变量
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(line.toLowerCase()));
  }

  /**
   * 检测跨函数调用
   */
  private detectCrossFunctionCalls(line: string, lineIndex: number, scopeStack: ScopeManager[], issues: Issue[], context: DetectionContext, globalSymbolTable: GlobalSymbolTable): void {
    // 检测函数调用模式 - 更全面的模式
    const functionCallPatterns = [
      /\b(\w+)\s*=\s*(\w+)\s*\(/,  // var = func(
      /\b(\w+)\s*=\s*(\w+)\s*\([^)]*\)\s*;/,  // var = func(args);
      /\b(\w+)\s*=\s*(\w+)\s*\([^)]*\)\s*$/,  // var = func(args) (行尾)
      /\b(\w+\*?)\s+(\w+)\s*=\s*(\w+)\s*\(/,  // type var = func(
      /\b(\w+\*?)\s+(\w+)\s*=\s*(\w+)\s*\([^)]*\)\s*;/,  // type var = func(args);
      /\b(\w+\*?)\s+(\w+)\s*=\s*(\w+)\s*\([^)]*\)\s*$/,  // type var = func(args) (行尾)
    ];
    
    for (const pattern of functionCallPatterns) {
      const match = line.match(pattern);
      if (match) {
        // 根据不同的模式提取变量名和函数名
        let varName: string, funcName: string;
        if (match.length === 4) {
          // type var = func( 模式
          varName = match[2];
          funcName = match[3];
        } else {
          // var = func( 模式
          varName = match[1];
          funcName = match[2];
        }
        
        // 记录跨函数调用
        const crossCall: CrossFunctionCall = {
          caller: 'current_function', // 这里需要从上下文获取当前函数名
          callee: funcName,
          line: lineIndex + 1,
          filePath: context.filePath,
          returnAssignment: varName
        };
        globalSymbolTable.addCrossFunctionCall(crossCall);
        
        // 检查是否是危险函数
        const isDangerous = globalSymbolTable.isDangerousFunction(funcName) || this.isDangerousFunction(funcName);
        
        if (isDangerous) {
          // 检查变量是否被赋值给危险函数的返回值
          for (const scope of scopeStack) {
            if (scope.hasVariable(varName)) {
              const varInfo = scope.getVariable(varName);
              if (varInfo && varInfo.isPointer) {
                // 标记为危险状态
                scope.updateVariableValue(varName, 'dangerous', 'function_call', lineIndex);
                
                issues.push({
                  file: context.filePath,
                  line: lineIndex + 1,
                  category: 'Dangerous function call',
                  message: `危险函数调用：变量 '${varName}' 被赋值为危险函数 '${funcName}' 的返回值`,
                  codeLine: line
                });
              }
            }
          }
        }
        
        // 使用函数摘要进行过程间分析
        this.performInterproceduralAnalysis(funcName, varName, lineIndex, issues, context, globalSymbolTable);
      }
    }
  }

  /**
   * 执行过程间分析
   */
  private performInterproceduralAnalysis(funcName: string, varName: string, lineIndex: number, issues: Issue[], context: DetectionContext, globalSymbolTable: GlobalSymbolTable): void {
    const summary = globalSymbolTable.getFunctionSummary(funcName);
    if (summary) {
      // 检查函数是否返回局部地址
      if (summary.returnsLocalAddress) {
        issues.push({
          file: context.filePath,
          line: lineIndex + 1,
          category: 'Interprocedural analysis',
          message: `过程间分析：函数 '${funcName}' 返回局部地址，变量 '${varName}' 可能成为野指针`,
          codeLine: context.lines[lineIndex]
        });
      }
      
      // 检查函数是否返回已释放内存
      if (summary.returnsFreedMemory) {
        issues.push({
          file: context.filePath,
          line: lineIndex + 1,
          category: 'Interprocedural analysis',
          message: `过程间分析：函数 '${funcName}' 返回已释放内存，变量 '${varName}' 可能成为悬空指针`,
          codeLine: context.lines[lineIndex]
        });
      }
      
      // 检查函数是否调用危险函数
      if (summary.callsDangerousFunctions.length > 0) {
        issues.push({
          file: context.filePath,
          line: lineIndex + 1,
          category: 'Interprocedural analysis',
          message: `过程间分析：函数 '${funcName}' 调用了危险函数 [${summary.callsDangerousFunctions.join(', ')}]，变量 '${varName}' 可能不安全`,
          codeLine: context.lines[lineIndex]
        });
      }
    }
  }

  /**
   * 检查是否是危险函数
   */
  private isDangerousFunction(funcName: string): boolean {
    const dangerousFunctions = [
      'createAndFree', 'returnLocal', 'returnLocalArray', 'returnLocalStruct',
      'returnLocalString', 'returnLocalPointer', 'returnLocalFuncPtr',
      'returnLocalUnion', 'returnLocalEnum', 'returnLocalBitField',
      'returnLocalVLA', 'returnLocalCompound', 'returnLocalAnonymous',
      'returnLocalNested', 'returnLocalBitFieldStruct', 'returnLocalUnionStruct',
      'returnLocalFuncStruct', 'returnLocalArrayStruct', 'returnLocalStringStruct',
      'returnLocalPointerStruct', 'returnLocalNestedPointerStruct',
      'returnLocalBitFieldPointerStruct', 'returnLocalUnionPointerStruct',
      'freePointer', 'reallocatePointer'  // 添加更多危险函数
    ];
    
    // 检查函数名是否包含危险关键词
    const dangerousKeywords = [
      'returnLocal', 'returnLocal', 'createAndFree', 'freePointer',
      'returnLocalArray', 'returnLocalStruct', 'returnLocalString',
      'returnLocalPointer', 'returnLocalFuncPtr', 'returnLocalUnion',
      'returnLocalEnum', 'returnLocalBitField', 'returnLocalVLA',
      'returnLocalCompound', 'returnLocalAnonymous', 'returnLocalNested',
      'returnLocalBitFieldStruct', 'returnLocalUnionStruct',
      'returnLocalFuncStruct', 'returnLocalArrayStruct', 'returnLocalStringStruct',
      'returnLocalPointerStruct', 'returnLocalNestedPointerStruct',
      'returnLocalBitFieldPointerStruct', 'returnLocalUnionPointerStruct'
    ];
    
    return dangerousFunctions.includes(funcName) || 
           dangerousKeywords.some(keyword => funcName.includes(keyword));
  }

  /**
   * 检查栈变量是否仍然有效
   */
  private isStackVariableValid(targetVariable: string, stackFrameId: string | undefined, scopeStack: ScopeManager[]): boolean {
    // 简化实现：检查变量是否在当前作用域中
    for (const scope of scopeStack) {
      if (scope.hasVariable(targetVariable)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查变量是否为函数参数
   */
  private isFunctionParameter(varName: string, functionParameters: Map<string, Set<string>>): boolean {
    for (const paramSet of functionParameters.values()) {
      if (paramSet.has(varName)) {
        return true;
      }
    }
    return false;
  }
  
  private stripLineComments(s: string): string {
    const idx = s.indexOf('//');
    return idx >= 0 ? s.slice(0, idx) : s;
  }
}
