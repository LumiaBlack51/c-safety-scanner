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

// 死循环检测相关函数
interface LoopInfo {
  type: 'for' | 'while' | 'do-while';
  condition: string;
  init?: string;
  update?: string;
  line: number;
  hasBreak: boolean;
  hasReturn: boolean;
}

function extractLoopInfo(line: string, lineNum: number): LoopInfo | null {
  const trimmed = line.trim();
  
  // 检测 for(;;) 或 while(1) 等明显死循环
  if (/\bfor\s*\(\s*;\s*;\s*\)/.test(trimmed) || /\bwhile\s*\(\s*(1|true)\s*\)/.test(trimmed)) {
    return {
      type: /\bfor\s*\(\s*;\s*;\s*\)/.test(trimmed) ? 'for' : 'while',
      condition: 'true',
      line: lineNum,
      hasBreak: false,
      hasReturn: false
    };
  }
  
  // 检测 for 循环
  const forMatch = trimmed.match(/\bfor\s*\(\s*([^;]*);\s*([^;]*);\s*([^)]*)\)/);
  if (forMatch) {
    return {
      type: 'for',
      init: forMatch[1].trim(),
      condition: forMatch[2].trim(),
      update: forMatch[3].trim(),
      line: lineNum,
      hasBreak: false,
      hasReturn: false
    };
  }
  
  // 检测 while 循环
  const whileMatch = trimmed.match(/\bwhile\s*\(\s*([^)]+)\)/);
  if (whileMatch) {
    return {
      type: 'while',
      condition: whileMatch[1].trim(),
      line: lineNum,
      hasBreak: false,
      hasReturn: false
    };
  }
  
  return null;
}

function simulateLoopExecution(loop: LoopInfo): boolean {
  // 如果已经有break或return，认为不是死循环
  if (loop.hasBreak || loop.hasReturn) {
    return false;
  }
  
  // 对于明显的死循环
  if (loop.condition === 'true' || loop.condition === '1') {
    return true;
  }
  
  // 尝试解析循环变量和条件
  if (loop.type === 'for' && loop.init && loop.condition && loop.update) {
    return analyzeForLoop(loop.init, loop.condition, loop.update);
  }
  
  if (loop.type === 'while') {
    return analyzeWhileLoop(loop.condition);
  }
  
  return false;
}

function analyzeForLoop(init: string, condition: string, update: string): boolean {
  // 提取循环变量名
  const initMatch = init.match(/([a-zA-Z_]\w*)\s*=\s*([+-]?\d+(?:\.\d+)?)/);
  if (!initMatch) return false;
  
  const varName = initMatch[1];
  const initValue = parseFloat(initMatch[2]);
  
  // 解析条件
  const condMatch = condition.match(new RegExp(`${varName}\\s*([<>=!]+)\\s*([+-]?\\d+(?:\\.\\d+)?)`));
  if (!condMatch) return false;
  
  const operator = condMatch[1];
  const targetValue = parseFloat(condMatch[2]);
  
  // 解析更新表达式
  const updateMatch = update.match(new RegExp(`${varName}\\s*([+-]?=)\\s*([+-]?\\d+(?:\\.\\d+)?)`));
  if (!updateMatch) {
    // 尝试 i++ 或 i-- 格式
    const incMatch = update.match(new RegExp(`${varName}\\s*([+-]{2})`));
    if (incMatch) {
      const step = incMatch[1] === '++' ? 1 : -1;
      return simulateIterations(initValue, operator, targetValue, step);
    }
    return false;
  }
  
  const updateOp = updateMatch[1];
  const updateValue = parseFloat(updateMatch[2]);
  
  let step: number;
  if (updateOp === '+=') step = updateValue;
  else if (updateOp === '-=') step = -updateValue;
  else if (updateOp === '=') step = updateValue - initValue; // 对于 i = i + 1 的情况
  else return false;
  
  return simulateIterations(initValue, operator, targetValue, step);
}

function analyzeWhileLoop(condition: string): boolean {
  // 检查是否包含变量
  const varMatch = condition.match(/([a-zA-Z_]\w*)/);
  if (!varMatch) {
    // 没有变量的条件，检查是否为常量
    if (condition === '1' || condition === 'true') return true;
    return false;
  }
  
  // 对于包含变量的while循环，如果变量在循环中不更新，可能是死循环
  // 这里简化处理，只检查明显的常量条件
  return condition === '1' || condition === 'true';
}

function simulateIterations(initValue: number, operator: string, targetValue: number, step: number): boolean {
  let currentValue = initValue;
  const maxIterations = 100000;
  
  for (let i = 0; i < maxIterations; i++) {
    // 检查是否满足退出条件
    if (checkExitCondition(currentValue, operator, targetValue)) {
      return false; // 不是死循环
    }
    
    // 更新值
    currentValue += step;
    
    // 检查是否溢出或进入无限循环
    if (Math.abs(currentValue) > 1e10) {
      return true; // 可能是死循环
    }
  }
  
  return true; // 超过最大迭代次数，认为是死循环
}

