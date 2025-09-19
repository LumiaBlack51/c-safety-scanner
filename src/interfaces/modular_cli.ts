/**
 * 模块化CLI接口
 * 支持配置化的检测功能
 */

import * as path from 'path';
import * as fs from 'fs';
import { Issue } from './types';
import { DetectorConfig, ConfigManager, DEFAULT_CONFIG } from '../config/detector_config';
import { DetectorManager } from '../detectors/detector_manager';
import { CASTParser } from '../core/ast_parser';

export class ModularCLI {
  private detectorManager: DetectorManager;
  private config: DetectorConfig;
  private astParser: CASTParser | null = null;
  
  constructor(config?: Partial<DetectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.detectorManager = new DetectorManager(this.config);
  }
  
  /**
   * 分析目录中的所有C文件
   */
  async analyzeDirectory(dir: string): Promise<Issue[]> {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.c'));
    const allIssues: Issue[] = [];
    
    console.log(`正在分析目录: ${dir}`);
    console.log(`引擎模式: ${this.config.engine}`);
    console.log(`启用的检测器: ${this.getEnabledDetectorNames().join(', ')}`);
    
    // 初始化AST解析器（如果需要）
    if (this.config.engine !== 'heuristic') {
      try {
        this.astParser = await CASTParser.create();
        console.log('AST解析器初始化成功');
      } catch (error) {
        console.log('AST解析器初始化失败，使用启发式模式');
        this.config.engine = 'heuristic';
      }
    }
    
    // 分析每个文件
    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      console.log(`正在分析文件: ${file}`);
      
      try {
        const issues = await this.analyzeFile(filePath, content, lines);
        allIssues.push(...issues);
        console.log(`  发现 ${issues.length} 个问题`);
      } catch (error) {
        console.error(`  分析文件 ${file} 时发生错误:`, error);
      }
    }
    
