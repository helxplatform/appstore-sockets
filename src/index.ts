import path from 'path'
import express from 'express'
import expressWs from 'express-ws'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import { wsClientMiddleware } from './middleware'
import { wsRouter, eventRouter } from './routes'

const app = express()
expressWs(app)

app.use(morgan('tiny'))
app.use(bodyParser.json())
app.use(wsClientMiddleware)

app.use('/ws', wsRouter)
app.use('/hooks', eventRouter)

app.listen(5555, () => console.log("Listening on port 5555"))