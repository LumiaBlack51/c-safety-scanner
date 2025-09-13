import * as fs from 'fs';
import * as path from 'path';

export type Issue = {
  file: string;
  line: number;
  category: string;
  message: string;
  codeLine: string;
};

type VariableInfo = {
  name: string;
  typeName: string;
  isPointer: boolean;
  isInitialized: boolean;
  isArray?: boolean;
  pointerMaybeNull?: boolean;
};

// Segmented hash tables (a-f, g-m, n-s, t-z)
const SEGMENTS = 4;
function chooseSegment(name: string): number {
  if (!name || name.length === 0) return 0;
  const c = name[0].toLowerCase();
  if (c < 'g') return 0;      // a-f
  if (c < 'n') return 1;      // g-m
  if (c < 't') return 2;      // n-s
  return 3;                   // t-z
}

type SegmentedTable = Array<Map<string, VariableInfo>>;
function createSegmentedTable(): SegmentedTable {
  return new Array(SEGMENTS).fill(null).map(() => new Map<string, VariableInfo>());
}
function segSet(table: SegmentedTable, vi: VariableInfo) {
  table[chooseSegment(vi.name)].set(vi.name, vi);
}
function segGet(table: SegmentedTable, name: string): VariableInfo | undefined {
  return table[chooseSegment(name)].get(name);
}
function segAllNames(table: SegmentedTable): string[] {
  const out: string[] = [];
  for (const seg of table) out.push(...Array.from(seg.keys()));
  return out;
}

const typeKeywords = ['int','char','float','double','void','short','long','signed','unsigned','bool','size_t'];
const storageClassSpecifiers = ['static','const','extern','register','volatile','restrict'];

