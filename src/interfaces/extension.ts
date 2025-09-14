import * as vscode from 'vscode';
import { analyzeWorkspaceCFiles } from '../core/scanner';

let diagnostics: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  diagnostics = vscode.languages.createDiagnosticCollection('c-safety');
  context.subscriptions.push(diagnostics);

  const cmd = vscode.commands.registerCommand('cscan.scanHomeC', async () => {
    try {
      const homeUri = vscode.Uri.file(require('os').homedir());
      const progressTitle = 'C Safety Scanner: 扫描中…';
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: progressTitle }, async () => {
        const results = await analyzeWorkspaceCFiles(homeUri);
        diagnostics.clear();
        for (const [file, diags] of results) {
          diagnostics.set(file, diags);
        }
        vscode.window.showInformationMessage(`扫描完成：${results.size} 个文件`);
      });
    } catch (err: any) {
      vscode.window.showErrorMessage(`扫描失败: ${err?.message ?? String(err)}`);
    }
  });

  context.subscriptions.push(cmd);

  // 新增：扫描当前工作区的 C 文件
  const cmdWorkspace = vscode.commands.registerCommand('cscan.scanWorkspaceC', async () => {
    try {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        vscode.window.showWarningMessage('未找到工作区，请先打开一个文件夹。');
        return;
      }
      const root = folders[0].uri;
      const progressTitle = 'C Safety Scanner: 扫描工作区…';
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: progressTitle }, async () => {
        const results = await analyzeWorkspaceCFiles(root);
        diagnostics.clear();
        for (const [file, diags] of results) {
          diagnostics.set(file, diags);
        }
        vscode.window.showInformationMessage(`扫描完成：${results.size} 个文件`);
      });
    } catch (err: any) {
      vscode.window.showErrorMessage(`扫描失败: ${err?.message ?? String(err)}`);
    }
  });
  context.subscriptions.push(cmdWorkspace);

  // 状态栏按钮：一键扫描
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  item.text = '$(search) C Scan';
  item.tooltip = 'C Safety Scanner: 扫描当前工作区 C 文件';
  item.command = 'cscan.scanWorkspaceC';
  item.show();
  context.subscriptions.push(item);
}

export function deactivate() {
  diagnostics?.dispose();
}


