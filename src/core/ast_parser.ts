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
            'FloatingLiteral': 'number_literal',
            'CharacterLiteral': 'char_literal',
            'ForStmt': 'for_statement',
            'WhileStmt': 'while_statement',
            'DoStmt': 'do_statement',
            'IfStmt': 'if_statement',
            'BreakStmt': 'break_statement',
            'ContinueStmt': 'continue_statement',
            'ReturnStmt': 'return_statement',
            'BinaryOperator': 'binary_expression',
            'UnaryOperator': 'unary_expression',
            'CompoundStmt': 'compound_statement',
            'ParmVarDecl': 'parameter_declaration',
            'ImplicitCastExpr': 'cast_expression',
            'CStyleCastExpr': 'cast_expression',
            'PreprocessorDirective': 'preproc_include',
            'MemberExpr': 'field_expression',
            'ArraySubscriptExpr': 'subscript_expression',
            'InitListExpr': 'initializer_list',
            'InitDeclarator': 'init_declarator',
            'RecordDecl': 'struct_specifier',
            'TypedefDecl': 'type_definition',
            'EnumDecl': 'enum_specifier',
            'FieldDecl': 'field_declaration',
            'ParenExpr': 'parenthesized_expression',
            'ConditionalOperator': 'conditional_expression',
            'CompoundAssignOperator': 'compound_assignment',
            'CXXNewExpr': 'new_expression',
            'CXXDeleteExpr': 'delete_expression',
            'PointerType': 'pointer_type',
            'ArrayType': 'array_type',
            'BuiltinType': 'primitive_type',
            'TypedefType': 'type_identifier',
            'RecordType': 'struct_specifier',
            'EnumType': 'enum_specifier',
            'FunctionType': 'function_type',
            'ParenType': 'parenthesized_type',
            'QualType': 'qualified_type',
            'ElaboratedType': 'elaborated_type',
            'SubstTemplateTypeParmType': 'template_type',
            'TemplateTypeParmType': 'template_type',
            'CXXNullPtrLiteralExpr': 'null_literal',
            'GNUNullExpr': 'null_literal',
            'CXXBoolLiteralExpr': 'boolean_literal',
            'UnaryExprOrTypeTraitExpr': 'sizeof_expression',
            'SizeOfPackExpr': 'sizeof_expression',
            'OffsetOfExpr': 'offsetof_expression',
            'StmtExpr': 'statement_expression',
            'CompoundLiteralExpr': 'compound_literal',
            'ImplicitValueInitExpr': 'implicit_value_init',
            'CXXConstructExpr': 'constructor_expression',
            'CXXTemporaryObjectExpr': 'temporary_object',
            'CXXBindTemporaryExpr': 'bind_temporary',
            'MaterializeTemporaryExpr': 'materialize_temporary',
            'CXXThisExpr': 'this_expression',
            'CXXThrowExpr': 'throw_expression',
            'CXXNoexceptExpr': 'noexcept_expression',
            'CXXDefaultArgExpr': 'default_argument',
            'CXXDefaultInitExpr': 'default_initializer',
            'CXXScalarValueInitExpr': 'scalar_value_init',
            'CXXStdInitializerListExpr': 'std_initializer_list',
            'CXXPseudoDestructorExpr': 'pseudo_destructor',
            'CXXMemberCallExpr': 'member_call_expression',
            'CXXOperatorCallExpr': 'operator_call_expression',
            'UserDefinedLiteral': 'user_defined_literal',
            'CXXFunctionalCastExpr': 'functional_cast',
            'CXXStaticCastExpr': 'static_cast_expression',
            'CXXDynamicCastExpr': 'dynamic_cast_expression',
            'CXXReinterpretCastExpr': 'reinterpret_cast_expression',
            'CXXConstCastExpr': 'const_cast_expression',
            'CXXAddrspaceCastExpr': 'addrspace_cast_expression',
            'CXXUnresolvedConstructExpr': 'unresolved_construct',
            'CXXDependentScopeMemberExpr': 'dependent_scope_member',
            'CXXUnresolvedMemberExpr': 'unresolved_member',
            'OverloadExpr': 'overload_expression',
            'UnresolvedLookupExpr': 'unresolved_lookup',
            'UnresolvedMemberExpr': 'unresolved_member',
            'TypeTraitExpr': 'type_trait_expression',
            'PackExpansionExpr': 'pack_expansion',
            'SubstNonTypeTemplateParmExpr': 'subst_non_type_template',
            'SubstNonTypeTemplateParmPackExpr': 'subst_non_type_template_pack',
            'FunctionParmPackExpr': 'function_parameter_pack',
            'CXXFoldExpr': 'fold_expression',
            'CoroutineSuspendExpr': 'coroutine_suspend',
            'CoawaitExpr': 'coawait_expression',
            'CoyieldExpr': 'coyield_expression',
            'DependentScopeDeclRefExpr': 'dependent_scope_decl_ref',
            'CXXTypeidExpr': 'typeid_expression',
            'CXXUuidofExpr': 'uuidof_expression'
          };
          
          // 获取节点的文本内容
          let text = '';
          if (node?.name) {
            text = node.name;
          } else if (node?.value) {
            text = node.value;
          } else if (node?.kind === 'DeclRefExpr' && node?.name) {
            text = node.name;
          } else if (node?.kind === 'VarDecl' && node?.name) {
            text = node.name;
          } else if (node?.kind === 'CallExpr' && node?.name) {
            text = node.name;
          } else if (node?.kind === 'StringLiteral' && node?.value) {
            text = node.value;
          } else if (node?.kind === 'IntegerLiteral' && node?.value) {
            text = node.value;
          } else if (node?.kind === 'FloatingLiteral' && node?.value) {
            text = node.value;
          } else if (node?.kind === 'CharacterLiteral' && node?.value) {
            text = node.value;
          } else if (node?.kind === 'UnaryOperator' && node?.opcode) {
            text = node.opcode;
          } else if (node?.kind === 'BinaryOperator' && node?.opcode) {
            text = node.opcode;
          }
          
          const ast: any = {
            type: typeMap[node?.kind] || node?.kind || 'unknown',
            text: text,
            startPosition: toPos(node),
            endPosition: toPos(node?.range?.end ?? node),
            children: [],
            namedChildren: [],
            parent,
          };
          
          // 处理 clang AST 的子节点
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
          
          // 特殊处理 VarDecl 节点，确保其子节点被正确识别
          if (node?.kind === 'VarDecl') {
            // 查找类型信息
            if (node?.type) {
              const typeName = node.type?.qualType || node.type?.desugaredQualType || 'int';
              const typeNode = convert({ kind: 'BuiltinType', name: typeName }, ast);
              if (typeNode) {
                ast.children.push(typeNode);
                ast.namedChildren.push(typeNode);
              }
            }
            
            // 查找变量名
            if (node?.name) {
              const nameNode = convert({ kind: 'DeclRefExpr', name: node.name }, ast);
              if (nameNode) {
                ast.children.push(nameNode);
                ast.namedChildren.push(nameNode);
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
    if (node.children) {
    for (const child of node.children) {
      const childNode = this.convertNode(child, astNode);
      astNode.children.push(childNode);
      }
    }

    // 转换命名子节点
    if (node.namedChildren) {
    for (const namedChild of node.namedChildren) {
      const childNode = this.convertNode(namedChild, astNode);
      astNode.namedChildren.push(childNode);
      }
    }

    // 如果 namedChildren 为空但有 children，将所有 children 也加入 namedChildren
    if (astNode.namedChildren.length === 0 && astNode.children.length > 0) {
      astNode.namedChildren = [...astNode.children];
    }

    return astNode;
  }

  /**
   * 提取所有变量声明
   */
  extractVariableDeclarations(root: ASTNode, sourceLines: string[]): VariableDeclaration[] {
    const declarations: VariableDeclaration[] = [];
    const currentScope = this.getCurrentScope(root);
    const nodeTypes = new Set<string>();

    this.traverseNode(root, (node) => {
      nodeTypes.add(node.type);
      if (node.type === 'declaration' || node.type === 'VarDecl' || node.type === 'DeclStmt') {
        const vars = this.parseDeclaration(node, currentScope, sourceLines);
        declarations.push(...vars);
      } else if (node.type === 'parameter_declaration' || node.type === 'ParmVarDecl') {
        const vars = this.parseParameterDeclaration(node, currentScope);
        declarations.push(...vars);
      }
    });

    console.log(`    Node types found in AST: ${Array.from(nodeTypes).join(', ')}`);
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
    let identifierCount = 0;

    this.traverseNode(root, (node) => {
      if (node.type === 'identifier' || node.type === 'DeclRefExpr') {
        identifierCount++;
        console.log(`    Found identifier '${node.text}' at line ${node.startPosition.row + 1}, type: ${node.type}`);
      }
      
      // 检查多种可能的节点类型
      if ((node.type === 'identifier' || node.type === 'DeclRefExpr' || node.type === 'unknown') && 
          node.text === variableName) {
        console.log(`    Found identifier '${variableName}' at line ${node.startPosition.row + 1}, type: ${node.type}, isDeclaration: ${this.isDeclaration(node)}`);
        // 确保这是一个变量引用而不是声明
        if (!this.isDeclaration(node)) {
          console.log(`    Found usage of '${variableName}' at line ${node.startPosition.row + 1}, type: ${node.type}`);
          usages.push(node.startPosition);
        }
      }
    });

    console.log(`    Total identifiers found: ${identifierCount}`);
    return usages;
  }

  /**
   * 查找指针解引用操作
   */
  findPointerDereferences(root: ASTNode, variableName: string): { row: number; column: number }[] {
    const dereferences: { row: number; column: number }[] = [];

    this.traverseNode(root, (node) => {
      // 查找 *variable - 检查unary_expression类型
      if (node.type === 'unary_expression' || node.type === 'UnaryOperator') {
        const argument = node.namedChildren?.[0];
        if (argument && (argument.type === 'identifier' || argument.type === 'DeclRefExpr' || argument.type === 'unknown') && 
            argument.text === variableName) {
          // 检查是否是解引用操作符
          if (node.text && node.text.includes('*')) {
          dereferences.push(node.startPosition);
          }
        }
      }
      // 查找 variable->field
      else if (node.type === 'field_expression' || node.type === 'MemberExpr') {
        const argument = node.namedChildren?.[0];
        if (argument && (argument.type === 'identifier' || argument.type === 'DeclRefExpr' || argument.type === 'unknown') && 
            argument.text === variableName) {
          dereferences.push(node.startPosition);
        }
      }
      // 查找 variable[index]
      else if (node.type === 'subscript_expression' || node.type === 'ArraySubscriptExpr') {
        const argument = node.namedChildren?.[0];
        if (argument && (argument.type === 'identifier' || argument.type === 'DeclRefExpr' || argument.type === 'unknown') && 
            argument.text === variableName) {
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
    
    // 遍历namedChildren
    if (node.namedChildren) {
    for (const child of node.namedChildren) {
      if (!child || typeof (child as any).type !== 'string') continue;
      this.traverseNode(child, callback);
      }
    }
    
    // 也遍历children（以防有些节点不在namedChildren中）
    if (node.children) {
      for (const child of node.children) {
        if (!child || typeof (child as any).type !== 'string') continue;
        // 避免重复遍历已经在namedChildren中的节点
        if (!node.namedChildren || !node.namedChildren.includes(child)) {
          this.traverseNode(child, callback);
        }
      }
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
    
    if (!typeSpecifier) {
      return declarations;
    }

    const baseType = typeSpecifier.text;

    // 查找声明器
    let declarators = this.findChildrenByType(node, 'init_declarator') ||
                      this.findChildrenByType(node, 'declarator') ||
                      this.findChildrenByType(node, 'identifier');

    // 如果没有找到声明器，尝试从所有子节点中查找
    if (declarators.length === 0) {
      declarators = node.namedChildren.filter(child => 
        child.type === 'identifier' || 
        child.type === 'declarator' || 
        child.type === 'init_declarator'
      );
    }

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
      // 检查是否是指针类型（通过父节点的类型信息）
      if (declarator.parent && declarator.parent.type === 'declaration') {
        // 检查父节点是否有指针类型信息
        const parentText = declarator.parent.text || '';
        isPointer = parentText.includes('*');
        
        // 也检查类型说明符是否包含指针信息
        const typeSpecifier = declarator.parent.namedChildren.find(child => 
          child.type === 'primitive_type' || child.type === 'type_identifier'
        );
        if (typeSpecifier && typeSpecifier.text.includes('*')) {
          isPointer = true;
        }
      }
    } else {
      // 查找标识符
      const identifier = this.findChildByType(declarator, 'identifier');
      if (identifier) {
        name = identifier.text;
      }
    }

    if (!name) {
      return null;
    }

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
           parent.type === 'init_declarator' ||
           parent.type === 'VarDecl' ||
           parent.type === 'ParmVarDecl' ||
           parent.type === 'InitDeclarator';
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