function checkExitCondition(value: number, operator: string, target: number): boolean {
  switch (operator) {
    case '<': return value < target;
    case '<=': return value <= target;
    case '>': return value > target;
    case '>=': return value >= target;
    case '==': return value === target;
    case '!=': return value !== target;
    default: return false;
  }
}

function checkForBreakOrReturn(lines: string[], startLine: number, endLine: number): { hasBreak: boolean; hasReturn: boolean } {
  let hasBreak = false;
  let hasReturn = false;
  
  for (let i = startLine; i < endLine && i < lines.length; i++) {
    const line = lines[i].trim();
    if (/\bbreak\b/.test(line)) hasBreak = true;
    if (/\breturn\b/.test(line)) hasReturn = true;
    if (/\bexit\s*\(/.test(line)) hasReturn = true;
  }
  
  return { hasBreak, hasReturn };
}

// 数值范围检查相关函数
interface TypeRange {
  min: number;
  max: number;
  isSigned: boolean;
}

function getTypeRange(typeName: string): TypeRange | null {
  const normalizedType = typeName.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // 基本整数类型范围
  const ranges: { [key: string]: TypeRange } = {
    'char': { min: -128, max: 127, isSigned: true },
    'unsigned char': { min: 0, max: 255, isSigned: false },
    'signed char': { min: -128, max: 127, isSigned: true },
    'short': { min: -32768, max: 32767, isSigned: true },
    'short int': { min: -32768, max: 32767, isSigned: true },
    'signed short': { min: -32768, max: 32767, isSigned: true },
    'unsigned short': { min: 0, max: 65535, isSigned: false },
    'unsigned short int': { min: 0, max: 65535, isSigned: false },
    'int': { min: -2147483648, max: 2147483647, isSigned: true },
    'signed int': { min: -2147483648, max: 2147483647, isSigned: true },
    'unsigned int': { min: 0, max: 4294967295, isSigned: false },
    'long': { min: -2147483648, max: 2147483647, isSigned: true },
    'long int': { min: -2147483648, max: 2147483647, isSigned: true },
    'signed long': { min: -2147483648, max: 2147483647, isSigned: true },
    'unsigned long': { min: 0, max: 4294967295, isSigned: false },
    'unsigned long int': { min: 0, max: 4294967295, isSigned: false },
    'long long': { min: -9223372036854775808, max: 9223372036854775807, isSigned: true },
    'long long int': { min: -9223372036854775808, max: 9223372036854775807, isSigned: true },
    'signed long long': { min: -9223372036854775808, max: 9223372036854775807, isSigned: true },
    'unsigned long long': { min: 0, max: 18446744073709551615, isSigned: false },
    'unsigned long long int': { min: 0, max: 18446744073709551615, isSigned: false },
    'size_t': { min: 0, max: 18446744073709551615, isSigned: false }
  };
  
  return ranges[normalizedType] || null;
}

function checkValueRange(value: number, typeName: string): boolean {
  const range = getTypeRange(typeName);
  if (!range) return true; // 未知类型，不检查
  
  return value >= range.min && value <= range.max;
}

function extractNumericValue(expr: string): number | null {
  // 移除空格
  expr = expr.trim();
  
  // 处理十六进制
  if (expr.startsWith('0x') || expr.startsWith('0X')) {
    const hexValue = parseInt(expr, 16);
    return isNaN(hexValue) ? null : hexValue;
  }
  
  // 处理八进制
  if (expr.startsWith('0') && expr.length > 1 && !expr.includes('.')) {
    const octValue = parseInt(expr, 8);
    return isNaN(octValue) ? null : octValue;
  }
  
  // 处理十进制
  const decValue = parseFloat(expr);
  return isNaN(decValue) ? null : decValue;
}

function checkAssignmentRange(line: string, varInfo: VariableInfo): boolean {
  // 查找赋值表达式（包括声明时的初始化）
  const assignmentMatch = line.match(new RegExp(`${varInfo.name}\\s*=\\s*([^;]+)`));
  if (!assignmentMatch) return true;
  
  const valueExpr = assignmentMatch[1].trim();
  const value = extractNumericValue(valueExpr);
  
  if (value === null) return true; // 无法解析数值，跳过检查
  
  return checkValueRange(value, varInfo.typeName);
}

function checkInitializationRange(line: string, varInfo: VariableInfo): boolean {
  // 检查声明时的初始化
  const initMatch = line.match(new RegExp(`${varInfo.name}\\s*=\\s*([^;]+)`));
  if (!initMatch) return true;
  
  const valueExpr = initMatch[1].trim();
  const value = extractNumericValue(valueExpr);
  
  if (value === null) return true; // 无法解析数值，跳过检查
  
  return checkValueRange(value, varInfo.typeName);
}

// 内存泄漏检测相关函数
interface MemoryAllocation {
  line: number;
  variable: string;
  size: string;
  isFreed: boolean;
}

function detectMemoryAllocation(line: string, lineNum: number): MemoryAllocation | null {
  // 检测 malloc, calloc, realloc
  const mallocMatch = line.match(/([a-zA-Z_]\w*)\s*=\s*(?:\([^)]*\))?\s*(malloc|calloc|realloc)\s*\(/);
  if (mallocMatch) {
    return {
      line: lineNum,
      variable: mallocMatch[1],
      size: 'unknown',
      isFreed: false
    };
  }
  return null;
}

function detectMemoryFree(line: string, allocations: MemoryAllocation[]): void {
  // 检测 free 调用
  const freeMatch = line.match(/free\s*\(\s*([a-zA-Z_]\w*)\s*\)/);
  if (freeMatch) {
    const varName = freeMatch[1];
    // 标记对应的分配为已释放
    for (const alloc of allocations) {
      if (alloc.variable === varName) {
        alloc.isFreed = true;
        break;
      }
    }
  }
}

function findLoopEnd(lines: string[], startLine: number): number {
  let braceDepth = 0;
  let foundOpeningBrace = false;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    
    // 查找循环体的开始
    if (!foundOpeningBrace) {
      if (line.includes('{')) {
        foundOpeningBrace = true;
        braceDepth = 1;
        // 如果大括号在同一行结束，直接返回
        if (line.includes('}')) {
          return i;
        }
        continue;
      }
    } else {
      // 计算大括号深度
      for (const char of line) {
        if (char === '{') braceDepth++;
        else if (char === '}') braceDepth--;
        
        // 当大括号深度回到0时，循环结束
        if (braceDepth === 0) {
          return i;
        }
      }
    }
  }
  
  // 如果没有找到结束的大括号，返回文件末尾
  return lines.length - 1;
}

