import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { analyzeWorkspaceCFiles } from '../core/ast_scanner';

function printIssues(diagnosticsMap: Map<vscode.Uri, vscode.Diagnostic[]>) {
  let totalIssues = 0;
  
  for (const [uri, diagnostics] of diagnosticsMap) {
    const filePath = uri.fsPath;
    const relativePath = path.relative(process.cwd(), filePath);
    
    for (const diag of diagnostics) {
      const line = diag.range.start.line + 1; // VSCode uses 0-based line numbers
      const category = getCategory(diag.severity!);
      const message = diag.message;
      
      console.log(`${relativePath}:${line}: [${category}] ${message}`);
      
      // 读取源码行显示上下文
      try {
        const sourceLines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
        const codeLine = sourceLines[diag.range.start.line] || '';
        if (codeLine.trim()) {
          console.log(`    ${codeLine.trim()}`);
        }
      } catch (error) {
        // 忽略文件读取错误
      }
      
      totalIssues++;
    }
    
    if (diagnostics.length > 0) {
      console.log(''); // 空行分隔不同文件
    }
  }
  
  console.log(`\n总计发现 ${totalIssues} 个问题。`);
}

function getCategory(severity: vscode.DiagnosticSeverity): string {
  switch (severity) {
    case vscode.DiagnosticSeverity.Error:
      return 'ERROR';
    case vscode.DiagnosticSeverity.Warning:
      return 'WARNING';
    case vscode.DiagnosticSeverity.Information:
      return 'INFO';
    case vscode.DiagnosticSeverity.Hint:
      return 'HINT';
    default:
      return 'UNKNOWN';
  }
}

function printTables() {
  console.log('\n=== 基于AST的C代码安全扫描器 ===');
  console.log('支持的检测功能:');
  console.log('- 未初始化变量检测');
  console.log('- 野指针/空指针解引用检测');
  console.log('- 库函数头文件包含检查');
  console.log('- 头文件拼写检查');
  console.log('- 死循环检测');
  console.log('- 数值范围检查');
  console.log('- 内存泄漏检测');
  console.log('- printf/scanf 格式检查');
}

async function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'samples');
  
  console.log(`正在扫描目录: ${dir}`);
  
  try {
    // 创建 VSCode URI
    const dirUri = vscode.Uri.file(dir);
    
    // 使用 AST 版本进行分析
    const diagnosticsMap = await analyzeWorkspaceCFiles(dirUri);
    
    if (diagnosticsMap.size === 0) {
      console.log('目录中没有找到 C 文件。');
    } else {
      let totalIssues = 0;
      for (const diags of diagnosticsMap.values()) {
        totalIssues += diags.length;
      }
      
      if (totalIssues === 0) {
        console.log('没有发现问题。');
      } else {
        printIssues(diagnosticsMap);
      }
    }
    
    printTables();
  } catch (error) {
    console.error('扫描过程中发生错误:', error);
    process.exit(1);
  }
}

main().catch(err => { 
  console.error('程序执行失败:', err); 
  process.exit(1); 
});


