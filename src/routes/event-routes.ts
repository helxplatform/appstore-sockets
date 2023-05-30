import { Router } from 'express'
import { requirePublishSecret, publisherSecret } from '../config'
import { authenticationMiddleware } from '../middleware'
import { AppStatus, ContainerStatus } from '../events/app-status-events'

const router = Router()
if (requirePublishSecret) {
    console.log('--- Requiring all event uploads to be signed using publisher secret ---')
    router.use(authenticationMiddleware(publisherSecret))
} else {
    console.log('--- Not requiring signed event uploads ---')
}

router.post('/app/status', (req, res) => {
    const getWsClient = req.getWsClient!

    const appId = req.body.app_id as string
    const appOwner = req.body.app_user as string
    const status = req.body.status as AppStatus
    const containerStates = req.body.container_states as ContainerStatus[]

    if (!appId || !appOwner || !status || !Object.keys(AppStatus).includes(status)) {
        res.status(400)
        res.send()
    } else {
        getWsClient(appOwner).emitAppStatus(appId, status, containerStates)

        res.status(200)
        res.send()
    }
})

export default router