function findFunctionStart(lines: string[], funcName: string): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes(funcName) && line.includes('(') && line.includes('{')) {
      return i + 1;
    }
  }
  return 0;
}

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
  const memoryAllocations: MemoryAllocation[] = [];
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
      else if (ch === '}') { 
        braceDepth = Math.max(0, braceDepth - 1); 
        if (braceDepth < funcStack.length) {
          // 函数结束时检查内存泄漏
          const currentFunc = funcStack[funcStack.length - 1];
          if (currentFunc) {
            // 只检查当前函数内的内存泄漏
            const currentFuncStart = findFunctionStart(lines, currentFunc);
            for (const alloc of memoryAllocations) {
              if (!alloc.isFreed && alloc.line >= currentFuncStart && alloc.line <= i + 1) {
                fallbackIssues.push({
                  file: filePath,
                  line: alloc.line,
                  category: 'Memory leak',
                  message: `内存泄漏：变量${alloc.variable}分配的内存未释放`,
                  codeLine: lines[alloc.line - 1] || ''
                });
              }
            }
          }
          funcStack.pop();
        }
      }
    }
    const fn = extractFunctionName(raw); if (fn) funcStack.push(fn);
    
    // 死循环检测
    const loopInfo = extractLoopInfo(line, i + 1);
    if (loopInfo) {
      // 检查循环体内是否有break或return
      const loopEnd = findLoopEnd(lines, i);
      const { hasBreak, hasReturn } = checkForBreakOrReturn(lines, i, loopEnd);
      loopInfo.hasBreak = hasBreak;
      loopInfo.hasReturn = hasReturn;
      
      // 模拟循环执行
      if (simulateLoopExecution(loopInfo)) {
        issues.push({
          file: filePath,
          line: i + 1,
          category: 'Dead loop',
          message: '潜在死循环（循环条件无法满足退出条件）',
          codeLine: raw
        });
      }
    }
    
    if (isLikelyDecl(line)) {
      const decls = parseDecl(line);
      for (const d of decls) {
        const vi: VariableInfo = { name: d.name, typeName: d.typeName, isPointer: d.isPointer, isInitialized: (d as any).isInitialized || false } as VariableInfo;
        
        // 检查声明时的数值范围
        if (vi.isInitialized && !checkInitializationRange(line, vi)) {
          fallbackIssues.push({
            file: filePath,
            line: i + 1,
            category: 'Range overflow',
            message: `初始化数值超出${vi.typeName}类型范围`,
            codeLine: raw
          });
        }
        
        const loc = currentLocals();
        if (braceDepth === 0 || !loc) segSet(globals, vi); else segSet(loc, vi);
      }
      continue;
    }
    
    const allNames = new Set<string>([...segAllNames(globals), ...Array.from(localsByFuncFB.values()).flatMap(tab => segAllNames(tab))]);
    for (const name of allNames) {
      if (tokenContains(line, name) && looksDirectAssignmentTo(line, name)) {
        const v = getVarFB(name);
        if (v) { 
          v.isInitialized = true; 
          markPointerInitKind(v, line);
          
          // 数值范围检查
          if (!checkAssignmentRange(line, v)) {
            fallbackIssues.push({
              file: filePath,
              line: i + 1,
              category: 'Range overflow',
              message: `赋值数值超出${v.typeName}类型范围`,
              codeLine: raw
            });
          }
        }
      }
    }
    
    // 内存分配检测
    const allocation = detectMemoryAllocation(line, i + 1);
    if (allocation) {
      memoryAllocations.push(allocation);
    }
    
    // 内存释放检测
    detectMemoryFree(line, memoryAllocations);
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