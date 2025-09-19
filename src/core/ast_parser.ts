// AST 解析器：优先使用原生 tree-sitter，失败则回退到 web-tree-sitter(WASM)
let NativeParser: any = null;
let NativeC: any = null;
try {
  // 尝试加载原生绑定
  NativeParser = require('tree-sitter');
  NativeC = require('tree-sitter-c');
} catch (_) {
  // 忽略，在 WASM 路径中初始化
}

export interface ASTNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: ASTNode[];
  namedChildren: ASTNode[];
  parent?: ASTNode;
  fieldName?: string;
}

export interface VariableDeclaration {
  name: string;
  type: string;
  isPointer: boolean;
  isArray: boolean;
  isInitialized: boolean;
  isParameter: boolean;
  isGlobal: boolean;
  position: { row: number; column: number };
  scope: string; // function name or 'global'
}

export interface FunctionCall {
  name: string;
  arguments: string[];
  position: { row: number; column: number };
}

export interface IncludeDirective {
  headerName: string;
  isSystemHeader: boolean; // <> vs ""
  position: { row: number; column: number };
}

export class CASTParser {
  private parser: any;

  constructor(parser?: any) {
    if (parser) {
      this.parser = parser;
      return;
    }
    if (NativeParser && NativeC) {
      const p = new NativeParser();
      p.setLanguage(NativeC);
      this.parser = p;
      return;
    }
    throw new Error('Native tree-sitter 不可用，请使用 CASTParser.create() (WASM)');
  }

  static async create(): Promise<CASTParser> {
    // 原生可用
    if (NativeParser && NativeC) {
      const p = new NativeParser();
      p.setLanguage(NativeC);
      return new CASTParser(p);
    }
    // 优先使用 WASM（web-tree-sitter）
    try {
      const WTS = require('web-tree-sitter');
      await WTS.init();
      const path = require('path');
      const fs = require('fs');
      const candidates = [
        path.join(process.cwd(), 'assets', 'grammars', 'tree-sitter-c.wasm'),
        path.join(__dirname, '..', '..', 'assets', 'grammars', 'tree-sitter-c.wasm')
      ];
      const wasmPath = candidates.find((p: string) => fs.existsSync(p));
      if (wasmPath) {
        const C_lang = await WTS.Language.load(wasmPath);
        const parser = new WTS();
        parser.setLanguage(C_lang);
        return new CASTParser(parser);
      }
    } catch (_) {
      // 忽略，转入 clang 回退
    }

    // 最终回退：使用 clang -Xclang -ast-dump=json 生成 AST 并转换
    const cp = require('child_process');
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    const clangParser = {
      // 智能修复截断的 JSON
      fixTruncatedJson(json: string): string | null {
        try {
          // 方法1: 尝试找到最后一个完整的对象
          let braceCount = 0;
          let lastValidPos = -1;
          let inString = false;
          let escapeNext = false;
          
          for (let i = 0; i < json.length; i++) {
            const char = json[i];
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            if (char === '"' && !escapeNext) {
              inString = !inString;
              continue;
            }
            if (!inString) {
              if (char === '{') braceCount++;
              if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  lastValidPos = i;
                }
              }
            }
          }
          
          if (lastValidPos > 0) {
            const truncated = json.substring(0, lastValidPos + 1);
            // 验证修复后的 JSON 是否有效
            JSON.parse(truncated);
            return truncated;
          }
          
          // 方法2: 尝试添加缺失的闭合括号
          const openBraces = (json.match(/\{/g) || []).length;
          const closeBraces = (json.match(/\}/g) || []).length;
          const missingBraces = openBraces - closeBraces;
          
          if (missingBraces > 0) {
            const fixed = json + '}'.repeat(missingBraces);
            JSON.parse(fixed);
            return fixed;
          }
          
          return null;
        } catch {
          return null;
        }
      },
      
