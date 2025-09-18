import * as vscode from 'vscode';
import { CASTParser, ASTNode, FunctionCall } from '../core/ast_parser';

/**
 * 基于 AST 的其他检测器
 * 包含死循环检测、数值范围检查、内存泄漏检测、printf/scanf格式检查
 */
export class ASTAdvancedDetector {
  private parser: CASTParser;

  constructor() {
    try {
      this.parser = new CASTParser();
    } catch {
      this.parser = {} as any;
    }
  }

  /**
   * 分析文件并返回所有诊断信息
   */
  async analyzeFile(uri: vscode.Uri): Promise<vscode.Diagnostic[]> {
    const document = await vscode.workspace.openTextDocument(uri);
    const sourceCode = document.getText();
    const sourceLines = sourceCode.split(/\r?\n/);
    
    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
      const ast = this.parser.parse(sourceCode);
      
      // 死循环检测
      diagnostics.push(...this.detectInfiniteLoops(ast));
      
      // 数值范围检查
      diagnostics.push(...this.checkNumericRange(ast, sourceLines));
      
      // 内存泄漏检测
      diagnostics.push(...this.detectMemoryLeaks(ast));
      
      // printf/scanf 格式检查
      diagnostics.push(...this.checkPrintfScanfFormats(ast));
      
    } catch (error) {
      console.error('AST parsing error in advanced detector:', error);
    }
    
