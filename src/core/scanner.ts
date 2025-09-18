// 完全基于 AST 的 C 代码安全扫描器
// 使用 tree-sitter 进行精确的语法分析

export async function analyzeWorkspaceCFiles(...args: any[]) {
  const mod = await import('./ast_scanner');
  return (mod as any).analyzeWorkspaceCFiles(...args);
}


