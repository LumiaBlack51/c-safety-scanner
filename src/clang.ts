import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Issue } from './scanner_cli';

function which(cmd: string): string | null {
  try {
    const found = child_process.execSync(process.platform === 'win32' ? `cmd /c where ${cmd}` : `which ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split(/\r?\n/)[0]?.trim();
    return found && fs.existsSync(found) ? found : null;
  } catch {
    return null;
  }
}

export function runClangTidy(targetDir: string): Issue[] {
  const exe = which('clang-tidy.exe') || which('clang-tidy');
  if (!exe) return [];
  const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.c'));
  const issues: Issue[] = [];
  for (const f of files) {
    const full = path.join(targetDir, f);
    try {
      // -quiet to reduce noise; without compile_commands, clang-tidy still runs basic checks
      const out = child_process.execSync(`"${exe}" -quiet "${full}"`, { cwd: targetDir, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
      // Parse nothing (no warnings) → continue
      if (!out) continue;
      const lines = out.split(/\r?\n/);
      for (const line of lines) {
        // pattern: file:line:col: <warning|error>: message [check]
        const m = line.match(/^(.*?):(\d+):(\d+):\s*(warning|error):\s*(.*?)(\s*\[([\w\-\.]+)\])?$/);
        if (!m) continue;
        const file = path.resolve(m[1]);
        const lineNo = parseInt(m[2], 10);
        const msg = m[5].trim();
        const check = m[7] || 'clang-tidy';
        issues.push({ file, line: lineNo, category: `Clang(${check})`, message: msg, codeLine: '' });
      }
    } catch (e: any) {
      const out = (e.stdout ? e.stdout.toString() : '') + '\n' + (e.stderr ? e.stderr.toString() : '');
      const lines = out.split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^(.*?):(\d+):(\d+):\s*(warning|error):\s*(.*?)(\s*\[([\w\-\.]+)\])?$/);
        if (!m) continue;
        const file = path.resolve(m[1]);
        const lineNo = parseInt(m[2], 10);
        const msg = m[5].trim();
        const check = m[7] || 'clang-tidy';
        issues.push({ file, line: lineNo, category: `Clang(${check})`, message: msg, codeLine: '' });
      }
    }
  }
  return issues;
}


