import * as vscode from 'vscode';
import * as path from 'path';

type VariableInfo = {
  name: string;
  typeName: string;
  isPointer: boolean;
  isInitialized: boolean;
  firstUseLine: number | null;
};

// 轻量启发式 C 语法分析器（行级）
export async function analyzeWorkspaceCFiles(root: vscode.Uri): Promise<Map<vscode.Uri, vscode.Diagnostic[]>> {
  const files = await vscode.workspace.findFiles(new vscode.RelativePattern(root.fsPath, '**/*.c'));
  const results = new Map<vscode.Uri, vscode.Diagnostic[]>();

  for (const file of files) {
    const doc = await vscode.workspace.openTextDocument(file);
    const diags: vscode.Diagnostic[] = [];
    const globals: Map<string, VariableInfo> = new Map();
    const localsStack: Array<Map<string, VariableInfo>> = [];
    const funcStack: string[] = [];

    function currentLocals(): Map<string, VariableInfo> | undefined {
      return localsStack[localsStack.length - 1];
    }

    const text = doc.getText();
    const lines = text.split(/\r?\n/);
    let braceDepth = 0;

    const addDiag = (line: number, startCol: number, endCol: number, message: string, severity = vscode.DiagnosticSeverity.Warning) => {
      const range = new vscode.Range(new vscode.Position(line, Math.max(0, startCol)), new vscode.Position(line, Math.max(endCol, startCol + 1)));
      diags.push(new vscode.Diagnostic(range, message, severity));
    };

    const typeKeywords = ['int','char','float','double','void','short','long','signed','unsigned','bool','size_t'];

    const isLikelyDecl = (line: string) => {
      if (!line.includes(';')) return false;
      if (line.trimStart().startsWith('#')) return false;
      if (/\b(printf|scanf|malloc|free|strcpy|strlen)\b/.test(line)) return false;
      return typeKeywords.some(t => new RegExp(`(^|\\s)${t}(\\s|\\*)`).test(line));
    };

    const parseDecl = (line: string): Array<VariableInfo & { line: number; col: number }> => {
      const result: Array<VariableInfo & { line: number; col: number }> = [];
      const semi = line.indexOf(';');
      const head = semi >= 0 ? line.slice(0, semi) : line;
      const m = head.match(/^\s*([a-zA-Z_][\w\s\*]*?)\s+(.+)$/);
      if (!m) return result;
      const base = m[1].trim();
      const decls = m[2];
      for (const raw of decls.split(',')) {
        const it = raw.trim();
        if (!it || it.includes('(')) continue; // 跳过函数指针
        const star = /^\*/.test(it);
        const nameMatch = it.match(/\**\s*([a-zA-Z_][\w]*)/);
        if (!nameMatch) continue;
        const name = nameMatch[1];
        const isPtr = star || /\*/.test(base);
        const isInit = /=/.test(it);
        result.push({ name, typeName: base.replace(/\*/g, '').trim(), isPointer: isPtr, isInitialized: isInit, firstUseLine: null, line: 0, col: 0 });
      }
      return result;
    };

    const pointerDerefPatterns = (name: string) => [new RegExp(`\\*${name}\\b`), new RegExp(`${name}\\s*->`), new RegExp(`${name}\\s*\\[` )];

    const tokenContains = (line: string, name: string) => new RegExp(`(^|[^\\w])${name}([^\\w]|$)`).test(line);

    const looksAssignmentTo = (line: string, name: string) => new RegExp(`(^|[^=<>!])${name}\\s*([-+*/]?=)`).test(line);

    const pointerInitKind = (line: string) => {
      if (/=\s*(NULL|0)\b/.test(line)) return 1; // null-like
      if (/=\s*&/.test(line)) return 2; // addr-of
      if (/=\s*\b(malloc|calloc|realloc)\s*\(/.test(line)) return 3; // heap
      return 0;
    };

    const formatSpecCount = (fmt: string) => {
      let cnt = 0;
      for (let i = 0; i < fmt.length; i++) {
        if (fmt[i] === '%') {
          if (fmt[i + 1] === '%') { i++; continue; }
          cnt++;
        }
      }
      return cnt;
    };

    const getArgsFromCall = (line: string) => {
      const lp = line.indexOf('(');
      const rp = line.lastIndexOf(')');
      if (lp < 0 || rp < 0 || rp <= lp) return [] as string[];
      const inside = line.slice(lp + 1, rp);
      const parts: string[] = [];
      let depth = 0, buf = '', inStr = false, q = '';
      for (let i = 0; i < inside.length; i++) {
        const c = inside[i];
        if (inStr) { buf += c; if (c === q) inStr = false; continue; }
        if (c === '"' || c === '\'') { inStr = true; q = c; buf += c; continue; }
        if (c === '(') { depth++; buf += c; continue; }
        if (c === ')') { if (depth > 0) depth--; buf += c; continue; }
        if (c === ',' && depth === 0) { parts.push(buf.trim()); buf = ''; continue; }
        buf += c;
      }
      if (buf.trim()) parts.push(buf.trim());
      return parts;
    };

    const getNameFromExpr = (expr: string) => {
      const m = expr.trim().replace(/^&/, '').match(/([a-zA-Z_][\w]*)/);
      return m ? m[1] : '';
    };

    const getVar = (name: string): VariableInfo | undefined => {
      for (let i = localsStack.length - 1; i >= 0; i--) {
        const v = localsStack[i].get(name);
        if (v) return v;
      }
      return globals.get(name);
    };

    const markInit = (name: string, lineText: string) => {
      const v = getVar(name);
      if (!v) return 0;
      v.isInitialized = true;
      return v.isPointer ? pointerInitKind(lineText) : 0;
    };

    // 遍历行
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      let line = raw.trim();
      if (!line) continue;
      if (line.startsWith('#')) continue;
      if (/\/\//.test(line)) line = line.split('//')[0];

      // 作用域跟踪
      for (const ch of raw) {
        if (ch === '{') { braceDepth++; localsStack.push(new Map()); funcStack.push(''); }
        if (ch === '}') { braceDepth = Math.max(0, braceDepth - 1); localsStack.pop(); funcStack.pop(); }
      }

      // 变量声明
      if (isLikelyDecl(line)) {
        const decls = parseDecl(line);
        for (const d of decls) {
          const vi: VariableInfo = { name: d.name, typeName: d.typeName, isPointer: d.isPointer, isInitialized: d.isInitialized, firstUseLine: null };
          if (braceDepth === 0) globals.set(vi.name, vi); else (currentLocals() ?? globals).set(vi.name, vi);
        }
        continue;
      }

      // 死循环（简单启发式）
      if (/\bfor\s*\(\s*;\s*;\s*\)/.test(line) || /\bwhile\s*\(\s*(1|true)\s*\)/.test(line)) {
        if (!/\b(break|return|exit\s*\()\b/.test(line)) {
          addDiag(i, 0, raw.length, '潜在死循环（无显式退出）');
        }
      }

      // 赋值初始化
      for (const name of new Set([...globals.keys(), ...Array.from(localsStack.flatMap(m => Array.from(m.keys())))])) {
        if (tokenContains(line, name) && looksAssignmentTo(line, name)) {
          const kind = markInit(name, line);
          if (kind === 1) {
            // 若下一行立刻解引用，提示空指针解引用风险
          }
        }
      }

      // 未初始化使用 & 野指针解引用
      for (const name of new Set([...globals.keys(), ...Array.from(localsStack.flatMap(m => Array.from(m.keys())))])) {
        if (!tokenContains(line, name)) continue;
        const v = getVar(name);
        if (!v) continue;
        if (!v.isInitialized) {
          // 解引用检测
          const derefHit = pointerDerefPatterns(name).some(r => r.test(line));
          if (v.isPointer && derefHit) {
            addDiag(i, Math.max(0, raw.indexOf(name) - 1), raw.indexOf(name) + name.length, '潜在野指针解引用（指针未初始化）');
          } else {
            addDiag(i, Math.max(0, raw.indexOf(name)), raw.indexOf(name) + name.length, '变量使用前未初始化');
          }
          if (v.firstUseLine == null) v.firstUseLine = i + 1;
        }
      }

      // printf / scanf 检查
      if (/\b(printf|scanf)\s*\(/.test(line)) {
        const isScanf = /\bscanf\s*\(/.test(line);
        const args = getArgsFromCall(line);
        if (args.length >= 1) {
          const fmt = args[0];
          const fmtStrMatch = fmt.match(/^[\s\(]*"([\s\S]*?)"[\s\)]*$/);
          const specCount = fmtStrMatch ? formatSpecCount(fmtStrMatch[1]) : 0;
          const provided = Math.max(0, args.length - 1);
          if (provided < specCount) addDiag(i, 0, raw.length, `${isScanf ? 'scanf' : 'printf'} 参数少于格式化占位数`);
          if (provided > specCount) addDiag(i, 0, raw.length, `${isScanf ? 'scanf' : 'printf'} 参数多于格式化占位数`);

          // 基础 & 检查（scanf 需要地址）
          if (isScanf) {
            for (let ai = 1; ai < args.length; ai++) {
              const expr = args[ai];
              const name = getNameFromExpr(expr);
              if (!name) continue;
              if (!expr.trim().startsWith('&')) {
                const v = getVar(name);
                if (!(v && v.typeName === 'char')) { // char 数组可不加 &
                  addDiag(i, 0, raw.length, 'scanf 实参建议传地址（使用 &var）');
                }
              }
            }
          }
        }
      }
    }

    results.set(file, diags);
  }

  return results;
}