    return allIssues;
  }
  
  /**
   * 分析单个文件
   */
  private async analyzeFile(filePath: string, content: string, lines: string[]): Promise<Issue[]> {
    let ast: any = null;
    let astParseSuccess = false;
    
    // 尝试使用AST解析
    if (this.config.engine !== 'heuristic' && this.astParser) {
      try {
        ast = this.astParser.parse(content);
        astParseSuccess = true;
        console.log(`  AST解析成功`);
      } catch (error: any) {
        console.log(`  AST解析失败，使用启发式回退: ${error.message}`);
        astParseSuccess = false;
      }
    }
    
    // 创建检测上下文
    const context = {
      filePath,
      content,
      lines,
      ast: astParseSuccess ? ast : undefined,
      config: this.config
    };
    
    // 执行检测
    return await this.detectorManager.detect(context);
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<DetectorConfig>): void {
    this.config = { ...this.config, ...config };
    this.detectorManager.updateConfig(this.config);
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): DetectorConfig {
    return { ...this.config };
  }
  
  /**
   * 获取启用的检测器名称列表
   */
  getEnabledDetectorNames(): string[] {
    return this.detectorManager.getEnabledDetectors().map(d => d.getName());
  }
  
  /**
   * 获取检测器统计信息
   */
  getDetectorStats(): Array<{ name: string; enabled: boolean; config: any }> {
    return this.detectorManager.getDetectorStats();
  }
  
  /**
   * 验证所有检测器
   */
  async validateDetectors(): Promise<{ [name: string]: boolean }> {
    return await this.detectorManager.validateAll();
  }
  
  /**
   * 打印问题报告
   */
  printIssues(issues: Issue[]): void {
    if (issues.length === 0) {
      console.log('没有发现问题。');
      return;
    }
    
    console.log(`\n发现 ${issues.length} 个问题:`);
    console.log('='.repeat(50));
    
    for (const issue of issues) {
      const relativePath = path.relative(process.cwd(), issue.file);
      console.log(`${relativePath}:${issue.line}: [${issue.category}] ${issue.message}`);
      console.log(`    ${issue.codeLine}`);
    }
  }
  
  /**
   * 打印检测器信息
   */
  printDetectorInfo(): void {
    console.log('\n=== C语言安全扫描器 (模块化版本) ===');
    console.log('支持的检测功能:');
    
    const stats = this.getDetectorStats();
    for (const stat of stats) {
      const status = stat.enabled ? '✓' : '✗';
      console.log(`  ${status} ${stat.name}`);
    }
    
    console.log(`\n引擎模式: ${this.config.engine}`);
    console.log(`并行检测: ${this.config.advanced.enableParallelDetection ? '启用' : '禁用'}`);
    console.log(`AST缓存: ${this.config.advanced.enableASTCache ? '启用' : '禁用'}`);
  }
  
  /**
   * 运行评测模式
   */
  async runEvaluation(dir: string, issues: Issue[]): Promise<void> {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.c'));
    const expected: Array<{ line: number; category: string }> = [];
    const reported: Array<{ line: number; category: string }> = [];
    
    // 收集报告的问题
    for (const issue of issues) {
      reported.push({ line: issue.line, category: issue.category });
    }
    
    // 解析标准答案
    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/BUG\s*:\s*([A-Za-z\s]+)\b/i);
        if (match) {
          const label = match[1].trim();
          const category = this.normalizeCategoryLabel(label);
          if (category) {
            expected.push({ line: i + 1, category });
          }
        }
      }
    }
    
    // 计算统计信息
    const expectedCounts: Record<string, number> = {};
    const reportedCounts: Record<string, number> = {};
    
    for (const exp of expected) {
      expectedCounts[exp.category] = (expectedCounts[exp.category] || 0) + 1;
    }
    
    for (const rep of reported) {
      reportedCounts[rep.category] = (reportedCounts[rep.category] || 0) + 1;
    }
    
    // 计算差异
    const allCategories = new Set([...Object.keys(expectedCounts), ...Object.keys(reportedCounts)]);
    const missing: Record<string, number> = {};
    const extra: Record<string, number> = {};
    let totalMismatch = 0;
    
    for (const category of allCategories) {
      const exp = expectedCounts[category] || 0;
      const rep = reportedCounts[category] || 0;
      if (rep < exp) missing[category] = exp - rep;
      if (rep > exp) extra[category] = rep - exp;
      totalMismatch += Math.abs(rep - exp);
    }
    
    // 打印评测结果
    console.log('\n=== 评测结果 ===');
    console.log(`文件数: ${files.length}`);
    console.log(`总问题数: ${issues.length}`);
    console.log(`标准答案: ${JSON.stringify(expectedCounts, null, 2)}`);
    console.log(`检测报告: ${JSON.stringify(reportedCounts, null, 2)}`);
    console.log(`漏报: ${JSON.stringify(missing, null, 2)}`);
    console.log(`误报: ${JSON.stringify(extra, null, 2)}`);
    console.log(`分类计数差值总和: ${totalMismatch}`);
    
    // 计算准确率
    const totalExpected = Object.values(expectedCounts).reduce((sum, count) => sum + count, 0);
    const totalReported = Object.values(reportedCounts).reduce((sum, count) => sum + count, 0);
    const totalMissing = Object.values(missing).reduce((sum, count) => sum + count, 0);
    const totalExtra = Object.values(extra).reduce((sum, count) => sum + count, 0);
    
    const precision = totalReported > 0 ? (totalReported - totalExtra) / totalReported : 0;
    const recall = totalExpected > 0 ? (totalExpected - totalMissing) / totalExpected : 0;
    const f1Score = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    
    console.log(`\n=== 性能指标 ===`);
    console.log(`精确率 (Precision): ${(precision * 100).toFixed(2)}%`);
    console.log(`召回率 (Recall): ${(recall * 100).toFixed(2)}%`);
    console.log(`F1分数: ${(f1Score * 100).toFixed(2)}%`);
  }
  
  private normalizeCategoryLabel(label: string): string | null {
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
}

// CLI主函数
async function main() {
  const args = process.argv.slice(2);
  const dir = args[0] ? path.resolve(args[0]) : path.resolve(process.cwd(), 'tests/graphs/buggy');
  const isEval = args.includes('--eval');
  const engineArg = args.find(a => a.startsWith('--engine=')) || '--engine=auto';
  const engine = engineArg.split('=')[1] as 'auto' | 'ast' | 'heuristic';
  
  // 创建CLI实例
  const cli = new ModularCLI({ engine });
  
  try {
    // 分析文件
    const issues = await cli.analyzeDirectory(dir);
    
    if (!isEval) {
      cli.printIssues(issues);
      cli.printDetectorInfo();
    } else {
      await cli.runEvaluation(dir, issues);
    }
  } catch (error) {
    console.error('扫描过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(err => {
    console.error('程序执行失败:', err);
    process.exit(1);
  });
}
