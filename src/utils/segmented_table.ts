// 分段哈希表实现

import { VariableInfo, SegmentedTable } from '../interfaces/types';

// Segmented hash tables (a-f, g-m, n-s, t-z)
const SEGMENTS = 4;

function chooseSegment(name: string): number {
  if (!name || name.length === 0) return 0;
  const c = name[0].toLowerCase();
  if (c < 'g') return 0;      // a-f
  if (c < 'n') return 1;      // g-m
  if (c < 't') return 2;      // n-s
  return 3;                   // t-z
}

export function createSegmentedTable(): SegmentedTable {
  return new Array(SEGMENTS).fill(null).map(() => new Map<string, VariableInfo>());
}

export function segSet(table: SegmentedTable, vi: VariableInfo) {
  table[chooseSegment(vi.name)].set(vi.name, vi);
}

export function segGet(table: SegmentedTable, name: string): VariableInfo | undefined {
  return table[chooseSegment(name)].get(name);
}

export function segAllNames(table: SegmentedTable): string[] {
  const out: string[] = [];
  for (const seg of table) {
    if (seg) {
      out.push(...Array.from(seg.keys()));
    }
  }
  return out;
}
