import {
  createScanner,
  findNodeAtLocation,
  getNodeValue,
  parse,
  parseTree,
  printParseErrorCode,
  type Node,
  type ParseError,
  type ParseOptions,
} from 'jsonc-parser'

const parseOptions: ParseOptions = { allowTrailingComma: true, disallowComments: false }
const commaToken = createScanner(',').scan()
const endOfFileToken = createScanner('').scan()

export function setJsoncProperty(source: string, key: string, value: unknown): string {
  const root = parseRootObject(source)
  const current = findNodeAtLocation(root, [key])
  if (current && equal(getNodeValue(current), value)) return source
  return current
    ? replaceNodeValue(source, current, value)
    : insertObjectProperty(source, root, key, value)
}

export function setJsoncObjectProperty(
  source: string,
  objectKey: string,
  key: string,
  value: unknown,
): string {
  const root = parseRootObject(source)
  const object = findNodeAtLocation(root, [objectKey])
  if (object && object.type !== 'object') {
    throw new Error(`JSONC property ${objectKey} is not an object.`)
  }
  if (!object) return insertObjectProperty(source, root, objectKey, { [key]: value })

  const current = findNodeAtLocation(root, [objectKey, key])
  if (current && equal(getNodeValue(current), value)) return source
  return current
    ? replaceNodeValue(source, current, value)
    : insertObjectProperty(source, object, key, value)
}

export function reconcileJsoncObjectArray(
  source: string,
  objectKey: string,
  key: string,
  removeValues: unknown[],
  appendValues: unknown[],
  forceAppendValues: unknown[] = [],
): string {
  const root = parseRootObject(source)
  const object = findNodeAtLocation(root, [objectKey])
  if (object && object.type !== 'object') {
    throw new Error(`JSONC property ${objectKey} is not an object.`)
  }
  const array = object && findNodeAtLocation(root, [objectKey, key])
  if (array && array.type !== 'array') {
    throw new Error(`JSONC property ${objectKey}.${key} is not an array.`)
  }

  const append = uniqueValues(appendValues)
  if (!array) {
    return setJsoncObjectProperty(source, objectKey, key, [...append, ...forceAppendValues])
  }

  let content = source
  const removals = valueCounts(removeValues)
  for (let index = (array.children?.length ?? 0) - 1; index >= 0; index -= 1) {
    const child = array.children![index]!
    const valueKey = keyForValue(getNodeValue(child))
    const count = removals.get(valueKey) ?? 0
    if (count > 0) {
      content = removeArrayIndex(content, [objectKey, key], index)
      removals.set(valueKey, count - 1)
    }
  }

  const current = getArrayNode(content, [objectKey, key])
  const retained = new Set(
    (current.children ?? []).map((child) => keyForValue(getNodeValue(child))),
  )
  const missing = append.filter((value) => !retained.has(keyForValue(value)))
  return appendArrayValues(content, current, [...missing, ...forceAppendValues])
}

export function appendJsoncArrayValue(source: string, key: string, value: unknown): string {
  const root = parseRootObject(source)
  const node = findNodeAtLocation(root, [key])
  if (!node) return setJsoncProperty(source, key, [value])
  if (node.type !== 'array') throw new Error(`JSONC property ${key} is not an array.`)
  if ((node.children ?? []).some((child) => equal(getNodeValue(child), value))) return source
  return appendArrayValues(source, node, [value])
}

export function removeJsoncArrayValue(source: string, key: string, value: unknown): string {
  const root = parseRootObject(source)
  const node = findNodeAtLocation(root, [key])
  if (!node) return source
  if (node.type !== 'array') throw new Error(`JSONC property ${key} is not an array.`)

  let content = source
  for (let index = (node.children?.length ?? 0) - 1; index >= 0; index -= 1) {
    if (equal(getNodeValue(node.children![index]!), value)) {
      content = removeArrayIndex(content, [key], index)
    }
  }
  return content
}

