enum HTTPMethods {
  OPTIONS = 'OPTIONS',
  GET ='GET',
  HEAD = 'HEAD',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  TRACE = 'TRACE',
  CONNECT = 'CONNECT'
}

interface RequestHeader {
  [x: string]: string | number
}

interface MessageBody {
  [x: string]: any
}

interface RequestParams {
  host: string,
  port: number,
  path?: string,
  method?: string,
  headers?: RequestHeader,
  body?: MessageBody
}

import net from 'net'
import { calculateStringLength } from './utils.ts'

export class Request {
  public host
  public port
  public path
  public method
  public headers
  public body

  constructor (options: RequestParams) {
    this.host = options.host
    this.port = options.port || 80
    this.path = options. path || '/'
    this.method = options.method || HTTPMethods.POST
    this.headers = options.headers || {}
    this.body = options.body || {}
  }

  #toSring () {
    const requestLine: string = `${this.method} ${this.path} HTTP/1.1`
    let messageBody: string = ''
    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }

    if (this.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
      messageBody = Object.keys(this.body).map(key => `${key}=${this.body[key]}`).join('&')
    } else if (this.headers['Content-Type'] === 'application/json') {
      messageBody = JSON.stringify(this.body)
    } else {
      // TODO
    }
    this.headers['Content-Length'] = calculateStringLength(messageBody)
    const messageHeader: string = Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')
    return `${requestLine}\r\n${messageHeader}\r\n\r\n${messageBody}`
  }

  send (connection?: net.Socket | undefined) {
    return new Promise((resolve, reject) => {
      if (connection) {
        connection.write(this.#toSring())
      } else {
        connection = net.createConnection({
          host: this.host,
          port: this.port
        }, () => {
          console.log('connected to server!')
          connection?.write(this.#toSring())
        })
      }
  
      connection.on('data', (data: any) => {
        resolve(data.toString())
        connection?.end()
      })
      connection.on('end', () => {
        console.log('disconnected from server')
      })
      connection.on('err', (err: any) => {
        reject(err)
      })
    })
  }
}


