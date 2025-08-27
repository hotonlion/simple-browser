import { Request, Response } from './http.ts'
import { htmlParser } from './html-parser.ts'

const request = new Request({
  host: '127.0.0.1',
  port: 3000,
  headers: {
    ['X-Foo']: 'bar'
  },
  body: {
    name: 'hello'
  }
})

const response: Response = await request.send()

const domTree = htmlParser(response.body as string)
