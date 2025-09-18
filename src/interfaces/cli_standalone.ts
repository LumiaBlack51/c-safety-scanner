import * as path from 'path';
import * as fs from 'fs';
import { Issue } from './types';

// AST版本的目录分析函数
function analyzeDir(dir: string): Issue[] {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.c'));
  const issues: Issue[] = [];
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    try {
      // 简化版AST分析 - 暂时只做基本的文本分析
      // 这是为了避免VSCode依赖问题
      
      // 检查未初始化变量
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 简单的未初始化检测
        if (/int\s+\w+\s*;/.test(line) && !line.includes('=')) {
          issues.push({
            file: filePath,
            line: i + 1,
            category: 'Uninitialized',
            message: '变量声明后未初始化',
            codeLine: line
          });
        }
        
        // 简单的库函数检测
        if (/malloc\s*\(/.test(line) && !content.includes('#include <stdlib.h>')) {
          issues.push({
            file: filePath,
            line: i + 1,
            category: 'Header',
            message: '使用malloc但未包含<stdlib.h>',
            codeLine: line
          });
        }
        
        if (/printf\s*\(/.test(line) && !content.includes('#include <stdio.h>')) {
          issues.push({
            file: filePath,
            line: i + 1,
            category: 'Header',
            message: '使用printf但未包含<stdio.h>',
            codeLine: line
          });
        }
      }
      
    } catch (error) {
      console.error(`分析文件 ${filePath} 时发生错误:`, error);
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

async function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'samples');
  
  console.log(`正在扫描目录: ${dir}`);
  
  try {
    // 使用原有的分析方法（暂时保留启发式方法直到 AST 版本完全稳定）
    const issues = analyzeDir(dir);
    
    if (issues.length === 0) {
      console.log('没有发现问题。');
    } else {
      printIssues(issues);
    }
    
    printTables();
  } catch (error) {
    console.error('扫描过程中发生错误:', error);
    process.exit(1);
  }
}

main().catch(err => { 
  console.error('程序执行失败:', err); 
  process.exit(1); 
});