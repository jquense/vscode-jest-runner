import * as path from 'path';
import * as vscode from 'vscode';

function getConfig(fileName?:string, testNamePattern?: string) {
  const args = ['--runInBand'];

  if (fileName) {
    args.push(path.basename(fileName));
  }

  if (testNamePattern) {
    args.push('--testNamePattern', testNamePattern);
  }

  return {
    name: 'TestRunner',
    type: 'node',
    request: 'launch',
    program: `${vscode.workspace.rootPath}/node_modules/.bin/jest`,
    args,
    console: 'integratedTerminal',
  };
}

export function startTest(
  channel: vscode.OutputChannel,
  fileName?: string,
  testNamePattern?: string,
) {
  let baseConfig = getConfig(fileName, testNamePattern);

  return new Promise<void>(resolve => {
    const handle = vscode.debug.onDidTerminateDebugSession(e => {
      handle.dispose();
      resolve();
    });

    vscode.debug.startDebugging(
      vscode.workspace.workspaceFolders[0],
      baseConfig,
    );
  });
}


export function startDebug(
  channel: vscode.OutputChannel,
  fileName?: string,
  testNamePattern?: string,
) {
  let baseConfig = getConfig(fileName, testNamePattern);

  const configuration = Object.assign({}, baseConfig, {
    runtimeArgs: ['--inspect-brk'],
    protocol: 'inspector',
    console: 'integratedTerminal',
    smartStep: true,
    sourceMaps: true,
  });

  return new Promise<void>(resolve => {
    const handle = vscode.debug.onDidTerminateDebugSession(e => {
      handle.dispose();
      resolve();
    });

    vscode.debug.startDebugging(
      vscode.workspace.workspaceFolders[0],
      configuration,
    );
  });
}
