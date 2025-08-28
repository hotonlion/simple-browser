/**
 * html parser state
 * visit https://html.spec.whatwg.org/multipage/parsing.html#tokenization
*/

interface Attribute {
  name: string
  value: string
}

interface Token {
  type: string,
  children?: Array<Element | TextToken>
  content?: string
}

interface TagToken extends Token {
  tagName?: string
  name?: string
  selfClosingFlag?: boolean
  attributes?: Array<Attribute>
}

interface TextToken extends Token {
}

type EmitToken = TagToken & TextToken

interface Element extends Token {
  tagName: string
  selfClosingFlag?: boolean
  attributes: Array<Attribute>
}

const EOF = Symbol('EOF') // end of file
let DOC_TYPE = ''
let currentTagToken: TagToken = {
  type: ''
}

const currentAttribute: Attribute = {
  name: '',
  value: ''
}

let currentTextNode: TextToken | undefined

const stack: Array<EmitToken> = []


export const htmlParser = function (string: string) {
  let state = dataState
  for (const c of string) {
    state = state(c)
  }
  state(EOF)
  return stack[stack.length - 1]
}

const emit = (token: EmitToken) => {
  if (token.type === 'document') {
    stack.push(token)
  }
  const top = stack[stack.length - 1]
  // If it's a start tag, 
  // the element is created and pushed into a child nodes of the stack top.
  if (token.type === 'startTag') {
    const element: Element = {
      type: 'element',
      tagName: token.tagName as string,
      attributes: token.attributes as Array<Attribute>,
      children: []
    }
    top.children?.push(element)
    // If the self-closing flag for tag name is false,
    // pushed element into the stack.
    if (!token.selfClosingFlag) {
      stack.push(element)
    }
    currentTextNode = void 0
  } else if (token.type === 'endTag') {
    if (token.tagName !== top.tagName) {
      throw new Error('The tag of start and end doesn\'t match.')
    } else {
      // If matcheed, poped from the stack.
      // self-closing flagof element is true,
      // immediately poped from the stack.
      stack.pop()
    }
    currentTextNode = void 0
  } else if (token.type === 'text') {
    // If the current text node is undefined,
    // the text node is created and pushed it into a child nodes of the stack top.
    if (currentTextNode === void 0) {
      currentTextNode = {
        type: 'text',
        content: ''
      }
      top.children?.push(currentTextNode)
    }
    // If it's text type, append it to current text node.
    currentTextNode.content += token.content as string
  }
}

const dataState = (c: string | symbol) => {
  if (c === '<') {
    return tagOpenState
  } else if (c === EOF) {
    emit({
      type: 'EOF'
    })
    return dataState
  } else {
    emit({
      type: 'text',
      content: c as string
    })
    return dataState
  }
}

const tagOpenState = (c: string | symbol) => {
  if (c === '!') {
    return markupDeclarationOpenState
  } else if (c === '/') {
    return endTagOpenState
  } else if (c === EOF) {
    throw new Error('This is an eof-before-tag-name parse error in tag open state.')
  } else if (typeof c === 'string' && c.match(/^[a-zA-Z]$/)) {
    // Create a new start tag token, set its tag name to the empty string.
    const startTagToken = {
      type: 'startTag',
      tagName: '',
      children: []
    }
    currentTagToken = startTagToken
    // Reconsume in the tag name state.
    return tagNameState(c)
  } else {
    throw new Error('This is an invalid-character-of-tag-name parse error.')
  }
}

const markupDeclarationOpenState = (c: string) => {
  if (c.toUpperCase() === 'D' ||
    c.toUpperCase() === 'O' ||
    c.toUpperCase() === 'C' ||
    c.toUpperCase() === 'T' ||
    c.toUpperCase() === 'Y' ||
    c.toUpperCase() === 'P' ||
    c.toUpperCase() === 'E') {
    DOC_TYPE += c.toUpperCase()
    return markupDeclarationOpenState
  } else if (DOC_TYPE.match(/^DOCTYPE$/)) {
    return DOCTYPEState(c)
  }
}

