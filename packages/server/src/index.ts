const Koa = require('koa')
const fs = require('node:fs')
const path =  require('node:path')

const app = new Koa()

app.use(async (ctx: { type: string; body: any }) => {
  ctx.type = 'text/html'
  ctx.body = fs.createReadStream(path.join(__dirname, '../template/index.html'))
})


app.listen(3000)
