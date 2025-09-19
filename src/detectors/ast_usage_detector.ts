import { Issue } from '../interfaces/types';

export interface DetectionContext {
  filePath: string;
  content: string;
  lines: string[];
  ast: any;
  config: any;
}

export class ASTUsageDetector {
  private astParser: any;

  constructor(astParser: any) {
    this.astParser = astParser;
  }

  async detect(context: DetectionContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    if (!this.astParser || !context.ast) {
      issues.push({
        file: context.filePath,
        line: 1,
        category: 'AST_NOT_USED',
        message: 'AST not available or failed to parse',
        codeLine: 'Check AST parser initialization'
      });
      return issues;
    }

    // Check if AST has meaningful content
    if (!context.ast || context.ast.type === 'unknown' || !context.ast.children || context.ast.children.length === 0) {
      issues.push({
        file: context.filePath,
        line: 1,
        category: 'AST_EMPTY',
        message: 'AST is empty or invalid',
        codeLine: 'AST parsing may have failed'
      });
      return issues;
    }

    // Check if we can extract meaningful information from AST
    try {
      const declarations = this.astParser.extractVariableDeclarations(context.ast, context.lines);
      const functionCalls = this.astParser.extractFunctionCalls(context.ast);
      
      if (declarations.length === 0 && functionCalls.length === 0) {
        issues.push({
          file: context.filePath,
          line: 1,
          category: 'AST_NO_CONTENT',
          message: `AST parsed but no meaningful content extracted (${declarations.length} declarations, ${functionCalls.length} function calls)`,
          codeLine: 'AST may not be properly converted from Clang format'
        });
      } else {
        // AST is working properly
        issues.push({
          file: context.filePath,
          line: 1,
          category: 'AST_WORKING',
          message: `AST working properly: ${declarations.length} declarations, ${functionCalls.length} function calls extracted`,
          codeLine: 'AST detection is functioning correctly'
        });
      }
    } catch (error: any) {
      issues.push({
        file: context.filePath,
        line: 1,
        category: 'AST_EXTRACTION_ERROR',
        message: `AST extraction failed: ${error.message}`,
        codeLine: 'Check AST extraction methods'
      });
    }

    return issues;
  }
}
