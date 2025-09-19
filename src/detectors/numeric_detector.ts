/**
 * 数值检测器模块
 * 检测数值范围溢出等问题
 */

import { BaseDetector, DetectionContext } from './base_detector';
import { Issue } from '../interfaces/types';

export class NumericDetector extends BaseDetector {
  constructor(config: any, enabled: boolean = true) {
    super(config, enabled);
  }
  
  getName(): string {
    return 'NumericDetector';
  }
  
  getDescription(): string {
    return '检测数值范围溢出等数值问题';
  }
  
  async detect(context: DetectionContext): Promise<Issue[]> {
    if (!this.enabled || !this.config.numericRange) return [];
    
    const issues: Issue[] = [];
    
    try {
      // 优先使用AST检测
      if (context.ast) {
        issues.push(...await this.detectWithAST(context));
      } else {
        // 回退到启发式检测
        issues.push(...this.detectWithHeuristic(context));
      }
    } catch (error) {
      console.error('NumericDetector检测错误:', error);
      // 回退到启发式检测
      issues.push(...this.detectWithHeuristic(context));
    }
    
    return issues;
  }
  
  private async detectWithAST(context: DetectionContext): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    if (!context.ast) return issues;
    
    try {
      // 遍历AST节点，查找数值声明和赋值
      this.traverseAST(context.ast, (node) => {
        this.analyzeNodeForNumericIssues(node, context, issues);
      });
    } catch (error) {
      console.error('AST数值检测错误:', error);
    }
    
