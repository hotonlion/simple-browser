import { property } from "lodash"

/**
 * HTTP types
*/
export enum HTTPMethods {
  OPTIONS = 'OPTIONS',
  GET ='GET',
  HEAD = 'HEAD',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  TRACE = 'TRACE',
  CONNECT = 'CONNECT'
}

export interface MessageHeader {
  [x: string]: string | number
}

export interface MessageBody {
  [x: string]: any
}

export interface RequestParams {
  host: string
  port: number
  path?: string
  method?: HTTPMethods
  headers?: MessageHeader
  body?: MessageBody
}

export interface Response {
  statusCode: string
  reason: string
  headers: MessageHeader
  body: string | null
}

/**
 * htmp parser types
 */

export interface Attribute {
  name: string
  value: string
}

export interface Token {
  type: string,
  children?: Array<Element | TextToken>
  content?: string
}

export interface TagToken extends Token {
  tagName?: string
  name?: string
  selfClosingFlag?: boolean
  attributes?: Array<Attribute>
}

export interface TextToken extends Token {
}

export type EmitToken = TagToken & TextToken

export interface Element extends Token {
  tagName: string
  selfClosingFlag?: boolean
  attributes: Array<Attribute>
  parent?: Element | EmitToken
  computedStyle?: Declaration
}

interface Declaration {
  [property: string]: Property
}

export interface Property {
  value: string
  specificity: number[]
}