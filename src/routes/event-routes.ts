import { Router } from 'express'
import { requirePublishSecret, publisherSecret } from '../config'
import { authenticationMiddleware } from '../middleware'

enum AppStatus {
    LAUNCHING = "LAUNCHING",
    LAUNCHED = "LAUNCHED",
    FAILED = "FAILED",
    SUSPENDING = "SUSPENDING",
    TERMINATED = "TERMINATED"
}

interface ContainerState {
    type: "WAITING" | "RUNNING" | "TERMINATED"
}
interface ContainerWaitingState extends ContainerState {
    message?: string
    reason?: string
}
interface ContainerRunningState extends ContainerState {
    started_at?: number
}
interface ContainerTerminatedState extends ContainerState {
    exit_code: number
    started_at?: number
    finished_at?: number
    message?: string
    reason?: string
}
interface ContainerStatus {
    container_name: string
    container_state: ContainerWaitingState | ContainerRunningState | ContainerTerminatedState
}

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
        const client = getWsClient(appOwner)
        if (client) client.send(JSON.stringify({
            type: 'app_status',
            app_id: appId,
            status,
            containerStates
        }))

        res.status(200)
        res.send()
    }
})

export default router