    return diagnostics;
  }

  /**
   * 死循环检测
   */
  detectInfiniteLoops(ast: ASTNode): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const loops = this.parser.findLoops(ast);
    
    for (const loop of loops) {
      if (this.parser.isInfiniteLoop(loop)) {
        const range = new vscode.Range(
          new vscode.Position(loop.startPosition.row, loop.startPosition.column),
          new vscode.Position(loop.startPosition.row, loop.startPosition.column + 10)
        );
        
        diagnostics.push(new vscode.Diagnostic(
          range,
          '潜在死循环（无显式退出条件）',
          vscode.DiagnosticSeverity.Warning
        ));
      }
    }
    
    return diagnostics;
  }

  /**
   * 数值范围检查
   */
  checkNumericRange(ast: ASTNode, sourceLines: string[]): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    // 定义类型范围
    const typeRanges: { [key: string]: { min: number; max: number } } = {
      'char': { min: -128, max: 127 },
      'unsigned char': { min: 0, max: 255 },
      'short': { min: -32768, max: 32767 },
      'unsigned short': { min: 0, max: 65535 },
      'int': { min: -2147483648, max: 2147483647 },
      'unsigned int': { min: 0, max: 4294967295 },
      'long': { min: -2147483648, max: 2147483647 }, // 32位系统
      'unsigned long': { min: 0, max: 4294967295 },
      'long long': { min: -9223372036854775808, max: 9223372036854775807 },
      'unsigned long long': { min: 0, max: 18446744073709551615 }
    };
    
    // 查找赋值表达式
    this.traverseAST(ast, (node) => {
      if (node.type === 'assignment_expression') {
        const left = node.namedChildren[0];
        const right = node.namedChildren[1];
        
        if (left && right && left.type === 'identifier') {
          // 获取变量类型
          const varType = this.getVariableType(ast, left.text);
          if (varType && typeRanges[varType]) {
            const value = this.parseNumericValue(right.text);
            if (value !== null) {
              const range = typeRanges[varType];
              if (value < range.min || value > range.max) {
                const vscodeRange = new vscode.Range(
                  new vscode.Position(node.startPosition.row, node.startPosition.column),
                  new vscode.Position(node.endPosition.row, node.endPosition.column)
                );
                
                diagnostics.push(new vscode.Diagnostic(
                  vscodeRange,
                  `数值 ${value} 超出类型 ${varType} 的范围 [${range.min}, ${range.max}]`,
                  vscode.DiagnosticSeverity.Warning
                ));
              }
            }
          }
        }
      }
    });
    
    return diagnostics;
  }

  /**
   * 内存泄漏检测
   */
  detectMemoryLeaks(ast: ASTNode): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    // 追踪内存分配和释放
    const allocations = new Map<string, { position: { row: number; column: number }; function: string }>();
    const deallocations = new Set<string>();
    
    // 查找 malloc/calloc/realloc 调用
    this.traverseAST(ast, (node) => {
      if (node.type === 'assignment_expression') {
        const left = node.namedChildren[0];
        const right = node.namedChildren[1];
        
        if (left && right && left.type === 'identifier' && right.type === 'call_expression') {
          const funcCall = right.namedChildren[0];
          if (funcCall && funcCall.type === 'identifier') {
            const funcName = funcCall.text;
            if (['malloc', 'calloc', 'realloc'].includes(funcName)) {
              allocations.set(left.text, {
                position: node.startPosition,
                function: funcName
              });
            }
          }
        }
      }
      
      // 查找 free 调用
      if (node.type === 'call_expression') {
        const funcCall = node.namedChildren[0];
        if (funcCall && funcCall.type === 'identifier' && funcCall.text === 'free') {
          const arg = node.namedChildren[1];
          if (arg && arg.type === 'argument_list') {
            const pointer = arg.namedChildren[0];
            if (pointer && pointer.type === 'identifier') {
              deallocations.add(pointer.text);
            }
          }
        }
      }
    });
    
    // 检查未释放的内存
    for (const [varName, allocation] of allocations) {
      if (!deallocations.has(varName)) {
        const range = new vscode.Range(
          new vscode.Position(allocation.position.row, allocation.position.column),
          new vscode.Position(allocation.position.row, allocation.position.column + varName.length)
        );
        
        diagnostics.push(new vscode.Diagnostic(
          range,
          `潜在内存泄漏：变量 '${varName}' 分配内存后未释放`,
          vscode.DiagnosticSeverity.Warning
        ));
      }
    }
    
    return diagnostics;
  }

  /**
   * printf/scanf 格式检查
   */
  checkPrintfScanfFormats(ast: ASTNode): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    const functionCalls = this.parser.extractFunctionCalls(ast);
    
    for (const call of functionCalls) {
      if (['printf', 'fprintf', 'sprintf', 'scanf', 'fscanf', 'sscanf'].includes(call.name)) {
        const formatDiags = this.checkFormatString(call);
        diagnostics.push(...formatDiags);
      }
    }
    
    return diagnostics;
  }

  /**
   * 检查格式字符串
   */
  private checkFormatString(call: FunctionCall): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    if (call.arguments.length === 0) {
      return diagnostics;
    }
    
    const isScanf = call.name.includes('scanf');
    let formatArgIndex = 0;
    
    // 对于 fprintf/fscanf，格式字符串是第二个参数
    if (call.name.startsWith('f') && call.name !== 'free') {
      formatArgIndex = 1;
    }
    
    if (call.arguments.length <= formatArgIndex) {
      return diagnostics;
    }
    
    const formatString = call.arguments[formatArgIndex];
    const formatSpecCount = this.countFormatSpecifiers(formatString);
    const providedArgs = call.arguments.length - formatArgIndex - 1;
    
    const range = new vscode.Range(
      new vscode.Position(call.position.row, call.position.column),
      new vscode.Position(call.position.row, call.position.column + call.name.length)
    );
    
    if (providedArgs < formatSpecCount) {
      diagnostics.push(new vscode.Diagnostic(
        range,
        `${call.name} 参数少于格式化占位数：需要 ${formatSpecCount} 个参数，但只提供了 ${providedArgs} 个`,
        vscode.DiagnosticSeverity.Warning
      ));
    } else if (providedArgs > formatSpecCount) {
      diagnostics.push(new vscode.Diagnostic(
        range,
        `${call.name} 参数多于格式化占位数：需要 ${formatSpecCount} 个参数，但提供了 ${providedArgs} 个`,
        vscode.DiagnosticSeverity.Warning
      ));
    }
    
    // 检查 scanf 的地址操作符
    if (isScanf && formatSpecCount > 0) {
      for (let i = formatArgIndex + 1; i < call.arguments.length; i++) {
        const arg = call.arguments[i].trim();
        if (!arg.startsWith('&') && !this.isCharArray(arg)) {
          diagnostics.push(new vscode.Diagnostic(
            range,
            `scanf 参数 '${arg}' 可能需要地址操作符 &`,
            vscode.DiagnosticSeverity.Information
          ));
        }
      }
    }
    
    return diagnostics;
  }

  /**
   * 计算格式说明符数量
   */
  private countFormatSpecifiers(formatString: string): number {
    let count = 0;
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < formatString.length; i++) {
      const char = formatString[i];
      
      if (char === '"' && !escaped) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        continue;
      }
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      if (char === '%') {
        if (i + 1 < formatString.length && formatString[i + 1] === '%') {
          i++; // 跳过 %%
          continue;
        }
        count++;
      }
    }
    
    return count;
  }

  /**
   * 检查是否是字符数组
   */
  private isCharArray(arg: string): boolean {
    // 简单启发式：包含 [  或者是纯标识符（可能是字符数组）
    return arg.includes('[') || /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(arg);
  }

  /**
   * 获取变量类型
   */
  private getVariableType(ast: ASTNode, varName: string): string | null {
    let foundType: string | null = null;
    
    this.traverseAST(ast, (node) => {
      if (node.type === 'declaration') {
        const typeSpec = this.findChildByType(node, 'primitive_type') ||
                        this.findChildByType(node, 'type_identifier');
        if (typeSpec) {
          const declarators = this.findChildrenByType(node, 'init_declarator') ||
                             this.findChildrenByType(node, 'declarator');
          
          for (const declarator of declarators) {
            const identifier = this.findIdentifierInDeclarator(declarator);
            if (identifier && identifier.text === varName) {
              foundType = typeSpec.text;
              // 检查是否有 unsigned 修饰符
              const parent = node;
              if (parent.text.includes('unsigned')) {
                foundType = 'unsigned ' + foundType;
              }
              return;
            }
          }
        }
      }
    });
    
    return foundType;
  }

  /**
   * 解析数值
   */
  private parseNumericValue(text: string): number | null {
    // 去除空格
    text = text.trim();
    
    // 十六进制
    if (text.startsWith('0x') || text.startsWith('0X')) {
      const num = parseInt(text, 16);
      return isNaN(num) ? null : num;
    }
    
    // 八进制
    if (text.startsWith('0') && text.length > 1 && /^[0-7]+$/.test(text.slice(1))) {
      const num = parseInt(text, 8);
      return isNaN(num) ? null : num;
    }
    
    // 十进制
    const num = parseInt(text, 10);
    return isNaN(num) ? null : num;
  }

  /**
   * 遍历 AST
   */
  private traverseAST(node: ASTNode, callback: (node: ASTNode) => void): void {
    callback(node);
    for (const child of node.namedChildren) {
      this.traverseAST(child, callback);
    }
  }

  /**
   * 查找子节点
   */
  private findChildByType(node: ASTNode, type: string): ASTNode | null {
    for (const child of node.namedChildren) {
      if (child.type === type) {
        return child;
      }
    }
    return null;
  }

  /**
   * 查找所有指定类型的子节点
   */
  private findChildrenByType(node: ASTNode, type: string): ASTNode[] {
    const children: ASTNode[] = [];
    for (const child of node.namedChildren) {
      if (child.type === type) {
        children.push(child);
      }
    }
    return children;
  }

  /**
   * 在声明器中查找标识符
   */
  private findIdentifierInDeclarator(node: ASTNode): ASTNode | null {
    if (node.type === 'identifier') {
      return node;
    }
    
    for (const child of node.namedChildren) {
      const identifier = this.findIdentifierInDeclarator(child);
      if (identifier) {
        return identifier;
      }
    }
    
    return null;
  }
}