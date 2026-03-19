import { Router } from  'express'
import expressWs from 'express-ws'
import axios from 'axios'
import { WsReadyEvent } from '../events/ws-ready-event'
import { appstoreIdentityMiddleware } from '../middleware'
// Start of fix for ASVS req_id V4.4.2
// Start of fix for ASVS req_id V7.4.1
import { allowedWsOrigins, appstoreHost, wsSessionRecheckIntervalMs } from '../config'
// End of fix for req_id V7.4.1
// End of fix for req_id V4.4.2

const router = Router()
expressWs(router as any)

router.use(appstoreIdentityMiddleware)

router.ws('/', (ws, req) => {
    // Start of fix for ASVS req_id V4.4.2
    const origin = req.headers.origin
    if (allowedWsOrigins.length > 0 && (!origin || !allowedWsOrigins.includes(origin))) {
        console.warn(`WebSocket connection rejected: origin '${ origin }' is not in the allowed origins list.`)
        ws.close(1008, 'Origin not permitted')
        return
    }
    // End of fix for req_id V4.4.2

    let { appstoreIdentity } = req
    const { remoteUser } = appstoreIdentity!
    const addWsClient = req.addWsClient!
    const deleteWsClient = req.deleteWsClient!
    const getWsClient = req.getWsClient!

    // Start of fix for ASVS req_id V7.4.1
    // Capture the session cookies from the original handshake request for periodic re-verification.
    const sessionCookies = req.headers.cookie

    // Periodically re-verify the user's appstore session. If the session has expired or the user
    // has logged out, close the WebSocket connection so it cannot continue to be used.
    const recheckInterval = setInterval(async () => {
        try {
            const authRes = await axios.get(`http://${ appstoreHost }/auth/`, {
                headers: { Cookie: sessionCookies },
                maxRedirects: 0
            })
            const currentRemoteUser = authRes.headers['remote_user']
            if (!currentRemoteUser) {
                console.log(`Session re-check failed for ${ remoteUser } (no remote_user returned). Closing WebSocket.`)
                ws.close(1008, 'Session expired or logged out')
            }
        } catch (err: any) {
            // A 401/403/redirect from the appstore means the session is no longer valid.
            console.log(`Session re-check error for ${ remoteUser } (${ err?.response?.status ?? err?.message }). Closing WebSocket.`)
            ws.close(1008, 'Session validation failed')
        }
    }, wsSessionRecheckIntervalMs)
    // End of fix for req_id V7.4.1

    console.log(`Websocket connection opened by client ${ remoteUser }`)
    addWsClient(remoteUser, ws)

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
        // Start of fix for ASVS req_id V7.4.1
        clearInterval(recheckInterval)
        // End of fix for req_id V7.4.1
        console.log(`Websocket connection closed by client ${ remoteUser }, code: ${ code}, reason: ${ reason }`)
        deleteWsClient(remoteUser, ws)
    })
})

export default router
