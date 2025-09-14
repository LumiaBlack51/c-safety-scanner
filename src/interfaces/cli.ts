import * as path from 'path';
import { analyzeDir } from '../core/scanner_cli';

function printIssues(issues: any[]) {
  for (const issue of issues) {
    console.log(`${issue.file}:${issue.line}: [${issue.category}] ${issue.message}`);
    console.log(`    ${issue.codeLine}`);
  }
}

function printTables() {
  console.log('\n=== Global Variables Table ===');
  console.log('Name               Type        Initialized');
}

async function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'samples');
  const issues = analyzeDir(dir);
  if (issues.length === 0) console.log('No issues found.');
  else printIssues(issues);
  printTables();
}

main().catch(err => { console.error(err); process.exit(1); });