function isLikelyDecl(line: string): boolean {
  if (!line.includes(';')) return false;
  if (line.trimStart().startsWith('#')) return false;
  // avoid obvious calls
  if (/\b(printf|scanf|malloc|free|strcpy|strlen)\b/.test(line)) return false;
  // built-in types
  if (typeKeywords.some(t => new RegExp(`(^|\\s)${t}(\\s|\\*)`).test(line))) return true;
  // heuristic: user-defined types or struct/typedef names
  const head = line.split(';')[0];
  if (head.includes('(')) return false; // avoid function prototypes/calls
  // matches: Type tokens (may include struct Foo or Graph) then identifier list
  // e.g., Graph* g; struct Foo *p; MyType a, *b;
  const re = /^\s*(?:struct\s+\w+|[A-Za-z_]\w*)(?:\s+\w+)?(?:\s*\*)*\s+[A-Za-z_]\w*(?:\s*(?:=|,|\[|;).*)?$/;
  return re.test(head);
}

function parseDecl(line: string): Array<VariableInfo> {
  const result: VariableInfo[] = [];
  const semi = line.indexOf(';');
  const head = semi >= 0 ? line.slice(0, semi) : line;
  
  // 支持存储类说明符的正则表达式
  const m = head.match(/^\s*((?:static|const|extern|register|volatile|restrict)\s+)?([a-zA-Z_][\w\s\*]*?)\s+(.+)$/);
  if (!m) return result;
  
  const storageClass = m[1] ? m[1].trim() : '';
  const base = m[2].trim();
  const decls = m[3];
  
  // 组合完整的类型名
  const fullType = storageClass ? `${storageClass} ${base}` : base;
  
  for (const raw of decls.split(',')) {
    const it = raw.trim();
    if (!it || it.includes('(')) continue; // skip function pointer or prototype
    const isArray = /\[\s*\d*\s*\]/.test(it);
    const star = /^\*/.test(it) || isArray; // treat arrays as pointers
    const nameMatch = it.match(/\**\s*([a-zA-Z_][\w]*)/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const isPtr = star || /\*/.test(base);
    const isInit = /=/.test(it);
    result.push({ name, typeName: fullType.replace(/\*/g, '').trim(), isPointer: isPtr, isInitialized: isInit, isArray, pointerMaybeNull: false });
  }
  return result;
}

function tokenContains(line: string, name: string) { return new RegExp(`(^|[^\\w])${name}([^\\w]|$)`).test(line); }
function looksAssignmentTo(line: string, name: string) { return new RegExp(`(^|[^=<>!])${name}\\s*([-+*/]?=)`).test(line); }

// Direct assignment to variable (not through dereference or indexing)
function looksDirectAssignmentTo(line: string, name: string): boolean {
  let idx = 0;
  while (true) {
    const pos = line.indexOf(name, idx);
    if (pos === -1) return false;
    const before = pos > 0 ? line[pos - 1] : ' ';
    const after = pos + name.length < line.length ? line[pos + name.length] : ' ';
    const before2 = pos > 1 ? line[pos - 2] : ' ';
    // exclude *name, ->name, name[ ... cases
    const isDeref = before === '*' || (before === '>' && before2 === '-') || after === '[';
    if (!isDeref) {
      const rest = line.slice(pos + name.length);
      const m = rest.match(/^\s*([-+*/]?=)/);
      if (m) return true;
    }
    idx = pos + name.length;
  }
}

function markPointerInitKind(v: VariableInfo, line: string) {
  if (!v.isPointer) return;
  // null-like
  if (/=\s*(NULL|0)\b/.test(line)) { v.isInitialized = true; v.pointerMaybeNull = true; return; }
  // address-of
  if (/=\s*&\s*\w+/.test(line)) { v.isInitialized = true; v.pointerMaybeNull = false; return; }
  // heap
  if (/=\s*\b(malloc|calloc|realloc)\s*\(/.test(line)) { v.isInitialized = true; v.pointerMaybeNull = false; return; }
  // function return assignment (e.g., p = create(...))
  if (/=\s*[A-Za-z_]\w*\s*\(/.test(line)) { v.isInitialized = true; v.pointerMaybeNull = false; return; }
}
function pointerDerefPatterns(name: string) { return [new RegExp(`\\*${name}\\b`), new RegExp(`${name}\\s*->`), new RegExp(`${name}\\s*\\[` )]; }

function formatSpecCount(fmt: string) {
  let cnt = 0;
  for (let i = 0; i < fmt.length; i++) {
    if (fmt[i] === '%') { if (fmt[i+1] === '%') { i++; continue; } cnt++; }
  }
  return cnt;
}

function getArgsFromCall(line: string) {
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
}

function getNameFromExpr(expr: string) { const m = expr.trim().replace(/^&/, '').match(/([a-zA-Z_][\w]*)/); return m ? m[1] : ''; }

// Function detection (heuristic)
function extractFunctionName(line: string): string | null {
  if (!line.includes('(') || !line.includes(')')) return null;
  if (line.trimStart().startsWith('#')) return null;
  const head = line.split('(')[0];
  const tokens = head.trim().split(/\s+/);
  const cand = tokens[tokens.length - 1];
  if (/^[a-zA-Z_][\w]*$/.test(cand) && /\{\s*$/.test(line)) return cand;
  return null;
}

export function analyzeCFile(filePath: string): { issues: Issue[]; globals: SegmentedTable; localsByFunc: Map<string, SegmentedTable> } {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const issues: Issue[] = [];
  const globals: SegmentedTable = createSegmentedTable();
  const localsByFunc: Map<string, SegmentedTable> = new Map();

  // 预处理：头文件拼写与宏多行标记（逐行）
  let inDefine = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;
    if (inDefine) { if (!raw.endsWith('\\')) inDefine = false; continue; }
    if (line.startsWith('#')) {
      const inc = line.match(/^#\s*include\s*<([^>]+)>/);
      if (inc) {
        const hdr = inc[1];
        const stdHeaders = new Set([
          'assert.h','complex.h','ctype.h','errno.h','fenv.h','float.h','inttypes.h','iso646.h','limits.h','locale.h','math.h','setjmp.h','signal.h','stdalign.h','stdarg.h','stdatomic.h','stdbool.h','stddef.h','stdint.h','stdio.h','stdlib.h','stdnoreturn.h','string.h','tgmath.h','threads.h','time.h','uchar.h','wchar.h','wctype.h'
        ]);
        if (!stdHeaders.has(hdr)) issues.push({ file: filePath, line: i + 1, category: 'Header', message: `可疑标准头文件: ${hdr}`, codeLine: raw });
      }
      if (/^#\s*define\b/.test(line)) inDefine = raw.endsWith('\\');
    }
  }

  // 启发式解析方法
  const fallbackIssues: Issue[] = [];
  let braceDepth = 0;
  const funcStack: string[] = [];
  const localsByFuncFB: Map<string, SegmentedTable> = new Map();
  const currentLocals = (): SegmentedTable | null => {
    const fname = funcStack[funcStack.length - 1];
    if (!fname) return null;
    if (!localsByFuncFB.has(fname)) localsByFuncFB.set(fname, createSegmentedTable());
    return localsByFuncFB.get(fname)!;
  };
  const getVarFB = (name: string): VariableInfo | undefined => {
    for (let i = funcStack.length - 1; i >= 0; i--) {
      const fname = funcStack[i];
      if (!fname) continue;
      const tab = localsByFuncFB.get(fname);
      if (tab) {
        const v = segGet(tab, name);
        if (v) return v;
      }
    }
    return segGet(globals, name);
  };
  
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    let line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) continue;
    if (/\/\//.test(line)) line = line.split('//')[0];
    
    for (const ch of raw) {
      if (ch === '{') { braceDepth++; }
      else if (ch === '}') { braceDepth = Math.max(0, braceDepth - 1); if (braceDepth < funcStack.length) funcStack.pop(); }
    }
    const fn = extractFunctionName(raw); if (fn) funcStack.push(fn);
    
    if (isLikelyDecl(line)) {
      const decls = parseDecl(line);
      for (const d of decls) {
        const vi: VariableInfo = { name: d.name, typeName: d.typeName, isPointer: d.isPointer, isInitialized: (d as any).isInitialized || false } as VariableInfo;
        const loc = currentLocals();
        if (braceDepth === 0 || !loc) segSet(globals, vi); else segSet(loc, vi);
      }
      continue;
    }
    
    const allNames = new Set<string>([...segAllNames(globals), ...Array.from(localsByFuncFB.values()).flatMap(tab => segAllNames(tab))]);
    for (const name of allNames) {
      if (tokenContains(line, name) && looksDirectAssignmentTo(line, name)) {
        const v = getVarFB(name);
        if (v) { v.isInitialized = true; markPointerInitKind(v, line); }
      }
    }
    for (const name of allNames) {
      if (!tokenContains(line, name)) continue;
      const v = getVarFB(name);
      if (!v) continue;
      if (!v.isInitialized) {
        const derefHitAny = v.isPointer && pointerDerefPatterns(name).some(r => r.test(line));
        const indexOnly = (v as any).isArray && new RegExp(`${name}\\s*\\[`).test(line) && !new RegExp(`\\*${name}\\b|${name}\\s*->`).test(line);
        const derefHit = derefHitAny && !indexOnly;
        if (derefHit) fallbackIssues.push({ file: filePath, line: i + 1, category: 'Wild pointer', message: '潜在野指针解引用（指针未初始化）', codeLine: raw });
        else fallbackIssues.push({ file: filePath, line: i + 1, category: 'Uninitialized', message: '变量使用前未初始化', codeLine: raw });
      }
    }
  }
  
  issues.push(...fallbackIssues);
  return { issues, globals, localsByFunc: localsByFuncFB };
}

export function analyzeDir(dirPath: string): Issue[] {
  const issues: Issue[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      issues.push(...analyzeDir(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.c')) {
      const result = analyzeCFile(fullPath);
      issues.push(...result.issues);
    }
  }
  return issues;
}