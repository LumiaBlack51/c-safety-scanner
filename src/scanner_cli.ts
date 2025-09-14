import * as fs from 'fs';
import * as path from 'path';
import { Issue, VariableInfo, SegmentedTable, MemoryAllocation, LoopInfo, TypeRange } from './types';
export { Issue };
import { createSegmentedTable, segSet, segGet, segAllNames } from './segmented_table';
import { functionHeaderMap } from './function_header_map';
import { getTypeRange, checkValueRange, extractNumericValue, checkAssignmentRange, checkInitializationRange } from './range_checker';
import { formatSpecCount, extractFormatSpecs, getArgumentType, isFormatSpecCompatible, getArgsFromCall } from './format_checker';
import { checkLibraryFunctionHeaders, extractIncludedHeaders } from './header_checker';


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
  
  // 特殊处理struct声明
  if (head.includes('struct ')) {
    // 匹配 struct TypeName *varname = value 模式
    const structMatch = head.match(/^\s*((?:static|const|extern|register|volatile|restrict)\s+)?struct\s+(\w+)\s+\*?([a-zA-Z_]\w*)\s*(=.*)?$/);
    if (structMatch) {
      const [, storageClass = '', structName, varName, initPart] = structMatch;
      const fullType = `${storageClass}struct ${structName}`.trim();
      const isPtr = head.includes('*');
      const isInit = !!initPart;
      result.push({ name: varName, typeName: fullType, isPointer: isPtr, isInitialized: isInit, isArray: false, pointerMaybeNull: false });
      return result;
    }
  }
  
  // 支持存储类说明符和类型修饰符的正则表达式
  const m = head.match(/^\s*((?:static|const|extern|register|volatile|restrict)\s+)?((?:unsigned|signed)\s+)?([a-zA-Z_][\w\s\*]*?)\s+(.+)$/);
  if (!m) return result;
  
  const storageClass = m[1] ? m[1].trim() : '';
  const typeModifier = m[2] ? m[2].trim() : '';
  const base = m[3].trim();
  const decls = m[4];
  
  // 组合完整的类型名
  let fullType = base;
  if (typeModifier) fullType = `${typeModifier} ${fullType}`;
  if (storageClass) fullType = `${storageClass} ${fullType}`;
  
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
function pointerDerefPatterns(name: string) { return [new RegExp(`\\*${name}\\s`), new RegExp(`${name}->`), new RegExp(`${name}\\s*\\[` )]; }
function functionPointerPatterns(name: string) { return [new RegExp(`${name}\\s*\\(`)]; }
function pointerAssignmentPatterns(name: string) { return [new RegExp(`\\w+\\s*=\\s*${name}\\b`)]; }


function getNameFromExpr(expr: string) { const m = expr.trim().replace(/^&/, '').match(/([a-zA-Z_][\w]*)/); return m ? m[1] : ''; }

// 死循环检测相关函数

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


// 内存泄漏检测相关函数

