import { TextDocument, CodeLens, Range, Position } from 'vscode'

export abstract class TestCodeLens extends CodeLens {
  readonly document: TextDocument;
  readonly identifier: string;
  readonly title: string;

  constructor(
    document: TextDocument,
    identifier: string,
    line: number,
    column: number,
    title: string,
  ) {
    const range = new Range(
      new Position(line, column),
      new Position(line, column + title.length),
    );

    super(range);

    this.document = document;
    this.identifier = identifier;
    this.title = title;
  }
}



export class Run extends TestCodeLens {
  constructor(
    document: TextDocument,
    identifier: string,
    line: number,
    column: number,
  ) {
    super(document, identifier, line, column, 'Run test');
  }
}

export class Debug extends TestCodeLens {
  constructor(
    document: TextDocument,
    identifier: string,
    line: number,
    column: number,
  ) {
    super(document, identifier, line, column, 'Debug test');
  }
}
