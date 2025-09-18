import * as path from 'path';
import * as fs from 'fs';
import { Issue } from './types';
import { CASTParser } from '../core/ast_parser';

// 基于AST的CLI版本目录分析函数
async function analyzeDir(dir: string): Promise<Issue[]> {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.c'));
  const issues: Issue[] = [];
  
  // 检查AST解析器是否可用
  let astAvailable = false;
  let parser: CASTParser | null = null;
  
  try {
    parser = await CASTParser.create();
    astAvailable = true;
    console.log('AST解析器初始化成功');
  } catch (error) {
    console.log('AST解析器初始化失败，使用文本分析模式');
    astAvailable = false;
  }
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`正在分析文件: ${file}`);
    
    if (astAvailable && parser) {
      try {
        // 尝试使用AST解析
        const ast = parser.parse(content);
        
        // 1. 未初始化变量检测
        const uninitIssues = await checkUninitializedVariables(ast, lines, filePath);
        issues.push(...uninitIssues);
        
        // 2. 野指针检测
        const wildPointerIssues = await checkWildPointers(ast, lines, filePath);
        issues.push(...wildPointerIssues);
        
        // 3. 空指针检测
        const nullPointerIssues = await checkNullPointers(ast, lines, filePath);
        issues.push(...nullPointerIssues);
        
        // 4. 死循环检测
        const deadLoopIssues = checkDeadLoops(ast, lines, filePath);
        issues.push(...deadLoopIssues);
        
        // 5. 数值范围检查
        const rangeIssues = checkNumericRange(ast, lines, filePath);
        issues.push(...rangeIssues);
        
        // 6. 内存泄漏检测
        const memoryLeakIssues = checkMemoryLeaks(ast, lines, filePath);
        issues.push(...memoryLeakIssues);
        
        // 7. 格式字符串检查
        const formatIssues = checkFormatStrings(ast, lines, filePath);
        issues.push(...formatIssues);
        
        // 8. 库函数头文件检查
        const headerIssues = checkLibraryHeaders(content, lines, filePath);
        issues.push(...headerIssues);
        
      } catch (error) {
        console.error(`  AST解析失败，使用文本分析回退: ${error}`);
        
        // 如果AST解析失败，回退到简单的文本分析
        const fallbackIssues = analyzeWithTextFallback(filePath, content, lines);
        issues.push(...fallbackIssues);
      }
    } else {
      // 直接使用文本分析
      const fallbackIssues = analyzeWithTextFallback(filePath, content, lines);
      issues.push(...fallbackIssues);
    }
  }
  
  return issues;
}

// 模拟 VSCode 的类型和接口用于 CLI
interface Position {
  line: number;
  character: number;
}

interface Range {
  start: Position;
  end: Position;
}

interface Diagnostic {
  range: Range;
  message: string;
  severity: number; // 0=Error, 1=Warning, 2=Information, 3=Hint
}

interface Uri {
  fsPath: string;
}

