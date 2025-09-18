import * as vscode from 'vscode';
import { CASTParser, VariableDeclaration, ASTNode } from '../core/ast_parser';

/**
 * 基于 AST 的变量检测器
 * 检测未初始化变量使用和野指针解引用
 */
export class ASTVariableDetector {
  private parser: CASTParser;

  constructor() {
    try {
      this.parser = new CASTParser();
    } catch {
      // 将在 CLI 中统一用 CASTParser.create() 路径，不在此处实例化
      // 保留占位，若被直接使用需外部重构为异步
      this.parser = {} as any;
    }
  }

  /**
   * 分析文件并返回诊断信息
   */
  async analyzeFile(uri: vscode.Uri): Promise<vscode.Diagnostic[]> {
    const document = await vscode.workspace.openTextDocument(uri);
    const sourceCode = document.getText();
    const sourceLines = sourceCode.split(/\r?\n/);
    
    const diagnostics: vscode.Diagnostic[] = [];
    
    try {
      const ast = this.parser.parse(sourceCode);
      
      // 提取所有变量声明
      const declarations = this.parser.extractVariableDeclarations(ast, sourceLines);
      
      // 创建变量映射，按作用域分组
      const variablesByScope = this.groupVariablesByScope(declarations);
      
      // 检查每个变量的使用
      for (const [scope, variables] of variablesByScope) {
        for (const variable of variables) {
          const issues = this.checkVariableUsage(ast, variable, sourceLines);
          diagnostics.push(...issues);
        }
      }
      
    } catch (error) {
      console.error('AST parsing error:', error);
      // 如果 AST 解析失败，返回空诊断而不是崩溃
    }
    
    return diagnostics;
  }

  /**
   * 按作用域分组变量
   */
  private groupVariablesByScope(declarations: VariableDeclaration[]): Map<string, VariableDeclaration[]> {
    const grouped = new Map<string, VariableDeclaration[]>();
    
    for (const decl of declarations) {
      const scope = decl.scope;
      if (!grouped.has(scope)) {
        grouped.set(scope, []);
      }
      grouped.get(scope)!.push(decl);
    }
    
    return grouped;
  }

  /**
   * 检查单个变量的使用情况
   */
  private checkVariableUsage(ast: ASTNode, variable: VariableDeclaration, sourceLines: string[]): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    // 如果变量已初始化或是参数，跳过检查
    if (variable.isInitialized || variable.isParameter) {
      return diagnostics;
    }
    
    // 查找变量的所有使用位置
    const usages = this.parser.findVariableUsages(ast, variable.name);
    
    // 查找指针解引用
    const dereferences = this.parser.findPointerDereferences(ast, variable.name);
    
    // 检查每个使用位置
    for (const usage of usages) {
      // 跳过声明位置
      if (usage.row === variable.position.row) {
        continue;
      }
      
      // 检查是否是赋值操作（这会初始化变量）
      if (this.isAssignmentTarget(sourceLines[usage.row], variable.name, usage.column)) {
        // 标记变量为已初始化（简化处理）
        variable.isInitialized = true;
        continue;
      }
      
      // 报告未初始化使用
      const range = new vscode.Range(
        new vscode.Position(usage.row, usage.column),
        new vscode.Position(usage.row, usage.column + variable.name.length)
      );
      
      diagnostics.push(new vscode.Diagnostic(
        range,
        `变量 '${variable.name}' 在初始化前被使用`,
        vscode.DiagnosticSeverity.Warning
      ));
    }
    
    // 检查指针解引用
    for (const deref of dereferences) {
      // 跳过声明位置
      if (deref.row === variable.position.row) {
        continue;
      }
      
      if (variable.isPointer && !variable.isInitialized) {
        const range = new vscode.Range(
          new vscode.Position(deref.row, deref.column),
          new vscode.Position(deref.row, deref.column + variable.name.length + 2) // 包含 * 或 ->
        );
        
        diagnostics.push(new vscode.Diagnostic(
          range,
          `潜在野指针解引用：指针 '${variable.name}' 未初始化`,
          vscode.DiagnosticSeverity.Error
        ));
      }
    }
    
    return diagnostics;
  }

  /**
   * 检查是否是赋值目标
   */
  private isAssignmentTarget(line: string, variableName: string, column: number): boolean {
    const trimmedLine = line.trim();
    
    // 查找变量名在行中的位置
    const varIndex = line.indexOf(variableName, column);
    if (varIndex === -1) {
      return false;
    }
    
    // 检查变量后面是否紧跟赋值操作符
    const afterVar = line.slice(varIndex + variableName.length).trim();
    return /^(=|[\+\-\*\/\%]?=)/.test(afterVar);
  }

  /**
   * 检查空指针解引用
   */
  checkNullPointerDereference(ast: ASTNode, sourceLines: string[]): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const declarations = this.parser.extractVariableDeclarations(ast, sourceLines);
    
    // 查找被赋值为 NULL 或 0 的指针
    const nullPointers = declarations.filter(decl => 
      decl.isPointer && this.isNullInitialized(sourceLines[decl.position.row])
    );
    
    for (const pointer of nullPointers) {
      const dereferences = this.parser.findPointerDereferences(ast, pointer.name);
      
      for (const deref of dereferences) {
        // 检查解引用是否在 NULL 赋值之后
        if (deref.row > pointer.position.row) {
          const range = new vscode.Range(
            new vscode.Position(deref.row, deref.column),
            new vscode.Position(deref.row, deref.column + pointer.name.length + 2)
          );
          
          diagnostics.push(new vscode.Diagnostic(
            range,
            `潜在空指针解引用：指针 '${pointer.name}' 可能为 NULL`,
            vscode.DiagnosticSeverity.Error
          ));
        }
      }
    }
    
    return diagnostics;
  }

  /**
   * 检查是否初始化为 NULL
   */
  private isNullInitialized(line: string): boolean {
    return /=\s*(NULL|0)\b/.test(line);
  }
}