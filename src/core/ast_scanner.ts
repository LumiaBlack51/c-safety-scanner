import * as vscode from 'vscode';
import * as path from 'path';
import { CASTParser } from './ast_parser';
import { ASTVariableDetector } from '../detectors/ast_variable_detector';
import { ASTLibraryDetector } from '../detectors/ast_library_detector';
import { ASTAdvancedDetector } from '../detectors/ast_advanced_detector';

/**
 * 基于 AST 的主扫描器
 * 集成所有检测器，替换原有的启发式逻辑
 */
export async function analyzeWorkspaceCFilesAST(root: vscode.Uri): Promise<Map<vscode.Uri, vscode.Diagnostic[]>> {
  const files = await vscode.workspace.findFiles(new vscode.RelativePattern(root.fsPath, '**/*.c'));
  const results = new Map<vscode.Uri, vscode.Diagnostic[]>();

  // 创建各种检测器
  const variableDetector = new ASTVariableDetector();
  const libraryDetector = new ASTLibraryDetector();
  const advancedDetector = new ASTAdvancedDetector();

  for (const file of files) {
    const allDiagnostics: vscode.Diagnostic[] = [];

    try {
      // 变量检测（未初始化、野指针）
      const variableDiags = await variableDetector.analyzeFile(file);
      allDiagnostics.push(...variableDiags);

      // 空指针检测
      const document = await vscode.workspace.openTextDocument(file);
      const sourceCode = document.getText();
      const sourceLines = sourceCode.split(/\r?\n/);
      const parser = new CASTParser();
      const ast = parser.parse(sourceCode);
      
      const nullPointerDiags = variableDetector.checkNullPointerDereference(ast, sourceLines);
      allDiagnostics.push(...nullPointerDiags);

      // 库函数检测
      const libraryDiags = await libraryDetector.analyzeFile(file);
      allDiagnostics.push(...libraryDiags);

      // 头文件拼写检查
      const headerSpellingDiags = await libraryDetector.checkHeaderSpelling(file);
      allDiagnostics.push(...headerSpellingDiags);

      // 高级检测（死循环、数值范围、内存泄漏、printf/scanf）
      const advancedDiags = await advancedDetector.analyzeFile(file);
      allDiagnostics.push(...advancedDiags);

    } catch (error) {
      console.error(`Error analyzing file ${file.fsPath}:`, error);
      // 继续处理其他文件，不让一个文件的错误影响整体扫描
    }

    results.set(file, allDiagnostics);
  }

  return results;
}

/**
 * 兼容性函数：保持与现有 CLI 接口的兼容性
 */
export async function analyzeWorkspaceCFiles(root: vscode.Uri): Promise<Map<vscode.Uri, vscode.Diagnostic[]>> {
  return analyzeWorkspaceCFilesAST(root);
}