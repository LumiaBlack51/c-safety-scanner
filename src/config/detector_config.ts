/**
 * 检测器配置模块
 * 支持动态启用/禁用各种检测功能
 */

export interface DetectorConfig {
  // 变量相关检测
  uninitializedVariables: boolean;
  wildPointers: boolean;
  nullPointers: boolean;
  
  // 控制流检测
  deadLoops: boolean;
  
  // 内存管理检测
  memoryLeaks: boolean;
  
  // 数值检测
  numericRange: boolean;
  
  // 格式字符串检测
  formatStrings: boolean;
  
  // 头文件检测
  libraryHeaders: boolean;
  
  // 引擎选择
  engine: 'auto' | 'ast' | 'heuristic';
  
  // 高级选项
  advanced: {
    enableASTCache: boolean;
    enableParallelDetection: boolean;
    maxFileSize: number; // MB
    timeout: number; // seconds
  };
}

export const DEFAULT_CONFIG: DetectorConfig = {
  uninitializedVariables: true,
  wildPointers: true,
  nullPointers: true,
  deadLoops: true,
  memoryLeaks: true,
  numericRange: true,
  formatStrings: true,
  libraryHeaders: true,
  engine: 'auto',
  advanced: {
    enableASTCache: true,
    enableParallelDetection: false,
    maxFileSize: 50,
    timeout: 30
  }
};

export class ConfigManager {
  private config: DetectorConfig;
  
  constructor(config?: Partial<DetectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  getConfig(): DetectorConfig {
    return { ...this.config };
  }
  
  updateConfig(updates: Partial<DetectorConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  isEnabled(detector: keyof Omit<DetectorConfig, 'engine' | 'advanced'>): boolean {
    return this.config[detector] as boolean;
  }
  
  getEngine(): 'auto' | 'ast' | 'heuristic' {
    return this.config.engine;
  }
  
  getAdvancedConfig() {
    return this.config.advanced;
  }
  
  // 预设配置
  static createMinimalConfig(): DetectorConfig {
    return {
      ...DEFAULT_CONFIG,
      uninitializedVariables: true,
      wildPointers: true,
      nullPointers: false,
      deadLoops: false,
      memoryLeaks: false,
      numericRange: false,
      formatStrings: false,
      libraryHeaders: false,
      engine: 'heuristic'
    };
  }
  
  static createComprehensiveConfig(): DetectorConfig {
    return {
      ...DEFAULT_CONFIG,
      engine: 'ast',
      advanced: {
        ...DEFAULT_CONFIG.advanced,
        enableASTCache: true,
        enableParallelDetection: true
      }
    };
  }
  
  static createPerformanceConfig(): DetectorConfig {
    return {
      ...DEFAULT_CONFIG,
      engine: 'heuristic',
      advanced: {
        ...DEFAULT_CONFIG.advanced,
        enableASTCache: false,
        enableParallelDetection: true,
        maxFileSize: 10,
        timeout: 10
      }
    };
  }
}
