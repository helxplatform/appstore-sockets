import { Router } from  'express'
import expressWs from 'express-ws'
import { appstoreIdentityMiddleware } from '../middleware'

const router = Router()
expressWs(router as any)

router.use(appstoreIdentityMiddleware)

router.ws('/', (ws, req) => {
    let { appstoreIdentity } = req
    const { remoteUser } = appstoreIdentity!
    const addWsClient = req.addWsClient!
    const deleteWsClient = req.deleteWsClient!
    const getWsClient = req.getWsClient!

    addWsClient(remoteUser, ws)

    ws.on('message', (msg: string) => {
        let eventType, eventData
        try {
            ({
                type: eventType,
                ...eventData
            } = JSON.parse(msg))
        } catch (e) {
            console.error('Could not parse message as JSON: ', msg)
            return
        }
        console.log(`Handling event ${ eventType } with following parameters: ${ eventData }`)
        switch (eventType) {
            case "initial_app_statuses":
                getWsClient(remoteUser).emitInitialAppStatuses()
                break
            default:
                console.log(`Unrecognized event ${ eventType }`)
        }
    })
    ws.on('close', (code, reason) => {
        console.log(`Websocket connection closed by client ${ remoteUser }, code: ${ code}, reason: ${ reason }`)
        deleteWsClient(remoteUser, ws)
    })
})

export default router