function printIssues(issues: any[]) {
  for (const issue of issues) {
    const relativePath = path.relative(process.cwd(), issue.file);
    console.log(`${relativePath}:${issue.line}: [${issue.category}] ${issue.message}`);
    console.log(`    ${issue.codeLine}`);
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

// === CLI专用的AST检测函数 ===

// 1. 未初始化变量检测
async function checkUninitializedVariables(ast: any, lines: string[], filePath: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  
  try {
  const parser = await CASTParser.create();
    const declarations = parser.extractVariableDeclarations(ast, lines);
    
    for (const decl of declarations) {
      if (!decl.isInitialized && !decl.isParameter && !decl.isGlobal) {
        // 检查是否在声明后有使用
        const usages = parser.findVariableUsages(ast, decl.name);
        for (const usage of usages) {
          if (usage.row > decl.position.row) {
            issues.push({
              file: filePath,
              line: decl.position.row + 1,
              category: 'Uninitialized',
              message: `变量 '${decl.name}' 声明后未初始化`,
              codeLine: lines[decl.position.row] || ''
            });
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error('未初始化变量检测错误:', error);
  }
  
  return issues;
}

// 2. 野指针检测
async function checkWildPointers(ast: any, lines: string[], filePath: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  
  try {
    const parser = await CASTParser.create();
    const declarations = parser.extractVariableDeclarations(ast, lines);
    
    for (const decl of declarations) {
      if (decl.isPointer && !decl.isInitialized && !decl.isParameter) {
        const dereferences = parser.findPointerDereferences(ast, decl.name);
        for (const deref of dereferences) {
          if (deref.row > decl.position.row) {
            issues.push({
              file: filePath,
              line: deref.row + 1,
              category: 'Wild pointer',
              message: `野指针解引用：指针 '${decl.name}' 未初始化`,
              codeLine: lines[deref.row] || ''
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('野指针检测错误:', error);
  }
  
  return issues;
}

// 3. 空指针检测
async function checkNullPointers(ast: any, lines: string[], filePath: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  
  try {
    const parser = await CASTParser.create();
    const declarations = parser.extractVariableDeclarations(ast, lines);
    
    for (const decl of declarations) {
      if (decl.isPointer && lines[decl.position.row].includes('NULL')) {
        const dereferences = parser.findPointerDereferences(ast, decl.name);
        for (const deref of dereferences) {
          if (deref.row > decl.position.row) {
            issues.push({
              file: filePath,
              line: deref.row + 1,
              category: 'Null pointer',
              message: `空指针解引用：指针 '${decl.name}' 为 NULL`,
              codeLine: lines[deref.row] || ''
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('空指针检测错误:', error);
  }
  
  return issues;
}

// 4. 死循环检测
function checkDeadLoops(ast: any, lines: string[], filePath: string): Issue[] {
  const issues: Issue[] = [];
  
  try {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检测明显的死循环模式
      const isForInfinite = /for\s*\(\s*;\s*;\s*\)/.test(line);
      const isWhileInfinite = /while\s*\(\s*1\s*\)/.test(line);
      if (!(isForInfinite || isWhileInfinite)) continue;

      // 如果循环体中存在 break; 则不报告
      const hasBreak = loopBodyHasBreak(lines, i);
      if (hasBreak) continue;

      issues.push({
        file: filePath,
        line: i + 1,
        category: 'Dead loop',
        message: '检测到可能的死循环',
        codeLine: line
      });
    }
  } catch (error) {
    console.error('死循环检测错误:', error);
  }
  
  return issues;
}

// 辅助：判断从循环起始行开始的循环体是否包含break
function loopBodyHasBreak(lines: string[], loopStartIndex: number): boolean {
  // 向后查找循环体：
  // 1) 如果同一行存在开花括号，则从该处起，匹配括号到闭合
  // 2) 否则，如果下一行起一个语句且该行或紧随行包含break;，也视为包含
  const startLine = lines[loopStartIndex];
  // 尝试从当前行定位第一个 '{'
  let i = loopStartIndex;
  let braceDepth = 0;
  let started = false;

  // 扫描最多200行作为上限，避免极端文件
  const LIMIT = Math.min(lines.length, loopStartIndex + 200);

  // 如果当前行或后续行出现 '{' 则进入块扫描模式；否则尝试一行语句模式
  for (; i < LIMIT; i++) {
    const line = stripLineComments(lines[i]);
    if (!started) {
      if (line.includes('{')) {
        started = true;
        braceDepth += countChar(line, '{');
        braceDepth -= countChar(line, '}');
        if (/(\bbreak\s*;|\breturn\b|\bexit\s*\(|\bgoto\s+\w+)/.test(line)) return true;
        if (braceDepth === 0) break; // 单行块
      } else if (i === loopStartIndex) {
        // 可能是无花括号的单语句循环体，检查下一行及之后连续非空行直至分号结束
        const nextIdx = i + 1;
        if (nextIdx < lines.length) {
          const nextLine = stripLineComments(lines[nextIdx]);
          if (/(\bbreak\s*;|\breturn\b|\bexit\s*\(|\bgoto\s+\w+)/.test(nextLine)) return true;
        }
        return false;
      }
    } else {
      // 已进入块
      if (/(\bbreak\s*;|\breturn\b|\bexit\s*\(|\bgoto\s+\w+)/.test(line)) return true;
      braceDepth += countChar(line, '{');
      braceDepth -= countChar(line, '}');
      if (braceDepth <= 0) break;
    }
  }
  return false;
}

function countChar(s: string, ch: string): number {
  let c = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === ch) c++;
  return c;
}

function stripLineComments(s: string): string {
  const idx = s.indexOf('//');
  return idx >= 0 ? s.slice(0, idx) : s;
}

// 5. 数值范围检查
function checkNumericRange(ast: any, lines: string[], filePath: string): Issue[] {
  const issues: Issue[] = [];
  
  try {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查char类型溢出
      if (/char\s+\w+\s*=\s*(\d+)/.test(line)) {
        const match = line.match(/char\s+\w+\s*=\s*(\d+)/);
        if (match) {
          const value = parseInt(match[1]);
          if (value > 127 || value < -128) {
            issues.push({
              file: filePath,
              line: i + 1,
              category: 'Range overflow',
              message: `char类型数值溢出：${value} 超出范围(-128到127)`,
              codeLine: line
            });
          }
        }
      }
      
      // 检查unsigned char类型溢出
      if (/unsigned\s+char\s+\w+\s*=\s*(\d+)/.test(line)) {
        const match = line.match(/unsigned\s+char\s+\w+\s*=\s*(\d+)/);
        if (match) {
          const value = parseInt(match[1]);
          if (value > 255 || value < 0) {
            issues.push({
              file: filePath,
              line: i + 1,
              category: 'Range overflow',
              message: `unsigned char类型数值溢出：${value} 超出范围(0到255)`,
              codeLine: line
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('数值范围检查错误:', error);
  }
  
  return issues;
}

// 6. 内存泄漏检测（降低误报：允许返回所有权或输出参数转移）
function checkMemoryLeaks(ast: any, lines: string[], filePath: string): Issue[] {
  const issues: Issue[] = [];
  
  try {
    const content = lines.join('\n');
    const mallocMatches = content.match(/(\w+)\s*=\s*malloc\s*\(/g) || [];
    
    for (const mallocMatch of mallocMatches) {
      const varMatch = mallocMatch.match(/(\w+)\s*=/);
      if (!varMatch) continue;
      const varName = varMatch[1];

      // 所有权返回：return varName; 或 return (varName);
      const returnedOwnership = new RegExp(`\breturn\s+\(?\*?${varName}\)?\s*;`).test(content);
      // 输出参数转移：*out = varName; 或 out->ptr = varName;
      const assignedToOut = new RegExp(`\*?\w+\s*(->\w+)?\s*=\s*${varName}\b`).test(content);

      if (returnedOwnership || assignedToOut) {
        continue; // 认为不构成当前函数内的泄漏
      }

      if (!content.includes(`free(${varName})`)) {
        // 找到malloc出现的第一行
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(mallocMatch)) {
            issues.push({
              file: filePath,
              line: i + 1,
              category: 'Memory leak',
              message: `内存泄漏：变量 '${varName}' 分配内存后未释放`,
              codeLine: lines[i]
            });
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error('内存泄漏检测错误:', error);
  }
  
  return issues;
}

// 7. 格式字符串检查
function checkFormatStrings(ast: any, lines: string[], filePath: string): Issue[] {
  const issues: Issue[] = [];
  
  try {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查printf格式不匹配
      const printfMatch = line.match(/printf\s*\(\s*"([^"]*)"(.*)?\)/);
      if (printfMatch) {
        const format = printfMatch[1];
        const args = printfMatch[2] || '';
        
        const formatSpecifiers = format.match(/%[sdioxXeEfFgGaAcpn%]/g) || [];
        const argCount = args.split(',').filter(arg => arg.trim()).length;
        
        if (formatSpecifiers.length !== argCount) {
          issues.push({
            file: filePath,
            line: i + 1,
            category: 'Format',
            message: `printf格式字符串参数不匹配：需要${formatSpecifiers.length}个参数，提供了${argCount}个`,
            codeLine: line
          });
        }
      }
      
      // 检查scanf缺少&符号
      if (/scanf\s*\([^&]*\w+\s*\)/.test(line) && !line.includes('&')) {
        issues.push({
          file: filePath,
          line: i + 1,
          category: 'Format',
          message: 'scanf参数缺少地址操作符&',
          codeLine: line
        });
      }
    }
  } catch (error) {
    console.error('格式字符串检查错误:', error);
  }
  
  return issues;
}

// 8. 库函数头文件检查
function checkLibraryHeaders(content: string, lines: string[], filePath: string): Issue[] {
  const issues: Issue[] = [];
  
  const functionHeaders = {
    'malloc': 'stdlib.h',
    'free': 'stdlib.h',
    'calloc': 'stdlib.h',
    'realloc': 'stdlib.h',
    'printf': 'stdio.h',
    'scanf': 'stdio.h',
    'strlen': 'string.h',
    'strcpy': 'string.h',
    'strcmp': 'string.h',
    'strcat': 'string.h',
    'sqrt': 'math.h',
    'pow': 'math.h',
    'isalpha': 'ctype.h',
    'isdigit': 'ctype.h',
    'islower': 'ctype.h',
    'isupper': 'ctype.h',
    'time': 'time.h',
    'clock': 'time.h',
    'rand': 'stdlib.h',
    'srand': 'stdlib.h',
    'exit': 'stdlib.h',
    'atoi': 'stdlib.h'
  } as Record<string, string>;
  
  // 去重：每个缺失的头文件仅报告一次（按头文件维度）
  const missingHeaderOnce = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const [func, header] of Object.entries(functionHeaders)) {
      if (new RegExp(`\\b${func}\\s*\\(`).test(line)) {
        if (!content.includes(`#include <${header}>`)) {
          if (missingHeaderOnce.has(header)) continue;
          missingHeaderOnce.add(header);
          issues.push({
            file: filePath,
            line: i + 1,
            category: 'Header',
            message: `使用${func}但未包含<${header}>`,
            codeLine: line
          });
        }
      }
    }
  }
  
  return issues;
}

// 增强的文本分析回退方案
function analyzeWithTextFallback(filePath: string, content: string, lines: string[]): Issue[] {
  const issues: Issue[] = [];
  
  // 1. 未初始化变量检测
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测各种类型的未初始化变量
    if (/\b(int|char|float|double|short|long)\s+\w+\s*;/.test(line) && !line.includes('=') && !line.includes('extern')) {
      issues.push({
        file: filePath,
        line: i + 1,
        category: 'Uninitialized',
        message: '变量声明后未初始化',
        codeLine: line
      });
    }
  }
  
  // 2. 野指针检测（加入赋值覆盖检查）
  const pointerDeclarations = new Map<string, number>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 找到指针声明
    const pointerMatch = line.match(/\b(\w+)\s*\*\s*(\w+)\s*;/);
    if (pointerMatch) {
      const pointerName = pointerMatch[2];
      if (!line.includes('=')) {
        pointerDeclarations.set(pointerName, i);
      }
    }
    
    // 检查解引用
    for (const [pointerName, declLine] of pointerDeclarations) {
      if (i > declLine) {
        const seg = stripLineComments(lines[i]);
        // 若在声明之后到当前之间有赋值/取址/分配，则视为已初始化
        let initialized = false;
        for (let k = declLine + 1; k < i; k++) {
          const mid = stripLineComments(lines[k]);
          if (new RegExp(`\\b${pointerName}\\s*=\\s*&?\\w+`).test(mid)) { initialized = true; break; }
          if (new RegExp(`\\b${pointerName}\\s*=\\s*malloc\\s*\\(`).test(mid)) { initialized = true; break; }
        }
        if (initialized) continue;
        if (seg.includes(`*${pointerName}`)) {
          issues.push({
            file: filePath,
            line: i + 1,
            category: 'Wild pointer',
            message: `野指针解引用：指针 '${pointerName}' 未初始化`,
            codeLine: lines[i]
          });
        }
      }
    }
  }
  
  // 3. 空指针检测（加入后续非空覆盖检查）
  const nullPointers = new Map<string, number>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 找到NULL指针赋值
    const nullMatch = line.match(/(\w+)\s*=\s*(NULL|0)\s*;/);
    if (nullMatch) {
      nullPointers.set(nullMatch[1], i);
    }
    
    // 检查解引用
    for (const [pointerName, declLine] of nullPointers) {
      if (i > declLine) {
        // 若之后有非空赋值则不报
        let becameNonNull = false;
        for (let k = declLine + 1; k < i; k++) {
          const mid = stripLineComments(lines[k]);
          if (new RegExp(`\\b${pointerName}\\s*=\\s*&?\\w+`).test(mid)) { becameNonNull = true; break; }
          if (new RegExp(`\\b${pointerName}\\s*=\\s*malloc\\s*\\(`).test(mid)) { becameNonNull = true; break; }
        }
        if (becameNonNull) continue;
        const seg = stripLineComments(lines[i]);
        if (seg.includes(`*${pointerName}`)) {
          issues.push({
            file: filePath,
            line: i + 1,
            category: 'Null pointer',
            message: `空指针解引用：指针 '${pointerName}' 为 NULL`,
            codeLine: lines[i]
          });
        }
      }
    }
  }
  
  // 4. 死循环检测（已在AST路径实现；这里保留启发式以防未走AST路径）
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isForInfinite = /for\s*\(\s*;\s*;\s*\)/.test(line);
    const isWhileInfinite = /while\s*\(\s*1\s*\)/.test(line);
    if (!(isForInfinite || isWhileInfinite)) continue;
    // 若下一行或块内包含 break/return/exit/goto 则不报
    if (loopBodyHasBreak(lines, i)) continue;
    issues.push({ file: filePath, line: i + 1, category: 'Dead loop', message: '检测到可能的死循环', codeLine: line });
  }
  
  // 5. 数值范围检查（保持原逻辑）
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // char类型范围检查
    const charMatch = line.match(/char\s+\w+\s*=\s*(\d+)/);
    if (charMatch) {
      const value = parseInt(charMatch[1]);
      if (value > 127 || value < -128) {
        issues.push({
          file: filePath,
          line: i + 1,
          category: 'Range overflow',
          message: `char类型数值溢出：${value} 超出范围(-128到127)`,
          codeLine: line
        });
      }
    }
    
    // unsigned char类型范围检查
    const ucharMatch = line.match(/unsigned\s+char\s+\w+\s*=\s*(\d+)/);
    if (ucharMatch) {
      const value = parseInt(ucharMatch[1]);
      if (value > 255 || value < 0) {
        issues.push({
          file: filePath,
          line: i + 1,
          category: 'Range overflow',
          message: `unsigned char类型数值溢出：${value} 超出范围(0到255)`,
          codeLine: line
        });
      }
    }
  }
  
  // 6. 内存泄漏检测（保持改进逻辑）
  const mallocVars = new Map<string, number>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测malloc
    const mallocMatch = line.match(/(\w+)\s*=\s*malloc\s*\(/);
    if (mallocMatch) {
      const varName = mallocMatch[1];
      // 若后续 return varName 或 *out=varName 则豁免
      let exempt = false;
      for (let k = i + 1; k < Math.min(lines.length, i + 200); k++) {
        const mid = stripLineComments(lines[k]);
        // return varName; 或 return (varName);
        const retRe = new RegExp(`\\breturn\\s+\\(?\\*?${varName}\\)?\\s*;`);
        // 输出参数赋值：左侧任意标识（或成员）= varName;
        const outAssignRe = new RegExp(`\\*?\\w+\\s*(->\\w+)?\\s*=\\s*${varName}\\b`);
        if (retRe.test(mid) || outAssignRe.test(mid)) { exempt = true; break; }
      }
      if (!exempt) mallocVars.set(varName, i);
    }
    
    // 检测free
    const freeMatch = line.match(/free\s*\(\s*(\w+)\s*\)/);
    if (freeMatch) mallocVars.delete(freeMatch[1]);
  }
  
  // 报告未释放的内存
  for (const [varName, lineNum] of mallocVars) {
    issues.push({
      file: filePath,
      line: lineNum + 1,
      category: 'Memory leak',
      message: `内存泄漏：变量 '${varName}' 分配内存后未释放`,
      codeLine: lines[lineNum]
    });
  }
  
  // 7. 格式字符串检查（收紧参数计数）
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/printf\s*\(\s*"([^\"]*)"(.*)\)/);
    if (m) {
      const format = m[1];
      const argsRaw = m[2] || '';
      const fmtSpecs = (format.match(/%[sdioxXeEfFgGaAcpn%]/g) || []).filter(s => s !== '%%');
      let argCount = 0;
      const inner = argsRaw.replace(/^[\s,]*/, '').replace(/[\s\)]*$/, '');
      if (inner.length > 0) {
        argCount = inner.split(',').filter(x => x.trim().length > 0).length;
      }
      if (fmtSpecs.length !== argCount) {
        issues.push({ file: filePath, line: i + 1, category: 'Format', message: `printf格式字符串参数不匹配：需要${fmtSpecs.length}个参数，提供了${argCount}个`, codeLine: line });
      }
    }
    if (/scanf\s*\(/.test(line)) {
      const hasAmp = /&\s*\w+/.test(line);
      if (!hasAmp) {
        issues.push({ file: filePath, line: i + 1, category: 'Format', message: 'scanf参数缺少地址操作符&', codeLine: line });
      }
    }
  }
  
  // 8. 头文件检查（已在独立函数中做去重）
  issues.push(...checkLibraryHeaders(content, lines, filePath));

  return issues;
}

// === 评测模式（增强）：逐行标准标签解析与比对，统计缺失/多报/类别不匹配 ===
interface LinedExpectation { line: number; category: string; }
interface EvalDetailed {
  files: number;
  expected: LinedExpectation[];
  reported: LinedExpectation[];
  missing: LinedExpectation[];
  extra: LinedExpectation[];
  mismatched: { line: number; expected: string; reported: string }[];
}

function runEvaluationDetailed(dir: string, issues: Issue[]): EvalDetailed {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.c'));
  const expected: LinedExpectation[] = [];
  const reported: LinedExpectation[] = [];

  // 收集reported（按文件相对路径处理到行）
  for (const iss of issues) {
    reported.push({ line: iss.line, category: iss.category });
  }

  // 解析“BUG: <Category>”
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/BUG\s*:\s*([A-Za-z\s]+)\b/i);
      if (!m) continue;
      const label = m[1].trim();
      const cat = normalizeCategoryLabel(label);
      if (!cat) continue;
      expected.push({ line: i + 1, category: cat });
    }
  }

  // 比对逻辑：逐行匹配
  const missing: LinedExpectation[] = [];
  const extra: LinedExpectation[] = [];
  const mismatched: { line: number; expected: string; reported: string }[] = [];

  // 构建行到类别的映射（允许一行多标签/多报告，多对多匹配简化处理）
  const expectedByLine = new Map<number, string[]>();
  for (const e of expected) {
    const arr = expectedByLine.get(e.line) || [];
    arr.push(e.category);
    expectedByLine.set(e.line, arr);
  }
  const reportedByLine = new Map<number, string[]>();
  for (const r of reported) {
    const arr = reportedByLine.get(r.line) || [];
    arr.push(r.category);
    reportedByLine.set(r.line, arr);
  }

  const linesSet = new Set<number>([...expectedByLine.keys(), ...reportedByLine.keys()]);
  for (const ln of linesSet) {
    const exp = [...(expectedByLine.get(ln) || [])];
    const rep = [...(reportedByLine.get(ln) || [])];
    // 逐类匹配
    for (const c of [...exp]) {
      const idx = rep.indexOf(c);
      if (idx >= 0) {
        // 命中：从双方移除
        exp.splice(exp.indexOf(c), 1);
        rep.splice(idx, 1);
      }
    }
    // 剩余：若双方还有元素，视为类别不匹配（两两配对记为mismatch），剩余单边为缺失或多报
    while (exp.length > 0 && rep.length > 0) {
      mismatched.push({ line: ln, expected: exp.shift() as string, reported: rep.shift() as string });
    }
    for (const c of exp) missing.push({ line: ln, category: c });
    for (const c of rep) extra.push({ line: ln, category: c });
  }

  return { files: files.length, expected, reported, missing, extra, mismatched };
}

function normalizeCategoryLabel(label: string): string | null {
  const l = label.toLowerCase();
  if (/header/.test(l)) return 'Header';
  if (/wild\s*pointer|野指针/.test(l)) return 'Wild pointer';
  if (/null\s*pointer|空指针/.test(l)) return 'Null pointer';
  if (/uninitialized|未初始化/.test(l)) return 'Uninitialized';
  if (/dead\s*loop|死循环/.test(l)) return 'Dead loop';
  if (/leak|内存泄漏/.test(l)) return 'Memory leak';
  if (/range|溢出/.test(l)) return 'Range overflow';
  if (/format|格式/.test(l)) return 'Format';
  return null;
}

// === 评测模式：从注释中提取标准答案并与结果比对 ===
interface EvalResultSummary {
  files: number;
  expectedCounts: Record<string, number>;
  reportedCounts: Record<string, number>;
  missing: Record<string, number>;   // 标准有但未报
  over: Record<string, number>;      // 报了但标准没有或多报
  mismatch: number;                  // 分类不一致计数（简化为按类别计数差）
}

function runEvaluation(dir: string, issues: Issue[]): EvalResultSummary {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.c'));
  const expectedCountsTotal: Record<string, number> = {};
  const reportedCountsTotal: Record<string, number> = {};

  // 统计报告
  for (const iss of issues) {
    reportedCountsTotal[iss.category] = (reportedCountsTotal[iss.category] || 0) + 1;
  }

  // 解析每个文件的“BUG:”注释作为标准答案
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const m = line.match(/BUG\s*:\s*(.+)/i);
      if (!m) continue;
      const desc = m[1].toLowerCase();
      const cat = mapBugDescriptionToCategory(desc);
      if (!cat) continue;
      expectedCountsTotal[cat] = (expectedCountsTotal[cat] || 0) + 1;
    }
  }

  // 计算差异
  const cats = new Set<string>([...Object.keys(expectedCountsTotal), ...Object.keys(reportedCountsTotal)]);
  const missing: Record<string, number> = {};
  const over: Record<string, number> = {};
  let mismatch = 0;
  for (const c of cats) {
    const exp = expectedCountsTotal[c] || 0;
    const rep = reportedCountsTotal[c] || 0;
    if (rep < exp) missing[c] = exp - rep;
    if (rep > exp) over[c] = rep - exp;
    mismatch += Math.abs(rep - exp);
  }

  return {
    files: files.length,
    expectedCounts: expectedCountsTotal,
    reportedCounts: reportedCountsTotal,
    missing,
    over,
    mismatch,
  };
}

function mapBugDescriptionToCategory(desc: string): string | null {
  if (/wild\s*pointer|野指针/.test(desc)) return 'Wild pointer';
  if (/null\s*pointer|空指针/.test(desc)) return 'Null pointer';
  if (/uninitialized|未初始化/.test(desc)) return 'Uninitialized';
  if (/dead\s*loop|死循环/.test(desc)) return 'Dead loop';
  if (/leak|内存泄漏/.test(desc)) return 'Memory leak';
  if (/range|溢出/.test(desc)) return 'Range overflow';
  if (/format|格式/.test(desc)) return 'Format';
  if (/header|头文件/.test(desc)) return 'Header';
  return null;
}

async function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'samples');
  const isEval = process.argv.includes('--eval');
  
  console.log(`正在扫描目录: ${dir}`);
  
  try {
    // 使用完整的分析（AST 可用则AST，否则回退）
    const issues = await analyzeDir(dir);
    
    if (!isEval) {
      if (issues.length === 0) {
        console.log('没有发现问题。');
      } else {
        printIssues(issues);
      }
      printTables();
    } else {
      // 评测模式：逐行详细比对 + 汇总
      const detail = runEvaluationDetailed(dir, issues);
      const summary = runEvaluation(dir, issues);
      console.log('\n=== 评测结果(逐行) ===');
      console.log(`文件数: ${detail.files}`);
      console.log('缺失(漏报): ', JSON.stringify(detail.missing, null, 2));
      console.log('多报(误报): ', JSON.stringify(detail.extra, null, 2));
      console.log('类别不匹配: ', JSON.stringify(detail.mismatched, null, 2));
      console.log('\n=== 评测结果(汇总) ===');
      console.log(`文件数: ${summary.files}`);
      console.log('标准答案计数: ', JSON.stringify(summary.expectedCounts, null, 2));
      console.log('检测报告计数: ', JSON.stringify(summary.reportedCounts, null, 2));
      console.log('未命中(漏报): ', JSON.stringify(summary.missing, null, 2));
      console.log('过报/多报: ', JSON.stringify(summary.over, null, 2));
      console.log(`分类计数差值总和(越小越好): ${summary.mismatch}`);
    }
  } catch (error) {
    console.error('扫描过程中发生错误:', error);
    process.exit(1);
  }
}

main().catch(err => { 
  console.error('程序执行失败:', err); 
  process.exit(1); 
});