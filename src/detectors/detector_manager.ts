/**
 * 检测器管理器
 * 协调所有检测器的执行和管理
 */

import { BaseDetector, DetectionContext } from './base_detector';
import { VariableDetector } from './variable_detector';
import { ControlFlowDetector } from './control_flow_detector';
import { MemoryDetector } from './memory_detector';
import { NumericDetector } from './numeric_detector';
import { FormatDetector } from './format_detector';
import { HeaderDetector } from './header_detector';
import { Issue } from '../interfaces/types';
import { DetectorConfig } from '../config/detector_config';

export class DetectorManager {
  private detectors: Map<string, BaseDetector>;
  private config: DetectorConfig;
  
  constructor(config: DetectorConfig) {
    this.config = config;
    this.detectors = new Map();
    this.initializeDetectors();
  }
  
  private initializeDetectors(): void {
    // 初始化所有检测器
    this.detectors.set('variable', new VariableDetector({
      uninitializedVariables: this.config.uninitializedVariables,
      wildPointers: this.config.wildPointers,
      nullPointers: this.config.nullPointers
    }, this.config.uninitializedVariables || this.config.wildPointers || this.config.nullPointers));
    
    this.detectors.set('controlFlow', new ControlFlowDetector({
      deadLoops: this.config.deadLoops
    }, this.config.deadLoops));
    
    this.detectors.set('memory', new MemoryDetector({
      memoryLeaks: this.config.memoryLeaks
    }, this.config.memoryLeaks));
    
    this.detectors.set('numeric', new NumericDetector({
      numericRange: this.config.numericRange
    }, this.config.numericRange));
    
    this.detectors.set('format', new FormatDetector({
      formatStrings: this.config.formatStrings
    }, this.config.formatStrings));
    
    this.detectors.set('header', new HeaderDetector({
      libraryHeaders: this.config.libraryHeaders
    }, this.config.libraryHeaders));
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: DetectorConfig): void {
    this.config = config;
    
    // 更新所有检测器的配置
    this.detectors.forEach((detector, name) => {
      const detectorConfig = this.getDetectorConfig(name);
      detector.updateConfig(detectorConfig);
      detector.setEnabled(this.isDetectorEnabled(name));
    });
  }
  
  /**
   * 获取检测器配置
   */
  private getDetectorConfig(name: string): any {
    switch (name) {
      case 'variable':
        return {
          uninitializedVariables: this.config.uninitializedVariables,
          wildPointers: this.config.wildPointers,
          nullPointers: this.config.nullPointers
        };
      case 'controlFlow':
        return { deadLoops: this.config.deadLoops };
      case 'memory':
        return { memoryLeaks: this.config.memoryLeaks };
      case 'numeric':
        return { numericRange: this.config.numericRange };
      case 'format':
        return { formatStrings: this.config.formatStrings };
      case 'header':
        return { libraryHeaders: this.config.libraryHeaders };
      default:
        return {};
    }
  }
  
  /**
   * 检查检测器是否启用
   */
  private isDetectorEnabled(name: string): boolean {
    switch (name) {
      case 'variable':
        return this.config.uninitializedVariables || this.config.wildPointers || this.config.nullPointers;
      case 'controlFlow':
        return this.config.deadLoops;
      case 'memory':
        return this.config.memoryLeaks;
      case 'numeric':
        return this.config.numericRange;
      case 'format':
        return this.config.formatStrings;
      case 'header':
        return this.config.libraryHeaders;
      default:
        return false;
    }
  }
  
  /**
   * 执行所有启用的检测器
   */
  async detect(context: DetectionContext): Promise<Issue[]> {
    const allIssues: Issue[] = [];
    
    // 并行执行所有启用的检测器
    const enabledDetectors = Array.from(this.detectors.values()).filter(d => d.isEnabled());
    console.log(`[DEBUG] 启用的检测器: ${enabledDetectors.map(d => d.getName()).join(', ')}`);
    
    if (this.config.advanced.enableParallelDetection) {
      // 并行执行
      const promises = enabledDetectors.map(detector => detector.detect(context));
      const results = await Promise.all(promises);
      results.forEach(issues => allIssues.push(...issues));
    } else {
      // 串行执行
      for (const detector of enabledDetectors) {
        try {
          const issues = await detector.detect(context);
          allIssues.push(...issues);
        } catch (error) {
          console.error(`检测器 ${detector.getName()} 执行失败:`, error);
        }
      }
    }
    
    return allIssues;
  }
  
  /**
   * 获取指定检测器
   */
  getDetector(name: string): BaseDetector | undefined {
    return this.detectors.get(name);
  }
  
  /**
   * 获取所有检测器
   */
  getAllDetectors(): Map<string, BaseDetector> {
    return new Map(this.detectors);
  }
  
  /**
   * 获取启用的检测器列表
   */
  getEnabledDetectors(): BaseDetector[] {
    return Array.from(this.detectors.values()).filter(d => d.isEnabled());
  }
  
  /**
   * 启用/禁用指定检测器
   */
  setDetectorEnabled(name: string, enabled: boolean): void {
    const detector = this.detectors.get(name);
    if (detector) {
      detector.setEnabled(enabled);
    }
  }
  
  /**
   * 获取检测器统计信息
   */
  getDetectorStats(): Array<{ name: string; enabled: boolean; config: any }> {
    return Array.from(this.detectors.values()).map(detector => detector.getStats());
  }
  
  /**
   * 验证所有检测器
   */
  async validateAll(): Promise<{ [name: string]: boolean }> {
    const results: { [name: string]: boolean } = {};
    
    for (const [name, detector] of this.detectors) {
      try {
        results[name] = await detector.validate();
      } catch (error) {
        console.error(`检测器 ${name} 验证失败:`, error);
        results[name] = false;
      }
    }
    
    return results;
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): DetectorConfig {
    return { ...this.config };
  }
}
