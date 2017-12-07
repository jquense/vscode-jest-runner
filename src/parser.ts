import * as t from 'babel-types';
import * as babylon from 'babylon';
import * as walk from 'babylon-walk';
import { TextDocument } from 'vscode';

const groupNames = ['describe', 'suite']
const testNames = ['test', 'it'];

const modifiers = ['only']

const allNames = [...groupNames, ...testNames]

const babylonOptions = {
  plugins: ['*'],
  sourceType: 'module',
};

const cache = new Map<string, {
  entities: ParserEntity[];
  version: number;
}>();

function getName(node) {
  return node.callee.name || node.callee.object.name
}

function isExpression(node, names = allNames) {
  return (
    (t.isIdentifier(node.callee) || t.isMemberExpression(node.callee)) &&
    node.arguments.length >= 2 &&
    t.isStringLiteral(node.arguments[0]) &&
    names.includes(getName(node))
  )
}


function sortResults(state: { [title: string]: ParserEntity }) {
  const keys = Object.keys(state);

  keys.sort((a, b) => {
    const x = state[a];
    const y = state[b];
    if (x.line > y.line) return 1;
    if (x.line < y.line) return -1;
    if (x.column > y.column) return 1;
    if (x.column < y.column) return -1;
    return 0;
  });

  return keys.map(key => state[key]);
}

export default function parse(
  document: TextDocument
): ParserEntity[]
{
  const cached = cache.get(document.fileName);
  if (cached && cached.version === document.version) {
    return cached.entities
  }


  const node = babylon.parse(document.getText(), babylonOptions);
  const state: { [title: string]: ParserEntity } = {};

  walk.ancestor(node, {
    CallExpression(
      node: walk.NodeTypes,
      state: any,
      ancestors: t.Node[],
    ) {
      if (!isExpression(node)) return

      // if function name matches any of given name create basic info
      let info = new ParserEntity(
        getName(node),
        node.loc.start.line - 1,
        node.loc.start.column,
        node.arguments[0].value,
      );

      // add full path to info object
      const path = [];
      for (let i = ancestors.length - 2; i >= 0; --i) {
        const ancestor = ancestors[i];
        if (!isExpression(ancestor, groupNames))
          continue;

        path.unshift(ancestor.arguments[0].value);
      }

      if (path.length > 0) info.path = path;

      state[info.identifier] = info;
    },
  }, state);

  let entities = sortResults(state)
  cache.set(document.fileName, {
    entities,
    version: document.version,
  })

  return entities
}

export class ParserEntity {
  column: number;
  title: string;
  line: number;
  type: string;

  private _path?: string[];
  private _identifier: string | undefined;

  constructor(type: string, line: number, column: number, title: string) {
    this.type = type;
    this.line = line;
    this.column = column;
    this.title = title;
  }

  get isTest() {
    return testNames.includes(this.type)
  }

  get path() {
    return this._path;
  }

  set path(value: string[] | undefined) {
    this._path = value;
    this._identifier = undefined;
  }

  get identifier() {
    if (!this._identifier) {
      const parts = [];
      if (this._path) {
        parts.push(...this._path);
      }

      parts.push(this.title);
      this._identifier = parts.join(' ');
    }

    return this._identifier;
  }
}