export function removeJsoncProperty(source: string, key: string): string {
  const root = parseRootObject(source)
  const property = findProperty(root, key)
  if (!property) return source

  const children = root.children ?? []
  const index = children.indexOf(property)
  const next = children[index + 1]
  const value = property.children?.[1] ?? property
  const commaAfter = findToken(
    source,
    value.offset + value.length,
    next?.offset ?? root.offset + root.length - 1,
    commaToken,
  )
  if (commaAfter !== undefined) {
    return splice(source, property.offset, commaAfter + 1 - property.offset, '')
  }
  if (index > 0) {
    const previous = children[index - 1]!
    const comma = findToken(source, previous.offset + previous.length, property.offset, commaToken)
    if (comma !== undefined)
      return splice(source, comma, property.offset + property.length - comma, '')
  }
  return splice(source, property.offset, property.length, '')
}

export function removeJsoncObjectProperty(source: string, objectKey: string, key: string): string {
  const root = parseRootObject(source)
  const object = findNodeAtLocation(root, [objectKey])
  if (!object) return source
  if (object.type !== 'object') throw new Error(`JSONC property ${objectKey} is not an object.`)
  const property = findProperty(object, key)
  if (!property) return source
  const children = object.children ?? []
  const index = children.indexOf(property)
  const next = children[index + 1]
  const value = property.children?.[1] ?? property
  const close = object.offset + object.length - 1
  const commaAfter = findToken(
    source,
    value.offset + value.length,
    next?.offset ?? close,
    commaToken,
  )
  if (commaAfter !== undefined)
    return splice(source, property.offset, commaAfter + 1 - property.offset, '')
  if (index > 0) {
    const previous = children[index - 1]!
    const comma = findToken(source, previous.offset + previous.length, property.offset, commaToken)
    if (comma !== undefined)
      return splice(source, comma, property.offset + property.length - comma, '')
  }
  return splice(source, property.offset, property.length, '')
}

export function parseJsonc(source: string): unknown {
  const errors: ParseError[] = []
  const value = parse(source, errors, parseOptions)
  assertNoParseErrors(errors)
  return value
}

function parseRootObject(source: string): Node {
  const errors: ParseError[] = []
  const root = parseTree(source, errors, parseOptions)
  assertNoParseErrors(errors)
  if (!root || root.type !== 'object') {
    throw new Error('JSONC document must contain a root object.')
  }
  return root
}

function getArrayNode(source: string, path: Array<string | number>): Node {
  const node = findNodeAtLocation(parseRootObject(source), path)
  if (!node || node.type !== 'array')
    throw new Error(`JSONC property ${path.join('.')} is not an array.`)
  return node
}

function replaceNodeValue(source: string, node: Node, value: unknown): string {
  const indentation = lineIndent(source, node.parent?.offset ?? node.offset)
  return splice(source, node.offset, node.length, serialize(value, indentation, eol(source)))
}

function insertObjectProperty(source: string, object: Node, key: string, value: unknown): string {
  const close = object.offset + object.length - 1
  const closingIndentation = lineIndent(source, close)
  const childIndentation = closingIndentation + indentationUnit(source)
  const lineEnding = eol(source)
  const entry = `${JSON.stringify(key)}: ${serialize(value, childIndentation, lineEnding)}`
  const children = object.children ?? []
  let content = source
  let adjustedClose = close

  if (children.length > 0) {
    const last = children.at(-1)!
    const valueNode = last.children?.[1] ?? last
    if (!hasCommaAfter(content, valueNode, adjustedClose)) {
      const offset = valueNode.offset + valueNode.length
      content = splice(content, offset, 0, ',')
      adjustedClose += 1
    }
  }

  const insertion = closingOnOwnLine(content, adjustedClose)
    ? `${childIndentation}${entry}${lineEnding}`
    : `${children.length > 0 ? ' ' : ''}${entry}`
  const offset = closingOnOwnLine(content, adjustedClose)
    ? lineStart(content, adjustedClose)
    : adjustedClose
  return splice(content, offset, 0, insertion)
}