      parse(sourceCode: string) {
        // 将源码写入临时文件
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cscan-'));
        const tmpC = path.join(tmpDir, 'tmp.c');
        fs.writeFileSync(tmpC, sourceCode, 'utf8');
        
        // 使用更健壮的 clang 命令，包含必要的头文件路径
        const clangCmd = `clang -Xclang -ast-dump=json -fsyntax-only -I/usr/include -I/usr/local/include -I. "${tmpC}"`;
        
        let jsonRaw = '';
        try {
          // 增加超时和缓冲区大小
          jsonRaw = cp.execSync(clangCmd, { 
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 30000, // 30秒超时
            maxBuffer: 50 * 1024 * 1024 // 50MB 缓冲区
          }).toString();
        } catch (e: any) {
          // clang 可能因为头文件错误而失败，但仍可能生成部分 AST
          jsonRaw = (e.stdout ? e.stdout.toString() : '') + '\n' + (e.stderr ? e.stderr.toString() : '');
          if (!jsonRaw.includes('{')) {
            console.log(`Clang AST 生成失败: ${e.message}`);
            return { type: 'translation_unit', text: '', startPosition: { row: 0, column: 0 }, endPosition: { row: 0, column: 0 }, children: [], namedChildren: [] } as any;
          }
        } finally {
          try { fs.unlinkSync(tmpC); fs.rmdirSync(tmpDir); } catch {}
        }
        
        // 改进的 JSON 提取和修复逻辑
        const jsonStart = jsonRaw.indexOf('{');
        const jsonEnd = jsonRaw.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) {
          console.log('无法找到有效的 JSON 结构');
          return { type: 'translation_unit', text: '', startPosition: { row: 0, column: 0 }, endPosition: { row: 0, column: 0 }, children: [], namedChildren: [] } as any;
        }
        
        let cleanJson = jsonRaw.substring(jsonStart, jsonEnd + 1);
        
        // 尝试解析 JSON，如果失败则进行智能修复
        let rootJson;
        try {
          rootJson = JSON.parse(cleanJson);
          console.log(`Clang AST JSON 解析成功，长度: ${cleanJson.length}`);
          console.log(`Clang AST 根节点类型: ${rootJson?.kind}`);
        } catch (parseError: any) {
          console.log(`JSON 解析失败，尝试智能修复: ${parseError.message}`);
          
          // 智能修复截断的 JSON
          const fixedJson = this.fixTruncatedJson(cleanJson);
          if (fixedJson) {
            try {
              rootJson = JSON.parse(fixedJson);
              console.log(`修复后 JSON 解析成功，长度: ${fixedJson.length}`);
              console.log(`Clang AST 根节点类型: ${rootJson?.kind}`);
            } catch (fixError) {
              console.log(`修复后仍然解析失败: ${fixError}`);
              return { type: 'translation_unit', text: '', startPosition: { row: 0, column: 0 }, endPosition: { row: 0, column: 0 }, children: [], namedChildren: [] } as any;
            }
          } else {
            console.log('无法修复 JSON，使用启发式回退');
            return { type: 'translation_unit', text: '', startPosition: { row: 0, column: 0 }, endPosition: { row: 0, column: 0 }, children: [], namedChildren: [] } as any;
          }
        }

        function toPos(node: any) {
          const line = node?.loc?.line ?? 1;
          const col = node?.loc?.col ?? 1;
          return { row: Math.max(0, line - 1), column: Math.max(0, col - 1) };
        }

        function convert(node: any, parent?: any): any {
          if (!node || typeof node !== 'object') return null;
          
          // 映射 clang 节点类型到 tree-sitter 兼容类型
          const typeMap: Record<string, string> = {
            'TranslationUnitDecl': 'translation_unit',
            'FunctionDecl': 'function_definition',
            'VarDecl': 'declaration',
            'DeclStmt': 'declaration',
            'CallExpr': 'call_expression',
            'DeclRefExpr': 'identifier',
            'StringLiteral': 'string_literal',
            'IntegerLiteral': 'number_literal',
            'ForStmt': 'for_statement',
            'WhileStmt': 'while_statement',
            'IfStmt': 'if_statement',
            'BreakStmt': 'break_statement',
            'ReturnStmt': 'return_statement',
            'BinaryOperator': 'binary_expression',
            'UnaryOperator': 'pointer_expression',
            'CompoundStmt': 'compound_statement',
            'ParmVarDecl': 'parameter_declaration',
            'ImplicitCastExpr': 'cast_expression',
            'PreprocessorDirective': 'preproc_include'
          };
          
          const ast: any = {
            type: typeMap[node?.kind] || node?.kind || 'unknown',
            text: node?.name || node?.value || '',
            startPosition: toPos(node),
            endPosition: toPos(node?.range?.end ?? node),
            children: [],
            namedChildren: [],
            parent,
          };
          
          const inner = Array.isArray(node?.inner) ? node.inner : [];
          for (const ch of inner) {
            if (ch && typeof ch === 'object' && ch.kind) {
              const c = convert(ch, ast);
              if (c) {
                ast.children.push(c);
                ast.namedChildren.push(c);
              }
            }
          }
          return ast;
        }