const DOCTYPEState = (c: string | symbol) => {
  if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
    return beforeDOCTYPENameState
  } else if (c === '>') {
    return afterDOCTYPENameState(c)
  } else if (c === EOF) {
    throw new Error('This is an eof-in-doctype parse error in DOCTYPE state.')
  } else {
    return beforeDOCTYPENameState(c)
  }
}

const beforeDOCTYPENameState = (c: string | symbol) => {
  if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
    return beforeDOCTYPENameState
  } else if (c === '>') {
    return dataState
  } else if (c === EOF) {
    throw new Error('This is an eof-in-doctype parse error in before DOCTYPE state.')
  } else {
    // Create a new DOCTYPE token.
    // Set the token's name to the current input character.
    currentTagToken = {
      type: 'document',
      name: '',
      children: []
    }
    return DOCTYPENameState(c)
  }
}

const DOCTYPENameState = (c: string | symbol) => {
  if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
    return afterDOCTYPENameState
  } else if (c === '>') {
    emit(currentTagToken)
    return dataState
  } else if (c === EOF) {
    throw new Error('This is an eof-in-doctype parse error in DOCTYPE name state')
  } else {
    // Append the current input character to the current DOCTYPE token's name.
    currentTagToken.name += c as string
    return DOCTYPENameState
  }
}

const afterDOCTYPENameState = (c: string | symbol) => {
  if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
    return afterDOCTYPENameState
  } else if (c === '>') {
    emit(currentTagToken)
    return dataState
  } else if (c === EOF) {
    throw new Error('This is an eof-indoctype parse error in after DOCTYPE name state')
  }
}

const endTagOpenState = (c: string | symbol) => {
  if (c === '>') {
    return dataState
  } else if (c === EOF) {
    throw new Error('This is an eof-before-tag-name parse error')
  } else if (typeof c === 'string' && c.match(/^[a-zA-Z]$/)) {
    // Create a new end tag token,
    // set its tag name to the empty string.
    const endTagToken = {
      type: 'endTag',
      tagName: ''
    }
    currentTagToken = endTagToken
    // Reconsume in the tag name state.
    return tagNameState(c)
  }
}

const tagNameState = (c: string | symbol) => {
  if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
    return beforeAttributeNameState
  } else if (c === '/') {
    return selfClosingStartTagState
  } else if (c === '>') {
    emit(currentTagToken)
    return dataState
  } else if (c === EOF) {
    throw new Error('This is an eof-in-tag parse error in tag name state.')
  } else {
    // Append the current input character to the current tag token's tag name.
    if (typeof c === 'string') {
      currentTagToken.tagName += c.toLowerCase()
    }
    return tagNameState
  }
}

const beforeAttributeNameState = (c: string | symbol) => {
  if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
    return beforeAttributeNameState
  } else if (c === '/' || c === EOF || c === '>') {
    return afterAttributeNameState(c)
  } else if (c === '=') {
    throw new Error('This is an unexpected-equals-sign-before-attribute-name parse error in before attribute name state.')
  } else {
    if (currentTagToken.attributes === void 0) {
      currentTagToken.attributes = []
    } else {
      const { name, value } = currentAttribute
      currentTagToken.attributes.push({
        name,
        value
      })
    }
    // Start a new attribute in the current tag token.
    // Set that attribute name and value to the empty string.
    currentAttribute.name = ''
    currentAttribute.value = ''
    // Reconsume in the attribute name state.
    return attributeNameState(c)
  }
}

const attributeNameState = (c: string | symbol): any => {
  if (c === '\t' || c === '\n' || c === '\f' || c === ' ' || c === '/' || c === '>' || c === EOF) {
    return afterAttributeNameState(c)
  } else if (c === '=') {
    return beforeAttributeValueState
  } else if (c === '\"' || c === '\'' || c === '<') {
    throw new Error('This is an unexpected-character-in-attribute-name parse error in attribute name state.')
  } else {
    // Append the current input character to the current attribute's name.
    currentAttribute.name += c as string
    return attributeNameState
  }
}

const afterAttributeNameState = (c: string | symbol) => {
  if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
    return afterAttributeNameState
  } else if (c === '/') {
    return selfClosingStartTagState
  } else if (c === '=') {
    return beforeAttributeValueState
  } else if (c === '>') {
    const { name, value } = currentAttribute
    currentTagToken.attributes?.push({
      name,
      value
    })
    emit(currentTagToken)
    return dataState
  } else if (c === EOF) {
    throw new Error('This is an eof-in-tag parse error in after attribute name state.')
  } else {
    // Start a new attribute in the current tag token.
    // Set that attribute name and value to the empty string.
    currentAttribute.name = ''
    currentAttribute.value = ''
    // Reconsume in the attribute name state.
    return attributeNameState(c)
  }
}

const beforeAttributeValueState = (c: string | symbol) => {
  if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
    return beforeAttributeValueState
  } else if (c === '\"') {
    return attributeValueDoubleQuotedState
  } else if (c === '\'') {
    return attributeValueSingleQuotedState
  } else if (c === '>') {
    throw new Error('This is a missing-attribute-value parse error in before attribute value state.')
  } else {
    return attributeValueUnquotedState(c)
  }
}

const attributeValueDoubleQuotedState = (c: string | symbol) => {
  if (c === '\"') {
    return afterAttributeValueQuotedState
  } else if (c === EOF) {
    throw new Error('This is an eof-in-tag parse error in aattribute value double quoted state.')
  } else {
    // Append the current input character to the current attribute's value.
    currentAttribute.value += c as string
    return attributeValueDoubleQuotedState
  }
}

const attributeValueSingleQuotedState = (c: string | symbol) => {
  if (c === '\'') {
    return afterAttributeValueQuotedState
  } else if (c === EOF) {
    throw new Error('This is an eof-in-tag parse error in aattribute value single quoted state.')
  } else {
    // Append the current input character to the current attribute's value.
    currentAttribute.value += c as string
    return attributeValueSingleQuotedState
  }
}

const attributeValueUnquotedState = (c: string | symbol) => {
  if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
    return beforeAttributeNameState
  } else if (c === '>') {
    const { name, value } = currentAttribute
    currentTagToken.attributes?.push({
      name,
      value
    })
    emit(currentTagToken)
    return dataState
  } else if (c === '\"' || c === '\'' || c === '<' || c === '=' || c === '\`') {
    throw new Error('This is an unexpected-character-in-unquoted-attribute-value parse error in attribute value unquoted state.')
  } else if (c === EOF) {
    throw new Error('This is an eof-in-tag parse error in attribute value unquoted state.')
  } else {
    // Append the current input character to the current attribute's value.
    currentAttribute.value += c as string
    return attributeValueUnquotedState
  }
}

const afterAttributeValueQuotedState = (c: string | symbol) => {
  if (c === '\t' || c === '\n' || c === '\f' || c === ' ') {
    return beforeAttributeNameState
  } else if (c === '/') {
    return selfClosingStartTagState
  } else if (c === '>') {
    const { name, value } = currentAttribute
    currentTagToken.attributes?.push({
      name,
      value
    })
    emit(currentTagToken)
    return dataState
  } else if (c === EOF) {
    throw new Error('This is an eof-in-tag parse error in after attribute value quoted state.')
  } else {
    throw new Error('This is a missing-whitespace-between-attributes parse error in after attribute value quoted state.')
  }
}

const selfClosingStartTagState = (c: string | symbol) => {
  if (c === '>') {
    // Set the self-closing flag of the current tag token. 
    currentTagToken.selfClosingFlag = true
    const { name, value } = currentAttribute
    // And pushed attribute into the current tag token's attributes. 
    currentTagToken.attributes?.push({
      name,
      value
    })
    emit(currentTagToken)
    return dataState
  } else if (c === EOF) {
    throw new Error('This is an eof-in-tag parse error in self closing start tag state.')
  }
}
