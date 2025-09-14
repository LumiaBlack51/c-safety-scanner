import * as path from 'path';
import * as vscode from 'vscode';
import { analyzeWorkspaceCFiles } from '../core/scanner';

async function main() {
  const fake = {
    fsPath: path.resolve(process.cwd(), 'samples'),
  } as unknown as vscode.Uri;
  const res = await analyzeWorkspaceCFiles(fake);
  for (const [file, diags] of res) {
    console.log(`File: ${file.fsPath}`);
    for (const d of diags) {
      console.log(`  [${vscode.DiagnosticSeverity[d.severity]}] ${d.message} @ ${d.range.start.line+1}:${d.range.start.character+1}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });


