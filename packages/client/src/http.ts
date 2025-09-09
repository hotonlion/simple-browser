import {
  HTTPMethods,
  MessageHeader, 
  MessageBody,
  RequestParams,
  Response
} from './types.ts'
import net from 'net'
import { Buffer } from 'node:buffer'
import { calculateStringLength } from './utils.ts'

export class Request {
  host: string
  port: number
  path: string
  method: HTTPMethods
  headers: MessageHeader
  body: MessageBody

  constructor (options: RequestParams) {
    this.host = options.host
    this.port = options.port || 80
    this.path = options. path || '/'
    this.method = options.method || HTTPMethods.POST
    this.headers = options.headers || {}
    this.body = options.body || {}
  }

  #toSring () {
    /*****************************************************************
     * visit https://datatracker.ietf.org/doc/html/rfc2616#section-5
     * 
     * Request = Request-Line
     *           *((header) CRLF)
     *           CRLF
     *           [message-body]
     * 
     * 
     * Request-Line = Method SP Request-URI SP HTTP-Version CRLF
     * 
     *    Request-URI = host + port + path
     * 
     *
     * message-header = `key: value`
     * 
     * message-body = `key=value`
     * 
     ***************************************************************/
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

  send (connection?: net.Socket | undefined): Promise<Response> {
    return new Promise((resolve, reject) => {
      const parser = new ResponseParser()
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
      let buffer = Buffer.alloc(0)
      connection.on('data', (data: Buffer) => {
        /**
         * #Notice:
         * chunk data is stream, so we need to await the last chunk.
         * but, real HTTP is not, we must knowen.
         * 
         * `0\r\n\r\n` is end of chunked
         * */
        const LAST_CHUNK = Buffer.from('0\r\n\r\n')
        buffer = Buffer.concat([buffer, data])
        if (buffer.indexOf(LAST_CHUNK) !== -1) {
          parser.receive(buffer.toString())
          if (parser.isFinished) {
            resolve(parser.response)
          }
          connection?.end()
        }
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


class ResponseParser {
  #currentState: null | Function
  #statusLine: string
  #headers: MessageHeader
  #fieldName: string
  #fieldValue: string
  #bodyParser: ChunkedParser | null
  constructor () {
    this.#currentState = null
    this.#statusLine = ''
    this.#fieldName = ''
    this.#fieldValue = ''
    this.#headers = {}
    this.#bodyParser = null
  }

  get isFinished (): boolean | undefined {
    return this.#bodyParser?.finished
  }

  get response () {
    this.#statusLine.match(/^HTTP\/1.1 ([0-9]{3}) ([\s\S]+)$/)
    return {
      statusCode: RegExp.$1,
      reason: RegExp.$2,
      headers: this.#headers,
      body: this.#bodyParser && this.#bodyParser.messageBody.join('')
    }
  }

  receive (chars: string) {
    this.#currentState = this.#STATUS_LINE
    for (const c of chars) {
      this.#receiverChar(c)
    }
  }

  #receiverChar (c: string) {
    this.#currentState = this.#currentState && this.#currentState(c)
  }

  #STATUS_LINE (c: string) {
    if (c === '\r') {
      return this.#STATUS_LINE
    } else if (c === '\n') {
      return this.#FIELDS_NAME
    } else {
      this.#statusLine += c
      return this.#STATUS_LINE
    }
  }

  #FIELDS_NAME (c: string) {
    if (c=== '\r') {
      return this.#MESSAGE_HEADERS_BLOCK
    } else if (c === ':') {
      return this.#FIELDS_NAME
    } else if (c === ' ') {
      return this.#FIELDS_VALUE
    } else {
      this.#fieldName += c
      return this.#FIELDS_NAME
    }
  }

  #FIELDS_VALUE (c: string) {
    if (c === '\r') {
      return this.#MESSAGE_HEADER_BLOCK_CR
    } else {
      this.#fieldValue += c
      return this.#FIELDS_VALUE
    }
  }

  #MESSAGE_HEADER_BLOCK_CR (c: string) {
    this.#headers[this.#fieldName] = this.#fieldValue
    this.#fieldName = ''
    this.#fieldValue = ''
    if (c === '\n') {
      return this.#FIELDS_NAME
    }
  }

  #MESSAGE_HEADERS_BLOCK (c: string) {
    if (c === '\n') {
      if (this.#headers['Transfer-Encoding'] === 'chunked') {
        this.#bodyParser = new ChunkedParser()
        return this.#MESSAGE_BODY
      } else {
        // TODO
      }
    }
  }

  #MESSAGE_BODY (c: string) {
    if (!this.isFinished) {
      this.#bodyParser?.receiverChar(c)
      return this.#MESSAGE_BODY
    }
  }
}

class ChunkedParser {
  #currentState: null | Function
  finished: boolean = false
  #chunkSize: number
  messageBody: string[]
  constructor () {
    this.#currentState = null
    this.finished = false
    this.#chunkSize = 0
    this.messageBody = []
  }

  receiverChar (c: string) {
    if (!this.#currentState) {
      this.#currentState = this.#CHUNK_SIZE
    }
    this.#currentState = this.#currentState(c)
  }

  #CHUNK_SIZE (c: string) {
    if (c === '\r') {
      return this.#CHUNK_SIZE
    } else if (c === '\n') {
      return this.#CHUNK_DATA
    } else {
      if (this.finished) {
        return
      }
      this.#chunkSize *= 16
      this.#chunkSize += parseInt(c, 16)
      return this.#CHUNK_SIZE
    }
  }

  #CHUNK_DATA (c: string) {
    const charSize = calculateStringLength(c)
    if (this.#chunkSize !== 0) {
      this.messageBody.push(c)
      this.#chunkSize -= charSize
      return this.#CHUNK_DATA
    } else {
      if (c === '\r') {
        return this.#CHUNK_DATA
      } else if (c === '\n') {
        return this.#LAST_CHUNK
      }
    }
  }

  #LAST_CHUNK (c: string) {
    if (c === '0') {
      return this.#TRAILER
    }
  }

  #TRAILER (c: string) {
    if (c === '\r') {
      return this.#TRAILER
    } else if (c === '\n') {
      return this.#CHUNKED_BODY_CR
    }
  }

  #CHUNKED_BODY_CR (c: string) {
    if (c === '\r') {
      return this.#CHUNKED_BODY_CR
    } else if (c === '\n') {
      this.finished = true
      return this.#chunkSize
    }
  }
}