    return issues;
  }
  
  private traverseAST(node: any, callback: (node: any) => void): void {
    callback(node);
    if (node.children) {
      for (const child of node.children) {
        this.traverseAST(child, callback);
      }
    }
    if (node.namedChildren) {
      for (const child of node.namedChildren) {
        this.traverseAST(child, callback);
      }
    }
  }
  
  private analyzeNodeForNumericIssues(node: any, context: DetectionContext, issues: Issue[]): void {
    const line = node.startPosition?.row || 0;
    
    // 分析变量声明
    if (node.type === 'declaration' || node.type === 'VarDecl') {
      this.analyzeVariableDeclaration(node, context, issues);
    }
    
    // 分析赋值操作
    if (node.type === 'binary_expression' && node.text === '=') {
      this.analyzeAssignment(node, context, issues);
    }
    
    // 分析数值字面量
    if (node.type === 'number_literal' || node.type === 'IntegerLiteral' || node.type === 'FloatingLiteral') {
      this.analyzeNumericLiteral(node, context, issues);
    }
  }
  
  private analyzeVariableDeclaration(node: any, context: DetectionContext, issues: Issue[]): void {
    // 查找类型说明符
    const typeSpecifier = this.findChildByType(node, 'primitive_type') || 
                         this.findChildByType(node, 'type_identifier') ||
                         this.findChildByType(node, 'BuiltinType');
    
    if (!typeSpecifier) return;
    
    const typeName = typeSpecifier.text;
    
    // 查找初始化器
    const initDeclarator = this.findChildByType(node, 'init_declarator');
    if (initDeclarator) {
      const initializer = this.findChildByType(initDeclarator, 'number_literal') ||
                         this.findChildByType(initDeclarator, 'IntegerLiteral') ||
                         this.findChildByType(initDeclarator, 'FloatingLiteral');
      
      if (initializer) {
        this.checkNumericRange(typeName, initializer.text, node.startPosition.row, context, issues);
      }
    }
  }
  
  private analyzeAssignment(node: any, context: DetectionContext, issues: Issue[]): void {
    const leftOperand = node.namedChildren?.[0];
    const rightOperand = node.namedChildren?.[1];
    
    if (!leftOperand || !rightOperand) return;
    
    // 检查右操作数是否是数值字面量
    if (rightOperand.type === 'number_literal' || rightOperand.type === 'IntegerLiteral' || rightOperand.type === 'FloatingLiteral') {
      // 需要确定左操作数的类型
      const varName = leftOperand.text;
      const typeName = this.inferVariableType(varName, context);
      
      if (typeName) {
        this.checkNumericRange(typeName, rightOperand.text, node.startPosition.row, context, issues);
      }
    }
  }
  
  private analyzeNumericLiteral(node: any, context: DetectionContext, issues: Issue[]): void {
    // 查找包含此字面量的声明或赋值
    const parent = node.parent;
    if (parent) {
      if (parent.type === 'declaration' || parent.type === 'VarDecl') {
        this.analyzeVariableDeclaration(parent, context, issues);
      } else if (parent.type === 'binary_expression' && parent.text === '=') {
        this.analyzeAssignment(parent, context, issues);
      }
    }
  }
  
  private findChildByType(node: any, type: string): any {
    if (node.namedChildren) {
      for (const child of node.namedChildren) {
        if (child.type === type) {
          return child;
        }
      }
    }
    return null;
  }
  
  private inferVariableType(varName: string, context: DetectionContext): string | null {
    // 简化实现：通过分析源码来推断变量类型
    const lines = context.lines;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 查找变量声明
      const patterns = [
        { regex: new RegExp(`\\b(unsigned\\s+)?char\\s+${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), type: 'char' },
        { regex: new RegExp(`\\b(unsigned\\s+)?short\\s+${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), type: 'short' },
        { regex: new RegExp(`\\b(unsigned\\s+)?int\\s+${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), type: 'int' },
        { regex: new RegExp(`\\b(unsigned\\s+)?long\\s+${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), type: 'long' },
        { regex: new RegExp(`\\bfloat\\s+${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), type: 'float' },
        { regex: new RegExp(`\\bdouble\\s+${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`), type: 'double' }
      ];
      
      for (const pattern of patterns) {
        if (pattern.regex.test(line)) {
          return pattern.type;
        }
      }
    }
    return null;
  }
  
  private checkNumericRange(typeName: string, valueStr: string, line: number, context: DetectionContext, issues: Issue[]): void {
    let value: number;
    let isHex = false;
    let isOctal = false;
    
    // 解析数值
    if (valueStr.startsWith('0x') || valueStr.startsWith('0X')) {
      value = parseInt(valueStr, 16);
      isHex = true;
    } else if (valueStr.startsWith('0') && valueStr.length > 1) {
      value = parseInt(valueStr, 8);
      isOctal = true;
    } else {
      value = parseFloat(valueStr);
    }
    
    // 定义类型范围
    const typeRanges: Record<string, { min: number; max: number; unsignedMin?: number; unsignedMax?: number }> = {
      'char': { min: -128, max: 127, unsignedMin: 0, unsignedMax: 255 },
      'short': { min: -32768, max: 32767, unsignedMin: 0, unsignedMax: 65535 },
      'int': { min: -2147483648, max: 2147483647, unsignedMin: 0, unsignedMax: 4294967295 },
      'long': { min: -9223372036854775808, max: 9223372036854775807, unsignedMin: 0, unsignedMax: 18446744073709551615 },
      'float': { min: -3.4028235e38, max: 3.4028235e38 },
      'double': { min: -1.7976931348623157e308, max: 1.7976931348623157e308 }
    };
    
    const range = typeRanges[typeName];
    if (!range) return;
    
    // 检查是否是无符号类型
    const isUnsigned = typeName.includes('unsigned');
    const min = isUnsigned ? (range.unsignedMin || 0) : range.min;
    const max = isUnsigned ? (range.unsignedMax || range.max) : range.max;
    
    if (value < min || value > max) {
      const displayValue = isHex ? `0x${valueStr}` : isOctal ? `0${valueStr}` : valueStr;
      issues.push({
        file: context.filePath,
        line: line + 1,
        category: 'Range overflow',
        message: `${typeName}类型数值溢出：${displayValue} (${value}) 超出范围(${min}到${max})`,
        codeLine: context.lines[line] || ''
      });
    }
  }
  
  private detectWithHeuristic(context: DetectionContext): Issue[] {
    return this.detectNumericRange(context);
  }
  
  private detectNumericRange(context: DetectionContext): Issue[] {
    const issues: Issue[] = [];
    const lines = context.lines;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 改进的数值范围检测，更精确地识别类型
      this.checkNumericOverflow(context, line, i, issues);
    }
    
    return issues;
  }
  
  private checkNumericOverflow(context: DetectionContext, line: string, lineIndex: number, issues: Issue[]): void {
    // 移除注释部分
    const cleanLine = this.stripLineComments(line);
    
    // 首先检查unsigned类型（优先级最高）
    const unsignedPatterns = [
      {
        regex: /^\s*\bunsigned\s+char\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'unsigned char',
        min: 0,
        max: 255
      },
      {
        regex: /^\s*\bunsigned\s+short\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'unsigned short',
        min: 0,
        max: 65535
      },
      {
        regex: /^\s*\bunsigned\s+int\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'unsigned int',
        min: 0,
        max: 4294967295
      },
      {
        regex: /^\s*\bunsigned\s+long\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'unsigned long',
        min: 0,
        max: 18446744073709551615
      }
    ];
    
    // 检查十六进制数值
    const hexPatterns = [
      {
        regex: /^\s*\b(unsigned\s+)?char\s+(\w+)\s*=\s*0x([0-9a-fA-F]+)\s*;?\s*$/,
        type: 'char',
        min: -128,
        max: 127,
        unsignedMin: 0,
        unsignedMax: 255
      },
      {
        regex: /^\s*\b(unsigned\s+)?short\s+(\w+)\s*=\s*0x([0-9a-fA-F]+)\s*;?\s*$/,
        type: 'short',
        min: -32768,
        max: 32767,
        unsignedMin: 0,
        unsignedMax: 65535
      },
      {
        regex: /^\s*\b(unsigned\s+)?int\s+(\w+)\s*=\s*0x([0-9a-fA-F]+)\s*;?\s*$/,
        type: 'int',
        min: -2147483648,
        max: 2147483647,
        unsignedMin: 0,
        unsignedMax: 4294967295
      }
    ];
    
    // 检查八进制数值
    const octalPatterns = [
      {
        regex: /^\s*\b(unsigned\s+)?char\s+(\w+)\s*=\s*0([0-7]+)\s*;?\s*$/,
        type: 'char',
        min: -128,
        max: 127,
        unsignedMin: 0,
        unsignedMax: 255
      },
      {
        regex: /^\s*\b(unsigned\s+)?short\s+(\w+)\s*=\s*0([0-7]+)\s*;?\s*$/,
        type: 'short',
        min: -32768,
        max: 32767,
        unsignedMin: 0,
        unsignedMax: 65535
      },
      {
        regex: /^\s*\b(unsigned\s+)?int\s+(\w+)\s*=\s*0([0-7]+)\s*;?\s*$/,
        type: 'int',
        min: -2147483648,
        max: 2147483647,
        unsignedMin: 0,
        unsignedMax: 4294967295
      }
    ];
    
    // 检查unsigned类型
    for (const pattern of unsignedPatterns) {
      const match = cleanLine.match(pattern.regex);
      if (match) {
        const varName = match[1];
        const value = parseInt(match[2]);
        
        if (value < pattern.min || value > pattern.max) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Range overflow',
            message: `${pattern.type}类型数值溢出：${value} 超出范围(${pattern.min}到${pattern.max})`,
            codeLine: line
          });
        }
        return; // 找到匹配就返回，避免重复检查
      }
    }
    
    // 检查十六进制数值
    for (const pattern of hexPatterns) {
      const match = cleanLine.match(pattern.regex);
      if (match) {
        const isUnsigned = match[1] && match[1].includes('unsigned');
        const varName = match[2];
        const hexValue = match[3];
        const value = parseInt(hexValue, 16);
        
        const min = isUnsigned ? pattern.unsignedMin : pattern.min;
        const max = isUnsigned ? pattern.unsignedMax : pattern.max;
        const type = isUnsigned ? `unsigned ${pattern.type}` : pattern.type;
        
        if (value < min || value > max) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Range overflow',
            message: `${type}类型数值溢出：0x${hexValue} (${value}) 超出范围(${min}到${max})`,
            codeLine: line
          });
        }
        return;
      }
    }
    
    // 检查八进制数值
    for (const pattern of octalPatterns) {
      const match = cleanLine.match(pattern.regex);
      if (match) {
        const isUnsigned = match[1] && match[1].includes('unsigned');
        const varName = match[2];
        const octalValue = match[3];
        const value = parseInt(octalValue, 8);
        
        const min = isUnsigned ? pattern.unsignedMin : pattern.min;
        const max = isUnsigned ? pattern.unsignedMax : pattern.max;
        const type = isUnsigned ? `unsigned ${pattern.type}` : pattern.type;
        
        if (value < min || value > max) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Range overflow',
            message: `${type}类型数值溢出：0${octalValue} (${value}) 超出范围(${min}到${max})`,
            codeLine: line
          });
        }
        return;
      }
    }
    
    // 然后检查signed类型（确保不匹配unsigned）
    const signedPatterns = [
      {
        regex: /^\s*\bchar\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'char',
        min: -128,
        max: 127
      },
      {
        regex: /^\s*\bshort\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'short',
        min: -32768,
        max: 32767
      },
      {
        regex: /^\s*\bint\s+(\w+)\s*=\s*(\d+)\s*;?\s*$/,
        type: 'int',
        min: -2147483648,
        max: 2147483647
      }
    ];
    
    // 检查signed类型
    for (const pattern of signedPatterns) {
      const match = cleanLine.match(pattern.regex);
      if (match) {
        const varName = match[1];
        const value = parseInt(match[2]);
        
        if (value < pattern.min || value > pattern.max) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Range overflow',
            message: `${pattern.type}类型数值溢出：${value} 超出范围(${pattern.min}到${pattern.max})`,
            codeLine: line
          });
        }
        return; // 找到匹配就返回
      }
    }
    
    // 检查八进制和十六进制数值
    this.checkOctalHexOverflow(context, cleanLine, lineIndex, issues);
  }
  
  private checkOctalHexOverflow(context: DetectionContext, line: string, lineIndex: number, issues: Issue[]): void {
    // 检查八进制数值 (0开头)
    const octalPatterns = [
      {
        regex: /^[^=]*\bchar\s+(\w+)\s*=\s*0(\d+)\s*;?\s*$/,
        type: 'char',
        min: -128,
        max: 127,
        isUnsigned: false
      },
      {
        regex: /^[^=]*\bunsigned\s+char\s+(\w+)\s*=\s*0(\d+)\s*;?\s*$/,
        type: 'unsigned char',
        min: 0,
        max: 255,
        isUnsigned: true
      }
    ];
    
    for (const pattern of octalPatterns) {
      const match = line.match(pattern.regex);
      if (match) {
        const varName = match[1];
        const octalStr = match[2];
        const value = parseInt(octalStr, 8);
        
        if (value < pattern.min || value > pattern.max) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Range overflow',
            message: `${pattern.type}类型八进制数值溢出：0${octalStr} (${value}) 超出范围(${pattern.min}到${pattern.max})`,
            codeLine: line
          });
        }
      }
    }
    
    // 检查十六进制数值 (0x开头)
    const hexPatterns = [
      {
        regex: /^[^=]*\bchar\s+(\w+)\s*=\s*0x([0-9a-fA-F]+)\s*;?\s*$/,
        type: 'char',
        min: -128,
        max: 127,
        isUnsigned: false
      },
      {
        regex: /^[^=]*\bunsigned\s+char\s+(\w+)\s*=\s*0x([0-9a-fA-F]+)\s*;?\s*$/,
        type: 'unsigned char',
        min: 0,
        max: 255,
        isUnsigned: true
      }
    ];
    
    for (const pattern of hexPatterns) {
      const match = line.match(pattern.regex);
      if (match) {
        const varName = match[1];
        const hexStr = match[2];
        const value = parseInt(hexStr, 16);
        
        if (value < pattern.min || value > pattern.max) {
          issues.push({
            file: context.filePath,
            line: lineIndex + 1,
            category: 'Range overflow',
            message: `${pattern.type}类型十六进制数值溢出：0x${hexStr} (${value}) 超出范围(${pattern.min}到${pattern.max})`,
            codeLine: line
          });
        }
      }
    }
  }
  
  private stripLineComments(s: string): string {
    const idx = s.indexOf('//');
    return idx >= 0 ? s.slice(0, idx) : s;
  }
}
