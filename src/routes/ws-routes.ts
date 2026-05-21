import { Router } from  'express'
import expressWs from 'express-ws'
import { WsReadyEvent } from '../events/ws-ready-event'
import { appstoreIdentityMiddleware, wsOriginMiddleware } from '../middleware'
import { checkAppstoreAuth } from '../middleware/appstore-auth'
import { wsReauthIntervalMs } from '../config'

// Custom close code for sockets terminated because the upstream appstore session
// is no longer valid (logout / expiry / cookie revoked).
const SESSION_INVALIDATED_CODE = 4401

const router = Router()
expressWs(router as any)

// Origin verification runs before identity lookup so disallowed origins never
// reach the upstream auth call.
router.use(wsOriginMiddleware)
router.use(appstoreIdentityMiddleware)

router.ws('/', (ws, req) => {
    let { appstoreIdentity } = req
    const { remoteUser, cookie } = appstoreIdentity!
    const addWsClient = req.addWsClient!
    const deleteWsClient = req.deleteWsClient!
    const getWsClient = req.getWsClient!

    console.log(`Websocket connection opened by client ${ remoteUser }`)
    addWsClient(remoteUser, ws)

    // Periodically re-verify the appstore session. Authentication only happens at
    // handshake, so without this a logout or session expiry on appstore would not
    // tear down the existing connection. Appstore sessions don't rotate cookies,
    // so reusing the handshake cookie is sufficient until the upstream session
    // ends, at which point /auth/ will stop returning a remote_user.
    const reauthTimer = setInterval(async () => {
        const { remoteUser: currentRemoteUser } = await checkAppstoreAuth(cookie)
        if (currentRemoteUser !== remoteUser) {
            console.log(`Appstore session no longer valid for ${ remoteUser } (got "${ currentRemoteUser ?? 'none' }"); closing socket`)
            ws.close(SESSION_INVALIDATED_CODE, 'Appstore session invalidated')
        }
    }, wsReauthIntervalMs)

    // Appstore identity middleware is async, which means the websocket server is unable to receive messages
    // despite being in an open state until the middleware completes and verifies the connection.
    // Therefore, clients should wait until receiving a _confirmReady before sending messages.
    ws.send(JSON.stringify(new WsReadyEvent().serialize()))

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
        console.log(`Handling event ${ eventType } with following parameters: ${ JSON.stringify(eventData) }`)
        switch (eventType) {
            case "initial_app_statuses":
                getWsClient(remoteUser).emitInitialAppStatuses()
                break
            case "clear_logs":
                getWsClient(remoteUser).clearLogs()
                break
            default:
                console.log(`Unrecognized event ${ eventType }`)
        }
    })
    ws.on('close', (code, reason) => {
        console.log(`Websocket connection closed by client ${ remoteUser }, code: ${ code}, reason: ${ reason }`)
        clearInterval(reauthTimer)
        deleteWsClient(remoteUser, ws)
    })
})

export default router