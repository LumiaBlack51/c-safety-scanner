// 头文件检查模块

import { functionHeaderMap } from './function_header_map';

// 检查库函数是否包含对应头文件
export function checkLibraryFunctionHeaders(line: string, includedHeaders: Set<string>): string[] {
  const warnings: string[] = [];
  
  // 提取函数调用
  const functionCalls = line.match(/\b([a-zA-Z_]\w*)\s*\(/g);
  if (!functionCalls) return warnings;
  
  for (const call of functionCalls) {
    const functionName = call.replace(/\s*\($/, '');
    const requiredHeader = functionHeaderMap[functionName];
    
    if (requiredHeader && !includedHeaders.has(requiredHeader)) {
      warnings.push(`函数 ${functionName} 需要包含头文件 ${requiredHeader}`);
    }
  }
  
  return warnings;
}

// 提取包含的头文件
export function extractIncludedHeaders(lines: string[]): Set<string> {
  const headers = new Set<string>();
  
  for (const line of lines) {
    const includeMatch = line.match(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/);
    if (includeMatch) {
      headers.add(includeMatch[1]);
    }
  }
  
  return headers;
}