function detectMemoryAllocation(line: string, lineNum: number): MemoryAllocation | null {
  // 检测 malloc, calloc, realloc
  const mallocMatch = line.match(/([a-zA-Z_]\w*)\s*=\s*(?:\([^)]*\))?\s*(malloc|calloc|realloc)\s*\(/);
  if (mallocMatch) {
    return {
      line: lineNum,
      variable: mallocMatch[1],
      size: 'unknown',
      isFreed: false,
      reported: false
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
  
  // 提取包含的头文件
  const includedHeaders = extractIncludedHeaders(lines);

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
  let hasMemoryAllocation = false; // 是否有内存分配
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
          // 函数结束时检查内存泄漏（只在有内存分配时才检测）
          if (hasMemoryAllocation) {
            const currentFunc = funcStack[funcStack.length - 1];
            if (currentFunc) {
              // 只检查当前函数内的内存泄漏
              const currentFuncStart = findFunctionStart(lines, currentFunc);
              for (const alloc of memoryAllocations) {
                if (!alloc.isFreed && !alloc.reported && alloc.line >= currentFuncStart && alloc.line <= i + 1) {
                  fallbackIssues.push({
                    file: filePath,
                    line: alloc.line,
                    category: 'Memory leak',
                    message: `内存泄漏：变量${alloc.variable}分配的内存未释放`,
                    codeLine: lines[alloc.line - 1] || ''
                  });
                  alloc.reported = true; // 标记为已报告
                }
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
        
        // 设置指针类型标志
        if (vi.isInitialized) {
          markPointerInitKind(vi, line);
        }
        
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
      hasMemoryAllocation = true; // 标记有内存分配
    }
    
    // 库函数头文件检查
    const headerWarnings = checkLibraryFunctionHeaders(line, includedHeaders);
    for (const warning of headerWarnings) {
      fallbackIssues.push({
        file: filePath,
        line: i + 1,
        category: 'Header',
        message: warning,
        codeLine: raw
      });
    }
    
    // printf/scanf 格式字符串检查
    if (/\b(printf|scanf)\s*\(/.test(line)) {
      const isScanf = /\bscanf\s*\(/.test(line);
      const args = getArgsFromCall(line);
      if (args.length >= 1) {
        const fmt = args[0];
        const fmtStrMatch = fmt.match(/^[\s\(]*"([\s\S]*?)"[\s\)]*$/);
        if (fmtStrMatch) {
          const fmtStr = fmtStrMatch[1];
          const specCount = formatSpecCount(fmtStr);
          const provided = Math.max(0, args.length - 1);
          
          // 检查参数数量
          if (provided < specCount) {
            fallbackIssues.push({
              file: filePath,
              line: i + 1,
              category: 'Format',
              message: `${isScanf ? 'scanf' : 'printf'} 参数少于格式化占位数`,
              codeLine: raw
            });
          }
          if (provided > specCount) {
            fallbackIssues.push({
              file: filePath,
              line: i + 1,
              category: 'Format',
              message: `${isScanf ? 'scanf' : 'printf'} 参数多于格式化占位数`,
              codeLine: raw
            });
          }
          
          // 检查格式字符串与参数类型匹配
          const formatSpecs = extractFormatSpecs(fmtStr);
          for (let j = 0; j < Math.min(formatSpecs.length, provided); j++) {
            const spec = formatSpecs[j];
            const arg = args[j + 1];
            const argType = getArgumentType(arg, allNames, getVarFB);
            
            if (argType && !isFormatSpecCompatible(spec, argType)) {
              fallbackIssues.push({
                file: filePath,
                line: i + 1,
                category: 'Format',
                message: `格式字符串不匹配：${spec} 与 ${argType} 类型不兼容`,
                codeLine: raw
              });
            }
          }
          
          // scanf 地址检查
          if (isScanf) {
            for (let ai = 1; ai < args.length; ai++) {
              const expr = args[ai];
              const name = getNameFromExpr(expr);
              if (!name) continue;
              if (!expr.trim().startsWith('&')) {
                const v = getVarFB(name);
                if (!(v && v.typeName === 'char')) { // char 数组可不加 &
                  fallbackIssues.push({
                    file: filePath,
                    line: i + 1,
                    category: 'Format',
                    message: 'scanf 实参建议传地址（使用 &var）',
                    codeLine: raw
                  });
                }
              }
            }
          }
        }
      }
    }
    
    // 内存释放检测
    detectMemoryFree(line, memoryAllocations);
    for (const name of allNames) {
      if (!tokenContains(line, name)) continue;
      const v = getVarFB(name);
      if (!v) continue;
      // 检查未初始化的变量和空指针
      if (!v.isInitialized || (v.isInitialized && v.pointerMaybeNull)) {
        const derefHitAny = v.isPointer && pointerDerefPatterns(name).some(r => r.test(line));
        const funcPtrHitAny = v.isPointer && functionPointerPatterns(name).some(r => r.test(line));
        const assignHitAny = v.isPointer && pointerAssignmentPatterns(name).some(r => r.test(line));
        const indexOnly = (v as any).isArray && new RegExp(`${name}\\s*\\[`).test(line) && !new RegExp(`\\*${name}\\b|${name}\\s*->`).test(line);
        const derefHit = derefHitAny && !indexOnly;
        const funcPtrHit = funcPtrHitAny && !indexOnly;
        const assignHit = assignHitAny && !indexOnly;
        
        if (derefHit || funcPtrHit || assignHit) {
          // 区分野指针和空指针
          if (v.pointerMaybeNull) {
            if (funcPtrHit) {
              fallbackIssues.push({ file: filePath, line: i + 1, category: 'Null pointer', message: '潜在空函数指针调用（指针为NULL）', codeLine: raw });
            } else if (assignHit) {
              fallbackIssues.push({ file: filePath, line: i + 1, category: 'Null pointer', message: '潜在空指针赋值（指针为NULL）', codeLine: raw });
            } else {
              fallbackIssues.push({ file: filePath, line: i + 1, category: 'Null pointer', message: '潜在空指针解引用（指针为NULL）', codeLine: raw });
            }
          } else {
            if (funcPtrHit) {
              fallbackIssues.push({ file: filePath, line: i + 1, category: 'Wild pointer', message: '潜在野函数指针调用（指针未初始化）', codeLine: raw });
            } else if (assignHit) {
              fallbackIssues.push({ file: filePath, line: i + 1, category: 'Wild pointer', message: '潜在野指针赋值（指针未初始化）', codeLine: raw });
            } else {
              fallbackIssues.push({ file: filePath, line: i + 1, category: 'Wild pointer', message: '潜在野指针解引用（指针未初始化）', codeLine: raw });
            }
          }
        } else if (!v.isInitialized) {
          fallbackIssues.push({ file: filePath, line: i + 1, category: 'Uninitialized', message: '变量使用前未初始化', codeLine: raw });
        }
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