        return convert(rootJson);
      }
    };

    const parser = new CASTParser(clangParser);
    // 为 clang 解析器添加必要的方法
    parser.parse = clangParser.parse;
    return parser;
  }

  /**
   * 解析 C 代码并返回 AST 根节点
   */
  parse(sourceCode: string): ASTNode {
    const tree = this.parser.parse(sourceCode);
    return this.convertNode(tree.rootNode);
  }

  /**
   * 转换 tree-sitter 节点为我们的 ASTNode 接口
   */
  private convertNode(node: any, parent?: ASTNode): ASTNode {
    const astNode: ASTNode = {
      type: node.type,
      text: node.text,
      startPosition: node.startPosition,
      endPosition: node.endPosition,
      children: [],
      namedChildren: [],
      parent,
    };

    // 转换子节点
    for (const child of node.children) {
      const childNode = this.convertNode(child, astNode);
      astNode.children.push(childNode);
    }

    // 转换命名子节点
    for (const namedChild of node.namedChildren) {
      const childNode = this.convertNode(namedChild, astNode);
      astNode.namedChildren.push(childNode);
    }

    return astNode;
  }

  /**
   * 提取所有变量声明
   */
  extractVariableDeclarations(root: ASTNode, sourceLines: string[]): VariableDeclaration[] {
    const declarations: VariableDeclaration[] = [];
    const currentScope = this.getCurrentScope(root);

    this.traverseNode(root, (node) => {
      if (node.type === 'declaration') {
        const vars = this.parseDeclaration(node, currentScope, sourceLines);
        declarations.push(...vars);
      } else if (node.type === 'parameter_declaration') {
        const vars = this.parseParameterDeclaration(node, currentScope);
        declarations.push(...vars);
      }
    });

    return declarations;
  }

  /**
   * 提取所有函数调用
   */
  extractFunctionCalls(root: ASTNode): FunctionCall[] {
    const calls: FunctionCall[] = [];

    this.traverseNode(root, (node) => {
      if (node.type === 'call_expression') {
        const call = this.parseCallExpression(node);
        if (call) {
          calls.push(call);
        }
      }
    });

    return calls;
  }

  /**
   * 提取所有 include 指令
   */
  extractIncludeDirectives(root: ASTNode): IncludeDirective[] {
    const includes: IncludeDirective[] = [];

    this.traverseNode(root, (node) => {
      if (node.type === 'preproc_include') {
        const include = this.parseIncludeDirective(node);
        if (include) {
          includes.push(include);
        }
      }
    });

    return includes;
  }

  /**
   * 查找变量使用位置
   */
  findVariableUsages(root: ASTNode, variableName: string): { row: number; column: number }[] {
    const usages: { row: number; column: number }[] = [];

    this.traverseNode(root, (node) => {
      if (node.type === 'identifier' && node.text === variableName) {
        // 确保这是一个变量引用而不是声明
        if (!this.isDeclaration(node)) {
          usages.push(node.startPosition);
        }
      }
    });

    return usages;
  }

  /**
   * 查找指针解引用操作
   */
  findPointerDereferences(root: ASTNode, variableName: string): { row: number; column: number }[] {
    const dereferences: { row: number; column: number }[] = [];

    this.traverseNode(root, (node) => {
      // 查找 *variable
      if (node.type === 'pointer_expression') {
        const argument = node.namedChildren[0];
        if (argument && argument.type === 'identifier' && argument.text === variableName) {
          dereferences.push(node.startPosition);
        }
      }
      // 查找 variable->field
      else if (node.type === 'field_expression' && node.text.includes('->')) {
        const argument = node.namedChildren[0];
        if (argument && argument.type === 'identifier' && argument.text === variableName) {
          dereferences.push(node.startPosition);
        }
      }
      // 查找 variable[index]
      else if (node.type === 'subscript_expression') {
        const argument = node.namedChildren[0];
        if (argument && argument.type === 'identifier' && argument.text === variableName) {
          dereferences.push(node.startPosition);
        }
      }
    });

    return dereferences;
  }

  /**
   * 查找循环语句
   */
  findLoops(root: ASTNode): ASTNode[] {
    const loops: ASTNode[] = [];

    this.traverseNode(root, (node) => {
      if (node.type === 'for_statement' || node.type === 'while_statement' || node.type === 'do_statement') {
        loops.push(node);
      }
    });

    return loops;
  }

  /**
   * 检查循环是否可能是死循环
   */
  isInfiniteLoop(loopNode: ASTNode): boolean {
    // 检查 for(;;) 或 while(1) 等明显的死循环
    if (loopNode.type === 'for_statement') {
      const condition = this.findChildByType(loopNode, 'binary_expression');
      if (!condition) {
        // for(;;) 形式
        return !this.hasBreakOrReturn(loopNode);
      }
    } else if (loopNode.type === 'while_statement') {
      const condition = loopNode.namedChildren[0];
      if (condition && (condition.text === '1' || condition.text === 'true')) {
        return !this.hasBreakOrReturn(loopNode);
      }
    }

    return false;
  }

  /**
   * 检查节点内是否有 break 或 return 语句
   */
  private hasBreakOrReturn(node: ASTNode): boolean {
    let hasExit = false;

    this.traverseNode(node, (child) => {
      if (child.type === 'break_statement' || child.type === 'return_statement') {
        hasExit = true;
      }
      // 检查 exit() 函数调用
      if (child.type === 'call_expression') {
        const funcName = child.namedChildren[0];
        if (funcName && funcName.text === 'exit') {
          hasExit = true;
        }
      }
    });

    return hasExit;
  }

  /**
   * 遍历 AST 节点
   */
  private traverseNode(node: ASTNode, callback: (node: ASTNode) => void): void {
    callback(node);
    for (const child of node.namedChildren) {
      if (!child || typeof (child as any).type !== 'string') continue;
      this.traverseNode(child, callback);
    }
  }

  /**
   * 解析变量声明
   */
  private parseDeclaration(node: ASTNode, scope: string, sourceLines: string[]): VariableDeclaration[] {
    const declarations: VariableDeclaration[] = [];
    
    // 查找类型说明符
    const typeSpecifier = this.findChildByType(node, 'primitive_type') || 
                         this.findChildByType(node, 'type_identifier') ||
                         this.findChildByType(node, 'struct_specifier');
    
    if (!typeSpecifier) return declarations;

    const baseType = typeSpecifier.text;

    // 查找声明器
    const declarators = this.findChildrenByType(node, 'init_declarator') ||
                       this.findChildrenByType(node, 'declarator');

    for (const declarator of declarators) {
      const varInfo = this.parseDeclarator(declarator, baseType, scope, sourceLines);
      if (varInfo) {
        declarations.push(varInfo);
      }
    }

    return declarations;
  }

  /**
   * 解析声明器（变量名、指针等）
   */
  private parseDeclarator(declarator: ASTNode, baseType: string, scope: string, sourceLines: string[]): VariableDeclaration | null {
    let name = '';
    let isPointer = false;
    let isArray = false;
    let isInitialized = false;

    // 检查是否有初始化器
    const initDeclarator = this.findChildByType(declarator, 'init_declarator');
    if (initDeclarator) {
      isInitialized = true;
      const actualDeclarator = this.findChildByType(initDeclarator, 'declarator') ||
                              this.findChildByType(initDeclarator, 'pointer_declarator') ||
                              this.findChildByType(initDeclarator, 'array_declarator');
      if (actualDeclarator) {
        declarator = actualDeclarator;
      }
    } else {
      // 检查当前行是否有 = 号
      const line = sourceLines[declarator.startPosition.row];
      isInitialized = !!(line && line.includes('='));
    }

    // 解析声明器类型
    if (declarator.type === 'pointer_declarator') {
      isPointer = true;
      const innerDeclarator = this.findChildByType(declarator, 'identifier') ||
                             this.findChildByType(declarator, 'declarator');
      if (innerDeclarator) {
        name = innerDeclarator.text;
      }
    } else if (declarator.type === 'array_declarator') {
      isArray = true;
      const innerDeclarator = this.findChildByType(declarator, 'identifier') ||
                             this.findChildByType(declarator, 'declarator');
      if (innerDeclarator) {
        name = innerDeclarator.text;
      }
    } else if (declarator.type === 'identifier') {
      name = declarator.text;
    } else {
      // 查找标识符
      const identifier = this.findChildByType(declarator, 'identifier');
      if (identifier) {
        name = identifier.text;
      }
    }

    if (!name) return null;

    return {
      name,
      type: baseType,
      isPointer,
      isArray,
      isInitialized,
      isParameter: false,
      isGlobal: scope === 'global',
      position: declarator.startPosition,
      scope
    };
  }

  /**
   * 解析参数声明
   */
  private parseParameterDeclaration(node: ASTNode, scope: string): VariableDeclaration[] {
    const declarations: VariableDeclaration[] = [];
    
    const typeSpecifier = this.findChildByType(node, 'primitive_type') || 
                         this.findChildByType(node, 'type_identifier');
    
    if (!typeSpecifier) return declarations;

    const baseType = typeSpecifier.text;
    const declarator = this.findChildByType(node, 'declarator') ||
                      this.findChildByType(node, 'pointer_declarator') ||
                      this.findChildByType(node, 'array_declarator');

    if (declarator) {
      const varInfo = this.parseDeclarator(declarator, baseType, scope, []);
      if (varInfo) {
        varInfo.isParameter = true;
        varInfo.isInitialized = true; // 参数默认已初始化
        declarations.push(varInfo);
      }
    }

    return declarations;
  }

  /**
   * 解析函数调用表达式
   */
  private parseCallExpression(node: ASTNode): FunctionCall | null {
    const funcIdentifier = node.namedChildren[0];
    if (!funcIdentifier || funcIdentifier.type !== 'identifier') {
      return null;
    }

    const args: string[] = [];
    const argumentList = this.findChildByType(node, 'argument_list');
    if (argumentList) {
      for (const arg of argumentList.namedChildren) {
        args.push(arg.text);
      }
    }

    return {
      name: funcIdentifier.text,
      arguments: args,
      position: node.startPosition
    };
  }

  /**
   * 解析 include 指令
   */
  private parseIncludeDirective(node: ASTNode): IncludeDirective | null {
    const pathNode = this.findChildByType(node, 'string_literal') ||
                    this.findChildByType(node, 'system_lib_string');
    
    if (!pathNode) return null;

    const headerName = pathNode.text.replace(/[<>"]/g, '');
    const isSystemHeader = pathNode.text.startsWith('<');

    return {
      headerName,
      isSystemHeader,
      position: node.startPosition
    };
  }

  /**
   * 获取当前作用域
   */
  private getCurrentScope(node: ASTNode): string {
    // 简化实现，返回 global 或函数名
    const funcDef = this.findAncestorByType(node, 'function_definition');
    if (funcDef) {
      const declarator = this.findChildByType(funcDef, 'function_declarator');
      if (declarator) {
        const identifier = this.findChildByType(declarator, 'identifier');
        if (identifier) {
          return identifier.text;
        }
      }
    }
    return 'global';
  }

  /**
   * 检查节点是否是声明
   */
  private isDeclaration(node: ASTNode): boolean {
    const parent = node.parent;
    if (!parent) return false;

    return parent.type === 'declaration' || 
           parent.type === 'parameter_declaration' ||
           parent.type === 'init_declarator';
  }

  /**
   * 查找指定类型的子节点
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
   * 查找指定类型的所有子节点
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
   * 查找指定类型的祖先节点
   */
  private findAncestorByType(node: ASTNode, type: string): ASTNode | null {
    let current = node.parent;
    while (current) {
      if (current.type === type) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }
}