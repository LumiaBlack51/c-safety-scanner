// 数值范围检查模块

import { TypeRange, VariableInfo } from '../interfaces/types';

export function getTypeRange(typeName: string): TypeRange | null {
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

export function checkValueRange(value: number, typeName: string): boolean {
  const range = getTypeRange(typeName);
  if (!range) return true; // 未知类型，不检查
  
  return value >= range.min && value <= range.max;
}

export function extractNumericValue(expr: string): number | null {
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

export function checkAssignmentRange(line: string, varInfo: VariableInfo): boolean {
  // 查找赋值表达式（包括声明时的初始化）
  const assignmentMatch = line.match(new RegExp(`${varInfo.name}\\s*=\\s*([^;]+)`));
  if (!assignmentMatch) return true;
  
  const valueExpr = assignmentMatch[1].trim();
  const value = extractNumericValue(valueExpr);
  
  if (value === null) return true; // 无法解析数值，跳过检查
  
  return checkValueRange(value, varInfo.typeName);
}

export function checkInitializationRange(line: string, varInfo: VariableInfo): boolean {
  // 查找初始化表达式
  const initMatch = line.match(new RegExp(`${varInfo.name}\\s*=\\s*([^;]+)`));
  if (!initMatch) return true;
  
  const valueExpr = initMatch[1].trim();
  const value = extractNumericValue(valueExpr);
  
  if (value === null) return true; // 无法解析数值，跳过检查
  
  return checkValueRange(value, varInfo.typeName);
}
