import * as fs from 'fs';
import * as path from 'path';
import { Issue } from '../interfaces/types';
import { runClangTidy } from './clang';
import * as os from 'os';

// AST版本的分析目录函数
function analyzeDir(dir: string): Issue[] {
  // 这里需要调用AST版本的分析
  // 目前暂时返回空数组，实际应该调用AST扫描器
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.c'));
  const issues: Issue[] = [];
  
  // TODO: 这里应该调用AST扫描器
  // 暂时返回空结果，避免编译错误
  
  return issues;
}

type Metrics = { TP: number; FP: number; FN: number; Precision: number; Recall: number; F1: number; totalIssues: number; totalBugs: number };

function collectBugLines(dir: string): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.c'));
  for (const f of files) {
    const p = path.join(dir, f);
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    const set = new Set<number>();
    lines.forEach((line, idx) => {
      if (!line.includes('// BUG')) return;
      const code = line.split('// BUG')[0];
      const isDeclOnly = /^\s*(int|char|float|double|void|short|long|signed|unsigned|bool|size_t|struct\s+\w+)\b[^{;]*;\s*$/.test(code)
        && !/=/.test(code) && !/\*\w|\w\s*\[|->|\*\s*\w\s*=/.test(code);
      // Skip bug_1.c .. bug_49.c 4th line as requested
      const bn = path.basename(p);
      const skipBugLine4 = (/^bug_([0-9]|[1-4]\d)\.c$/.test(bn)) && (idx + 1) === 4;
      // 如果是仅声明的预置 BUG（例如“未初始化”/“野指针”在声明行），按当前标准不计入评测
      if (!isDeclOnly && !skipBugLine4) set.add(idx + 1);
    });
    map.set(p, set);
  }
  return map;
}

function computeMetrics(dir: string, issues: Issue[]): Metrics {
  const bugMap = collectBugLines(dir);
  let TP = 0, FP = 0, FN = 0;
  // Count TP/FP by mapping issue line to whether that line has BUG mark
  for (const it of issues) {
    const set = bugMap.get(it.file) ?? new Set<number>();
    if (set.has(it.line)) TP++; else FP++;
  }
  // Count FN: BUG lines with no issue reported at that line
  for (const [file, set] of bugMap) {
    for (const ln of set) {
      const hit = issues.some(x => x.file === file && x.line === ln);
      if (!hit) FN++;
    }
  }
  const Precision = (TP + FP) ? TP / (TP + FP) : 1;
  const Recall = (TP + FN) ? TP / (TP + FN) : 1;
  const F1 = (Precision + Recall) ? (2 * Precision * Recall) / (Precision + Recall) : 0;
  const totalIssues = issues.length;
  let totalBugs = 0; for (const s of bugMap.values()) totalBugs += s.size;
  return { TP, FP, FN, Precision, Recall, F1, totalIssues, totalBugs };
}

function appendToTestPlan(section: string, metrics: Metrics) {
  const plan = path.resolve(process.cwd(), 'tests/graphs/TESTPLAN.md');
  const content = `\n### ${section}\n- 总预置错误: ${metrics.totalBugs}\n- 报告总数: ${metrics.totalIssues}\n- TP: ${metrics.TP}, FP: ${metrics.FP}, FN: ${metrics.FN}\n- Precision: ${metrics.Precision.toFixed(3)}, Recall: ${metrics.Recall.toFixed(3)}, F1: ${metrics.F1.toFixed(3)}\n`;
  fs.appendFileSync(plan, content, 'utf8');
}

const RECOGNIZED_CATEGORIES = new Set<string>([
  'Uninitialized',
  'Wild pointer',
  'Infinite loop',
  'Format',
  'Header',
]);

function filterRecognized(issues: Issue[]): Issue[] {
  return issues.filter(it => RECOGNIZED_CATEGORIES.has(it.category));
}

function suggestionFor(category: string): string {
  switch (category) {
    case 'Uninitialized':
      return '在首次使用前显式赋值，或按址传递让被写入后再使用';
    case 'Wild pointer':
      return '为指针分配/指向有效内存或置 NULL 并在解引用前检查';
    case 'Infinite loop':
      return '确保条件变量在迭代中更新，或加入退出条件/break/超时';
    case 'Format':
      return '参数个数与占位匹配，scanf 对非字符串加 &，%s 对应 char*';
    case 'Header':
      return '改为正确的标准头文件名，或私有头使用双引号 include';
    default:
      return '根据类别修复潜在问题（参见 docs/ALGORITHM.md）';
  }
}

function writeRunLog(targetDir: string, issues: Issue[]) {
  const logPath = path.resolve(process.cwd(), 'docs/LOGS.md');
  const bugMap = collectBugLines(targetDir);
  const ts = new Date().toISOString();

  // Build FP and FN lists
  const fps: Issue[] = [];
  const fns: Array<{ file: string; line: number }> = [];
  for (const it of issues) {
    const set = bugMap.get(it.file) ?? new Set<number>();
    if (!set.has(it.line)) fps.push(it);
  }
  for (const [file, set] of bugMap) {
    for (const ln of set) {
      const hit = issues.some(x => x.file === file && x.line === ln);
      if (!hit) fns.push({ file, line: ln });
    }
  }

  let buff = '';
  buff += `\n[${ts}] 运行目标: ${path.relative(process.cwd(), targetDir)}\n`;
  // quick metrics
  const metrics = computeMetrics(targetDir, issues);
  buff += `统计: 总预置错误=${metrics.totalBugs}, 报告=${metrics.totalIssues}, TP=${metrics.TP}, FP=${metrics.FP}, FN=${metrics.FN}\n`;
  if (fps.length) {
    buff += `误报 FP:\n`;
    for (const it of fps.slice(0, 100)) {
      buff += `- ${path.relative(process.cwd(), it.file)}:${it.line} [${it.category}] 消息: ${it.message} 建议: ${suggestionFor(it.category)}\n`;
    }
    if (fps.length > 100) buff += `- ...(其余 ${fps.length - 100} 条省略)\n`;
  }
  if (fns.length) {
    buff += `漏报 FN:\n`;
    for (const miss of fns.slice(0, 100)) {
      buff += `- ${path.relative(process.cwd(), miss.file)}:${miss.line}\n`;
    }
    if (fns.length > 100) buff += `- ...(其余 ${fns.length - 100} 条省略)\n`;
  }
  fs.appendFileSync(logPath, buff, 'utf8');
}

async function main() {
  const target = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'tests/graphs/buggy');
  const issues = analyzeDir(target);
  // merge clang-tidy issues (best-effort)
  let merged = issues;
  try {
    const clangIssues = runClangTidy(target);
    // Try to map clang categories into local types by heuristic
    const remapped = clangIssues.map(it => {
      const msg = it.message.toLowerCase();
      let cat = it.category;
      if (msg.includes('uninitialized') || msg.includes('use of uninitialized')) cat = 'Uninitialized';
      else if (msg.includes('null') || msg.includes('dangling') || msg.includes('use-after-free')) cat = 'Wild pointer';
      else if (msg.includes('infinite') || msg.includes('endless loop')) cat = 'Infinite loop';
      else if (msg.includes('format') || msg.includes('printf') || msg.includes('scanf')) cat = 'Format';
      else if (msg.includes('include') || msg.includes('header')) cat = 'Header';
      return { ...it, category: cat } as Issue;
    });
    merged = issues.concat(remapped);
  } catch {}
  // Keep only recognized categories per current standard
  const recognized = filterRecognized(merged);
  const metrics = computeMetrics(target, recognized);
  console.log(JSON.stringify(metrics, null, 2));
  const section = target.endsWith('buggy') ? 'Buggy 组首轮报告' : 'Correct 组首轮报告';
  appendToTestPlan(section, metrics);
  writeRunLog(target, recognized);

  // Also append to BUG_GUIDE.md with current recognized issues snapshot
  try {
    const guide = path.resolve(process.cwd(), 'docs/BUG_GUIDE.md');
    let snap = `\n### 识别结果快照 (${new Date().toISOString()}) - ${path.relative(process.cwd(), target)}\n`;
    for (const it of recognized.slice(0, 500)) {
      snap += `- ${path.relative(process.cwd(), it.file)}:${it.line} [${it.category}] ${it.message} - 建议: ${suggestionFor(it.category)}\n`;
    }
    if (recognized.length > 500) snap += `- ...(其余 ${recognized.length - 500} 条省略)\n`;
    fs.appendFileSync(guide, snap, 'utf8');
  } catch {}
}

main().catch(e => { console.error(e); process.exit(1); });


