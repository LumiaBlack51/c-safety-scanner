/**
 * 检测器基类
 * 定义所有检测器的通用接口和功能
 */

import { Issue } from '../interfaces/types';

export interface DetectionContext {
  filePath: string;
  content: string;
  lines: string[];
  ast?: any;
  config: any;
}

export abstract class BaseDetector {
  protected config: any;
  protected enabled: boolean;
  
  constructor(config: any, enabled: boolean = true) {
    this.config = config;
    this.enabled = enabled;
  }
  
  /**
   * 检测器名称
   */
  abstract getName(): string;
  
  /**
   * 检测器描述
   */
  abstract getDescription(): string;
  
  /**
   * 执行检测
   */
  abstract detect(context: DetectionContext): Promise<Issue[]>;
  
  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * 启用/禁用检测器
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * 获取检测器配置
   */
  getConfig(): any {
    return this.config;
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: any): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * 验证检测器是否可用
   */
  async validate(): Promise<boolean> {
    return this.enabled;
  }
  
  /**
   * 获取检测器统计信息
   */
  getStats(): { name: string; enabled: boolean; config: any } {
    return {
      name: this.getName(),
      enabled: this.enabled,
      config: this.config
    };
  }
}
