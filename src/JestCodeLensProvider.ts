import * as path from 'path';

import micromatch = require('micromatch');
import { readConfig } from 'jest-config';
import {
  CancellationToken,
  CodeLens,
  CodeLensProvider,
  Command,
  SymbolInformation,
  SymbolKind,
  TextDocument,
  Range,
  Uri,
  Location,
  commands,
  workspace,
} from 'vscode';

import { flatMap } from 'lodash'
import parse, { ParserEntity } from './parser';
import { TestCodeLens, Run, Debug } from './CodeLens';

export default class JestCodeLensProvider implements CodeLensProvider {
  private lastLenses: { [fileName: string]: CodeLens[] } = {};
  private config: any;

  static runTestCommand = 'jest-runner.run-test';

  constructor() {
    this.config = readConfig({}, workspace.rootPath, true).projectConfig
  }

  isTestFile(document: TextDocument) {
    const { roots, testMatch, testPathIgnorePatterns, testRegex } = this.config
    let file = document.uri.path;
    let match = p => file.match(new RegExp(p))

    if (!roots.some(r => !path.relative(r, file).startsWith('.')))
      return false

    if (testRegex && !match(testRegex)) return false
    if (testPathIgnorePatterns.some(match)) return false
    if (!micromatch.any(file, testMatch)) return false
    return true;
  }

  provideCodeLenses(document: TextDocument, token: CancellationToken) {
    try {
        if (!this.isTestFile(document)) return;

        const entities = parse(document);

        // Ensure, that all tests have at least 'Inconclusive' state (otherwise

        const result = flatMap(
          entities,
          entity => this.createCodeLens(document, entity)
        ).filter(Boolean);

        this.lastLenses[document.fileName] = result;

        return result;
      } catch (error) {
        return this.lastLenses[document.fileName];
    }
  }

  resolveCodeLens(codeLens: CodeLens, _: CancellationToken) {
    if (codeLens instanceof TestCodeLens) {
      codeLens.command = {
        arguments: [codeLens],
        command: JestCodeLensProvider.runTestCommand,
        title: codeLens.title,
      };
    }

    return codeLens;
  }

  private createCodeLens(
    document: TextDocument,
    entity: ParserEntity,
  ) {

    // single test
    if (!entity.isTest)  return null;

    const fileName = path.relative(
      workspace.rootPath as string,
      document.fileName,
    );

    // Show 'Run' test lense with current state as title
    const itCodeLens = new Run(
      document,
      entity.identifier,
      entity.line,
      entity.column,
    );

    return [
      itCodeLens,
      new Debug(
        document,
        entity.identifier,
        entity.line,
        entity.column + itCodeLens.title.length + 1,
      ),
    ]
  }
}