function appendArrayValues(source: string, array: Node, values: unknown[]): string {
  if (values.length === 0) return source

  const close = array.offset + array.length - 1
  const closingIndentation = lineIndent(source, close)
  const childIndentation = closingIndentation + indentationUnit(source)
  const lineEnding = eol(source)
  const children = array.children ?? []
  const hadTrailingComma = children.length > 0 && hasCommaAfter(source, children.at(-1)!, close)
  let content = source
  let adjustedClose = close

  if (children.length > 0 && !hadTrailingComma) {
    const last = children.at(-1)!
    content = splice(content, last.offset + last.length, 0, ',')
    adjustedClose += 1
  }

  const serialized = values.map((value) => serialize(value, childIndentation, lineEnding))
  if (!closingOnOwnLine(content, adjustedClose)) {
    return splice(
      content,
      adjustedClose,
      0,
      `${children.length > 0 ? ' ' : ''}${serialized.join(', ')}`,
    )
  }

  const suffix = hadTrailingComma ? ',' : ''
  const insertion = serialized
    .map(
      (value, index) =>
        `${childIndentation}${value}${index < serialized.length - 1 ? ',' : suffix}`,
    )
    .join(lineEnding)
  return splice(content, lineStart(content, adjustedClose), 0, `${insertion}${lineEnding}`)
}

function removeArrayIndex(source: string, path: Array<string | number>, index: number): string {
  const array = getArrayNode(source, path)
  const children = array.children ?? []
  const node = children[index]
  if (!node) return source
  const next = children[index + 1]
  const close = array.offset + array.length - 1
  const commaAfter = findToken(source, node.offset + node.length, next?.offset ?? close, commaToken)
  if (commaAfter !== undefined) {
    return splice(source, node.offset, commaAfter + 1 - node.offset, '')
  }
  const previous = children[index - 1]
  if (previous) {
    const commaBefore = findToken(
      source,
      previous.offset + previous.length,
      node.offset,
      commaToken,
    )
    if (commaBefore !== undefined) {
      return splice(source, commaBefore, node.offset + node.length - commaBefore, '')
    }
  }
  return splice(source, node.offset, node.length, '')
}

function findProperty(object: Node, key: string): Node | undefined {
  return object.children?.find((property) => getNodeValue(property.children![0]!) === key)
}

function hasCommaAfter(source: string, node: Node, end: number): boolean {
  return findToken(source, node.offset + node.length, end, commaToken) !== undefined
}

function findToken(source: string, start: number, end: number, token: number): number | undefined {
  const scanner = createScanner(source, true)
  scanner.setPosition(start)
  while (scanner.scan() !== endOfFileToken && scanner.getTokenOffset() < end) {
    if (scanner.getToken() === token) return scanner.getTokenOffset()
  }
  return undefined
}

function serialize(value: unknown, indentation: string, lineEnding: string): string {
  return JSON.stringify(value, null, 2).replaceAll('\n', `${lineEnding}${indentation}`)
}

function lineStart(source: string, offset: number): number {
  return source.lastIndexOf('\n', offset - 1) + 1
}

function lineIndent(source: string, offset: number): string {
  const indentation = source.slice(lineStart(source, offset), offset)
  return /^[ \t]*$/.test(indentation) ? indentation : ''
}

function indentationUnit(source: string): string {
  return /\n([ \t]+)"/.exec(source)?.[1] ?? '  '
}

function eol(source: string): string {
  return source.includes('\r\n') ? '\r\n' : '\n'
}

function closingOnOwnLine(source: string, offset: number): boolean {
  return /^[ \t]*$/.test(source.slice(lineStart(source, offset), offset))
}

function splice(source: string, offset: number, length: number, replacement: string): string {
  return source.slice(0, offset) + replacement + source.slice(offset + length)
}

function assertNoParseErrors(errors: ParseError[]): void {
  const error = errors[0]
  if (error) {
    throw new Error(`Invalid JSONC at offset ${error.offset}: ${printParseErrorCode(error.error)}.`)
  }
}

function uniqueValues(values: unknown[]): unknown[] {
  const keys = new Set<string>()
  return values.filter((value) => {
    const key = keyForValue(value)
    if (keys.has(key)) return false
    keys.add(key)
    return true
  })
}

function valueCounts(values: unknown[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) {
    const key = keyForValue(value)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function keyForValue(value: unknown): string {
  return JSON.stringify(value)
}

function equal(left: unknown, right: unknown): boolean {
  return keyForValue(left) === keyForValue(right)
}
