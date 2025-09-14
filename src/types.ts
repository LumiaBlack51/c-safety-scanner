// 类型定义文件

export type Issue = {
  file: string;
  line: number;
  category: string;
  message: string;
  codeLine: string;
};

export type VariableInfo = {
  name: string;
  typeName: string;
  isPointer: boolean;
  isInitialized: boolean;
  isArray?: boolean;
  pointerMaybeNull?: boolean;
};

export type SegmentedTable = Array<Map<string, VariableInfo>>;

export interface MemoryAllocation {
  line: number;
  variable: string;
  size: string;
  isFreed: boolean;
  reported: boolean;
}

export interface LoopInfo {
  type: 'for' | 'while';
  init?: string;
  condition: string;
  update?: string;
  line: number;
  hasBreak: boolean;
  hasReturn: boolean;
}

export interface TypeRange {
  min: number;
  max: number;
  isSigned: boolean;
}
