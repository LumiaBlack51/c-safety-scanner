// 格式字符串检查模块

import { VariableInfo } from './types';

export function formatSpecCount(fmt: string): number {
  let cnt = 0;
  for (let i = 0; i < fmt.length; i++) {
    if (fmt[i] === '%') {
      if (fmt[i + 1] === '%') {
        i++;
        continue;
      }
      cnt++;
    }
  }
  return cnt;
}

export function extractFormatSpecs(fmtStr: string): string[] {
  // 提取格式字符串中的所有格式说明符
  const matches = fmtStr.match(/%[diouxXeEfFgGaAcspn%]/g);
  return matches || [];
}

export function getArgumentType(arg: string, allNames: Set<string>, getVarFB: (name: string) => VariableInfo | undefined): string | null {
  // 获取参数的类型
  const trimmed = arg.trim();
  
  // 处理字面量
  if (/^\d+$/.test(trimmed)) return 'int';
  if (/^\d+\.\d+[fF]?$/.test(trimmed)) return 'float';
  if (/^"[^"]*"$/.test(trimmed)) return 'char*';
  if (/^'[^']*'$/.test(trimmed)) return 'char';
  if (trimmed === 'NULL' || trimmed === 'nullptr') return 'void*';
  
  // 处理变量
  const name = getNameFromExpr(trimmed);
  if (name && allNames.has(name)) {
    const varInfo = getVarFB(name);
    if (varInfo) {
      if (varInfo.isPointer) {
        return varInfo.typeName + '*';
      }
      return varInfo.typeName;
    }
  }
  
  // 处理指针解引用
  if (trimmed.startsWith('*')) {
    const derefName = getNameFromExpr(trimmed.substring(1));
    if (derefName && allNames.has(derefName)) {
      const varInfo = getVarFB(derefName);
      if (varInfo && varInfo.isPointer) {
        return varInfo.typeName;
      }
    }
  }
  
  // 处理数组访问
  if (trimmed.includes('[')) {
    const arrayName = trimmed.split('[')[0].trim();
    if (allNames.has(arrayName)) {
      const varInfo = getVarFB(arrayName);
      if (varInfo) {
        return varInfo.typeName;
      }
    }
  }
  
  return null;
}

export function isFormatSpecCompatible(spec: string, argType: string): boolean {
  // 检查格式说明符与参数类型是否兼容
  const specType = spec.toLowerCase();
  
  // 整数类型
  if (['%d', '%i', '%o', '%u', '%x', '%x'].includes(specType)) {
    return ['int', 'char', 'short', 'long', 'unsigned', 'signed'].some(t => argType.includes(t));
  }
  
  // 浮点类型
  if (['%f', '%e', '%e', '%g', '%g', '%a', '%a'].includes(specType)) {
    return ['float', 'double'].some(t => argType.includes(t));
  }
  
  // 字符类型
  if (specType === '%c') {
    return argType.includes('char') && !argType.includes('*');
  }
  
  // 字符串类型
  if (specType === '%s') {
    return argType.includes('char') && argType.includes('*');
  }
  
  // 指针类型
  if (specType === '%p') {
    return argType.includes('*');
  }
  
  return true; // 默认兼容，避免误报
}

function getNameFromExpr(expr: string): string | null {
  // 从表达式中提取变量名
  const match = expr.match(/^([a-zA-Z_]\w*)/);
  return match ? match[1] : null;
}

export function getArgsFromCall(line: string): string[] {
  const lp = line.indexOf('(');
  const rp = line.lastIndexOf(')');
  if (lp < 0 || rp < 0 || rp <= lp) return [] as string[];
  const inside = line.slice(lp + 1, rp);
  const parts: string[] = [];
  let depth = 0, buf = '', inStr = false, q = '';
  for (let i = 0; i < inside.length; i++) {
    const c = inside[i];
    if (inStr) {
      buf += c;
      if (c === q) inStr = false;
    } else {
      if (c === '"' || c === "'") { inStr = true; q = c; buf += c; }
      else if (c === '(' || c === '[' || c === '{') { depth++; buf += c; }
      else if (c === ')' || c === ']' || c === '}') { depth--; buf += c; }
      else if (c === ',' && depth === 0) { parts.push(buf.trim()); buf = ''; }
      else buf += c;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}
