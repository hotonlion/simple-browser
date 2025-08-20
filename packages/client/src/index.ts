import { Request } from './http.ts'

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

const response = await request.send()
console.log(response)
